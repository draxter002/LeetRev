"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ProblemList } from "@/components/ProblemList";
import { StatsHeader } from "@/components/StatsHeader";
import {
  attachNextRevisions,
  fetchPendingRevisionsForProblems,
  fetchProblems,
  fetchProfile,
} from "@/lib/api";

export default function SolvedPage() {
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
  const timezone = profileQuery.data?.timezone ?? "UTC";

  const problemsQuery = useQuery({
    queryKey: ["problems"],
    queryFn: fetchProblems,
  });

  const problemIds = (problemsQuery.data ?? []).map((p) => p.id);

  const pendingQuery = useQuery({
    queryKey: ["pending-revisions", problemIds],
    queryFn: () => fetchPendingRevisionsForProblems(problemIds),
    enabled: problemIds.length > 0,
  });

  const problems = problemsQuery.data ?? [];
  const pending = pendingQuery.data ?? [];
  const withNext = attachNextRevisions(problems, pending, timezone);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <StatsHeader problems={problems} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch(`/api/leetcode/import`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                const j = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(j.error || "Refresh failed");
                const added = j.added ?? 0;
                alert(added > 0 ? `Synced — ${added} new problems added` : "Already up to date");
                // TODO: maybe use queryClient to invalidate; quick way: reload page
                location.reload();
              } catch (e) {
                alert(e instanceof Error ? e.message : "Refresh failed");
              }
            }}
            className="hidden shrink-0 rounded-lg border border-ink/15 px-3 py-2 text-sm font-semibold text-ink hover:bg-ink/5 sm:inline-flex"
          >
            Refresh
          </button>
          <Link
            href="/solved/new"
            className="hidden shrink-0 items-center gap-1 rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-dark sm:inline-flex"
          >
            <span className="text-lg leading-none">+</span> Add
          </Link>
        </div>
      </div>

      {(problemsQuery.isLoading || profileQuery.isLoading) && (
        <div className="h-40 animate-pulse rounded-xl bg-ink/5" />
      )}

      {problemsQuery.isError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Could not load problems.
        </p>
      )}

      {!problemsQuery.isLoading && (
        <ProblemList problems={withNext} pending={pending} timezone={timezone} />
      )}

      <Link
        href="/solved/new"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-2xl font-light text-white shadow-lg shadow-teal/30 transition hover:bg-teal-dark sm:hidden"
        aria-label="Add problem"
      >
        +
      </Link>
    </AppShell>
  );
}
