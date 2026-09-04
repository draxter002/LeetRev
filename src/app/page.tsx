"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RevisionRow } from "@/components/RevisionRow";
import { fetchDueRevisions, fetchProfile, fetchUserStreaks } from "@/lib/api";
import { todayInTimezone } from "@/lib/scheduling";

export default function HomePage() {
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

  const due = dueQuery.data ?? [];
  const totalCount = due.length;
  const completedCount = due.filter((e) => e.status === "done").length;
  const missedCount = due.filter(
    (e) => e.status === "missed" || (e.status !== "done" && e.scheduled_date < today)
  ).length;
  const remainingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentStreak = streakQuery.data?.currentStreak ?? 0;

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

        {/* Current Streak Flame Badge */}
        <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-orange-100/60 px-4 py-2.5 shadow-xs">
          <span className="text-2xl drop-shadow-xs">🔥</span>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-2xl font-bold text-amber-950 tabular-nums">
                {currentStreak}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                day{currentStreak === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-[11px] font-medium text-amber-900/70">Current Streak</p>
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
