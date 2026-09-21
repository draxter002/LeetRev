export type NormalizedSubmission = {
  title: string;
  problem_link: string | null;
  topic: string;
  source: string;
  date_solved: string;
  leetcode_slug?: string | null;
  platform: string;
};

export type PlatformSyncConfig = {
  leetcode_username?: string | null;
  leetcode_session?: string | null;
  platform_handles?: {
    codeforces?: string;
    atcoder?: string;
    codechef?: string;
    geeksforgeeks?: string;
    [key: string]: string | undefined;
  };
};

/**
 * Extracts username from a LEETCODE_SESSION JWT cookie if available.
 */
export function extractUsernameFromJwt(token?: string | null): string | null {
  if (!token) return null;
  try {
    const raw = token.includes("LEETCODE_SESSION=")
      ? token.split("LEETCODE_SESSION=")[1].split(";")[0].trim()
      : token.trim();
    const parts = raw.split(".");
    if (parts.length >= 2) {
      const payloadStr = Buffer.from(parts[1], "base64").toString("utf-8");
      const payload = JSON.parse(payloadStr);
      return payload.username || payload.user_slug || null;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * LeetCode fetcher: uses GraphQL recentAcSubmissionList and/or session cookie.
 */
export async function fetchLeetCodeSubmissions(
  username?: string | null,
  sessionCookie?: string | null
): Promise<NormalizedSubmission[]> {
  const effectiveUsername = username?.trim() || extractUsernameFromJwt(sessionCookie);
  const results: NormalizedSubmission[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // 1. If username available, query GraphQL for recent accepted submissions (very fast & reliable)
  if (effectiveUsername) {
    try {
      const query = `
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentAcSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            timestamp
          }
        }
      `;
      const res = await fetch("https://leetcode.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://leetcode.com",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        body: JSON.stringify({
          query,
          variables: { username: effectiveUsername, limit: 30 },
        }),
        signal: AbortSignal.timeout(7000),
      });

      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        const list = j?.data?.recentAcSubmissionList || [];
        for (const item of list) {
          if (!item.title || !item.titleSlug) continue;
          const solvedDate = item.timestamp
            ? new Date(Number(item.timestamp) * 1000).toISOString().slice(0, 10)
            : today;
          results.push({
            title: item.title,
            problem_link: `https://leetcode.com/problems/${item.titleSlug}`,
            topic: "LeetCode Fetched",
            source: "leetcode_import",
            date_solved: solvedDate,
            leetcode_slug: item.titleSlug,
            platform: "leetcode",
          });
        }
      }
    } catch (err) {
      console.warn("[sync] LeetCode GraphQL fetch error:", err);
    }
  }

  // 2. If session cookie available and results empty or we want to backfill with REST
  if (sessionCookie && results.length === 0) {
    try {
      const cookieHeader = sessionCookie.includes("LEETCODE_SESSION=")
        ? sessionCookie
        : `LEETCODE_SESSION=${sessionCookie}`;

      const res = await fetch("https://leetcode.com/api/problems/all/", {
        headers: {
          Cookie: cookieHeader,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Referer: "https://leetcode.com/progress/",
        },
        signal: AbortSignal.timeout(9000),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const pairs: any[] = data?.stat_status_pairs || [];
        const solved = pairs.filter((p) => p.status === "ac");
        for (const p of solved.slice(0, 50)) {
          const title = p.stat?.question__title;
          const slug = p.stat?.question__title_slug;
          if (title) {
            results.push({
              title,
              problem_link: slug ? `https://leetcode.com/problems/${slug}` : null,
              topic: "LeetCode Fetched",
              source: "leetcode_import",
              date_solved: today,
              leetcode_slug: slug || null,
              platform: "leetcode",
            });
          }
        }
      }
    } catch (err) {
      console.warn("[sync] LeetCode session REST fetch error:", err);
    }
  }

  return results;
}

/**
 * Codeforces fetcher: uses public user.status API.
 */
export async function fetchCodeforcesSubmissions(handle?: string | null): Promise<NormalizedSubmission[]> {
  if (!handle || !handle.trim()) return [];
  const cleanHandle = handle.trim();
  const results: NormalizedSubmission[] = [];

  try {
    const res = await fetch(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(cleanHandle)}&from=1&count=40`,
      {
        headers: { "User-Agent": "LeetRev/1.0" },
        signal: AbortSignal.timeout(7000),
      }
    );

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.status === "OK" && Array.isArray(json.result)) {
        for (const sub of json.result) {
          if (sub.verdict !== "OK" || !sub.problem?.name) continue;
          const p = sub.problem;
          const contestId = p.contestId;
          const index = p.index || "";
          const link =
            contestId && contestId < 100000
              ? `https://codeforces.com/contest/${contestId}/problem/${index}`
              : contestId
              ? `https://codeforces.com/gym/${contestId}/problem/${index}`
              : `https://codeforces.com/problemsets`;

          const tag = (Array.isArray(p.tags) && p.tags[0]) || "Codeforces";
          const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
          const solvedDate = sub.creationTimeSeconds
            ? new Date(sub.creationTimeSeconds * 1000).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

          results.push({
            title: `${index ? `${index}. ` : ""}${p.name}`,
            problem_link: link,
            topic: capitalizedTag,
            source: "codeforces_import",
            date_solved: solvedDate,
            platform: "codeforces",
          });
        }
      }
    }
  } catch (err) {
    console.warn("[sync] Codeforces API fetch error:", err);
  }

  return results;
}

