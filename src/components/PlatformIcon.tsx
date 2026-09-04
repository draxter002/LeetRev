"use client";

import React from "react";

export type PlatformKey =
  | "leetcode"
  | "geeksforgeeks"
  | "codeforces"
  | "codechef"
  | "atcoder"
  | "other";

export type PlatformInfo = {
  key: PlatformKey;
  name: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
};

export function identifyPlatform(url?: string | null): PlatformInfo | null {
  if (!url || !url.trim()) return null;
  const lower = url.toLowerCase().trim();

  if (lower.includes("leetcode.com") || lower.includes("leetcode.cn")) {
    return {
      key: "leetcode",
      name: "LeetCode",
      badgeBg: "bg-amber-500/10 hover:bg-amber-500/20",
      badgeText: "text-amber-700 font-semibold",
      borderColor: "border-amber-500/30",
    };
  }

  if (
    lower.includes("geeksforgeeks.org") ||
    lower.includes("geeksforgeeks") ||
    lower.includes("gfg")
  ) {
    return {
      key: "geeksforgeeks",
      name: "GeeksforGeeks",
      badgeBg: "bg-emerald-500/10 hover:bg-emerald-500/20",
      badgeText: "text-emerald-700 font-semibold",
      borderColor: "border-emerald-500/30",
    };
  }

  if (lower.includes("codeforces.com") || lower.includes("codeforces")) {
    return {
      key: "codeforces",
      name: "Codeforces",
      badgeBg: "bg-blue-500/10 hover:bg-blue-500/20",
      badgeText: "text-blue-700 font-semibold",
      borderColor: "border-blue-500/30",
    };
  }

  if (lower.includes("codechef.com") || lower.includes("codechef")) {
    return {
      key: "codechef",
      name: "CodeChef",
      badgeBg: "bg-amber-900/10 hover:bg-amber-900/20",
      badgeText: "text-amber-950 font-semibold",
      borderColor: "border-amber-900/30",
    };
  }

  if (lower.includes("atcoder.jp") || lower.includes("atcoder")) {
    return {
      key: "atcoder",
      name: "AtCoder",
      badgeBg: "bg-slate-700/10 hover:bg-slate-700/20",
      badgeText: "text-slate-800 font-semibold",
      borderColor: "border-slate-700/30",
    };
  }

  let domainName = "External Link";
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("www.")) {
    try {
      const parsed = new URL(lower.startsWith("www.") ? `https://${lower}` : lower);
      domainName = parsed.hostname.replace(/^www\./, "");
    } catch {
      domainName = "External Link";
    }
  }

  return {
    key: "other",
    name: domainName,
    badgeBg: "bg-teal/10 hover:bg-teal/20",
    badgeText: "text-teal font-semibold",
    borderColor: "border-teal/30",
  };
}

export function PlatformSVG({ platform }: { platform: PlatformKey }) {
  switch (platform) {
    case "leetcode":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#FFA116]" aria-hidden="true">
          <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.135 5.31 5.31 0 0 0-.097 2.438c.135.9.57 1.737 1.238 2.373l3.29 3.123 3.855 3.658a1.368 1.368 0 0 0 1.93-.06 1.367 1.367 0 0 0 .06-1.93l-3.855-3.658a2.532 2.532 0 0 1-.593-1.134 2.57 2.57 0 0 1 .046-1.168 2.52 2.52 0 0 1 .58-.1l3.854-4.126 5.406-5.788A1.368 1.368 0 0 0 13.483 0zm4.102 12.062a1.368 1.368 0 0 0-1.368 1.368v.005a1.368 1.368 0 0 0 1.368 1.368h4.5a1.368 1.368 0 0 0 1.368-1.368v-.005a1.368 1.368 0 0 0-1.368-1.368h-4.5z" />
        </svg>
      );
    case "geeksforgeeks":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#2F9E44]" aria-hidden="true">
          <path d="M19 10.5A3.5 3.5 0 0 0 15.5 7H14v2h1.5a1.5 1.5 0 0 1 0 3H14v2h1.5A3.5 3.5 0 0 0 19 10.5zM10 7H5a3.5 3.5 0 0 0 0 7h5v-2H5a1.5 1.5 0 0 1 0-3h5V7z" />
          <path d="M11 4.5h2v15h-2z" />
        </svg>
      );
    case "codeforces":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
          <rect x="2.5" y="10" width="4.5" height="11" rx="1" fill="#FFCC00" />
          <rect x="9.75" y="3" width="4.5" height="18" rx="1" fill="#318CE7" />
          <rect x="17" y="7" width="4.5" height="14" rx="1" fill="#FF3333" />
        </svg>
      );
    case "codechef":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#5B3214]" aria-hidden="true">
          <path d="M12 2A5 5 0 0 0 7.1 6.3 4.5 4.5 0 0 0 3.5 11c0 2.3 1.7 4.2 3.9 4.5v3.5a1 1 0 0 0 1 1h7.2a1 1 0 0 0 1-1v-3.5c2.2-.3 3.9-2.2 3.9-4.5 0-2.2-1.6-4.1-3.6-4.7A5 5 0 0 0 12 2zm-3 15h6v1.5H9V17z" />
        </svg>
      );
    case "atcoder":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-slate-800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 2 22 22 22 12 2" />
          <polygon points="12 9 7 19 17 19 12 9" fill="#1F2937" />
        </svg>
      );
    case "other":
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-teal" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      );
  }
}

export function ProblemLinkButton({
  url,
  showLabel = false,
  className = "",
}: {
  url?: string | null;
  showLabel?: boolean;
  className?: string;
}) {
  const info = identifyPlatform(url);
  if (!info || !url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 rounded-lg border ${info.borderColor} ${info.badgeBg} ${info.badgeText} px-2 py-1 text-xs transition-all hover:scale-105 active:scale-95 ${className}`}
      title={`Open problem on ${info.name}`}
      aria-label={`Open problem on ${info.name}`}
    >
      <PlatformSVG platform={info.key} />
      {showLabel && <span>{info.name}</span>}
    </a>
  );
}
