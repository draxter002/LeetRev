"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uncompleteRevision, type ProblemWithNextRevision } from "@/lib/api";
import type { RevisionEntry, RevisionEntryWithProblem } from "@/lib/types";
import { PriorityBadge, PriorityDot } from "./PriorityBadge";
import { SolutionDisplay } from "./SolutionDisplay";
import { isOverdue, StreakResult, todayInTimezone } from "@/lib/scheduling";
import { ProblemLinkButton } from "./PlatformIcon";

function RevisionHistoryItem({
  item,
  timezone,
}: {
  item: { id: string; problem_id: string; completed_date: string | null; interval_label: string };
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const today = todayInTimezone(timezone);

  const mutation = useMutation({
    mutationFn: () =>
      uncompleteRevision(
        {
          id: item.id,
          user_id: "",
          problem_id: item.problem_id,
          scheduled_date: item.completed_date || today,
          interval_days: parseInt(item.interval_label) || 1,
          interval_label: item.interval_label,
          status: "done",
          completed_date: item.completed_date,
          created_at: "",
        },
        timezone
      ),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["due-revisions"] });
      await queryClient.cancelQueries({ queryKey: ["user-streaks"] });
      await queryClient.cancelQueries({ queryKey: ["completed-revisions"] });
      await queryClient.cancelQueries({ queryKey: ["pending-revisions"] });

      const previousDue = queryClient.getQueriesData<RevisionEntryWithProblem[]>({ queryKey: ["due-revisions"] });
      const previousStreaks = queryClient.getQueriesData<StreakResult>({ queryKey: ["user-streaks"] });
      const previousCompleted = queryClient.getQueriesData<{ id: string; problem_id: string; completed_date: string | null; interval_label: string }[]>({ queryKey: ["completed-revisions"] });

      // Optimistically remove from completed-revisions
      queryClient.setQueriesData<
        { id: string; problem_id: string; completed_date: string | null; interval_label: string }[]
      >({ queryKey: ["completed-revisions"] }, (old = []) => old.filter((c) => c.id !== item.id));

      // Optimistically update due-revisions
      queryClient.setQueriesData<RevisionEntryWithProblem[]>(
        { queryKey: ["due-revisions"] },
        (old = []) =>
          old.map((r) =>
            r.id === item.id ? { ...r, status: "pending", completed_date: null } : r
          )
      );

      // Optimistically update streak if completed_date was today
      if (item.completed_date === today) {
        queryClient.setQueriesData<StreakResult>(
          { queryKey: ["user-streaks"] },
          (old) => {
            if (!old) return { currentStreak: 0, longestStreak: 0 };
            const dueList = queryClient.getQueryData<RevisionEntryWithProblem[]>(["due-revisions", timezone]) ?? [];
            const remainingCompletionsToday = dueList.filter(
              (e) => e.id !== item.id && e.status === "done" && e.completed_date === today
            ).length;
            const newStreak = remainingCompletionsToday === 0 ? Math.max(0, old.currentStreak - 1) : old.currentStreak;
            return {
              currentStreak: newStreak,
              longestStreak: old.longestStreak,
            };
          }
        );
      }

      return { previousDue, previousStreaks, previousCompleted };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDue) context.previousDue.forEach(([k, d]) => queryClient.setQueryData(k, d));
      if (context?.previousStreaks) context.previousStreaks.forEach(([k, d]) => queryClient.setQueryData(k, d));
      if (context?.previousCompleted) context.previousCompleted.forEach(([k, d]) => queryClient.setQueryData(k, d));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["completed-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["user-streaks"] });
    },
  });

  return (
    <li className="flex items-center justify-between gap-2 text-xs text-ink/75">
      <div className="flex items-center gap-2">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
          ✓
        </span>
        <span className="font-semibold text-ink">{item.interval_label}</span>
        <span className="text-ink/45">
          {item.completed_date ? `completed on ${item.completed_date}` : "completed"}
        </span>
      </div>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="text-[11px] text-ink/40 hover:text-rose-600 hover:underline disabled:opacity-50"
        title="Undo this completed revision"
      >
        {mutation.isPending ? "Undoing…" : "Undo"}
      </button>
    </li>
  );
}

