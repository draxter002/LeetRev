"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ProblemForm, type ProblemFormSubmit } from "@/components/ProblemForm";
import {
  deleteProblem,
  fetchProblem,
  fetchProfile,
  updateProblem,
} from "@/lib/api";

export default function EditProblemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const problemQuery = useQuery({
    queryKey: ["problem", id],
    queryFn: () => fetchProblem(id),
  });

  const timezone = profileQuery.data?.timezone ?? "UTC";
  const problem = problemQuery.data;

  async function handleSubmit(values: ProblemFormSubmit) {
    await updateProblem(id, values, { reseedSchedule: values.reseedSchedule });
    await queryClient.invalidateQueries({ queryKey: ["problems"] });
    await queryClient.invalidateQueries({ queryKey: ["problem", id] });
    await queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
    await queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
    router.push("/solved");
  }

  async function handleDelete() {
    if (!confirm("Delete this problem and all its revision entries?")) return;
    await deleteProblem(id);
    await queryClient.invalidateQueries({ queryKey: ["problems"] });
    await queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
    router.push("/solved");
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink">Edit problem</h1>
          <p className="mt-1 text-sm text-ink/55">Update details or reseed revision tracks.</p>
        </div>
        {problem && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            Delete
          </button>
        )}
      </div>

      {problemQuery.isLoading && (
        <div className="h-64 animate-pulse rounded-2xl bg-ink/5" />
      )}

      {problemQuery.isError && (
        <p className="text-sm text-rose-600">Could not load problem.</p>
      )}

      {!problemQuery.isLoading && !problem && (
        <p className="text-sm text-ink/50">Problem not found.</p>
      )}

      {problem && (
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
          <ProblemForm
            timezone={timezone}
            submitLabel="Update problem"
            showReseed
            initial={{
              title: problem.title,
              topic: problem.topic,
              priority: problem.priority,
              problem_link: problem.problem_link ?? "",
              date_solved: problem.date_solved ?? "",
              revision_intervals: problem.revision_intervals,
              solutions: problem.solutions,
            }}
            onSubmit={handleSubmit}
            onCancel={() => router.push("/solved")}
          />
        </div>
      )}
    </AppShell>
  );
}
