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
