"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { ToastContainer, useToast } from "@/components/Toast";
import { fetchProfile, updateProfile, fetchUserStreaks } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

type LeetCodeRecent = { title: string; titleSlug: string };

type LeetCodeStats = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  recent?: LeetCodeRecent[];
};

function formatSyncedAt(isoString: string | null | undefined): string {
  if (!isoString) return "Never";
  const d = new Date(isoString);
  return (
    d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) +
    " at " +
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toasts, toast, dismiss } = useToast();

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const profile = profileQuery.data;

  const streakQuery = useQuery({
    queryKey: ["user-streaks", profile?.timezone],
    queryFn: () => fetchUserStreaks(profile?.timezone || "UTC"),
    enabled: !!profile,
  });

  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [stats, setStats] = useState<LeetCodeStats | null>(null);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [defaultInterval, setDefaultInterval] = useState<number>(5);
  const [refreshing, setRefreshing] = useState(false);
  const [showSignOutLeet, setShowSignOutLeet] = useState(false);

  // Session cookie import state
  const [sessionCookie, setSessionCookie] = useState("");
  const [syncingCookie, setSyncingCookie] = useState(false);
  const [showCookieSection, setShowCookieSection] = useState(false);

  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Email reminders state (ticked by default)
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(String(profile.display_name ?? ""));
      setTimezone(profile.timezone || "UTC");
      setLeetcodeUsername(String(profile.leetcode_username ?? ""));
      setDefaultInterval(
        (profile.default_revision_intervals && profile.default_revision_intervals[0]) ?? 5
      );
      setEmailRemindersEnabled(profile.email_reminders_enabled ?? true);
    }
  }, [profile]);

  useEffect(() => {
    try {
      createClient()
        .auth.getUser()
        .then(({ data }) => setEmail(data?.user?.email ?? null))
        .catch((err) => console.warn("[getUser] effect error:", err));
    } catch (err) {
      console.warn("[getUser] exception:", err);
    }
  }, []);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        display_name: displayName.trim() || null,
        timezone,
        leetcode_username: leetcodeUsername.trim() || null,
        default_revision_intervals: [defaultInterval],
        email_reminders_enabled: emailRemindersEnabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
      toast("Settings saved.", "success");
    },
    onError: (err) => {
      console.error("[saveProfile]", err);
      toast(err instanceof Error ? err.message : "Could not save settings.", "error");
    },
  });

  async function fetchLeetCode() {
    const username = leetcodeUsername.trim();
    if (!username) return;
    setFetchingStats(true);
    setStats(null);
    try {
      const res = await fetch(`/api/leetcode?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      setStats(data as LeetCodeStats);

      // Persist username in profile
      await updateProfile({ leetcode_username: username });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast("LeetCode account connected!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not fetch LeetCode stats", "error");
    } finally {
      setFetchingStats(false);
    }
  }

  async function refreshLeetCode() {
    return syncWithCookie();
  }

  async function syncWithCookie(customCookie?: string) {
    const cookie = (customCookie || sessionCookie || profile?.leetcode_session || "").trim();
    if (!cookie) {
      toast("Please paste your LEETCODE_SESSION cookie first.", "error");
      return;
    }

    setSyncingCookie(true);
    try {
      const res = await fetch(`/api/leetcode/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: leetcodeUsername.trim() || undefined,
          sessionCookie: cookie,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Cookie sync failed");

      const added = j.added ?? 0;
      const total = j.totalFound ?? added;

      toast(
        `Success! Synced ${total} solved problems from your LeetCode account (${added} new added).`,
        "success"
      );

      setSessionCookie("");
      setShowCookieSection(false);
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to sync with session cookie", "error");
    } finally {
      setSyncingCookie(false);
    }
  }

  async function signOutLeetCode(deleteImported: boolean) {
    try {
      const res = await fetch(`/api/leetcode/signout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteImported }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Sign out failed");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      setLeetcodeUsername("");
      setStats(null);
      setShowSignOutLeet(false);
      toast(
        deleteImported
          ? "LeetCode disconnected and imported problems removed."
          : "LeetCode disconnected. Imported problems kept.",
        "success"
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sign out failed", "error");
    }
  }

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch (e) {
      console.warn("[signOut] error:", e);
    }
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast("Please type DELETE to confirm.", "error");
      return;
    }
    setDeletingAccount(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to delete account");

      await createClient().auth.signOut();
      toast("Your account and all associated data have been permanently deleted.", "success");
      router.push("/login");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to delete account", "error");
      setDeletingAccount(false);
    }
  }

  const isConnected = !!(profile?.leetcode_username);
  const lastSynced = (profile as any)?.leetcode_imported_at as string | null | undefined;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink/55">Account, timezone, and LeetCode connection.</p>
      </div>

      {profileQuery.isLoading && (
        <div className="h-48 animate-pulse rounded-2xl bg-ink/5" />
      )}

      {profileQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Could not load profile settings. Please make sure you are logged in or reload the page.
        </div>
      )}

      {!profileQuery.isLoading && !profileQuery.isError && !profile && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Session not found. Please{" "}
          <button
            onClick={() => router.push("/login")}
            className="font-semibold underline hover:text-amber-900"
          >
            log in again
          </button>{" "}
          to view your profile.
        </div>
      )}

      {profile && (
        <div className="space-y-5">
          {/* Streak Performance Stats */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Longest Streak */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-orange-100/50 p-4 shadow-xs">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100/90 text-2xl shadow-xs">
                🏆
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">
                  Longest Streak
                </p>
                <p className="font-display text-2xl font-bold text-amber-950 tabular-nums">
                  {streakQuery.data?.longestStreak ?? 0}{" "}
                  <span className="text-sm font-medium text-amber-800">
                    day{(streakQuery.data?.longestStreak ?? 0) === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
            </div>

            {/* Current Streak */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/90 to-amber-100/50 p-4 shadow-xs">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100/90 text-2xl shadow-xs">
                🔥
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-800/80">
                  Current Streak
                </p>
                <p className="font-display text-2xl font-bold text-orange-950 tabular-nums">
                  {streakQuery.data?.currentStreak ?? 0}{" "}
                  <span className="text-sm font-medium text-orange-800">
                    day{(streakQuery.data?.currentStreak ?? 0) === 1 ? "" : "s"}
                  </span>
                </p>
              </div>
            </div>
          </section>

          {/* Account settings */}
          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/45">
              Account
            </h2>
            <dl className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink/50">Email</dt>
                <dd className="font-medium text-ink">{email ?? "—"}</dd>
              </div>
            </dl>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Display name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  Timezone (day boundary)
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                >
                  {!COMMON_TIMEZONES.includes(timezone) && (
                    <option value={timezone}>{timezone}</option>
                  )}
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-ink/45">
                  "Today" for revisions is computed in this timezone.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">
                  Default revision interval (days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={defaultInterval}
                  onChange={(e) => setDefaultInterval(Number(e.target.value || 5))}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
                <p className="mt-1 text-xs text-ink/45">
                  Applied to all imported and newly created problems.
                </p>
              </div>

              {/* Email Reminders Checkbox (Ticked by Default) */}
              <div className="rounded-xl border border-ink/10 bg-ink/[0.02] p-3.5 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailRemindersEnabled}
                    onChange={(e) => setEmailRemindersEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-ink/30 text-teal focus:ring-teal"
                  />
                  <div>
                    <span className="text-sm font-semibold text-ink">
                      Send reminder for revision over emails
                    </span>
                    <p className="mt-0.5 text-xs text-ink/55">
                      Receive daily email reminders with a link to today's revision queue. (No email is sent if there are no problems due for revision).
                    </p>
                  </div>
                </label>

                {emailRemindersEnabled && (
                  <div className="pl-7 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        setSendingTestEmail(true);
                        try {
                          const res = await fetch("/api/reminders/send", { method: "POST" });
                          const j = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(j.error || "Failed to send reminder");
                          if (j.sent) {
                            toast(j.message || "Reminder email sent!", "success");
                          } else {
                            toast(j.message || j.reason || "No email sent.", "info");
                          }
                        } catch (err) {
                          toast(err instanceof Error ? err.message : "Failed to send test email", "error");
                        } finally {
                          setSendingTestEmail(false);
                        }
                      }}
                      disabled={sendingTestEmail}
                      className="flex items-center gap-1.5 rounded-md border border-ink/15 bg-white px-2.5 py-1 text-xs font-semibold text-ink/75 hover:bg-ink/5 disabled:opacity-50"
                    >
                      {sendingTestEmail && (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-teal" />
                      )}
                      {sendingTestEmail ? "Sending..." : "✉️ Send Test Reminder Email"}
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving…" : "Save settings"}
              </button>
            </div>
          </section>

          {/* LeetCode connection panel */}
          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink/45">
              LeetCode Connection
            </h2>
            <p className="mb-4 text-sm text-ink/55">
              Connect your LeetCode username or authenticate with your session cookie to import 100% of your solved problems.
            </p>

            {/* Connection status card */}
            {isConnected && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal text-xs font-bold text-white">
                  ✓
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    Connected as{" "}
                    <a
                      href={`https://leetcode.com/${profile.leetcode_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal hover:underline"
                    >
                      @{profile.leetcode_username}
                    </a>
                  </p>
                  <p className="mt-0.5 text-xs text-ink/45">
                    Last synced: {formatSyncedAt(lastSynced)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshLeetCode}
                  disabled={refreshing}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-teal/20 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/5 disabled:opacity-50"
                >
                  {refreshing && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-teal/20 border-t-teal" />
                  )}
                  {refreshing ? "Syncing…" : "Refresh"}
                </button>
              </div>
            )}

            {/* Public Username connect form */}
            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink/45">
                LeetCode Username
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={leetcodeUsername}
                  onChange={(e) => setLeetcodeUsername(e.target.value)}
                  placeholder="e.g. paulagnik9"
                  className="flex-1 rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 text-sm"
                />
                <button
                  type="button"
                  onClick={fetchLeetCode}
                  disabled={fetchingStats || !leetcodeUsername.trim()}
                  className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
                >
                  {fetchingStats ? "Fetching…" : isConnected ? "Re-fetch stats" : "Connect & import"}
                </button>
              </div>
            </div>

            {/* 100% Full History Sync via Saved LEETCODE_SESSION Cookie */}
            <div className="rounded-xl border border-ink/10 bg-ink/[0.02] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-base">🔑</span>
                  <div>
                    <h3 className="text-sm font-semibold text-ink">Sync All Solved Problems (Saved Cookie)</h3>
                    <p className="text-xs text-ink/55">
                      {profile?.leetcode_session ? (
                        <span className="font-medium text-teal">
                          ✓ Saved session cookie is active. 1-click full sync enabled.
                        </span>
                      ) : (
                        "Save your LEETCODE_SESSION cookie once to sync all your solved problems anytime in 1-click."
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {profile?.leetcode_session && (
                    <button
                      type="button"
                      onClick={() => syncWithCookie()}
                      disabled={syncingCookie}
                      className="flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-dark disabled:opacity-50"
                    >
                      {syncingCookie && (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      )}
                      {syncingCookie ? "Syncing all…" : "Sync All (1-Click)"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCookieSection(!showCookieSection)}
                    className="rounded-md border border-ink/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink/70 hover:bg-ink/5"
                  >
                    {showCookieSection ? "Hide" : profile?.leetcode_session ? "Update Cookie" : "Add Cookie"}
                  </button>
                </div>
              </div>

              {showCookieSection && (
                <div className="mt-4 space-y-3 border-t border-ink/10 pt-3">
                  <div className="rounded-lg bg-white p-3 text-xs text-ink/70 space-y-1">
                    <p className="font-semibold text-ink">How to copy your cookie in 15 seconds:</p>
                    <ol className="list-decimal list-inside space-y-0.5 text-ink/65">
                      <li>Open <a href="https://leetcode.com" target="_blank" rel="noopener noreferrer" className="text-teal underline">leetcode.com</a> while logged in.</li>
                      <li>Press <kbd className="rounded bg-ink/10 px-1 py-0.5 font-mono">F12</kbd> (DevTools) → <strong>Application</strong> tab (or Storage) → <strong>Cookies</strong> → <code>https://leetcode.com</code>.</li>
                      <li>Find <strong>LEETCODE_SESSION</strong>, double-click its value and copy it.</li>
                      <li>Paste below and click <strong>Save & Sync All Problems</strong>.</li>
                    </ol>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="password"
                      value={sessionCookie}
                      onChange={(e) => setSessionCookie(e.target.value)}
                      placeholder={profile?.leetcode_session ? "Paste new LEETCODE_SESSION cookie to update" : "Paste LEETCODE_SESSION cookie here"}
                      className="flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-mono outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                    />
                    <button
                      type="button"
                      onClick={() => syncWithCookie()}
                      disabled={syncingCookie || !sessionCookie.trim()}
                      className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-dark disabled:opacity-50"
                    >
                      {syncingCookie && (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      )}
                      {syncingCookie ? "Saving & Syncing…" : "Save & Sync All Problems"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Stats display after fetch */}
            {stats && (
              <div className="mt-4 rounded-xl bg-ink/[0.03] p-4">
                <p className="font-display text-lg text-ink">@{stats.username}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-teal">
                  {stats.totalSolved}
                  <span className="ml-2 text-sm font-medium text-ink/45">solved on LeetCode</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink/65">
                  <span>Easy {stats.easySolved}</span>
                  <span>Medium {stats.mediumSolved}</span>
                  <span>Hard {stats.hardSolved}</span>
                </div>
                {stats.recent && stats.recent.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                      Recent Submissions
                    </p>
                    <ul className="space-y-1 text-sm text-ink/70">
                      {stats.recent.map((t) => (
                        <li key={t.titleSlug}>
                          ·{" "}
                          <a
                            href={`https://leetcode.com/problems/${t.titleSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-teal hover:underline"
                          >
                            {t.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* LeetCode disconnect */}
            {isConnected && (
              <div className="mt-4 border-t border-ink/8 pt-4">
                {!showSignOutLeet ? (
                  <button
                    type="button"
                    onClick={() => setShowSignOutLeet(true)}
                    className="text-sm text-ink/50 hover:text-rose-600 transition-colors"
                  >
                    Disconnect LeetCode account…
                  </button>
                ) : (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="mb-3 text-sm font-medium text-rose-800">
                      Disconnect @{profile.leetcode_username}?
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => signOutLeetCode(false)}
                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100"
                      >
                        Keep imported problems
                      </button>
                      <button
                        type="button"
                        onClick={() => signOutLeetCode(true)}
                        className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        Also delete all imported problems
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSignOutLeet(false)}
                        className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm text-ink/60 hover:bg-ink/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* App sign-out */}
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-lg border border-ink/15 bg-white py-2.5 text-sm font-medium text-ink/70 hover:bg-ink/5 sm:w-auto sm:px-6"
          >
            Sign out of app
          </button>

          {/* Danger Zone: Permanent Account Deletion */}
          <section className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5 shadow-xs sm:p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-rose-700">
              Danger Zone
            </h2>
            <p className="mb-4 text-xs text-rose-800/70">
              Permanently delete your account and remove all solved problems, revision histories, and profile settings from the database. This action cannot be undone.
            </p>

            {!showDeleteModal ? (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="rounded-lg border border-rose-300 bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 shadow-xs"
              >
                Delete Account & Data…
              </button>
            ) : (
              <div className="rounded-xl border border-rose-300 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-rose-700">
                  <span className="text-lg">⚠️</span>
                  <p className="text-sm font-bold">Are you absolutely sure?</p>
                </div>
                <p className="text-xs text-ink/70 leading-relaxed">
                  This will permanently delete your user profile, all tracked problems, solutions, revision entries, and account login.
                </p>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/65">
                    Type <strong className="font-mono text-rose-700">DELETE</strong> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full max-w-xs rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-mono outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-200"
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deletingAccount || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition"
                  >
                    {deletingAccount && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    )}
                    {deletingAccount ? "Deleting permanently…" : "Permanently Delete Everything"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText("");
                    }}
                    disabled={deletingAccount}
                    className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-medium text-ink/70 hover:bg-ink/5"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </AppShell>
  );
}
