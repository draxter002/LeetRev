"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Solutions } from "@/lib/types";

const SECTIONS = [
  { key: "brute" as const, label: "Brute" },
  { key: "better" as const, label: "Better" },
  { key: "optimal" as const, label: "Optimal" },
];

function hasContent(solutions: Solutions, key: keyof Solutions) {
  const s = solutions[key];
  return Boolean(s?.code || s?.time_complexity || s?.space_complexity);
}

export function SolutionDisplay({ solutions }: { solutions: Solutions }) {
  const available = SECTIONS.filter((s) => hasContent(solutions, s.key));

  if (available.length === 0) {
    return <p className="text-sm text-ink/45">No solutions saved yet.</p>;
  }

  return (
    <div className="space-y-4">
      {available.map(({ key, label }) => {
        const s = solutions[key]!;
        return (
          <div key={key} className="overflow-hidden rounded-lg border border-ink/10">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 bg-ink/[0.03] px-3 py-2">
              <span className="text-sm font-semibold text-ink">{label}</span>
              <div className="flex flex-wrap gap-3 text-xs text-ink/60">
                {s.time_complexity && <span>Time: {s.time_complexity}</span>}
                {s.space_complexity && <span>Space: {s.space_complexity}</span>}
              </div>
            </div>
            {s.code ? (
              <SyntaxHighlighter
                language="python"
                style={oneLight}
                customStyle={{
                  margin: 0,
                  padding: "0.85rem 1rem",
                  fontSize: "0.8rem",
                  background: "#fafaf9",
                }}
                codeTagProps={{ style: { fontFamily: "var(--font-mono)" } }}
              >
                {s.code}
              </SyntaxHighlighter>
            ) : (
              <p className="px-3 py-2 text-sm text-ink/40">No code</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
