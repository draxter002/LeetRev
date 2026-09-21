import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { seedRevisionsFromSolved } from "@/lib/scheduling";
import { syncAllPlatforms, extractUsernameFromJwt } from "@/lib/platforms/sync";

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

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Fetch user profile and default preferences
    const { data: profile } = await admin
      .from("profiles")
      .select("leetcode_username, leetcode_session, default_revision_intervals, default_priority")
      .eq("id", user.id)
      .maybeSingle();

    const leetcodeSession = profile?.leetcode_session || null;
    const leetcodeUser =
      profile?.leetcode_username ||
      extractUsernameFromJwt(leetcodeSession) ||
      null;

    const platformHandles = (user.user_metadata?.platform_handles as Record<string, string>) || {};

    const defaultIntervals =
      profile?.default_revision_intervals && profile.default_revision_intervals.length > 0
        ? profile.default_revision_intervals
        : [5];
    const defaultPriority = profile?.default_priority || "medium";

    // ── Fetch new submissions across all platforms in parallel ──
    const { submissions, platformsChecked } = await syncAllPlatforms({
      leetcode_username: leetcodeUser,
      leetcode_session: leetcodeSession,
      platform_handles: platformHandles,
    });

    if (submissions.length === 0) {
      return NextResponse.json({
        ok: true,
        addedCount: 0,
        totalFound: 0,
        platformsChecked,
        message: platformsChecked.length > 0
          ? `Checked ${platformsChecked.join(", ")}. No new submissions found.`
          : "No coding platforms configured yet. Add your usernames in Profile.",
      });
    }

    // ── Deduplicate against existing problems in DB ──
    const today = new Date().toISOString().slice(0, 10);

    const { data: existingRows } = await admin
      .from("problems")
      .select("id, title, leetcode_slug, problem_link, platform_links")
      .eq("user_id", user.id);

    const existingSlugs = new Set<string>();
    const existingLinks = new Set<string>();
    const existingTitles = new Set<string>();
    // map normalised key → row for merge updates
    const slugToRow = new Map<string, { id: string; platform_links: Record<string, string> }>();
    const linkToRow = new Map<string, { id: string; platform_links: Record<string, string> }>();
    const titleToRow = new Map<string, { id: string; platform_links: Record<string, string> }>();

    for (const row of existingRows || []) {
      const pl: Record<string, string> = (row.platform_links as Record<string, string>) || {};
      if (row.leetcode_slug) {
        existingSlugs.add(row.leetcode_slug.toLowerCase());
        slugToRow.set(row.leetcode_slug.toLowerCase(), { id: row.id, platform_links: pl });
      }
      if (row.problem_link) {
        const norm = row.problem_link.toLowerCase().replace(/\/$/, "");
        existingLinks.add(norm);
        linkToRow.set(norm, { id: row.id, platform_links: pl });
      }
      if (row.title) {
        existingTitles.add(row.title.toLowerCase().trim());
        titleToRow.set(row.title.toLowerCase().trim(), { id: row.id, platform_links: pl });
      }
    }

    const genuineNew: typeof submissions = [];
    const seenInBatch = new Set<string>();

    // platform_links patches: problem_id → merged platform_links object
    const linkPatches = new Map<string, Record<string, string>>();

    for (const sub of submissions) {
      const normalizedTitle = sub.title.toLowerCase().trim();
      const normalizedLink = sub.problem_link
        ? sub.problem_link.toLowerCase().replace(/\/$/, "")
        : null;
      const normalizedSlug = sub.leetcode_slug?.toLowerCase();

      // Find matching existing row (if any)
      let matchedRow: { id: string; platform_links: Record<string, string> } | undefined;
      if (normalizedSlug && slugToRow.has(normalizedSlug)) {
        matchedRow = slugToRow.get(normalizedSlug);
      } else if (normalizedLink && linkToRow.has(normalizedLink)) {
        matchedRow = linkToRow.get(normalizedLink);
      } else if (existingTitles.has(normalizedTitle)) {
        matchedRow = titleToRow.get(normalizedTitle);
      }

      if (matchedRow) {
        // Problem already exists — check if this platform's link is new
        const platformKey = sub.platform || "other";
        const existingPlatformLink = matchedRow.platform_links[platformKey];
        const incomingLink = sub.problem_link || undefined;

        if (incomingLink && existingPlatformLink !== incomingLink) {
          // Merge: add/update the new platform link onto the existing problem row
          const current = linkPatches.get(matchedRow.id) ?? { ...matchedRow.platform_links };
          current[platformKey] = incomingLink;
          linkPatches.set(matchedRow.id, current);
        }
        // Either way, don't insert a new row
        continue;
      }

      // Check against earlier items in current batch to avoid within-batch dupes
      const batchKey = normalizedSlug || normalizedLink || normalizedTitle;
      if (seenInBatch.has(batchKey)) continue;
      seenInBatch.add(batchKey);

      genuineNew.push(sub);
    }

    // ── Apply platform_links patches to existing problems ──
    const patchedCount = linkPatches.size;
    if (patchedCount > 0) {
      const patchPromises = Array.from(linkPatches.entries()).map(([problemId, mergedLinks]) =>
        admin
          .from("problems")
          .update({ platform_links: mergedLinks, updated_at: new Date().toISOString() })
          .eq("id", problemId)
      );
      await Promise.allSettled(patchPromises);
    }

    if (genuineNew.length === 0) {
      return NextResponse.json({
        ok: true,
        addedCount: 0,
        patchedCount,
        totalFound: submissions.length,
        platformsChecked,
        message:
          patchedCount > 0
            ? `Added ${patchedCount} new platform link${patchedCount === 1 ? "" : "s"} to existing problems.`
            : "All fetched submissions are already in your revision queue.",
      });
    }

    // ── Batch insert new problems ──
    const problemsToInsert = genuineNew.map((item) => {
      const platformLinks: Record<string, string> = {};
      if (item.platform && item.problem_link) {
        platformLinks[item.platform] = item.problem_link;
      }
      return {
        user_id: user.id,
        title: item.title,
        topic: item.topic || "General",
        priority: defaultPriority,
        revision_intervals: defaultIntervals,
        problem_link: item.problem_link,
        leetcode_slug: item.leetcode_slug || null,
        source: item.source || "multi_platform_sync",
        date_added: today,
        date_solved: item.date_solved || today,
        solutions: {},
        platform_links: platformLinks,
      };
    });

    const CHUNK = 50;
    const insertedIds: string[] = [];
    for (let i = 0; i < problemsToInsert.length; i += CHUNK) {
      const chunk = problemsToInsert.slice(i, i + CHUNK);
      const { data: inserted, error: insErr } = await admin
        .from("problems")
        .insert(chunk)
        .select("id");

      if (insErr) {
        console.error("[sync/submissions] Problem insert error:", insErr.message);
      } else if (inserted) {
        for (const row of inserted) insertedIds.push(row.id);
      }
    }

    // ── Batch seed revision schedule entries ──
    if (insertedIds.length > 0 && defaultIntervals.length > 0) {
      const seeds = seedRevisionsFromSolved(today, defaultIntervals);
      const revisionRows = insertedIds.flatMap((pid) =>
        seeds.map((s) => ({ user_id: user.id, problem_id: pid, ...s }))
      );
      for (let i = 0; i < revisionRows.length; i += CHUNK) {
        await admin.from("revision_entries").insert(revisionRows.slice(i, i + CHUNK));
      }
    }

    // Update profile last-imported timestamp
    await admin
      .from("profiles")
      .update({
        leetcode_imported: true,
        leetcode_imported_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      addedCount: insertedIds.length,
      patchedCount,
      totalFound: submissions.length,
      platformsChecked,
      newProblems: genuineNew.map((p) => ({ title: p.title, platform: p.platform })),
      message: `Successfully added ${insertedIds.length} new submission${insertedIds.length === 1 ? "" : "s"}${patchedCount > 0 ? ` and ${patchedCount} new platform link${patchedCount === 1 ? "" : "s"}` : ""} across ${platformsChecked.join(", ")} to your revision queue!`,
    });
  } catch (err: any) {
    console.error("[api/sync/submissions error]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to sync platform submissions" },
      { status: 500 }
    );
  }
}
