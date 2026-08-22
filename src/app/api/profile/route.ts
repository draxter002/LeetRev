import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
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

    let { data: profile, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      const defaultName = user.user_metadata?.display_name || user.email?.split("@")[0] || null;
      const metaInterval = Number(user.user_metadata?.default_revision_interval);
      const defaultIntervals = metaInterval > 0 ? [metaInterval] : [5];
      const newProfile = {
        id: user.id,
        display_name: defaultName,
        timezone: "UTC",
        default_revision_intervals: defaultIntervals,
      };

      const { data: created } = await admin
        .from("profiles")
        .upsert(newProfile)
        .select()
        .maybeSingle();

      profile = created || newProfile;
    }

    // Ensure all existing problems have default priority 'medium' if null
    await admin
      .from("problems")
      .update({ priority: "medium" })
      .eq("user_id", user.id)
      .is("priority", null);

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[api/profile GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { display_name, timezone, leetcode_username, leetcode_session, default_revision_intervals, email_reminders_enabled } = body;

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (display_name !== undefined) updates.display_name = display_name;
    if (timezone !== undefined) updates.timezone = timezone;
    if (leetcode_username !== undefined) updates.leetcode_username = leetcode_username;
    if (leetcode_session !== undefined) updates.leetcode_session = leetcode_session;
    if (default_revision_intervals !== undefined) updates.default_revision_intervals = default_revision_intervals;
    if (email_reminders_enabled !== undefined) updates.email_reminders_enabled = email_reminders_enabled;

    // Fetch old profile BEFORE updating so we know what the previous default interval was
    let oldDefaultIntervals: number[] | null = null;
    if (default_revision_intervals !== undefined) {
      const { data: oldProfile } = await admin
        .from("profiles")
        .select("default_revision_intervals")
        .eq("id", user.id)
        .maybeSingle();
      oldDefaultIntervals = oldProfile?.default_revision_intervals ?? null;
    }

    // 1. Try upsert with all provided fields
    let { data: updated, error } = await admin
      .from("profiles")
      .upsert({ id: user.id, ...updates })
      .select()
      .maybeSingle();

    // 2. If error is because leetcode_session or default_revision_intervals column is missing in DB
    if (error && (error.message.includes("leetcode_session") || error.message.includes("default_revision_intervals"))) {
      if (error.message.includes("leetcode_session")) delete updates.leetcode_session;
      if (error.message.includes("default_revision_intervals")) delete updates.default_revision_intervals;
      const res2 = await admin
        .from("profiles")
        .upsert({ id: user.id, ...updates })
        .select()
        .maybeSingle();
      error = res2.error;
      updated = res2.data;
    }

    if (error) {
      console.error("[api/profile PATCH] DB error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If the user changed their default revision interval, propagate it to all
    // existing problems that were using the old default interval
    if (default_revision_intervals && Array.isArray(default_revision_intervals) && default_revision_intervals.length > 0) {
      // Determine which interval to look for in existing problems
      const oldSingle = oldDefaultIntervals && oldDefaultIntervals.length === 1
        ? oldDefaultIntervals[0]
        : 5; // fallback hardcoded default

      // Update problems that still use the old single-value default interval
      await admin
        .from("problems")
        .update({ revision_intervals: default_revision_intervals })
        .eq("user_id", user.id)
        .eq("revision_intervals", `{${oldSingle}}`);
    }

    return NextResponse.json({ ok: true, profile: updated });
  } catch (err) {
    console.error("[api/profile PATCH] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
