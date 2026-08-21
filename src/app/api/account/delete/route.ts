import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function DELETE(request: NextRequest) {
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

    // 1. Get all problem IDs for this user
    const { data: problems } = await admin
      .from("problems")
      .select("id")
      .eq("user_id", user.id);

    const problemIds = (problems ?? []).map((p: { id: string }) => p.id);

    // 2. Delete revision_entries for all user's problems
    if (problemIds.length > 0) {
      await admin.from("revision_entries").delete().in("problem_id", problemIds);
    }

    // 3. Delete all problems
    await admin.from("problems").delete().eq("user_id", user.id);

    // 4. Delete feedback submitted by user
    await admin.from("feedback").delete().eq("user_id", user.id);

    // 5. Delete profile row
    await admin.from("profiles").delete().eq("id", user.id);

    // 6. Delete the auth user account itself (hard delete from auth.users)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("[delete-account] Failed to delete auth user:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete account: " + deleteError.message },
        { status: 500 }
      );
    }

    console.log("[delete-account] Permanently deleted account for user:", user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[delete-account] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete account" },
      { status: 500 }
    );
  }
}