export function ProblemList({
  problems,
  pending,
  completed = [],
  timezone,
}: {
  problems: ProblemWithNextRevision[];
  pending: RevisionEntry[];
  completed?: { id: string; problem_id: string; completed_date: string | null; interval_label: string }[];
  timezone: string;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const today = todayInTimezone(timezone);

  if (problems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ink/15 bg-white/60 px-6 py-12 text-center">
        <p className="font-display text-lg text-ink">No problems yet</p>
        <p className="mt-1 text-sm text-ink/50">
          Add your first solved problem to start a revision cadence.
        </p>
        <Link
          href="/solved/new"
          className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white"
        >
          Add problem
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-sm">
      {/* Desktop header */}
      <div className="hidden grid-cols-[3rem_1fr_9rem_5rem] gap-3 border-b border-ink/10 bg-ink/[0.03] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink/45 md:grid">
        <span>S.No.</span>
        <span>Title</span>
        <span>Next revision</span>
        <span>Priority</span>
      </div>

      <ul className="divide-y divide-ink/10">
        {problems.map((problem, index) => {
          const open = expanded === problem.id;
          const tracks = pending
            .filter((e) => e.problem_id === problem.id)
            .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
          const doneTracks = completed
            .filter((e) => e.problem_id === problem.id)
            .sort((a, b) => (b.completed_date || "").localeCompare(a.completed_date || ""));
          const timesRevised = doneTracks.length;

          const overdueNext =
            problem.next_revision_date != null &&
            isOverdue(problem.next_revision_date, today);

          return (
            <li key={problem.id}>
              <button
                type="button"
                onClick={() => setExpanded(open ? null : problem.id)}
                className="grid w-full grid-cols-1 gap-1 px-4 py-3 text-left transition hover:bg-ink/[0.02] md:grid-cols-[3rem_1fr_9rem_5rem] md:items-center md:gap-3"
              >
                <span className="hidden text-sm text-ink/40 md:block">{index + 1}</span>
                <div className="flex min-w-0 items-center gap-2">
                  <PriorityDot priority={problem.priority} />
                  <span className="truncate font-medium text-ink">{problem.title}</span>
                  <span className="text-ink/30 md:hidden">#{index + 1}</span>
                </div>
                <span
                  className={`text-sm ${
                    problem.revision_disabled
                      ? "text-ink/40 font-normal italic"
                      : overdueNext
                      ? "font-medium text-missed"
                      : "text-ink/60"
                  }`}
                >
                  {problem.revision_disabled
                    ? "Revision turned off"
                    : problem.next_revision_label === "No schedule"
                    ? "Not scheduled"
                    : problem.next_revision_label}
                </span>
                <span className="hidden md:inline-flex">
                  <PriorityBadge priority={problem.priority} />
                </span>
              </button>

              {open && (
                <div className="animate-expand border-t border-ink/10 bg-paper/80 px-4 py-4">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={problem.priority} />
                    <span className="rounded-md bg-ink/5 px-2 py-0.5 text-xs text-ink/65">
                      {problem.topic}
                    </span>
                    {problem.revision_disabled ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        ⏸️ Revision Turned Off
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-teal/20 bg-teal/5 px-2 py-0.5 text-xs font-semibold text-teal">
                        🔁 {timesRevised === 0 ? "Revised 0 times" : `Revised ${timesRevised} time${timesRevised === 1 ? "" : "s"}`}
                      </span>
                    )}
                    {problem.problem_link && (
                      <ProblemLinkButton url={problem.problem_link} showLabel={true} />
                    )}
                    <Link
                      href={`/solved/${problem.id}/edit`}
                      className="ml-auto text-xs font-semibold text-ink/50 hover:text-teal"
                    >
                      Edit
                    </Link>
                  </div>

                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    {/* Active Upcoming Tracks */}
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                        Upcoming Revision Tracks
                      </h4>
                      {tracks.length === 0 ? (
                        <p className="text-sm text-ink/45">No upcoming revisions.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {tracks.map((t) => (
                            <li
                              key={t.id}
                              className="flex flex-wrap items-center gap-2 text-sm text-ink/70"
                            >
                              <span className="rounded bg-teal/10 px-1.5 py-0.5 text-xs font-medium text-teal">
                                {t.interval_label}
                              </span>
                              <span>next due {t.scheduled_date}</span>
                              {(isOverdue(t.scheduled_date, today) || t.status === "missed") && (
                                <span className="rounded bg-missed/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-missed">
                                  Missed
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Completed Revision History */}
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                        Revision History ({timesRevised})
                      </h4>
                      {doneTracks.length === 0 ? (
                        <p className="text-sm text-ink/45">No revisions completed yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {doneTracks.map((d) => (
                            <RevisionHistoryItem key={d.id} item={d} timezone={timezone} />
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                    Solutions
                  </h4>
                  <SolutionDisplay solutions={problem.solutions ?? {}} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