/**
 * AtCoder fetcher: uses Kenkoooo AtCoder submissions API.
 */
export async function fetchAtCoderSubmissions(handle?: string | null): Promise<NormalizedSubmission[]> {
  if (!handle || !handle.trim()) return [];
  const cleanHandle = handle.trim();
  const results: NormalizedSubmission[] = [];

  try {
    // Check submissions from the past 60 days
    const fromSecond = Math.floor(Date.now() / 1000) - 60 * 86400;
    const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(
      cleanHandle
    )}&from_second=${fromSecond}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "LeetRev/1.0" },
      signal: AbortSignal.timeout(7000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => []);
      if (Array.isArray(data)) {
        for (const sub of data) {
          if (sub.result !== "AC" || !sub.problem_id) continue;
          const contestId = sub.contest_id || "";
          const problemId = sub.problem_id;
          const link = `https://atcoder.jp/contests/${contestId}/tasks/${problemId}`;

          const formattedTitle = problemId
            .replace(/^[a-z0-9]+_/, "")
            .toUpperCase()
            .replace(/_/g, " ");
          const fullTitle = `${contestId.toUpperCase()} - Problem ${formattedTitle || problemId}`;

          const solvedDate = sub.epoch_second
            ? new Date(sub.epoch_second * 1000).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);

          results.push({
            title: fullTitle,
            problem_link: link,
            topic: "AtCoder",
            source: "atcoder_import",
            date_solved: solvedDate,
            platform: "atcoder",
          });
        }
      }
    }
  } catch (err) {
    console.warn("[sync] AtCoder API fetch error:", err);
  }

  return results;
}

/**
 * CodeChef fetcher: parses publicly accessible profile data.
 */
