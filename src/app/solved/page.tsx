"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ProblemList } from "@/components/ProblemList";
import { StatsHeader } from "@/components/StatsHeader";
import { ToastContainer, useToast } from "@/components/Toast";
import { BulkImportModal } from "@/components/BulkImportModal";
import {
  attachNextRevisions,
  fetchPendingRevisionsForProblems,
  fetchCompletedRevisionsForProblems,
  fetchProblems,
  fetchProfile,
} from "@/lib/api";

export default function SolvedPage() {
  const queryClient = useQueryClient();
  const { toasts, toast, dismiss } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
  const timezone = profileQuery.data?.timezone ?? "UTC";
  const hasLeetCode = !!(profileQuery.data?.leetcode_username || profileQuery.data?.leetcode_session);

  const problemsQuery = useQuery({
    queryKey: ["problems"],
    queryFn: fetchProblems,
  });

  const problemIds = (problemsQuery.data ?? []).map((p) => p.id);
  // Use a stable string key to avoid infinite re-fetches from array reference changes
  const problemIdsKey = problemIds.slice().sort().join(",");

  const pendingQuery = useQuery({
    queryKey: ["pending-revisions", problemIdsKey],
    queryFn: () => fetchPendingRevisionsForProblems(problemIds),
    enabled: problemIds.length > 0,
  });

  const completedQuery = useQuery({
    queryKey: ["completed-revisions", problemIdsKey],
    queryFn: () => fetchCompletedRevisionsForProblems(problemIds),
    enabled: problemIds.length > 0,
  });

  const problems = problemsQuery.data ?? [];
  const pending = pendingQuery.data ?? [];
  const completed = completedQuery.data ?? [];
  const withNext = attachNextRevisions(problems, pending, timezone);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/leetcode/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profileQuery.data?.leetcode_username || undefined,
          sessionCookie: profileQuery.data?.leetcode_session || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Refresh failed");
      const added = j.added ?? 0;
      const total = j.totalFound ?? added;

      if (total > 0) {
        toast(
          `Success! Synced ${total} solved problems from your LeetCode account (${added} new added).`,
          "success"
        );
      } else {
        toast(
          added > 0 ? `Synced — ${added} new problem${added === 1 ? "" : "s"} added` : "Already up to date",
          "success"
        );
      }

      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-streaks"] });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Refresh failed", "error");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <StatsHeader problems={problems} completed={completed} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-ink/5 sm:inline-flex"
          >
            📋 Bulk Paste
          </button>
          {hasLeetCode && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-2 text-sm font-semibold text-ink hover:bg-ink/5 disabled:opacity-50 sm:inline-flex"
            >
              {refreshing && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink/20 border-t-teal" />
              )}
              {refreshing ? "Syncing…" : "Refresh LeetCode"}
            </button>
          )}
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
        <ProblemList problems={withNext} pending={pending} completed={completed} timezone={timezone} />
      )}

      <Link
        href="/solved/new"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-teal text-2xl font-light text-white shadow-lg shadow-teal/30 transition hover:bg-teal-dark sm:hidden"
        aria-label="Add problem"
      >
        +
      </Link>

      <BulkImportModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={(count) => {
          toast(
            count > 0 ? `Imported ${count} new problem${count === 1 ? "" : "s"} with revision schedule!` : "All problems are already in your notebook.",
            "success"
          );
          queryClient.invalidateQueries({ queryKey: ["problems"] });
          queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
          queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
        }}
        onError={(err) => toast(err, "error")}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </AppShell>
  );
}
