"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { fetchProfile, updateProfile, fetchProblems } from "@/lib/api";
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

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const profile = profileQuery.data;

  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [leetcodeUsername, setLeetcodeUsername] = useState("");
  const [stats, setStats] = useState<LeetCodeStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [fetchingStats, setFetchingStats] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [defaultInterval, setDefaultInterval] = useState<number>(5);
  const [imported, setImported] = useState<boolean>(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(String(profile.display_name ?? ""));
      setTimezone(profile.timezone || "UTC");
      setLeetcodeUsername(String(profile.leetcode_username ?? ""));
      setDefaultInterval((profile.default_revision_intervals && profile.default_revision_intervals[0]) ?? 5);

      // detect whether LeetCode data appears already imported (best-effort)
      (async () => {
        try {
          const problems = await fetchProblems();
          const hasLeet = problems.some((p) => !!(p.problem_link && p.problem_link.includes("leetcode.com")) || p.topic === "imported");
          setImported(hasLeet);
        } catch (e) {
          // ignore errors; leave imported as false
        }
      })();
    }
  }, [profile]);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        display_name: displayName.trim() || null,
        timezone,
        leetcode_username: leetcodeUsername.trim() || null,
        default_revision_intervals: [defaultInterval],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
      setSavedMsg("Settings saved.");
      setTimeout(() => setSavedMsg(null), 2500);
    },
  });

  async function fetchLeetCode() {
    const username = leetcodeUsername.trim();
    if (!username) return;
    setFetchingStats(true);
    setStatsError(null);
    setStats(null);
    try {
      const res = await fetch(`/api/leetcode?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      const typed = data as LeetCodeStats;
      setStats(typed);

      // persist username and default interval in profile
      await updateProfile({ leetcode_username: username, default_revision_intervals: [defaultInterval] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });

      // Trigger server-side import once (idempotent)
      try {
        const importRes = await fetch(`/api/leetcode/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const importJson = await importRes.json().catch(() => ({}));
        if (!importRes.ok) throw new Error(importJson.error || "Import failed");
        if (importJson.imported) {
          setImported(true);
          queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
          queryClient.invalidateQueries({ queryKey: ["problems"] });
        }
      } catch (e) {
        // import failures are non-fatal for stats display
        console.warn("Server import failed", e);
      }
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Could not fetch LeetCode stats");
    } finally {
      setFetchingStats(false);
    }
  }

  async function refreshLeetCode() {
    try {
      const res = await fetch(`/api/leetcode/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: leetcodeUsername.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Refresh failed");
      const added = j.added ?? 0;
      setSavedMsg(added > 0 ? `Synced — ${added} new problems added` : "Already up to date");
      setTimeout(() => setSavedMsg(null), 3000);
      if (added > 0) {
        queryClient.invalidateQueries({ queryKey: ["problems"] });
        queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
      }
    } catch (e) {
      setStatsError(e instanceof Error ? e.message : "Refresh failed");
    }
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink/55">Account, timezone, and LeetCode stats.</p>
      </div>

      {profileQuery.isLoading && (
        <div className="h-48 animate-pulse rounded-2xl bg-ink/5" />
      )}

      {profile && (
        <div className="space-y-5">
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
                  “Today” for revisions is computed in this timezone.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Default revision interval (days)</label>
                <input
                  type="number"
                  min={1}
                  value={defaultInterval}
                  onChange={(e) => setDefaultInterval(Number(e.target.value || 5))}
                  className="w-full rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                />
                <p className="mt-1 text-xs text-ink/45">Applied to imported or newly created problems by default.</p>
              </div>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving…" : "Save settings"}
              </button>
              {savedMsg && <p className="text-sm text-teal">{savedMsg}</p>}
              {saveMutation.isError && (
                <p className="text-sm text-rose-600">Could not save settings.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink/45">
              LeetCode
            </h2>
            <p className="mb-4 text-sm text-ink/55">
              Pull public solved stats by username (no OAuth — best-effort GraphQL).
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={leetcodeUsername}
                onChange={(e) => setLeetcodeUsername(e.target.value)}
                placeholder="leetcode username"
                className="flex-1 rounded-lg border border-ink/15 px-3 py-2 outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={fetchLeetCode}
                  disabled={fetchingStats || !leetcodeUsername.trim()}
                  className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                >
                  {fetchingStats ? "Fetching…" : "Fetch stats"}
                </button>
                <button
                  type="button"
                  onClick={refreshLeetCode}
                  className="rounded-lg border border-ink/15 px-3 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>
            {statsError && <p className="mt-3 text-sm text-rose-600">{statsError}</p>}
            {savedMsg && <p className="mt-3 text-sm text-teal">{savedMsg}</p>}
            {stats && (
              <div className="mt-4 rounded-xl bg-ink/[0.03] p-4">
                <p className="font-display text-lg text-ink">@{stats.username}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-teal">
                  {stats.totalSolved}
                  <span className="ml-2 text-sm font-medium text-ink/45">solved</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-ink/65">
                  <span>Easy {stats.easySolved}</span>
                  <span>Medium {stats.mediumSolved}</span>
                  <span>Hard {stats.hardSolved}</span>
                </div>
                {stats.recent && stats.recent.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                      Recent (public)
                    </p>
                    <ul className="space-y-1 text-sm text-ink/70">
                      {stats.recent.map((t) => (
                        <li key={t.title}>· {t.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
 
          <div className="flex gap-3">
            <button
              type="button"
              onClick={async () => {
                // sign out of LeetCode (clear username), offer option to delete imported problems
                if (!confirm("Sign out of LeetCode? This will clear the connected username.\nClick OK to continue.")) return;
                const deleteAlso = confirm("Also remove all imported LeetCode problems? Click OK to delete, Cancel to keep them.");
                try {
                  const res = await fetch(`/api/leetcode/signout`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deleteImported: deleteAlso }),
                  });
                  const j = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(j.error || "Sign out failed");
                  // refresh profile
                  queryClient.invalidateQueries({ queryKey: ["profile"] });
                  queryClient.invalidateQueries({ queryKey: ["problems"] });
                  setSavedMsg("LeetCode disconnected");
                  setTimeout(() => setSavedMsg(null), 2500);
                } catch (e) {
                  setSavedMsg(e instanceof Error ? e.message : "Sign out failed");
                }
              }}
              className="w-full rounded-lg border border-ink/15 bg-white py-2.5 text-sm font-medium text-ink/70 hover:bg-ink/5 sm:w-auto sm:px-6"
            >
              Sign out of LeetCode
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-lg border border-ink/15 bg-white py-2.5 text-sm font-medium text-ink/70 hover:bg-ink/5 sm:w-auto sm:px-6"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
