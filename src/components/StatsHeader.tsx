"use client";

import type { Problem } from "@/lib/types";

export function StatsHeader({
  problems,
  completed = [],
}: {
  problems: Problem[];
  completed?: { id: string; problem_id: string; completed_date: string | null; interval_label: string }[];
}) {
  const total = problems.length;
  const activeRevisionProblems = problems.filter((p) => !p.revision_disabled);
  const activeRevisionTotal = activeRevisionProblems.length;
  const uniqueRevisedIds = new Set(completed.map((c) => c.problem_id));
  const revisedProblemsCount = activeRevisionProblems.filter((p) => uniqueRevisedIds.has(p.id)).length;
  const totalRevisionsDone = completed.length;
  const revisedPercentage = activeRevisionTotal > 0 ? Math.round((revisedProblemsCount / activeRevisionTotal) * 100) : 0;

  const byTopic = problems.reduce<Record<string, number>>((acc, p) => {
    acc[p.topic] = (acc[p.topic] ?? 0) + 1;
    return acc;
  }, {});
  const topTopics = Object.entries(byTopic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  
  // Solved ring
  const solvedProgress = Math.min(total / 100, 1);
  const solvedDash = circumference * solvedProgress;

  // Revised ring (% of active revision library revised)
  const revisedProgress = activeRevisionTotal > 0 ? revisedProblemsCount / activeRevisionTotal : 0;
  const revisedDash = circumference * revisedProgress;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-ink/10 bg-gradient-to-br from-teal/10 via-paper to-emerald-500/[0.04] p-5 shadow-sm sm:p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Text and Topics breakdown */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="font-display text-2xl text-ink">Solved Notebook</h2>
          <p className="mt-1 text-sm text-ink/55">
            {total === 0
              ? "Track what you've cracked and when to revisit it."
              : `${total} problem${total === 1 ? "" : "s"} tracked • ${revisedProblemsCount} actively revised (${revisedPercentage}% retention rate)`}
          </p>

          {topTopics.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {topTopics.map(([topic, count]) => (
                <span
                  key={topic}
                  className="rounded-md bg-white/80 px-2 py-1 text-xs text-ink/65 ring-1 ring-ink/10 shadow-xs"
                >
                  {topic}{" "}
                  <span className="font-semibold text-teal">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Dual Visual Stats Graphics */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {/* Graphic 1: Total Solved */}
          <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white/80 px-3.5 py-2.5 shadow-xs">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 90 90" className="h-full w-full -rotate-90">
                <circle
                  cx="45"
                  cy="45"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-ink/10"
                />
                <circle
                  cx="45"
                  cy="45"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${solvedDash} ${circumference}`}
                  className="text-teal transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-base font-bold text-ink tabular-nums">
                  {total}
                </span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/45">Solved</p>
              <p className="text-sm font-bold text-ink">{total} Problems</p>
            </div>
          </div>

          {/* Graphic 2: Total Revised */}
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2.5 shadow-xs">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 90 90" className="h-full w-full -rotate-90">
                <circle
                  cx="45"
                  cy="45"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  className="text-emerald-950/10"
                />
                <circle
                  cx="45"
                  cy="45"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${revisedDash} ${circumference}`}
                  className="text-emerald-600 transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-base font-bold text-emerald-900 tabular-nums">
                  {revisedPercentage}%
                </span>
              </div>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/60">Revised</p>
              <p className="text-sm font-bold text-emerald-900">
                {revisedProblemsCount} <span className="text-xs font-normal text-emerald-800/70">({totalRevisionsDone} times)</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
