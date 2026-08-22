"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [defaultInterval, setDefaultInterval] = useState<number>(5);
  const [defaultPriority, setDefaultPriority] = useState<"low" | "medium" | "high">("medium");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Guard: check Supabase env vars are configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || supabaseUrl.includes("placeholder") || !supabaseKey || supabaseKey.includes("placeholder")) {
      setError("App is not configured: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Please set these in your Vercel environment variables and redeploy.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName || email.split("@")[0],
              default_revision_interval: String(defaultInterval ?? 5),
              default_priority: defaultPriority,
            },
          },
        });
        if (signUpError) throw signUpError;

        // Immediately sign in and save the chosen default interval to profile
        const { error: signInAfterSignupError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInAfterSignupError) {
          // Profile is created on first /api/profile GET, which picks up metadata.
          // But also explicitly PATCH now so the interval is definitely saved.
          try {
            await fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                default_revision_intervals: [defaultInterval ?? 5],
                default_priority: defaultPriority
              }),
            });
          } catch (_) {
            // Non-fatal: profile GET will backfill from metadata if PATCH fails
          }
          router.push("/");
          router.refresh();
          return;
        }

        setMessage("Account created! Please sign in.");
        setMode("signin");

      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("networkerror")) {
        setError("Could not connect to Supabase. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in your Vercel Environment Variables, then redeploy.");
      } else {
        setError(msg || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl tracking-tight text-ink">
            Leet<span className="text-teal">Revision</span>
          </h1>
          <p className="mt-2 text-sm text-ink/55">
            Your personal spaced-repetition notebook for LeetCode.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="mb-5 flex rounded-lg bg-ink/5 p-1">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === "signin" ? "bg-white text-ink shadow-sm" : "text-ink/50"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                mode === "signup" ? "bg-white text-ink shadow-sm" : "text-ink/50"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">Display name</label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                    placeholder="You"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">
                    Default revision interval (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={defaultInterval}
                    onChange={(e) => setDefaultInterval(Number(e.target.value) || 5)}
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  />
                  <p className="mt-1 text-xs text-ink/45">
                    How often you want to revise problems by default.
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">
                    Default Priority
                  </label>
                  <select
                    value={defaultPriority}
                    onChange={(e) => setDefaultPriority(e.target.value as "low" | "medium" | "high")}
                    className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <p className="mt-1 text-xs text-ink/45">
                    Default priority for imported and newly created problems.
                  </p>
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}
            {message && <p className="text-sm text-teal">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal py-2.5 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
