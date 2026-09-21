import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { todayInTimezone, calculateStreaks } from "@/lib/scheduling";

// Create reusable Nodemailer transporter if Gmail credentials are provided
function createTransporter() {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "").replace(/\s+/g, "");

  if (user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user,
        pass: pass,
      },
    });
  }
  return null;
}

async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; method: string; error?: string }> {
  // 1. Try Gmail SMTP via Nodemailer (Free, no domain needed, sends to any recipient)
  const transporter = createTransporter();
  if (transporter) {
    try {
      const fromUser = process.env.GMAIL_USER || process.env.SMTP_USER;
      await transporter.sendMail({
        from: `LeetRevision Reminder <${fromUser}>`,
        to: to,
        subject: subject,
        text: text,
      });
      return { ok: true, method: "Gmail SMTP" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[reminders] Gmail SMTP dispatch error:", msg);
      // If Gmail fails, fall through to Resend if configured
    }
  }

  // 2. Try Resend API if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "LeetRevision Reminder <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: to,
          subject: subject,
          text: text,
        }),
      });

      if (res.ok) {
        return { ok: true, method: "Resend API" };
      } else {
        const errJson = await res.json().catch(() => ({}));
        const emailError = errJson.message || `Resend HTTP ${res.status}`;
        console.warn("[reminders] Resend API error:", emailError);
        return { ok: false, method: "Resend API", error: emailError };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, method: "Resend API", error: msg };
    }
  }

  // 3. Simulated mode (No email provider configured)
  console.log(`[reminders] Simulated email dispatch to ${to}`);
  return { ok: true, method: "Simulated" };
}

async function processUserReminder(
  admin: any,
  user: { id: string; email?: string | null },
  profile: any,
  requestOrigin: string,
  isTest: boolean = false
) {
  const remindersEnabled = profile?.email_reminders_enabled !== false;
  if (!remindersEnabled && !isTest) {
    return { status: "skipped", reason: "Email reminders are disabled in profile settings." };
  }

  const timezone = profile?.timezone || "UTC";
  const today = todayInTimezone(timezone);
  const userEmail = user.email || profile?.leetcode_username;

  if (!userEmail) {
    return { status: "skipped", reason: "No email address found for this user." };
  }

  const displayName = profile?.display_name || user.email?.split("@")[0] || "Friend";

  // Fetch due revisions for today
  const { data: dueData } = await admin
    .from("revision_entries")
    .select("id, scheduled_date, interval_label, problems(id, title, topic, priority, revision_disabled)")
    .eq("user_id", user.id)
    .in("status", ["pending", "missed"])
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: true });

  const rawRows = (dueData ?? []) as any[];
  const dueRevisions = rawRows.filter((r) => r.problems?.revision_disabled !== true);

  // Calculate current streak
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
    .select("date_solved")
    .eq("user_id", user.id);

  const activeDates: string[] = [];
  if (revDone) {
    for (const r of revDone) if (r.completed_date) activeDates.push(r.completed_date);
  }
  if (probData) {
    for (const p of probData) {
      if (p.date_solved) activeDates.push(p.date_solved);
    }
  }

  const missedDates: string[] = [];
  if (revMissed) {
    for (const m of revMissed) if (m.scheduled_date) missedDates.push(m.scheduled_date);
  }

  const streaks = calculateStreaks(activeDates, missedDates, today);
  const currentStreak = streaks.currentStreak;

  const revisionLink = `${requestOrigin}/`;
  const hasDue = dueRevisions.length > 0;

  const subject = hasDue
    ? "Let the streak number only go up. Here is your reminder for daily revision 🔥"
    : "Relax, it's a rest day! ☕ — LeetRevision";

  const problemListText = dueRevisions
    .map((r) => `  • ${r.problems?.title ?? "Problem"} (${r.problems?.topic ?? "DSA"} · ${r.interval_label})`)
    .join("\n");

  const emailTextBody = hasDue
    ? `Hi ${displayName},

Let the streak number only go up 🔥 (Current streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"}).

Here is your reminder for daily revision.

You have ${dueRevisions.length} problem${dueRevisions.length === 1 ? "" : "s"} due for revision today (${today}):
${problemListText}

Click the link below to view today's revision queue and complete them:
${revisionLink}

Keep up the great work!
- LeetRevision Team`
    : `Hi ${displayName},

Relax, it's a rest day! ☕

You have 0 revisions due today in your queue (${today}). Your spaced repetition schedule gives you a well-deserved break today to recharge.

Current streak: ${currentStreak} day${currentStreak === 1 ? "" : "s"} 🔥 (rest days preserve your streak!).

View your dashboard anytime:
${revisionLink}

Enjoy your day!
- LeetRevision Team`;

  console.log("================== REMINDER EMAIL DISPATCH ==================");
  console.log(`To: ${userEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${emailTextBody}`);
  console.log("=============================================================");

  const dispatchResult = await sendEmail({
    to: userEmail,
    subject: subject,
    text: emailTextBody,
  });

  return {
    status: dispatchResult.ok ? "sent" : "failed",
    userEmail,
    method: dispatchResult.method,
    dueCount: dueRevisions.length,
    currentStreak,
    error: dispatchResult.error,
  };
}

async function handleReminders(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Try user authentication via session cookie (for manual "Send Test Email" calls)
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const {
      data: { user: currentUser },
    } = await serverSupabase.auth.getUser();

    // Check if auth secret or CRON secret was supplied for cron calls
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (currentUser && !isCronAuthorized) {
      // Single user trigger (e.g. from Profile page test button)
      const { data: profile } = await admin
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      const result = await processUserReminder(admin, currentUser, profile, origin, true);

      if (result.status === "skipped") {
        return NextResponse.json({
          ok: true,
          sent: false,
          reason: result.reason,
          message: result.reason,
        });
      }

      if (result.status === "failed") {
        return NextResponse.json(
          {
            ok: false,
            sent: false,
            error: result.error,
            message: `Could not send email via ${result.method}: ${result.error}`,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        sent: true,
        method: result.method,
        dueCount: result.dueCount,
        currentStreak: result.currentStreak,
        message: `Reminder email sent successfully via ${result.method} to ${result.userEmail}! (${result.dueCount} due problem${result.dueCount === 1 ? "" : "s"})`,
      });
    }

    // Cron / Batch mode: Send reminders to ALL eligible users
    console.log("[reminders] Executing cron batch dispatch for all users...");

    // Fetch users from Supabase Auth & Profiles
    const { data: profiles, error: profErr } = await admin.from("profiles").select("*");
    if (profErr) throw profErr;

    let authUsersMap = new Map<string, { id: string; email?: string }>();
    try {
      const { data: authData } = await admin.auth.admin.listUsers();
      if (authData?.users) {
        for (const u of authData.users) {
          authUsersMap.set(u.id, { id: u.id, email: u.email });
        }
      }
    } catch (e) {
      console.warn("[reminders] Could not list auth users:", e);
    }

    const results: any[] = [];
    for (const profile of profiles ?? []) {
      const authUser = authUsersMap.get(profile.id) || { id: profile.id, email: null };
      const res = await processUserReminder(admin, authUser, profile, origin);
      results.push({ profileId: profile.id, ...res });
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const skippedCount = results.filter((r) => r.status === "skipped").length;

    return NextResponse.json({
      ok: true,
      mode: "cron",
      totalProcessed: results.length,
      sentCount,
      skippedCount,
      results,
    });
  } catch (err) {
    console.error("[reminders] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send reminders" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleReminders(request);
}

export async function POST(request: NextRequest) {
  return handleReminders(request);
}