export async function fetchCodeChefSubmissions(handle?: string | null): Promise<NormalizedSubmission[]> {
  if (!handle || !handle.trim()) return [];
  const cleanHandle = handle.trim();
  const results: NormalizedSubmission[] = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch(`https://www.codechef.com/users/${encodeURIComponent(cleanHandle)}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (res.ok) {
      const html = await res.text();
      // Match problem links in the fully solved practice/contest sections: /problems/PROBLEMCODE
      const matches = html.matchAll(/href=["']\/problems\/([A-Za-z0-9_]+)["']/g);
      const seenCodes = new Set<string>();

      for (const m of matches) {
        const code = m[1];
        if (code && !seenCodes.has(code) && code !== "submit") {
          seenCodes.add(code);
          results.push({
            title: `CodeChef ${code}`,
            problem_link: `https://www.codechef.com/problems/${code}`,
            topic: "CodeChef",
            source: "codechef_import",
            date_solved: today,
            platform: "codechef",
          });
          if (results.length >= 25) break;
        }
      }
    }
  } catch (err) {
    console.warn("[sync] CodeChef fetch error:", err);
  }

  return results;
}

/**
 * GeeksforGeeks fetcher: fetches solved practice problems for user handle.
 */
export async function fetchGeeksforGeeksSubmissions(handle?: string | null): Promise<NormalizedSubmission[]> {
  if (!handle || !handle.trim()) return [];
  const cleanHandle = handle.trim();
  const results: NormalizedSubmission[] = [];
  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        body: JSON.stringify({ handle: cleanHandle }),
        signal: AbortSignal.timeout(7000),
      }
    );

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      const rawList = json?.result || json?.data || [];
      if (Array.isArray(rawList)) {
        for (const item of rawList.slice(0, 25)) {
          const title = item.problem_name || item.title || item.name;
          const slug = item.problem_slug || item.slug;
          if (title) {
            results.push({
              title,
              problem_link: slug ? `https://www.geeksforgeeks.org/problems/${slug}/1` : "https://www.geeksforgeeks.org",
              topic: "GeeksforGeeks",
              source: "geeksforgeeks_import",
              date_solved: today,
              platform: "geeksforgeeks",
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[sync] GeeksforGeeks fetch error:", err);
  }

  return results;
}

/**
 * Concurrently syncs all configured platforms for a user.
 */
export async function syncAllPlatforms(config: PlatformSyncConfig): Promise<{
  submissions: NormalizedSubmission[];
  platformsChecked: string[];
}> {
  const tasks: { platform: string; promise: Promise<NormalizedSubmission[]> }[] = [];
  const platformsChecked: string[] = [];

  // LeetCode
  if (config.leetcode_username || config.leetcode_session) {
    platformsChecked.push("leetcode");
    tasks.push({
      platform: "leetcode",
      promise: fetchLeetCodeSubmissions(config.leetcode_username, config.leetcode_session),
    });
  }

  // Codeforces
  const cfHandle = config.platform_handles?.codeforces;
  if (cfHandle) {
    platformsChecked.push("codeforces");
    tasks.push({
      platform: "codeforces",
      promise: fetchCodeforcesSubmissions(cfHandle),
    });
  }

  // AtCoder
  const atCoderHandle = config.platform_handles?.atcoder;
  if (atCoderHandle) {
    platformsChecked.push("atcoder");
    tasks.push({
      platform: "atcoder",
      promise: fetchAtCoderSubmissions(atCoderHandle),
    });
  }

  // CodeChef
  const ccHandle = config.platform_handles?.codechef;
  if (ccHandle) {
    platformsChecked.push("codechef");
    tasks.push({
      platform: "codechef",
      promise: fetchCodeChefSubmissions(ccHandle),
    });
  }

  // GeeksforGeeks
  const gfgHandle = config.platform_handles?.geeksforgeeks;
  if (gfgHandle) {
    platformsChecked.push("geeksforgeeks");
    tasks.push({
      platform: "geeksforgeeks",
      promise: fetchGeeksforGeeksSubmissions(gfgHandle),
    });
  }

  const settled = await Promise.allSettled(tasks.map((t) => t.promise));
  const submissions: NormalizedSubmission[] = [];

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === "fulfilled") {
      submissions.push(...outcome.value);
    } else {
      console.warn(`[syncAllPlatforms] ${tasks[i].platform} error:`, outcome.reason);
    }
  }

  return { submissions, platformsChecked };
}
