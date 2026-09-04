"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeRevision, uncompleteRevision } from "@/lib/api";
import { isOverdue, StreakResult, todayInTimezone } from "@/lib/scheduling";
import type { RevisionEntryWithProblem } from "@/lib/types";
import { PriorityDot } from "./PriorityBadge";
import { ProblemLinkButton } from "./PlatformIcon";

export function RevisionRow({
  entry,
  timezone,
}: {
  entry: RevisionEntryWithProblem;
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const today = todayInTimezone(timezone);
  const isDone = entry.status === "done";
  const overdue = !isDone && (isOverdue(entry.scheduled_date, today) || entry.status === "missed");
  const problem = entry.problems;

  const mutation = useMutation({
    mutationFn: () =>
      isDone
        ? uncompleteRevision(entry, timezone)
        : completeRevision(entry, timezone),
    onMutate: async () => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ["due-revisions"] });
      await queryClient.cancelQueries({ queryKey: ["user-streaks"] });
      await queryClient.cancelQueries({ queryKey: ["completed-revisions"] });
      await queryClient.cancelQueries({ queryKey: ["pending-revisions"] });

      // Save snapshots for rollback
      const previousDue = queryClient.getQueriesData<RevisionEntryWithProblem[]>({ queryKey: ["due-revisions"] });
      const previousStreaks = queryClient.getQueriesData<StreakResult>({ queryKey: ["user-streaks"] });
      const previousCompleted = queryClient.getQueriesData<{ id: string; problem_id: string; completed_date: string | null; interval_label: string }[]>({ queryKey: ["completed-revisions"] });

      const willBeDone = !isDone;

      // 1. Update due-revisions
      queryClient.setQueriesData<RevisionEntryWithProblem[]>(
        { queryKey: ["due-revisions"] },
        (old = []) =>
          old.map((item) => {
            if (item.id === entry.id) {
              return {
                ...item,
                status: willBeDone ? "done" : isOverdue(entry.scheduled_date, today) ? "missed" : "pending",
                completed_date: willBeDone ? today : null,
              };
            }
            return item;
          })
      );

      // 2. Update completed-revisions (for Revision History on Solved page / ProblemList)
      queryClient.setQueriesData<
        { id: string; problem_id: string; completed_date: string | null; interval_label: string }[]
      >({ queryKey: ["completed-revisions"] }, (old = []) => {
        if (willBeDone) {
          if (old.some((c) => c.id === entry.id)) return old;
          return [
            {
              id: entry.id,
              problem_id: entry.problem_id,
              completed_date: today,
              interval_label: entry.interval_label,
            },
            ...old,
          ];
        } else {
          return old.filter((c) => c.id !== entry.id);
        }
      });

      // 3. Update user-streaks (Current Streak Badge)
      queryClient.setQueriesData<StreakResult>(
        { queryKey: ["user-streaks"] },
        (old) => {
          if (!old) return { currentStreak: 0, longestStreak: 0 };

          const currentDueList = queryClient.getQueryData<RevisionEntryWithProblem[]>(["due-revisions", timezone]) ?? [];
          
          const otherActiveTodayCount = currentDueList.filter(
            (e) => e.id !== entry.id && e.status === "done" && e.completed_date === today
          ).length;

          const wasActiveToday = isDone || otherActiveTodayCount > 0;
          const isActiveTodayNow = willBeDone || otherActiveTodayCount > 0;

          let newCurrentStreak = old.currentStreak;
          if (!wasActiveToday && isActiveTodayNow) {
            newCurrentStreak += 1;
          } else if (wasActiveToday && !isActiveTodayNow) {
            newCurrentStreak = Math.max(0, newCurrentStreak - 1);
          }

          const newLongestStreak = Math.max(old.longestStreak, newCurrentStreak);
          return {
            currentStreak: newCurrentStreak,
            longestStreak: newLongestStreak,
          };
        }
      );

      return { previousDue, previousStreaks, previousCompleted };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousDue) {
        context.previousDue.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      if (context?.previousStreaks) {
        context.previousStreaks.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      if (context?.previousCompleted) {
        context.previousCompleted.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
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
    <li
      className={`flex items-start gap-3 rounded-lg border px-3 py-3 shadow-sm transition ${
        isDone
          ? "border-ink/10 bg-slate-50/80 opacity-75"
          : overdue
          ? "border-l-4 border-l-missed border-ink/10 bg-missed-bg"
          : "border-ink/10 bg-white"
      } ${mutation.isPending ? "opacity-70" : ""}`}
    >
      <label className="mt-0.5 flex shrink-0 cursor-pointer">
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-ink/30 text-teal focus:ring-teal cursor-pointer accent-teal"
          checked={isDone}
          onChange={() => mutation.mutate()}
          aria-label={
            isDone
              ? `Unmark ${problem.title} as completed`
              : `Mark ${problem.title} (${entry.interval_label}) as revised`
          }
        />
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <PriorityDot priority={problem.priority} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className={`truncate font-medium ${isDone ? "line-through text-ink/45" : "text-ink"}`}>
                {problem.title}
              </p>
              {problem.problem_link && (
                <ProblemLinkButton url={problem.problem_link} showLabel={false} />
              )}
            </div>
            <p className="mt-0.5 text-sm text-ink/55">
              {problem.topic}
              <span className="mx-1.5 text-ink/25">·</span>
              <span className="text-ink/70">{entry.interval_label} track</span>
            </p>
          </div>
          {isDone ? (
            <span className="shrink-0 rounded bg-teal/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-teal">
              Completed
            </span>
          ) : overdue ? (
            <span className="shrink-0 rounded bg-missed/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-missed">
              Missed
            </span>
          ) : null}
        </div>
        {mutation.isError && (
          <p className="mt-1 text-xs text-rose-600">Could not update. Try again.</p>
        )}
      </div>
    </li>
  );
}
