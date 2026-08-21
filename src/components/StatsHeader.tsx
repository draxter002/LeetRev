"use client";

import type { Problem } from "@/lib/types";

export function StatsHeader({ problems }: { problems: Problem[] }) {
  const total = problems.length;
  const byTopic = problems.reduce<Record<string, number>>((acc, p) => {
    acc[p.topic] = (acc[p.topic] ?? 0) + 1;
    return acc;
  }, {});
  const topTopics = Object.entries(byTopic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const circumference = 2 * Math.PI * 42;
  // Decorative ring fill based on a soft cap of 100 for visual progress
  const progress = Math.min(total / 100, 1);
  const dash = circumference * progress;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-ink/10 bg-gradient-to-br from-teal/15 via-paper to-ink/[0.04] p-5 shadow-sm sm:p-6">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-teal/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-ink/10"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className="text-teal transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl font-semibold text-ink tabular-nums">
              {total}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-ink/45">
              Solved
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2 className="font-display text-2xl text-ink">Solved problems</h2>
          <p className="mt-1 text-sm text-ink/55">
            {total === 0
              ? "Track what you've cracked and when to revisit it."
              : `${total} problem${total === 1 ? "" : "s"} in your notebook.`}
          </p>
          {topTopics.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {topTopics.map(([topic, count]) => (
                <span
                  key={topic}
                  className="rounded-md bg-white/80 px-2 py-1 text-xs text-ink/65 ring-1 ring-ink/10"
                >
                  {topic}{" "}
                  <span className="font-semibold text-teal">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
