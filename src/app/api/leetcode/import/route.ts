import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { seedRevisionsFromSolved } from "@/lib/scheduling";

export async function POST(request: NextRequest) {
  try {
    const serverSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const sessionCookie = (body.sessionCookie || "").trim();

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Fetch saved session cookie and default intervals/priority from profile
    const { data: profile } = await admin
      .from("profiles")
      .select("leetcode_session, default_revision_intervals, default_priority")
      .eq("id", user.id)
      .maybeSingle();

    // Use cookie passed in request body, or fall back to saved profile cookie
    const effectiveCookie = (sessionCookie || profile?.leetcode_session || "").trim();

    if (!effectiveCookie) {
      return NextResponse.json(
        {
          error:
            "No LEETCODE_SESSION cookie found. Please provide your LeetCode session cookie in Profile settings to sync solved problems.",
        },
        { status: 400 }
      );
    }

    const defaultIntervals =
      profile?.default_revision_intervals && profile.default_revision_intervals.length > 0
        ? profile.default_revision_intervals
        : [5];
    const defaultPriority = profile?.default_priority || "medium";

    // Build the cookie header
    const cookieHeader = effectiveCookie.includes("LEETCODE_SESSION=")
      ? effectiveCookie
      : `LEETCODE_SESSION=${effectiveCookie}`;

    // ── Fetch all solved problems using LEETCODE_SESSION cookie (REST only) ──
    console.log("[import] Fetching solved problems via LEETCODE_SESSION cookie...");

    let problemsToImport: { title: string; titleSlug?: string }[] = [];
    let isCookieInvalid = false;
    let authStatusCode: number | null = null;

    try {
      const res = await fetch("https://leetcode.com/api/problems/all/", {
        headers: {
          Cookie: cookieHeader,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://leetcode.com/progress/",
        },
      });

      authStatusCode = res.status;

      if (!res.ok) {
        console.warn("[import] LeetCode REST returned status:", res.status);
        if (res.status === 401 || res.status === 403) {
          isCookieInvalid = true;
        }
      } else {
        const data = await res.json().catch(() => ({}));
        const pairs: any[] = data?.stat_status_pairs || [];

        if (pairs.length === 0) {
          // Empty stat_status_pairs usually means the cookie is invalid or not authenticated
          isCookieInvalid = true;
        } else {
          const solvedPairs = pairs.filter((p: any) => p.status === "ac");
          console.log("[import] Found", solvedPairs.length, "accepted solved problems.");
          problemsToImport = solvedPairs.map((p: any) => ({
            title: p.stat.question__title,
            titleSlug: p.stat.question__title_slug,
          }));
        }
      }
    } catch (err) {
      console.warn("[import] Cookie REST fetch error:", err);
    }

    // If cookie is invalid or returned an auth error
    if (isCookieInvalid || (problemsToImport.length === 0 && authStatusCode && authStatusCode >= 400)) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired LEETCODE_SESSION cookie. Please copy a fresh cookie from your browser's Developer Tools (F12 → Application → Cookies) and update it in your profile.",
        },
        { status: 401 }
      );
    }

    if (problemsToImport.length === 0) {
      return NextResponse.json({
        ok: true,
        added: 0,
        totalFound: 0,
        message: "No accepted solved problems found on this LeetCode account.",
      });
    }

    // If a new session cookie was passed and successfully used, save it to profile
    if (sessionCookie) {
      await admin
        .from("profiles")
        .update({ leetcode_session: sessionCookie })
        .eq("id", user.id);
    }

    const today = new Date().toISOString().slice(0, 10);
    let added = 0;
    let lastError: string | null = null;

    // ── Batch deduplication: fetch all existing slugs + titles in one query ──
    const allSlugs = problemsToImport.map((p) => p.titleSlug).filter(Boolean) as string[];
    const allTitles = problemsToImport.map((p) => p.title);

    const { data: existingRows } = await admin
      .from("problems")
      .select("id, title, leetcode_slug, revision_intervals, priority")
      .eq("user_id", user.id)
      .or(
        [
          allSlugs.length > 0 ? `leetcode_slug.in.(${allSlugs.map((s) => `"${s}"`).join(",")})` : null,
          `title.in.(${allTitles.map((t) => `"${t.replace(/"/g, '""')}"`).join(",")})`,
        ]
          .filter(Boolean)
          .join(",")
      );

    const existingBySlug = new Map<string, { id: string; revision_intervals: number[] | null; priority: string | null }>();
    const existingByTitle = new Map<string, { id: string; revision_intervals: number[] | null; priority: string | null }>();
    for (const row of existingRows ?? []) {
      if (row.leetcode_slug) existingBySlug.set(row.leetcode_slug, row);
      existingByTitle.set(row.title, row);
    }

    // Backfill priority / intervals for already-existing problems that are missing them
    const needsBackfill = (existingRows ?? []).filter(
      (r) => !r.priority || !r.revision_intervals?.length
    );
    if (needsBackfill.length > 0) {
      for (const r of needsBackfill) {
        const updates: Record<string, unknown> = {};
        if (!r.priority) updates.priority = "medium";
        if (!r.revision_intervals?.length) {
          updates.revision_intervals = defaultIntervals;
          const seeds = seedRevisionsFromSolved(today, defaultIntervals);
          if (seeds.length > 0) {
            await admin.from("revision_entries").insert(
              seeds.map((s) => ({ user_id: user.id, problem_id: r.id, ...s }))
            );
          }
        }
        if (Object.keys(updates).length > 0) {
          await admin.from("problems").update(updates).eq("id", r.id);
        }
      }
    }

    // Build list of genuinely new problems to insert
    const newProblems: any[] = [];
    for (const item of problemsToImport) {
      const slug = item.titleSlug ?? null;
      const existing = (slug && existingBySlug.get(slug)) || existingByTitle.get(item.title);
      if (existing) continue; // already in DB

      newProblems.push({
        user_id: user.id,
        title: item.title,
        topic: "LeetCode Fetched",
        priority: defaultPriority,
        revision_intervals: defaultIntervals,
        problem_link: slug ? `https://leetcode.com/problems/${slug}` : null,
        leetcode_slug: slug,
        source: "leetcode_import",
        date_added: today,
        date_solved: today,
        solutions: {},
      });
    }

    // Batch insert new problems in chunks of 50
    const CHUNK = 50;
    const insertedIds: string[] = [];
    for (let i = 0; i < newProblems.length; i += CHUNK) {
      const chunk = newProblems.slice(i, i + CHUNK);
      const { data: inserted, error: insErr } = await admin
        .from("problems")
        .insert(chunk)
        .select("id");
      if (insErr) {
        lastError = insErr.message;
        console.error("[import] Batch insert error:", insErr.message);
      } else if (inserted) {
        for (const row of inserted) insertedIds.push(row.id);
      }
    }
    added = insertedIds.length;

    // Batch insert revision seeds for all newly inserted problems
    if (insertedIds.length > 0 && defaultIntervals.length > 0) {
      const seeds = seedRevisionsFromSolved(today, defaultIntervals);
      const revisionRows = insertedIds.flatMap((pid) =>
        seeds.map((s) => ({ user_id: user.id, problem_id: pid, ...s }))
      );
      for (let i = 0; i < revisionRows.length; i += CHUNK) {
        await admin.from("revision_entries").insert(revisionRows.slice(i, i + CHUNK));
      }
    }

    // Backfill any remaining problems that have null priority
    await admin
      .from("problems")
      .update({ priority: "medium" })
      .eq("user_id", user.id)
      .is("priority", null);

    // Update last-synced timestamp on profile
    await admin
      .from("profiles")
      .update({
        leetcode_imported: true,
        leetcode_imported_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    console.log("[import] Completed: added", added, "new problems.");

    if (added === 0 && lastError) {
      return NextResponse.json({ error: `Database insert failed: ${lastError}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      added,
      totalFound: problemsToImport.length,
    });
  } catch (err) {
    console.error("[import] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
