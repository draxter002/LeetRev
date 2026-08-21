"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ToastContainer, useToast } from "@/components/Toast";
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/api";

const CATEGORIES = [
  { id: "general", label: "General Feedback", icon: "💬" },
  { id: "bug", label: "Bug Report", icon: "🐛" },
  { id: "feature", label: "Feature Request", icon: "✨" },
  { id: "question", label: "Question / Help", icon: "❓" },
] as const;

export default function FeedbackPage() {
  const { toasts, toast, dismiss } = useToast();
  const [category, setCategory] = useState<string>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast("Please enter both a subject and message.", "error");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to send feedback");

      toast("Thank you! Your feedback has been sent successfully.", "success");
      setSubmitted(true);
      setSubject("");
      setMessage("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to send feedback", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="font-display text-3xl text-ink">Share Feedback</h1>
          <p className="mt-1 text-sm text-ink/60">
            Have a suggestion, found a bug, or want a new feature? Send a message directly to the developer.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center shadow-xs">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              🎉
            </span>
            <h2 className="mt-3 font-display text-xl text-emerald-900">Message Received!</h2>
            <p className="mt-1.5 text-sm text-emerald-800/80">
              Thank you for helping improve the app. Your feedback has been saved and forwarded.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6"
          >
            {/* Category Selector */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink/50">
                Feedback Category
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      category === c.id
                        ? "border-teal bg-teal/10 font-semibold text-teal shadow-xs"
                        : "border-ink/10 bg-white text-ink/70 hover:border-ink/20 hover:bg-ink/[0.02]"
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Add dark mode or interval reminder bug"
                className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>

            {/* Message Box */}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">
                Message <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your feedback, thoughts, or the issue you encountered in detail..."
                className="w-full rounded-lg border border-ink/15 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>

            {/* Submit Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-ink/45">
                Sent from: <span className="font-mono text-ink/70">{profileQuery.data?.display_name || "Signed-in user"}</span>
              </p>

              <button
                type="submit"
                disabled={sending || !subject.trim() || !message.trim()}
                className="flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-dark disabled:opacity-50"
              >
                {sending && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {sending ? "Sending..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </AppShell>
  );
}
