import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { RECENT_QUERY } from "../route";
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
          setAll() {
            // not needed
          },
        },
      }
    );

    const {
      data: { user },
    } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const username = (body.username || undefined) as string | undefined;

    let leetUsername = username;
    if (!leetUsername) {
      const { data: profile } = await serverSupabase.from("profiles").select("leetcode_username").eq("id", user.id).maybeSingle();
      leetUsername = profile?.leetcode_username ?? undefined;
    }
    if (!leetUsername) {
      console.warn("[import] No LeetCode username found for user", user.id);
      return NextResponse.json({ error: "LeetCode username not set" }, { status: 400 });
    }

    console.log("[import] Starting import for", leetUsername);
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" },
      body: JSON.stringify({ query: RECENT_QUERY, variables: { username: leetUsername, limit: 200 } }),
    });
    if (!res.ok) {
      console.error("[import] LeetCode API failed:", res.status);
      return NextResponse.json({ error: `LeetCode returned ${res.status}` }, { status: 502 });
    }

    const json = await res.json().catch(() => ({}));
    const list = json?.data?.recentAcSubmissionList ?? [];
    console.log("[import] Fetched", list.length, "recent problems");
    const recent: { title: string; titleSlug?: string }[] = list.map((x: any) => ({ title: x.title, titleSlug: x.titleSlug }));

    // use admin client to upsert safely
    const admin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

    const today = new Date().toISOString().slice(0, 10);
    let added = 0;

    for (const item of recent) {
      const slug = item.titleSlug ?? null;
      const link = slug ? `https://leetcode.com/problems/${slug}` : null;

      // build insert object; leave priority and revision_intervals null (do not set)
      const insertObj: any = {
        user_id: user.id,
        title: item.title,
        topic: "LeetCode Fetched",
        problem_link: link,
        leetcode_slug: slug,
        source: "leetcode_import",
        date_added: today,
        date_solved: today,
        solutions: {},
      };

      if (slug) {
        // upsert by user_id + leetcode_slug using onConflict (requires unique index)
        const { data: upserted, error: upsertErr } = await admin
          .from("problems")
          .upsert(insertObj, { onConflict: "user_id,leetcode_slug" })
          .select()
          .maybeSingle();
        if (upsertErr) {
          console.warn("[import] Upsert failed for", slug, ":", upsertErr);
          continue;
        }
        // Supabase upsert always returns the row (newly created or updated)
        // Count it if it was inserted (check if created_at is very recent, or assume all are new on first import)
        if (upserted) {
          added++;
        }
      } else {
        // no slug – insert only if no problem with same title exists for user
        const { data: existing } = await admin.from("problems").select("id").eq("user_id", user.id).eq("title", item.title).limit(1).maybeSingle();
        if (existing && existing.id) continue;
        const { data: inserted, error: insErr } = await admin.from("problems").insert(insertObj).select().maybeSingle();
        if (insErr) {
          console.warn("[import] Insert failed", insErr);
          continue;
        }
        if (inserted) added++;
      }
    }

    // mark profile as imported if any were added
    if (added > 0) {
      await admin.from("profiles").update({ leetcode_imported: true, leetcode_imported_at: new Date().toISOString() }).eq("id", user.id);
    }

    console.log("[import] Successfully added", added, "problems");
    return NextResponse.json({ ok: true, added });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
