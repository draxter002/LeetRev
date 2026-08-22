import type {
  Problem,
  ProblemFormValues,
  Profile,
  RevisionEntry,
  RevisionEntryWithProblem,
  Solutions,
} from "@/lib/types";
import {
  calculateStreaks,
  formatNextRevision,
  isOverdue,
  nextRevisionAfterComplete,
  seedRevisionsFromSolved,
  StreakResult,
  todayInTimezone,
} from "@/lib/scheduling";
import { createClient } from "@/lib/supabase/client";

export async function fetchProfile(): Promise<Profile | null> {
  try {
    const res = await fetch("/api/profile");
    if (res.status === 401) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to fetch profile");
    return data.profile as Profile | null;
  } catch (err) {
    console.error("[fetchProfile] error:", err);
    return null;
  }
}

export async function fetchUserStreaks(timezone: string): Promise<StreakResult> {
  try {
    const supabase = createClient();
    const today = todayInTimezone(timezone);

    const { data: revData, error: revErr } = await supabase
      .from("revision_entries")
      .select("completed_date")
      .eq("status", "done")
      .not("completed_date", "is", null);

    if (revErr) console.warn("[fetchUserStreaks] revDone warning:", revErr.message);

    const { data: revMissed, error: missedErr } = await supabase
      .from("revision_entries")
      .select("scheduled_date")
      .in("status", ["missed", "pending"])
      .lt("scheduled_date", today);

    if (missedErr) console.warn("[fetchUserStreaks] revMissed warning:", missedErr.message);

    const { data: probData, error: probErr } = await supabase
      .from("problems")
      .select("date_solved, date_added");

    if (probErr) console.warn("[fetchUserStreaks] probData warning:", probErr.message);

    const activeDates: string[] = [];
    if (revData) {
      for (const r of revData) {
        if (r.completed_date) activeDates.push(r.completed_date);
      }
    }
    if (probData) {
      for (const p of probData) {
        if (p.date_solved) activeDates.push(p.date_solved);
        if (p.date_added) activeDates.push(p.date_added);
      }
    }

    const missedDates: string[] = [];
    if (revMissed) {
      for (const m of revMissed) {
        if (m.scheduled_date) missedDates.push(m.scheduled_date);
      }
    }

    return calculateStreaks(activeDates, missedDates, today);
  } catch (err) {
    console.error("[fetchUserStreaks] error:", err);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

export async function updateProfile(
  updates: Partial<Pick<Profile, "display_name" | "timezone" | "leetcode_username" | "default_revision_intervals" | "default_priority" | "email_reminders_enabled">>
): Promise<Profile> {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to save profile settings");
  return data.profile as Profile;
}

export async function fetchProblems(): Promise<Problem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Problem[];
}

export async function fetchProblem(id: string): Promise<Problem | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("problems")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Problem | null;
}

