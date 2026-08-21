import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

    const body = await request.json().catch(() => ({}));
    const { subject, message, category = "general" } = body;

    if (!subject?.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const admin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const userEmail = user?.email || "anonymous@user.com";
    const userId = user?.id || null;

    // 1. Store feedback record in database
    const { data: feedbackRow, error: dbError } = await admin
      .from("feedback")
      .insert({
        user_id: userId,
        user_email: userEmail,
        subject: subject.trim(),
        message: message.trim(),
        category: category.trim(),
      })
      .select()
      .maybeSingle();

    if (dbError) {
      console.warn("[feedback] DB insert warning (migration 007 may not have been run yet):", dbError.message);
    }

    // 2. Log feedback payload clearly for email dispatch/admin review
    console.log("================== NEW USER FEEDBACK ==================");
    console.log(`From: ${userEmail} (User ID: ${userId ?? "none"})`);
    console.log(`Category: ${category}`);
    console.log(`Subject: ${subject}`);
    console.log(`Message:\n${message}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log("=======================================================");

    // 3. Optional: If Resend API Key is set in env, send email directly
    if (process.env.RESEND_API_KEY) {
      try {
        const recipient = process.env.FEEDBACK_RECIPIENT_EMAIL || userEmail;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "LeetRevision Feedback <onboarding@resend.dev>",
            to: recipient,
            subject: `[Feedback - ${category}] ${subject}`,
            text: `From: ${userEmail}\n\nSubject: ${subject}\nCategory: ${category}\n\nMessage:\n${message}`,
          }),
        });
      } catch (emailErr) {
        console.warn("[feedback] Resend email dispatch warning:", emailErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Thank you! Your feedback has been received and saved.",
      feedbackId: feedbackRow?.id ?? null,
    });
  } catch (err) {
    console.error("[feedback] Fatal error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
