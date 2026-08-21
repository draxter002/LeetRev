"use client";

import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RevisionRow } from "@/components/RevisionRow";
import { fetchDueRevisions, fetchProfile } from "@/lib/api";
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

  const due = dueQuery.data ?? [];
  const missedCount = due.filter(
    (e) => e.status === "missed" || e.scheduled_date < today
  ).length;

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal">Today</p>
        <h1 className="mt-1 font-display text-3xl text-ink">Revision queue</h1>
        <p className="mt-1 text-sm text-ink/55">
          {today}
          {due.length > 0 && (
            <>
              {" "}
              · {due.length} due
              {missedCount > 0 && (
                <span className="text-missed"> · {missedCount} missed</span>
              )}
            </>
          )}
        </p>
      </div>

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
