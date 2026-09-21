"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RevisionRow } from "@/components/RevisionRow";
import { fetchDueRevisions, fetchProfile, fetchUserStreaks, syncSubmissions } from "@/lib/api";
import { todayInTimezone } from "@/lib/scheduling";
import { useToast } from "@/components/Toast";

export default function HomePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  const timezone = profileQuery.data?.timezone ?? "UTC";
  const today = todayInTimezone(timezone);

  const dueQuery = useQuery({
    queryKey: ["due-revisions", timezone],
    queryFn: () => fetchDueRevisions(timezone),
    enabled: !!profileQuery.data,
  });

  const streakQuery = useQuery({
    queryKey: ["user-streaks", timezone],
    queryFn: () => fetchUserStreaks(timezone),
    enabled: !!profileQuery.data,
  });

  // ── Auto-sync on first website open (once per browser session) ──
  const autoSyncFiredRef = useRef(false);
  useEffect(() => {
    // Only run after profile is loaded and only once per session
    if (!profileQuery.data) return;
    if (autoSyncFiredRef.current) return;
    if (sessionStorage.getItem("leetrev_synced_this_session") === "1") {
      autoSyncFiredRef.current = true;
      return;
    }

    autoSyncFiredRef.current = true;
    sessionStorage.setItem("leetrev_synced_this_session", "1");

    // Fire silently in background — no loading spinner, no error toast on failure
    syncSubmissions()
      .then((res) => {
        if (res.addedCount > 0) {
          toast(
            `✨ Found ${res.addedCount} new problem${
              res.addedCount === 1 ? "" : "s"
            } across ${
              res.platformsChecked?.join(", ") || "platforms"
            }! Added to your queue.`,
            "success"
          );
          queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
          queryClient.invalidateQueries({ queryKey: ["problems"] });
          queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
          queryClient.invalidateQueries({ queryKey: ["user-streaks"] });
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      })
      .catch(() => {
        // Silently ignore auto-sync errors so startup UX is unaffected
      });
  }, [profileQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const due = dueQuery.data ?? [];
  const totalCount = due.length;
  const completedCount = due.filter((e) => e.status === "done").length;
  const missedCount = due.filter(
    (e) => e.status === "missed" || (e.status !== "done" && e.scheduled_date < today)
  ).length;
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentStreak = streakQuery.data?.currentStreak ?? 0;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncSubmissions();
      const added = res.addedCount ?? 0;
      const patched = res.patchedCount ?? 0;

      if (added > 0 || patched > 0) {
        const parts: string[] = [];
        if (added > 0) parts.push(`${added} new problem${added === 1 ? "" : "s"}`);
        if (patched > 0) parts.push(`${patched} cross-platform link${patched === 1 ? "" : "s"} merged`);
        toast(
          `✨ ${parts.join(" · ")} across ${res.platformsChecked?.join(", ") || "platforms"}!`,
          "success"
        );
      } else {
        toast(res.message || "All platforms are up to date.", "info");
      }
      queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["user-streaks"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) {
      toast(e?.message || "Failed to sync submissions", "error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">Today</p>
          <h1 className="mt-1 font-display text-3xl text-ink">Revision queue</h1>
          <p className="mt-1 text-sm text-ink/60">
            {today}
            {totalCount > 0 && (
              <>
                {" "}
                · <span className="font-medium text-ink">{completedCount} of {totalCount} completed</span> ({progressPercent}%)
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-2xl border border-ink/15 bg-white/90 px-3.5 py-2 text-xs font-semibold text-ink shadow-xs hover:bg-ink/5 disabled:opacity-50 transition"
            title="Look for new submissions across all platforms"
          >
            <span className={syncing ? "animate-spin inline-block" : ""}>🔄</span>
            <span>{syncing ? "Syncing…" : "Sync Platforms"}</span>
          </button>

          {/* Current Streak Flame Badge */}
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-orange-100/60 px-4 py-2.5 shadow-xs">
          <span className="text-2xl drop-shadow-xs">🔥</span>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl font-bold text-amber-950 tabular-nums">
                {currentStreak}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                day{currentStreak === 1 ? "" : "s"}
              </span>
              <Link
                href="/streak-info"
                className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-200/80 text-amber-950 transition-colors hover:bg-amber-300 hover:scale-105 active:scale-95"
                title="Streak rules & info"
                aria-label="Streak rules and information"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </Link>
            </div>
            <p className="text-[11px] font-medium text-amber-900/70">Current Streak</p>
          </div>
        </div>
      </div>
    </div>

      {totalCount > 0 && (
        <div className="mb-6 space-y-2 rounded-xl border border-ink/10 bg-white/70 p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-teal">✓ {completedCount} Done</span>
              <span className="text-ink/60">{remainingCount} Remaining</span>
              {missedCount > 0 && (
                <span className="font-semibold text-missed">{missedCount} Missed</span>
              )}
            </div>
            <span className="font-semibold text-ink/70">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full bg-teal transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {totalCount > 0 && completedCount === totalCount && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-teal-900">
          <span className="text-lg">🎉</span>
          <div>
            <p className="font-semibold">All done for today!</p>
            <p className="text-xs text-teal-800/80">You completed all scheduled revisions in today's queue.</p>
          </div>
        </div>
      )}

      {(profileQuery.isLoading || dueQuery.isLoading) && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-ink/5" />
          ))}
        </div>
      )}

      {dueQuery.isError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Could not load revisions. Check your Supabase setup.
        </p>
      )}

      {!dueQuery.isLoading && !dueQuery.isError && due.length === 0 && (
        <div className="rounded-xl border border-dashed border-ink/15 bg-white/70 px-6 py-14 text-center">
          <p className="font-display text-xl text-ink">All clear</p>
          <p className="mt-1 text-sm text-ink/50">
            Nothing due today. Enjoy the break — or add a new problem from Solved.
          </p>
        </div>
      )}

      {due.length > 0 && (
        <ul className="space-y-2.5">
          {due.map((entry) => (
            <RevisionRow key={entry.id} entry={entry} timezone={timezone} />
          ))}
        </ul>
      )}
    </AppShell>
  );
}
