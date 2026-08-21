import type { Priority } from "@/lib/types";

const styles: Record<Priority, string> = {
  low: "bg-priority-low",
  medium: "bg-priority-med",
  high: "bg-priority-high",
};

const labels: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${styles[priority]}`}
      title={labels[priority]}
      aria-label={`${labels[priority]} priority`}
    />
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const text: Record<Priority, string> = {
    low: "text-emerald-800 bg-emerald-100",
    medium: "text-amber-800 bg-amber-100",
    high: "text-rose-800 bg-rose-100",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${text[priority]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles[priority]}`} />
      {labels[priority]}
    </span>
  );
}