export async function fetchPendingRevisionsForProblems(
  problemIds: string[]
): Promise<RevisionEntry[]> {
  if (problemIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("revision_entries")
    .select("*")
    .in("problem_id", problemIds)
    .in("status", ["pending", "missed"])
    .order("scheduled_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as RevisionEntry[];
}

export async function fetchCompletedRevisionsForProblems(
  problemIds: string[]
): Promise<{ id: string; problem_id: string; completed_date: string | null; interval_label: string }[]> {
  if (problemIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("revision_entries")
    .select("id, problem_id, completed_date, interval_label")
    .in("problem_id", problemIds)
    .eq("status", "done")
    .order("completed_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as { id: string; problem_id: string; completed_date: string | null; interval_label: string }[];
}

export async function fetchDueRevisions(
  timezone: string
): Promise<RevisionEntryWithProblem[]> {
  const supabase = createClient();
  const today = todayInTimezone(timezone);

  const { data, error } = await supabase
    .from("revision_entries")
    .select("*, problems (id, title, topic, priority, problem_link, revision_disabled)")
    .in("status", ["pending", "missed"])
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: true });

  if (error) throw error;

  const rawRows = (data ?? []) as (RevisionEntryWithProblem & { problems?: { revision_disabled?: boolean } })[];

  // Filter out any entries for problems where revision_disabled is true
  const rows = rawRows.filter((r) => r.problems?.revision_disabled !== true);

  // Mark overdue as missed (best-effort; display still works if this fails)
  const overdueIds = rows
    .filter((r) => isOverdue(r.scheduled_date, today) && r.status === "pending")
    .map((r) => r.id);

  if (overdueIds.length > 0) {
    await supabase
      .from("revision_entries")
      .update({ status: "missed" })
      .in("id", overdueIds);

    for (const row of rows) {
      if (overdueIds.includes(row.id)) row.status = "missed";
    }
  }

  // Sort rows by priority (high > medium > low), then by scheduled date
  const priorityScore = { high: 3, medium: 2, low: 1 };
  rows.sort((a, b) => {
    const pA = priorityScore[a.problems?.priority || "medium"];
    const pB = priorityScore[b.problems?.priority || "medium"];
    if (pA !== pB) return pB - pA; // Descending
    return a.scheduled_date.localeCompare(b.scheduled_date);
  });

  return rows;
}

export async function completeRevision(
  entry: RevisionEntry,
  timezone: string
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const today = todayInTimezone(timezone);
  const next = nextRevisionAfterComplete(entry.scheduled_date, entry.interval_days);

  const { error: updateError } = await supabase
    .from("revision_entries")
    .update({ status: "done", completed_date: today })
    .eq("id", entry.id);

  if (updateError) throw updateError;

  const { error: insertError } = await supabase.from("revision_entries").insert({
    user_id: user.id,
    problem_id: entry.problem_id,
    scheduled_date: next.scheduled_date,
    interval_days: next.interval_days,
    interval_label: next.interval_label,
    status: "pending",
  });

  if (insertError) throw insertError;
}

function normalizeSolutions(solutions: Solutions): Solutions {
  const out: Solutions = {};
  for (const key of ["brute", "better", "optimal"] as const) {
    const s = solutions[key];
    if (!s) continue;
    const cleaned = {
      code: s.code?.trim() || undefined,
      time_complexity: s.time_complexity?.trim() || undefined,
      space_complexity: s.space_complexity?.trim() || undefined,
    };
    if (cleaned.code || cleaned.time_complexity || cleaned.space_complexity) {
      out[key] = cleaned;
    }
  }
  return out;
}

export async function createProblem(values: ProblemFormValues): Promise<Problem> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const intervals = values.revision_intervals.filter((n) => n > 0);
  const dateSolved = values.date_solved || todayInTimezone("UTC");
  const isDisabled = values.revision_disabled ?? false;

  const { data: problem, error } = await supabase
    .from("problems")
    .insert({
      user_id: user.id,
      title: values.title.trim(),
      topic: values.topic,
      priority: values.priority,
      problem_link: values.problem_link.trim() || null,
      date_added: dateSolved,
      date_solved: dateSolved,
      revision_intervals: intervals,
      solutions: normalizeSolutions(values.solutions),
      revision_disabled: isDisabled,
    })
    .select()
    .single();

  if (error) throw error;

  if (!isDisabled) {
    const seeds = seedRevisionsFromSolved(dateSolved, intervals);
    if (seeds.length > 0) {
      const { error: revError } = await supabase.from("revision_entries").insert(
        seeds.map((s) => ({
          user_id: user.id,
          problem_id: problem.id,
          ...s,
        }))
      );
      if (revError) throw revError;
    }
  }

  return problem as Problem;
}

export async function updateProblem(
  id: string,
  values: ProblemFormValues,
  options?: { reseedSchedule?: boolean }
): Promise<Problem> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const intervals = values.revision_intervals.filter((n) => n > 0);
  const dateSolved = values.date_solved || todayInTimezone("UTC");
  const isDisabled = values.revision_disabled ?? false;

  const { data: problem, error } = await supabase
    .from("problems")
    .update({
      title: values.title.trim(),
      topic: values.topic,
      priority: values.priority,
      problem_link: values.problem_link.trim() || null,
      date_solved: dateSolved,
      revision_intervals: intervals,
      solutions: normalizeSolutions(values.solutions),
      revision_disabled: isDisabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // Always delete open pending/missed entries when schedule or revision_disabled changes
  await supabase
    .from("revision_entries")
    .delete()
    .eq("problem_id", id)
    .in("status", ["pending", "missed"]);

  // If revision is NOT disabled, seed fresh pending entries
  if (!isDisabled && intervals.length > 0) {
    const seeds = seedRevisionsFromSolved(dateSolved, intervals);
    if (seeds.length > 0) {
      const { error: revError } = await supabase.from("revision_entries").insert(
        seeds.map((s) => ({
          user_id: user.id,
          problem_id: id,
          ...s,
        }))
      );
      if (revError) throw revError;
    }
  }

  return problem as Problem;
}

export async function deleteProblem(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("problems").delete().eq("id", id);
  if (error) throw error;
}

export type ProblemWithNextRevision = Problem & {
  next_revision_date: string | null;
  next_revision_label: string;
};

export function attachNextRevisions(
  problems: Problem[],
  pending: RevisionEntry[],
  timezone: string
): ProblemWithNextRevision[] {
  const today = todayInTimezone(timezone);
  const byProblem = new Map<string, RevisionEntry[]>();

  for (const e of pending) {
    const list = byProblem.get(e.problem_id) ?? [];
    list.push(e);
    byProblem.set(e.problem_id, list);
  }

  return problems.map((p) => {
    const entries = byProblem.get(p.id) ?? [];
    const next = entries.sort((a, b) =>
      a.scheduled_date.localeCompare(b.scheduled_date)
    )[0];
    const nextDate = next?.scheduled_date ?? null;
    return {
      ...p,
      next_revision_date: nextDate,
      next_revision_label: formatNextRevision(nextDate, today),
    };
  });
}

export function pendingByTrack(
  pending: RevisionEntry[],
  problemId: string
): RevisionEntry[] {
  return pending
    .filter((e) => e.problem_id === problemId)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
}


