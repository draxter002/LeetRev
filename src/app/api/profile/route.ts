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

    const metaInterval = Number(user.user_metadata?.default_revision_interval);
    const metaIntervals = metaInterval > 0 ? [metaInterval] : [5];
    const metaPriority = user.user_metadata?.default_priority || "medium";

    if (!profile) {
      const defaultName = user.user_metadata?.display_name || user.email?.split("@")[0] || null;
      const newProfile = {
        id: user.id,
        display_name: defaultName,
        timezone: "UTC",
        default_revision_intervals: metaIntervals,
        default_priority: metaPriority,
      };

      const { data: created } = await admin
        .from("profiles")
        .upsert(newProfile)
        .select()
        .maybeSingle();

      profile = created || newProfile;
    } else if (!profile.default_revision_intervals || (profile.default_revision_intervals as number[]).length === 0 || !profile.default_priority) {
      // Profile exists but fields were never set — backfill from signup metadata
      const patchData: any = {};
      if (!profile.default_revision_intervals || (profile.default_revision_intervals as number[]).length === 0) patchData.default_revision_intervals = metaIntervals;
      if (!profile.default_priority) patchData.default_priority = metaPriority;

      const { data: patched } = await admin
        .from("profiles")
        .update(patchData)
        .eq("id", user.id)
        .select()
        .maybeSingle();
      if (patched) profile = patched;
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
    const {
      display_name,
      timezone,
      leetcode_username,
      leetcode_session,
      default_revision_intervals,
      default_priority,
      email_reminders_enabled,
    } = body;

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
    if (default_priority !== undefined) updates.default_priority = default_priority;
    if (email_reminders_enabled !== undefined) updates.email_reminders_enabled = email_reminders_enabled;

    // Fetch old profile BEFORE updating so we know what the previous default interval and priority was
    let oldDefaultIntervals: number[] | null = null;
    let oldDefaultPriority: string | null = null;
    if (default_revision_intervals !== undefined || default_priority !== undefined) {
      const { data: oldProfile } = await admin
        .from("profiles")
        .select("default_revision_intervals, default_priority")
        .eq("id", user.id)
        .maybeSingle();
      oldDefaultIntervals = oldProfile?.default_revision_intervals ?? null;
      oldDefaultPriority = oldProfile?.default_priority ?? null;
    }

    // 1. Try upsert with all provided fields
    let { data: updated, error } = await admin
      .from("profiles")
      .upsert({ id: user.id, ...updates })
      .select()
      .maybeSingle();

    // The columns leetcode_session and default_revision_intervals are now guaranteed
    // to exist by migrations. We don't need the fallback that silently drops them.
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

    // If the user changed their default priority, propagate it to existing problems that were using the old default
    if (default_priority && oldDefaultPriority && default_priority !== oldDefaultPriority) {
      await admin
        .from("problems")
        .update({ priority: default_priority })
        .eq("user_id", user.id)
        .eq("priority", oldDefaultPriority);
    }

    return NextResponse.json({ profile: updated });
  } catch (err) {
    console.error("[api/profile PATCH] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
