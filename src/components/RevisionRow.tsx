"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeRevision } from "@/lib/api";
import { isOverdue, todayInTimezone } from "@/lib/scheduling";
import type { RevisionEntryWithProblem } from "@/lib/types";
import { PriorityDot } from "./PriorityBadge";

export function RevisionRow({
  entry,
  timezone,
}: {
  entry: RevisionEntryWithProblem;
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const today = todayInTimezone(timezone);
  const overdue = isOverdue(entry.scheduled_date, today) || entry.status === "missed";
  const problem = entry.problems;

  const mutation = useMutation({
    mutationFn: () => completeRevision(entry, timezone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["problems"] });
      queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
      queryClient.invalidateQueries({ queryKey: ["user-streaks"] });
    },
  });

  return (
    <li
      className={`flex items-start gap-3 rounded-lg border bg-white px-3 py-3 shadow-sm transition ${
        overdue
          ? "border-l-4 border-l-missed border-ink/10 bg-missed-bg"
          : "border-ink/10"
      } ${mutation.isPending ? "opacity-60" : ""}`}
    >
      <label className="mt-0.5 flex shrink-0 cursor-pointer">
        <input
          type="checkbox"
          className="h-5 w-5 rounded border-ink/30 text-teal focus:ring-teal"
          checked={false}
          disabled={mutation.isPending}
          onChange={() => mutation.mutate()}
          aria-label={`Mark ${problem.title} (${entry.interval_label}) as revised`}
        />
      </label>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <PriorityDot priority={problem.priority} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{problem.title}</p>
            <p className="mt-0.5 text-sm text-ink/55">
              {problem.topic}
              <span className="mx-1.5 text-ink/25">·</span>
              <span className="text-ink/70">{entry.interval_label} track</span>
            </p>
          </div>
          {overdue && (
            <span className="shrink-0 rounded bg-missed/15 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-missed">
              Missed
            </span>
          )}
        </div>
        {mutation.isError && (
          <p className="mt-1 text-xs text-rose-600">Could not update. Try again.</p>
        )}
      </div>
    </li>
  );
}
