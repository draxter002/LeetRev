import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

/** Calendar date YYYY-MM-DD in the given IANA timezone. */
export function todayInTimezone(timezone: string, now = new Date()): string {
  const zoned = toZonedTime(now, timezone || "UTC");
  return format(zoned, "yyyy-MM-dd");
}

export function addDaysToDate(dateStr: string, days: number): string {
  return format(addDays(parseISO(dateStr), days), "yyyy-MM-dd");
}

export function intervalLabel(days: number): string {
  return `${days}-day`;
}

export function daysUntil(fromDate: string, toDate: string): number {
  return differenceInCalendarDays(parseISO(toDate), parseISO(fromDate));
}

export type SeedRevision = {
  scheduled_date: string;
  interval_days: number;
  interval_label: string;
  status: "pending";
};

/** Initial pending entries: one per interval at date_solved + interval. */
export function seedRevisionsFromSolved(
  dateSolved: string,
  intervals: number[]
): SeedRevision[] {
  const unique = [...new Set(intervals.filter((n) => Number.isFinite(n) && n > 0))];
  return unique.map((interval_days) => ({
    scheduled_date: addDaysToDate(dateSolved, interval_days),
    interval_days,
    interval_label: intervalLabel(interval_days),
    status: "pending" as const,
  }));
}

/** Next occurrence keeps cadence: scheduled_date + interval (not completion date). */
export function nextRevisionAfterComplete(
  scheduledDate: string,
  intervalDays: number
): SeedRevision {
  return {
    scheduled_date: addDaysToDate(scheduledDate, intervalDays),
    interval_days: intervalDays,
    interval_label: intervalLabel(intervalDays),
    status: "pending",
  };
}

export function isOverdue(scheduledDate: string, today: string): boolean {
  return scheduledDate < today;
}

export function isDueTodayOrEarlier(scheduledDate: string, today: string): boolean {
  return scheduledDate <= today;
}

/** Human countdown from today to a future (or past) scheduled date. */
export function formatNextRevision(scheduledDate: string | null, today: string): string {
  if (!scheduledDate) return "No schedule";
  const diff = daysUntil(today, scheduledDate);
  if (diff < 0) return `overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"}`;
  if (diff === 0) return "today";
  if (diff === 1) return "in 1 day";
  return `in ${diff} days`;
}

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
};

/**
 * Calculates current and longest streaks.
 * - Active dates (problem solved or revision completed) increment streak.
 * - Rest days (days with 0 revisions due & 0 activity) do NOT break streak.
 * - Missed dates (days with uncompleted due revisions & 0 activity) break streak.
 */
export function calculateStreaks(
  activeDatesInput: string[],
  missedDatesInput: string[],
  today: string
): StreakResult {
  const activeSet = new Set(activeDatesInput.filter(Boolean));
  const missedSet = new Set(missedDatesInput.filter((d) => d && d < today));

  if (activeSet.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const allActiveSorted = Array.from(activeSet).sort();
  const startDate = allActiveSorted[0];

  let currentStreak = 0;
  let longestStreak = 0;

  let currDate = startDate;

  // Walk day by day from first active date to today
  while (currDate <= today) {
    if (activeSet.has(currDate)) {
      // Activity logged on this day -> increment streak
      currentStreak += 1;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
    } else if (missedSet.has(currDate)) {
      // Missed due revision on this day without any activity -> break streak
      currentStreak = 0;
    } else {
      // Rest day (no revisions due, no activity) -> streak is preserved
    }

    currDate = addDaysToDate(currDate, 1);
  }

  return { currentStreak, longestStreak };
}

