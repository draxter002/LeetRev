"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [defaultInterval, setDefaultInterval] = useState<number>(5);
  const [defaultPriority, setDefaultPriority] = useState<"low" | "medium" | "high">("medium");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (oAuthError) throw oAuthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google");
      setGoogleLoading(false);
    }
  }

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

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-ink/15 bg-white py-2.5 px-4 text-sm font-semibold text-ink shadow-xs transition hover:bg-ink/[0.02] hover:border-ink/25 disabled:opacity-50"
          >
            {googleLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/20 border-t-teal" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{mode === "signin" ? "Sign in with Google" : "Sign up with Google"}</span>
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-ink/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-ink/45">or continue with email</span>
            </div>
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
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 pr-14 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink/60 hover:text-ink"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-ink/15 text-teal focus:ring-2 focus:ring-teal/20"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-ink">
                Remember me
              </label>
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
