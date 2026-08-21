import type {
  Problem,
  ProblemFormValues,
  Profile,
  RevisionEntry,
  RevisionEntryWithProblem,
  Solutions,
} from "@/lib/types";
import {
  formatNextRevision,
  isOverdue,
  nextRevisionAfterComplete,
  seedRevisionsFromSolved,
  todayInTimezone,
} from "@/lib/scheduling";
import { createClient } from "@/lib/supabase/client";

export async function fetchProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  updates: Partial<Pick<Profile, "display_name" | "timezone" | "leetcode_username" | "default_revision_intervals">>
): Promise<Profile> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
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

export async function fetchDueRevisions(
  timezone: string
): Promise<RevisionEntryWithProblem[]> {
  const supabase = createClient();
  const today = todayInTimezone(timezone);

  const { data, error } = await supabase
    .from("revision_entries")
    .select("*, problems (id, title, topic, priority, problem_link)")
    .in("status", ["pending", "missed"])
    .lte("scheduled_date", today)
    .order("scheduled_date", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as RevisionEntryWithProblem[];

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
    })
    .select()
    .single();

  if (error) throw error;

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
  const dateSolved = values.date_solved || null;

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
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  if (options?.reseedSchedule && dateSolved) {
    // Remove open pending/missed entries and reseed from solved date
    await supabase
      .from("revision_entries")
      .delete()
      .eq("problem_id", id)
      .in("status", ["pending", "missed"]);

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
