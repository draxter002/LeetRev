"use client";

import type { Priority } from "@/lib/types";

const DOT_CLASSES: Record<Priority, string> = {
  low: "bg-priority-low",
  medium: "bg-priority-med",
  high: "bg-priority-high",
};

const BADGE_CLASSES: Record<Priority, string> = {
  low: "text-priority-low bg-priority-low/10",
  medium: "text-priority-med bg-priority-med/10",
  high: "text-priority-high bg-priority-high/10",
};

const BADGE_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function PriorityDot({ priority }: { priority: Priority | null }) {
  if (!priority) {
    // Neutral grey dot for unset priority (LeetCode-imported problems)
    return <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-ink/20" title="Priority not set" />;
  }
  return (
    <span
      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT_CLASSES[priority]}`}
      title={BADGE_LABELS[priority]}
    />
  );
}

export function PriorityBadge({ priority }: { priority: Priority | null }) {
  if (!priority) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-ink/35 bg-ink/5">
        —
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_CLASSES[priority]}`}
    >
      {BADGE_LABELS[priority]}
    </span>
  );
}
