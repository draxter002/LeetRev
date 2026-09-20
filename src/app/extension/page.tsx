"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const PLATFORMS = [
  { name: "LeetCode", icon: "🧡", domain: "leetcode.com", desc: "Full problem & submission sync" },
  { name: "Codeforces", icon: "🟦", domain: "codeforces.com", desc: "Contest & problem progress" },
  { name: "CodeChef", icon: "🟤", domain: "codechef.com", desc: "Practice & contest submissions" },
  { name: "GeeksforGeeks", icon: "🟩", domain: "geeksforgeeks.org", desc: "POTD & practice sync" },
  { name: "AtCoder", icon: "⚪", domain: "atcoder.jp", desc: "ABC & ARC contest problems" },
  { name: "CodeStudio", icon: "🟧", domain: "codingninjas.com", desc: "Code360 & Guided paths" },
  { name: "InterviewBit", icon: "🟨", domain: "interviewbit.com", desc: "Topic & track progress" },
  { name: "HackerRank", icon: "🟩", domain: "hackerrank.com", desc: "Domain & sub-domain sync" },
  { name: "HackerEarth", icon: "🟥", domain: "hackerearth.com", desc: "Practice & challenge tracks" },
];

export default function ExtensionDownloadPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 border border-amber-200 mb-2">
              ✨ 9 Platforms Supported
            </div>
            <h1 className="font-display text-3xl font-bold text-ink">LeetRev Companion Extension</h1>
            <p className="mt-1 text-sm text-ink/60">
              1-click multi-platform session detection & automatic problem sync for your spaced repetition queue
            </p>
          </div>

          <a
            href="/leetrev-extension.zip"
            download="leetrev-extension.zip"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:from-orange-600 hover:to-amber-700 hover:scale-105 active:scale-95"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download Extension (.zip)
          </a>
        </div>

        {/* 9 Supported Platforms Cards */}
        <div className="space-y-4">
          <h2 className="font-display text-xl font-bold text-ink">Supported Platforms</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PLATFORMS.map((p) => (
              <div key={p.name} className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-3.5 shadow-xs transition-colors hover:border-teal/30">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink/5 text-xl">
                  {p.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-ink truncate">{p.name}</h3>
                  <p className="text-[11px] text-ink/60 truncate">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Browser Setup Guides */}
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-ink">Installation Guide by Browser</h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Chrome / Brave / Opera Guide (Free Local Load) */}
            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌐</span>
                <div>
                  <h3 className="font-bold text-ink text-base">Google Chrome / Brave / Opera</h3>
                  <p className="text-xs text-teal font-semibold">100% Free Developer Mode Installation</p>
                </div>
              </div>
              <ol className="space-y-2.5 text-xs text-ink/80 list-decimal list-inside leading-relaxed">
                <li>Click the <strong>Download Extension (.zip)</strong> button above.</li>
                <li>Extract the downloaded <code>leetrev-extension.zip</code> file to a folder.</li>
                <li>Open Chrome and navigate to <code>chrome://extensions</code>.</li>
                <li>Enable the <strong>Developer mode</strong> toggle switch in the top-right corner.</li>
                <li>Click <strong>Load unpacked</strong> and select the extracted extension folder.</li>
                <li>Pin the 🔥 <strong>LeetRev Companion</strong> icon to your toolbar & click <strong>Sync All Platforms</strong>!</li>
              </ol>
            </div>

            {/* Firefox & Edge Store Guides */}
            <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🦊</span>
                <div>
                  <h3 className="font-bold text-ink text-base">Firefox & Microsoft Edge</h3>
                  <p className="text-xs text-amber-800 font-semibold">Official Web Store Add-ons</p>
                </div>
              </div>
              <div className="space-y-3 text-xs text-ink/80 leading-relaxed">
                <p>
                  Our extension manifest is fully Manifest V3 compliant for Firefox and Edge Web Stores.
                </p>
                <div className="rounded-xl bg-ink/5 p-3 space-y-2 border border-ink/10">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">Microsoft Edge Add-ons</span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">Free Listing</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">Firefox Add-ons (AMO)</span>
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900">Free Listing</span>
                  </div>
                </div>
                <p className="text-[11px] text-ink/60">
                  You can also load the <code>.zip</code> file directly in Firefox via <code>about:debugging</code> or in Edge via <code>edge://extensions</code>!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-4 border-t border-ink/10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline">
            ← Back to Revision Queue
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
