"use client";

import { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  onError: (msg: string) => void;
};

export function BulkImportModal({ isOpen, onClose, onSuccess, onError }: Props) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/leetcode/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk import failed");

      onSuccess(data.added ?? 0);
      setText("");
      onClose();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to import problems");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-ink/10 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-ink">Bulk Import Problems</h3>
            <p className="mt-1 text-xs text-ink/55">
              Paste problem titles, URLs, or slugs (one per line or comma-separated).
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Two Sum\nhttps://leetcode.com/problems/valid-anagram/\ngroup-anagrams\n3Sum\n121. Best Time to Buy and Sell Stock`}
              className="w-full rounded-xl border border-ink/15 bg-paper/40 p-3 font-mono text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              required
            />
            <p className="mt-1.5 text-[11px] text-ink/45">
              Any duplicates will be automatically skipped without overwriting existing data.
            </p>
          </div>

          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-ink/15 px-4 py-2 text-sm font-medium text-ink/70 hover:bg-ink/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-dark disabled:opacity-50"
            >
              {loading && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              )}
              {loading ? "Importing…" : "Import All"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
