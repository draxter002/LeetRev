"use client";

import React, { useState } from "react";

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
  domain: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
};

export function identifyPlatform(url?: string | null): PlatformInfo | null {
  if (!url || !url.trim()) return null;
  const lower = url.toLowerCase().trim();

  let domain = "";
  try {
    const parsed = new URL(lower.startsWith("http") ? lower : `https://${lower}`);
    domain = parsed.hostname.replace(/^www\./, "");
  } catch {
    domain = "";
  }

  if (lower.includes("leetcode.com") || lower.includes("leetcode.cn")) {
    return {
      key: "leetcode",
      name: "LeetCode",
      domain: domain || "leetcode.com",
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
      domain: domain || "geeksforgeeks.org",
      badgeBg: "bg-emerald-500/10 hover:bg-emerald-500/20",
      badgeText: "text-emerald-700 font-semibold",
      borderColor: "border-emerald-500/30",
    };
  }

  if (lower.includes("codeforces.com") || lower.includes("codeforces")) {
    return {
      key: "codeforces",
      name: "Codeforces",
      domain: domain || "codeforces.com",
      badgeBg: "bg-blue-500/10 hover:bg-blue-500/20",
      badgeText: "text-blue-700 font-semibold",
      borderColor: "border-blue-500/30",
    };
  }

  if (lower.includes("codechef.com") || lower.includes("codechef")) {
    return {
      key: "codechef",
      name: "CodeChef",
      domain: domain || "codechef.com",
      badgeBg: "bg-amber-900/10 hover:bg-amber-900/20",
      badgeText: "text-amber-950 font-semibold",
      borderColor: "border-amber-900/30",
    };
  }

  if (lower.includes("atcoder.jp") || lower.includes("atcoder")) {
    return {
      key: "atcoder",
      name: "AtCoder",
      domain: domain || "atcoder.jp",
      badgeBg: "bg-slate-700/10 hover:bg-slate-700/20",
      badgeText: "text-slate-800 font-semibold",
      borderColor: "border-slate-700/30",
    };
  }

  return {
    key: "other",
    name: domain || "External Link",
    domain: domain,
    badgeBg: "bg-teal/10 hover:bg-teal/20",
    badgeText: "text-teal font-semibold",
    borderColor: "border-teal/30",
  };
}

export function PlatformFavicon({ info }: { info: PlatformInfo }) {
  const [imgError, setImgError] = useState(false);

  // High quality vector SVGs for official platforms
  if (imgError || !info.domain) {
    switch (info.key) {
      case "leetcode":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#FFA116]" aria-hidden="true">
            <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.135 5.31 5.31 0 0 0-.097 2.438c.135.9.57 1.737 1.238 2.373l3.29 3.123 3.855 3.658a1.368 1.368 0 0 0 1.93-.06 1.367 1.367 0 0 0 .06-1.93l-3.855-3.658a2.532 2.532 0 0 1-.593-1.134 2.57 2.57 0 0 1 .046-1.168 2.52 2.52 0 0 1 .58-.1l3.854-4.126 5.406-5.788A1.368 1.368 0 0 0 13.483 0zm4.102 12.062a1.368 1.368 0 0 0-1.368 1.368v.005a1.368 1.368 0 0 0 1.368 1.368h4.5a1.368 1.368 0 0 0 1.368-1.368v-.005a1.368 1.368 0 0 0-1.368-1.368h-4.5z" />
          </svg>
        );
      case "geeksforgeeks":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#2F9E44]" aria-hidden="true">
            <path d="M19.146 8.329c-.382.493-.827.876-1.334 1.149a4.846 4.846 0 0 1-2.298.547c-.779 0-1.5-.16-2.164-.479a4.67 4.67 0 0 1-1.623-1.368l2.128-1.745c.342.424.717.733 1.127.927a2.52 2.52 0 0 0 1.077.291c.424 0 .786-.098 1.087-.294.301-.196.536-.458.705-.786.169-.328.254-.693.254-1.095 0-.465-.113-.865-.339-1.201a2.28 2.28 0 0 0-.903-.797 3.328 3.328 0 0 0-1.378-.328c-.533 0-1.012.113-1.437.339-.425.226-.759.544-1.002.955l-2.073-1.69c.479-.766 1.134-1.354 1.967-1.764C12.553 1.585 13.524 1.38 14.612 1.38c1.066 0 2.057.219 2.973.657a6.224 6.224 0 0 1 2.215 1.834c.595.785.893 1.703.893 2.754 0 1.053-.298 1.972-.893 2.757z" />
            <path d="M4.854 8.329c.382.493.827.876 1.334 1.149a4.846 4.846 0 0 0 2.298.547c.779 0 1.5-.16 2.164-.479a4.67 4.67 0 0 0 1.623-1.368L10.145 6.433a2.637 2.637 0 0 1-1.127.927 2.52 2.52 0 0 1-1.077.291c-.424 0-.786-.098-1.087-.294a1.737 1.737 0 0 1-.705-.786c-.169-.328-.254-.693-.254-1.095 0-.465.113-.865.339-1.201.226-.336.527-.602.903-.797.376-.195.835-.304 1.378-.328.533 0 1.012.113 1.437.339.425.226.759.544 1.002.955l2.073-1.69c-.479-.766-1.134-1.354-1.967-1.764C11.447 1.585 10.476 1.38 9.388 1.38c-1.066 0-2.057.219-2.973.657a6.224 6.224 0 0 0-2.215 1.834C3.605 4.656 3.307 5.574 3.307 6.625c0 1.053.298 1.972.893 2.757z" />
          </svg>
        );
      case "codeforces":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
            <rect x="2" y="10" width="5" height="11" rx="1" fill="#FFCC00" />
            <rect x="9.5" y="3" width="5" height="18" rx="1" fill="#318CE7" />
            <rect x="17" y="7" width="5" height="14" rx="1" fill="#FF3333" />
          </svg>
        );
      case "codechef":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#5B3214]" aria-hidden="true">
            <path d="M12.44 2C9.4 2 6.84 4.14 6.22 7C4.1 7.42 2.5 9.3 2.5 11.5c0 2.45 1.88 4.47 4.28 4.71v3.29a1.5 1.5 0 0 0 1.5 1.5h7.44a1.5 1.5 0 0 0 1.5-1.5v-3.29c2.4-.24 4.28-2.26 4.28-4.71 0-2.2-1.6-4.08-3.72-4.5.21-.6.32-1.24.32-1.9 0-3.04-2.56-5.4-5.6-5.4zm-4.16 16.5h7.44v1.5H8.28v-1.5z" />
          </svg>
        );
      case "atcoder":
        return (
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-[#000000]" aria-hidden="true">
            <path d="M12 2L1 21h22L12 2zm0 5.2L18.4 18H5.6L12 7.2z" />
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

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${info.domain}&sz=64`}
      alt={info.name}
      onError={() => setImgError(true)}
      className="h-4 w-4 shrink-0 rounded-xs object-contain"
    />
  );
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
      <PlatformFavicon info={info} />
      {showLabel && <span>{info.name}</span>}
    </a>
  );
}
