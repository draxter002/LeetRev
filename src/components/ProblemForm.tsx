"use client";

import { useMemo, useState } from "react";
import type { ProblemFormValues, Priority, Solutions } from "@/lib/types";
import { TOPICS } from "@/lib/topics";
import { todayInTimezone } from "@/lib/scheduling";

const emptySolutions: Solutions = {
  brute: { code: "", time_complexity: "", space_complexity: "" },
  better: { code: "", time_complexity: "", space_complexity: "" },
  optimal: { code: "", time_complexity: "", space_complexity: "" },
};

export type ProblemFormSubmit = ProblemFormValues & { reseedSchedule?: boolean };

type Props = {
  initial?: Partial<ProblemFormValues>;
  timezone?: string;
  submitLabel?: string;
  onSubmit: (values: ProblemFormSubmit) => Promise<void>;
  onCancel?: () => void;
  showReseed?: boolean;
  reseedDefault?: boolean;
};

export function ProblemForm({
  initial,
  timezone = "UTC",
  submitLabel = "Save problem",
  onSubmit,
  onCancel,
  showReseed = false,
  reseedDefault = false,
}: Props) {
  const defaultSolved = todayInTimezone(timezone);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [topic, setTopic] = useState(initial?.topic ?? TOPICS[0]);
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [problemLink, setProblemLink] = useState(initial?.problem_link ?? "");
  const [dateSolved, setDateSolved] = useState(initial?.date_solved ?? defaultSolved);
  const [intervals, setIntervals] = useState<number[]>(
    initial?.revision_intervals?.length ? initial.revision_intervals : [5]
  );
  const [solutions, setSolutions] = useState<Solutions>({
    brute: { ...emptySolutions.brute, ...initial?.solutions?.brute },
    better: { ...emptySolutions.better, ...initial?.solutions?.better },
    optimal: { ...emptySolutions.optimal, ...initial?.solutions?.optimal },
  });
  const [openSection, setOpenSection] = useState<"brute" | "better" | "optimal" | null>(
    "optimal"
  );
  const [reseed, setReseed] = useState(reseedDefault);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () => title.trim().length > 0 && intervals.some((n) => n > 0),
    [title, intervals]
  );

  function updateSolution(
    key: keyof Solutions,
    field: "code" | "time_complexity" | "space_complexity",
    value: string
  ) {
    setSolutions((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        title,
        topic,
        priority,
        problem_link: problemLink,
        date_solved: dateSolved,
        revision_intervals: intervals.filter((n) => n > 0),
        solutions,
        reseedSchedule: showReseed ? reseed : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-ink">Title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          placeholder="Two Sum"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Topic</label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Date solved</label>
          <input
            type="date"
            value={dateSolved}
            onChange={(e) => setDateSolved(e.target.value)}
            className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-ink">Priority</label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "low", label: "Low", cls: "bg-emerald-500" },
              { value: "medium", label: "Medium", cls: "bg-amber-400" },
              { value: "high", label: "High", cls: "bg-rose-500" },
            ] as const
          ).map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                priority === p.value
                  ? "border-ink/30 bg-ink text-paper"
                  : "border-ink/15 bg-white text-ink/70 hover:border-ink/25"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${p.cls}`} />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-ink">
          Problem link <span className="font-normal text-ink/40">(optional)</span>
        </label>
        <input
          type="url"
          value={problemLink}
          onChange={(e) => setProblemLink(e.target.value)}
          className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          placeholder="https://leetcode.com/problems/..."
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-ink">Revision intervals (days)</label>
          <button
            type="button"
            onClick={() => setIntervals((prev) => [...prev, 12])}
            className="rounded-md bg-teal/10 px-2 py-1 text-xs font-semibold text-teal hover:bg-teal/15"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {intervals.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={val}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setIntervals((prev) =>
                    prev.map((v, i) => (i === idx ? (Number.isFinite(n) ? n : 0) : v))
                  );
                }}
                className="w-28 rounded-lg border border-ink/15 bg-white px-3 py-2 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              />
              <span className="text-sm text-ink/50">day track</span>
              {intervals.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIntervals((prev) => prev.filter((_, i) => i !== idx))}
                  className="ml-auto text-xs font-medium text-ink/45 hover:text-rose-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Solutions (optional)</p>
        <div className="space-y-2">
          {(["brute", "better", "optimal"] as const).map((key) => {
            const open = openSection === key;
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} className="overflow-hidden rounded-lg border border-ink/10">
                <button
                  type="button"
                  onClick={() => setOpenSection(open ? null : key)}
                  className="flex w-full items-center justify-between bg-ink/[0.03] px-3 py-2 text-left text-sm font-semibold text-ink"
                >
                  {label}
                  <span className="text-ink/40">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="space-y-3 p-3">
                    <textarea
                      value={solutions[key]?.code ?? ""}
                      onChange={(e) => updateSolution(key, "code", e.target.value)}
                      rows={8}
                      placeholder="// your code"
                      className="w-full rounded-md border border-ink/15 bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={solutions[key]?.time_complexity ?? ""}
                        onChange={(e) =>
                          updateSolution(key, "time_complexity", e.target.value)
                        }
                        placeholder="Time complexity (e.g. O(n))"
                        className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                      />
                      <input
                        value={solutions[key]?.space_complexity ?? ""}
                        onChange={(e) =>
                          updateSolution(key, "space_complexity", e.target.value)
                        }
                        placeholder="Space complexity (e.g. O(1))"
                        className="rounded-md border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showReseed && (
        <label className="flex items-start gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={reseed}
            onChange={(e) => setReseed(e.target.checked)}
            className="mt-0.5 rounded border-ink/30 text-teal focus:ring-teal"
          />
          Reseed open revision tracks from date solved + intervals (clears pending/missed)
        </label>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="submit"
          disabled={!canSave || saving}
          className="rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-ink/15 px-4 py-2.5 text-sm font-medium text-ink/70 hover:bg-ink/5"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
