"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export default function StreakInfoPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 pb-12">
        {/* Back Link & Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-teal transition-colors hover:text-teal/80"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Queue
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl shadow-xs">
              🔥
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold text-ink">Streak Guide & Rules</h1>
              <p className="text-sm text-ink/60">
                Understand exactly how your daily activity and revisions impact your streak
              </p>
            </div>
          </div>
        </div>

        {/* Hero Card / Key Principle */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/40 p-5 shadow-xs sm:p-6">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-200/80 text-amber-900 font-bold text-sm">
              💡
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-amber-950">
                Rest Days Do NOT Break Your Streak!
              </h2>
              <p className="text-sm leading-relaxed text-amber-900/80">
                Unlike apps that require activity every calendar day, LeetRevision respects your spaced repetition schedule. Your streak only breaks if you have <strong>revisions due</strong> on a day and fail to complete them.
              </p>
            </div>
          </div>
        </div>

        {/* The 3 Day Types */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-ink">The 3 Day Types</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Active Day */}
            <div className="rounded-2xl border border-teal/20 bg-teal/5 p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <h3 className="font-bold text-teal-900">Active Day</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-teal-900/80">
                You solved a new problem or completed a scheduled revision.
              </p>
              <div className="mt-3 inline-block rounded-md bg-teal/15 px-2 py-1 text-[11px] font-semibold text-teal-900">
                +1 Day to Streak
              </div>
            </div>

            {/* Rest Day */}
            <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-2xl">☕</span>
                <h3 className="font-bold text-ink">Rest Day</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">
                No revisions were due and no activity occurred.
              </p>
              <div className="mt-3 inline-block rounded-md bg-ink/10 px-2 py-1 text-[11px] font-semibold text-ink/80">
                Streak Preserved
              </div>
            </div>

            {/* Missed Day */}
            <div className="rounded-2xl border border-missed/20 bg-missed/5 p-4 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-2xl">❌</span>
                <h3 className="font-bold text-missed">Missed Day</h3>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-missed/80">
                Revisions were due, but you completed 0 of them before midnight.
              </p>
              <div className="mt-3 inline-block rounded-md bg-missed/15 px-2 py-1 text-[11px] font-semibold text-missed">
                Streak Resets to 0
              </div>
            </div>
          </div>
        </div>

        {/* Visual Timeline Scenarios */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-ink">Streak Scenarios & Examples</h2>

          <div className="space-y-3">
            {/* Scenario 1 */}
            <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">Scenario 1: Taking Rest Days</h3>
                <span className="rounded-full bg-teal/15 px-2.5 py-0.5 text-xs font-semibold text-teal-900">
                  Current Streak: 2 Days
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-xl bg-teal/10 p-2 border border-teal/20">
                  <div className="font-medium text-ink/60">Mon</div>
                  <div className="text-lg">🔥</div>
                  <div className="text-[10px] font-semibold text-teal-800">Solved #1</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 border border-amber-200/60">
                  <div className="font-medium text-ink/60">Tue</div>
                  <div className="text-lg">☕</div>
                  <div className="text-[10px] font-semibold text-amber-800">No Revisions Due</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 border border-amber-200/60">
                  <div className="font-medium text-ink/60">Wed</div>
                  <div className="text-lg">☕</div>
                  <div className="text-[10px] font-semibold text-amber-800">No Revisions Due</div>
                </div>
                <div className="rounded-xl bg-teal/10 p-2 border border-teal/20">
                  <div className="font-medium text-ink/60">Thu</div>
                  <div className="text-lg">🔥</div>
                  <div className="text-[10px] font-semibold text-teal-800">Revision Done</div>
                </div>
              </div>
              <p className="text-xs text-ink/60">
                Because Tue & Wed had zero due revisions, your streak bridge is maintained from Mon through Thu!
              </p>
            </div>

            {/* Scenario 2 */}
            <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-ink">Scenario 2: Missing a Due Revision</h3>
                <span className="rounded-full bg-missed/15 px-2.5 py-0.5 text-xs font-semibold text-missed">
                  Current Streak: 1 Day
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-xl bg-teal/10 p-2 border border-teal/20">
                  <div className="font-medium text-ink/60">Mon</div>
                  <div className="text-lg">🔥</div>
                  <div className="text-[10px] font-semibold text-teal-800">Solved #1</div>
                </div>
                <div className="rounded-xl bg-missed/10 p-2 border border-missed/20">
                  <div className="font-medium text-ink/60">Tue</div>
                  <div className="text-lg">❌</div>
                  <div className="text-[10px] font-semibold text-missed">Due & Incomplete</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-2 border border-amber-200/60">
                  <div className="font-medium text-ink/60">Wed</div>
                  <div className="text-lg">☕</div>
                  <div className="text-[10px] font-semibold text-amber-800">No Revisions Due</div>
                </div>
                <div className="rounded-xl bg-teal/10 p-2 border border-teal/20">
                  <div className="font-medium text-ink/60">Thu</div>
                  <div className="text-lg">🔥</div>
                  <div className="text-[10px] font-semibold text-teal-800">Solved #2</div>
                </div>
              </div>
              <p className="text-xs text-ink/60">
                Tuesday had a revision due that was missed, resetting streak to 0. Thursday starts a fresh streak of 1 day.
              </p>
            </div>
          </div>
        </div>

        {/* Detailed Situations & FAQ */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-ink">Frequently Asked Questions</h2>
          <div className="space-y-3">
            <details className="group rounded-2xl border border-ink/10 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-ink">
                <span>Do pending revisions today break my streak immediately?</span>
                <span className="transition group-open:rotate-180">
                  <svg className="h-4 w-4 text-ink/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">
                <strong>No!</strong> Pending revisions for the current day do not count as missed until midnight passes in your configured timezone. You have until the end of today to complete them.
              </p>
            </details>

            <details className="group rounded-2xl border border-ink/10 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-ink">
                <span>What if I have 3 revisions due and only complete 1?</span>
                <span className="transition group-open:rotate-180">
                  <svg className="h-4 w-4 text-ink/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">
                Completing <strong>at least 1 revision or problem</strong> on a day marks that day as an <strong>Active Day</strong> (🔥), protecting your streak for that day!
              </p>
            </details>

            <details className="group rounded-2xl border border-ink/10 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-ink">
                <span>What is "Longest Streak"?</span>
                <span className="transition group-open:rotate-180">
                  <svg className="h-4 w-4 text-ink/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">
                Longest Streak tracks your all-time highest consecutive active days record. Even if your current streak resets due to a missed day, your Longest Streak record is permanently preserved in your profile.
              </p>
            </details>

            <details className="group rounded-2xl border border-ink/10 bg-white p-4 transition-all [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between font-semibold text-ink">
                <span>How is timezone handled?</span>
                <span className="transition group-open:rotate-180">
                  <svg className="h-4 w-4 text-ink/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ink/70">
                All date calculations and midnights are evaluated according to your preferred timezone selected in your <Link href="/profile" className="text-teal underline font-medium">Profile Settings</Link>.
              </p>
            </details>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
