import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
    const deleteImported = !!body.deleteImported;

    // clear username from profile
    await serverSupabase.from("profiles").update({ leetcode_username: null }).eq("id", user.id);

    if (deleteImported) {
      // delete imported problems for user; remove revision_entries first
      const { data: ids } = await serverSupabase.from("problems").select("id").eq("user_id", user.id).eq("source", "leetcode_import");
      const idsArr = (ids || []).map((r: any) => r.id);
      if (idsArr.length > 0) {
        await serverSupabase.from("revision_entries").delete().in("problem_id", idsArr);
        await serverSupabase.from("problems").delete().in("id", idsArr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
