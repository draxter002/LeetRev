import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { seedRevisionsFromSolved } from "@/lib/scheduling";

function parseProblemEntry(raw: string): { title: string; slug: string | null; link: string | null } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Case 1: Full LeetCode URL e.g. https://leetcode.com/problems/two-sum/description/
  const urlMatch = trimmed.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  if (urlMatch && urlMatch[1]) {
    const slug = urlMatch[1].toLowerCase();
    const title = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      title,
      slug,
      link: `https://leetcode.com/problems/${slug}`,
    };
  }

  // Case 2: Slug format e.g. "two-sum" or "3sum-closest"
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/i.test(trimmed)) {
    const slug = trimmed.toLowerCase();
    const title = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return {
      title,
      slug,
      link: `https://leetcode.com/problems/${slug}`,
    };
  }

  // Case 3: Problem title e.g. "1. Two Sum" or "Two Sum" or "Valid Anagram"
  const cleanTitle = trimmed.replace(/^\d+[\.\s\-]+/, "").trim();
  const slug = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

  return {
    title: cleanTitle,
    slug: slug || null,
    link: slug ? `https://leetcode.com/problems/${slug}` : null,
  };
}

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
    const text = (body.text || "") as string;

    if (!text.trim()) {
      return NextResponse.json({ error: "Please provide problem titles or links." }, { status: 400 });
    }

    const lines = text
      .split(/[\r\n,]+/)
      .map((l) => l.trim())
      .filter(Boolean);

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Fetch user profile for default revision intervals
    const { data: profile } = await admin
      .from("profiles")
      .select("default_revision_intervals")
      .eq("id", user.id)
      .maybeSingle();

    const defaultIntervals =
      profile?.default_revision_intervals && profile.default_revision_intervals.length > 0
        ? profile.default_revision_intervals
        : [5];

    // Fetch all existing problems for this user to dedupe
    const { data: existingRows } = await admin
      .from("problems")
      .select("title, leetcode_slug")
      .eq("user_id", user.id);

    const existingSlugs = new Set((existingRows || []).map((r) => r.leetcode_slug).filter(Boolean));
    const existingTitles = new Set((existingRows || []).map((r) => r.title?.toLowerCase().trim()).filter(Boolean));

    const today = new Date().toISOString().slice(0, 10);
    const toInsert: any[] = [];

    for (const line of lines) {
      const parsed = parseProblemEntry(line);
      if (!parsed) continue;

      if (parsed.slug && existingSlugs.has(parsed.slug)) continue;
      if (existingTitles.has(parsed.title.toLowerCase())) continue;

      if (parsed.slug) existingSlugs.add(parsed.slug);
      existingTitles.add(parsed.title.toLowerCase());

      toInsert.push({
        user_id: user.id,
        title: parsed.title,
        topic: "LeetCode Fetched",
        priority: "medium",
        revision_intervals: defaultIntervals,
        problem_link: parsed.link,
        leetcode_slug: parsed.slug,
        source: "leetcode_import",
        date_added: today,
        date_solved: today,
        solutions: {},
      });
    }

    let added = 0;
    if (toInsert.length > 0) {
      let insertBatch = toInsert;
      let { error: insErr, data } = await admin
        .from("problems")
        .insert(insertBatch)
        .select("id");

      // Fallback 1: if priority constraint fails
      if (insErr && (insErr.message.includes("priority") || insErr.code === "23502" || insErr.code === "23514")) {
        insertBatch = insertBatch.map((p) => ({ ...p, priority: "medium" }));
        const res2 = await admin.from("problems").insert(insertBatch).select("id");
        insErr = res2.error;
        data = res2.data;
      }

      // Fallback 2: if leetcode_slug / source columns missing
      if (insErr && (insErr.message.includes("leetcode_slug") || insErr.message.includes("source"))) {
        insertBatch = insertBatch.map((p) => {
          const c = { ...p, priority: p.priority || "medium" };
          delete c.leetcode_slug;
          delete c.source;
          return c;
        });
        const res3 = await admin.from("problems").insert(insertBatch).select("id");
        insErr = res3.error;
        data = res3.data;
      }

      if (insErr) {
        throw new Error(insErr.message);
      }

      added = data?.length || insertBatch.length;

      // Seed revision schedule for all newly inserted problems
      if (data && data.length > 0 && defaultIntervals.length > 0) {
        const seedRows = [];
        for (const p of data) {
          const seeds = seedRevisionsFromSolved(today, defaultIntervals);
          for (const s of seeds) {
            seedRows.push({
              user_id: user.id,
              problem_id: p.id,
              ...s,
            });
          }
        }
        if (seedRows.length > 0) {
          await admin.from("revision_entries").insert(seedRows);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      added,
      totalProcessed: lines.length,
      skipped: lines.length - added,
    });
  } catch (err) {
    console.error("[bulk-import]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
