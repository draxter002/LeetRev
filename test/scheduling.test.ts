import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  todayInTimezone,
  addDaysToDate,
  intervalLabel,
  daysUntil,
  seedRevisionsFromSolved,
  nextRevisionAfterComplete,
  isOverdue,
  isDueTodayOrEarlier,
  formatNextRevision,
  calculateStreaks,
} from "../src/lib/scheduling";

describe("Scheduling & Streak Algorithms", () => {
  describe("todayInTimezone", () => {
    it("formats calendar date as YYYY-MM-DD for a specific timezone", () => {
      // 2026-06-15 01:00 UTC is 2026-06-14 21:00 in America/New_York
      const fixedDate = new Date("2026-06-15T01:00:00Z");
      assert.equal(todayInTimezone("UTC", fixedDate), "2026-06-15");
      assert.equal(todayInTimezone("America/New_York", fixedDate), "2026-06-14");
      assert.equal(todayInTimezone("Asia/Kolkata", fixedDate), "2026-06-15");
    });

    it("defaults to UTC when timezone string is empty", () => {
      const fixedDate = new Date("2026-01-01T12:00:00Z");
      assert.equal(todayInTimezone("", fixedDate), "2026-01-01");
    });
  });

  describe("addDaysToDate", () => {
    it("adds days correctly within the same month", () => {
      assert.equal(addDaysToDate("2026-03-10", 5), "2026-03-15");
    });

    it("handles month rollover", () => {
      assert.equal(addDaysToDate("2026-01-30", 3), "2026-02-02");
    });

    it("handles leap year rollover accurately", () => {
      // 2024 is a leap year
      assert.equal(addDaysToDate("2024-02-28", 1), "2024-02-29");
      assert.equal(addDaysToDate("2024-02-28", 2), "2024-03-01");

      // 2025 is not a leap year
      assert.equal(addDaysToDate("2025-02-28", 1), "2025-03-01");
    });

    it("handles year rollover", () => {
      assert.equal(addDaysToDate("2025-12-31", 1), "2026-01-01");
    });
  });

  describe("intervalLabel", () => {
    it("generates correct human-readable interval labels", () => {
      assert.equal(intervalLabel(1), "1-day");
      assert.equal(intervalLabel(7), "7-day");
      assert.equal(intervalLabel(30), "30-day");
    });
  });

  describe("daysUntil", () => {
    it("calculates exact calendar day differences", () => {
      assert.equal(daysUntil("2026-05-01", "2026-05-01"), 0);
      assert.equal(daysUntil("2026-05-01", "2026-05-06"), 5);
      assert.equal(daysUntil("2026-05-10", "2026-05-05"), -5);
    });
  });

  describe("seedRevisionsFromSolved", () => {
    it("seeds pending entries corresponding to specified positive intervals", () => {
      const seeds = seedRevisionsFromSolved("2026-04-10", [1, 3, 7]);
      assert.equal(seeds.length, 3);
      assert.deepEqual(seeds, [
        {
          scheduled_date: "2026-04-11",
          interval_days: 1,
          interval_label: "1-day",
          status: "pending",
        },
        {
          scheduled_date: "2026-04-13",
          interval_days: 3,
          interval_label: "3-day",
          status: "pending",
        },
        {
          scheduled_date: "2026-04-17",
          interval_days: 7,
          interval_label: "7-day",
          status: "pending",
        },
      ]);
    });

    it("deduplicates intervals and filters non-positive numbers", () => {
      const seeds = seedRevisionsFromSolved("2026-04-10", [5, 5, 0, -2, 10]);
      assert.equal(seeds.length, 2);
      assert.equal(seeds[0].interval_days, 5);
      assert.equal(seeds[1].interval_days, 10);
    });

    it("returns empty array when no valid intervals are provided", () => {
      assert.deepEqual(seedRevisionsFromSolved("2026-04-10", []), []);
      assert.deepEqual(seedRevisionsFromSolved("2026-04-10", [0, -1]), []);
    });
  });

  describe("nextRevisionAfterComplete", () => {
    it("preserves cadence by adding interval to scheduledDate, not completion date", () => {
      const next = nextRevisionAfterComplete("2026-05-10", 7);
      assert.deepEqual(next, {
        scheduled_date: "2026-05-17",
        interval_days: 7,
        interval_label: "7-day",
        status: "pending",
      });
    });
  });

  describe("isOverdue & isDueTodayOrEarlier", () => {
    const today = "2026-05-15";

    it("evaluates overdue status strictly before today", () => {
      assert.equal(isOverdue("2026-05-14", today), true);
      assert.equal(isOverdue("2026-05-15", today), false);
      assert.equal(isOverdue("2026-05-16", today), false);
    });

    it("evaluates due today or earlier accurately", () => {
      assert.equal(isDueTodayOrEarlier("2026-05-14", today), true);
      assert.equal(isDueTodayOrEarlier("2026-05-15", today), true);
      assert.equal(isDueTodayOrEarlier("2026-05-16", today), false);
    });
  });

  describe("formatNextRevision", () => {
    const today = "2026-05-10";

    it("handles null/missing scheduled date", () => {
      assert.equal(formatNextRevision(null, today), "No schedule");
    });

    it("handles overdue countdown with singular and plural days", () => {
      assert.equal(formatNextRevision("2026-05-09", today), "overdue by 1 day");
      assert.equal(formatNextRevision("2026-05-07", today), "overdue by 3 days");
    });

    it("handles today countdown", () => {
      assert.equal(formatNextRevision("2026-05-10", today), "today");
    });

    it("handles upcoming countdown with singular and plural days", () => {
      assert.equal(formatNextRevision("2026-05-11", today), "in 1 day");
      assert.equal(formatNextRevision("2026-05-14", today), "in 4 days");
    });
  });

  describe("calculateStreaks", () => {
    it("returns zero streaks when there are no active dates", () => {
      const result = calculateStreaks([], [], "2026-05-10");
      assert.deepEqual(result, { currentStreak: 0, longestStreak: 0 });
    });

    it("increments streak on consecutive active days", () => {
      const active = ["2026-05-01", "2026-05-02", "2026-05-03"];
      const result = calculateStreaks(active, [], "2026-05-03");
      assert.deepEqual(result, { currentStreak: 3, longestStreak: 3 });
    });

    it("preserves streak during rest days (days with no due revisions and no activity)", () => {
      // May 1: Active
      // May 2: Rest day (no missed revisions)
      // May 3: Active
      const active = ["2026-05-01", "2026-05-03"];
      const missed: string[] = [];
      const result = calculateStreaks(active, missed, "2026-05-03");

      // May 1 (+1 streak = 1) -> May 2 (rest day, preserved = 1) -> May 3 (+1 streak = 2)
      assert.equal(result.currentStreak, 2);
      assert.equal(result.longestStreak, 2);
    });

    it("breaks streak on missed dates where due revisions were not completed", () => {
      // May 1: Active
      // May 2: Active
      // May 3: Missed due revision without activity
      // May 4: Active
      const active = ["2026-05-01", "2026-05-02", "2026-05-04"];
      const missed = ["2026-05-03"];
      const result = calculateStreaks(active, missed, "2026-05-04");

      // Peak streak before break was 2.
      // After break on May 3 (reset to 0), May 4 active makes current streak 1.
      assert.equal(result.currentStreak, 1);
      assert.equal(result.longestStreak, 2);
    });

    it("handles multiple streaks and tracks the longest streak accurately", () => {
      // Week 1: 4 days streak (May 1 to May 4)
      // May 5: Missed revision -> breaks streak
      // Week 2: 2 days streak (May 6 to May 7)
      const active = [
        "2026-05-01",
        "2026-05-02",
        "2026-05-03",
        "2026-05-04",
        "2026-05-06",
        "2026-05-07",
      ];
      const missed = ["2026-05-05"];
      const result = calculateStreaks(active, missed, "2026-05-07");

      assert.equal(result.currentStreak, 2);
      assert.equal(result.longestStreak, 4);
    });
  });
});
