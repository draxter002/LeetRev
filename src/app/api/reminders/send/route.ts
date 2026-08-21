import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { todayInTimezone, calculateStreaks } from "@/lib/scheduling";

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

    // 1. Fetch user profile
    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const remindersEnabled = profile?.email_reminders_enabled !== false; // Default true
    if (!remindersEnabled) {
      return NextResponse.json({
        ok: true,
        sent: false,
        reason: "Email reminders are disabled in profile settings.",
      });
    }

    const timezone = profile?.timezone || "UTC";
    const today = todayInTimezone(timezone);
    const userEmail = user.email || profile?.leetcode_username || "user@app.com";
    const displayName = profile?.display_name || user.email?.split("@")[0] || "Friend";

    // 2. Fetch due revisions for today
    const { data: dueData } = await admin
      .from("revision_entries")
      .select("id, scheduled_date, interval_label, problems(id, title, topic, priority)")
      .eq("user_id", user.id)
      .in("status", ["pending", "missed"])
      .lte("scheduled_date", today)
      .order("scheduled_date", { ascending: true });

    const dueRevisions = (dueData ?? []) as any[];

    // Rule: DON'T send mail if there is no problem for revision
    if (dueRevisions.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: false,
        dueCount: 0,
        message: "No problems due for revision today. Reminder email was not sent.",
      });
    }

    // 3. Calculate current streak
    const { data: revDone } = await admin
      .from("revision_entries")
      .select("completed_date")
      .eq("user_id", user.id)
      .eq("status", "done")
      .not("completed_date", "is", null);

    const { data: revMissed } = await admin
      .from("revision_entries")
      .select("scheduled_date")
      .eq("user_id", user.id)
      .in("status", ["missed", "pending"])
      .lt("scheduled_date", today);

    const { data: probData } = await admin
      .from("problems")
      .select("date_solved, date_added")
      .eq("user_id", user.id);

    const activeDates: string[] = [];
    if (revDone) {
      for (const r of revDone) if (r.completed_date) activeDates.push(r.completed_date);
    }
    if (probData) {
      for (const p of probData) {
        if (p.date_solved) activeDates.push(p.date_solved);
        if (p.date_added) activeDates.push(p.date_added);
      }
    }

    const missedDates: string[] = [];
    if (revMissed) {
      for (const m of revMissed) if (m.scheduled_date) missedDates.push(m.scheduled_date);
    }

    const streaks = calculateStreaks(activeDates, missedDates, today);
    const currentStreak = streaks.currentStreak;

    // 4. Construct email payload
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const revisionLink = `${origin}/`;

    const subject = "Let the streak number only go up. Here is your reminder for daily revision";

    const problemListText = dueRevisions
      .map((r) => `  • ${r.problems?.title ?? "Problem"} (${r.problems?.topic ?? "DSA"} · ${r.interval_label})`)
      .join("\n");

    const emailTextBody = `Hi ${displayName},

Let the streak number only go up 🔥 (Current streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"}).

Here is your reminder for daily revision.

You have ${dueRevisions.length} problem${dueRevisions.length === 1 ? "" : "s"} due for revision today (${today}):
${problemListText}

Click the link below to view today's revision queue and complete them:
${revisionLink}

Keep up the great work!
- LeetRevision Team`;

    console.log("================== REMINDER EMAIL DISPATCH ==================");
    console.log(`To: ${userEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${emailTextBody}`);
    console.log("=============================================================");

    let emailSent = false;
    let emailError: string | null = null;

    if (process.env.RESEND_API_KEY) {
      try {
        const recipient = process.env.FEEDBACK_RECIPIENT_EMAIL || userEmail;
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "LeetRevision Reminder <onboarding@resend.dev>",
            to: recipient,
            subject: subject,
            text: emailTextBody,
          }),
        });

        if (emailRes.ok) {
          emailSent = true;
        } else {
          const errJson = await emailRes.json().catch(() => ({}));
          emailError = errJson.message || `Resend HTTP ${emailRes.status}`;
          console.warn("[reminders] Resend error:", emailError);
        }
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
        console.warn("[reminders] Dispatch error:", err);
      }
    } else {
      console.log("[reminders] RESEND_API_KEY not configured. Email logged to console.");
      emailSent = true; // Logged mode
    }

    return NextResponse.json({
      ok: true,
      sent: emailSent,
      dueCount: dueRevisions.length,
      currentStreak,
      emailError,
      message: emailSent
        ? `Reminder email sent successfully! (${dueRevisions.length} due problem${dueRevisions.length === 1 ? "" : "s"})`
        : `Could not send email: ${emailError}`,
    });
  } catch (err) {
    console.error("[reminders] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send reminder" },
      { status: 500 }
    );
  }
}
