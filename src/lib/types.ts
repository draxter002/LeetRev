import type { Topic } from "./topics";

export type Priority = "low" | "medium" | "high";
export type RevisionStatus = "pending" | "done" | "missed";

export type SolutionSection = {
  code?: string;
  time_complexity?: string;
  space_complexity?: string;
};

export type Solutions = {
  brute?: SolutionSection;
  better?: SolutionSection;
  optimal?: SolutionSection;
};

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  leetcode_username: string | null;
  // default intervals to use when seeding/importing problems
  default_revision_intervals?: number[];
  created_at: string;
  updated_at: string;
};

export type Problem = {
  id: string;
  user_id: string;
  title: string;
  topic: Topic | string;
  priority: Priority;
  problem_link: string | null;
  date_added: string;
  date_solved: string | null;
  revision_intervals: number[];
  solutions: Solutions;
  created_at: string;
  updated_at: string;
};

export type RevisionEntry = {
  id: string;
  user_id: string;
  problem_id: string;
  scheduled_date: string;
  interval_days: number;
  interval_label: string;
  status: RevisionStatus;
  completed_date: string | null;
  created_at: string;
};

export type RevisionEntryWithProblem = RevisionEntry & {
  problems: Pick<Problem, "id" | "title" | "topic" | "priority" | "problem_link">;
};

export type ProblemFormValues = {
  title: string;
  topic: string;
  priority: Priority;
  problem_link: string;
  date_solved: string;
  revision_intervals: number[];
  solutions: Solutions;
};
