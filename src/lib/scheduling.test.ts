import {
  addDaysToDate,
  formatNextRevision,
  nextRevisionAfterComplete,
  seedRevisionsFromSolved,
} from "./scheduling";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const seeds = seedRevisionsFromSolved("2026-01-01", [5, 12]);
assert(seeds.length === 2, "two tracks");
assert(seeds[0].scheduled_date === "2026-01-06", "5-day first due");
assert(seeds[1].scheduled_date === "2026-01-13", "12-day first due");

const next = nextRevisionAfterComplete("2026-01-06", 5);
assert(next.scheduled_date === "2026-01-11", "cadence from scheduled not completion");

assert(formatNextRevision("2026-01-04", "2026-01-01") === "in 3 days", "countdown");
assert(formatNextRevision("2026-01-01", "2026-01-01") === "today", "today");
assert(formatNextRevision("2025-12-30", "2026-01-01").startsWith("overdue"), "overdue");

assert(addDaysToDate("2026-01-01", 0) === "2026-01-01", "add 0");

console.log("scheduling tests passed");
