"use client";

import Link from "next/link";
import { useState } from "react";
import type { ProblemWithNextRevision } from "@/lib/api";
import type { RevisionEntry } from "@/lib/types";
import { PriorityBadge, PriorityDot } from "./PriorityBadge";
import { SolutionDisplay } from "./SolutionDisplay";
import { isOverdue, todayInTimezone } from "@/lib/scheduling";

export function ProblemList({
  problems,
  pending,
  timezone,
}: {
  problems: ProblemWithNextRevision[];
  pending: RevisionEntry[];
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
                    overdueNext ? "font-medium text-missed" : "text-ink/60"
                  }`}
                >
                  {problem.next_revision_label}
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
                    {problem.problem_link && (
                      <a
                        href={problem.problem_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-teal hover:underline"
                      >
                        Open on LeetCode →
                      </a>
                    )}
                    <Link
                      href={`/solved/${problem.id}/edit`}
                      className="ml-auto text-xs font-semibold text-ink/50 hover:text-teal"
                    >
                      Edit
                    </Link>
                  </div>

                  <div className="mb-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/45">
                      Revision tracks
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
