"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ProblemForm, type ProblemFormSubmit } from "@/components/ProblemForm";
import { createProblem, fetchProfile } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export default function NewProblemPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const timezone = profileQuery.data?.timezone ?? "UTC";

  async function handleSubmit(values: ProblemFormSubmit) {
    await createProblem(values);
    await queryClient.invalidateQueries({ queryKey: ["problems"] });
    await queryClient.invalidateQueries({ queryKey: ["due-revisions"] });
    await queryClient.invalidateQueries({ queryKey: ["pending-revisions"] });
    router.push("/solved");
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Add problem</h1>
        <p className="mt-1 text-sm text-ink/55">
          Saving seeds an independent revision track for each interval.
        </p>
      </div>
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
        <ProblemForm
          timezone={timezone}
          submitLabel="Save problem"
          onSubmit={handleSubmit}
          onCancel={() => router.push("/solved")}
        />
      </div>
    </AppShell>
  );
}
