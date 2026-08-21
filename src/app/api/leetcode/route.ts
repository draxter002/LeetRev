import { NextRequest, NextResponse } from "next/server";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

const PROFILE_QUERY = `
  query userPublicProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`;

export const RECENT_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      title
      titleSlug
    }
  }
`;

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  try {
    const profileRes = await fetch(LEETCODE_GRAPHQL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
      },
      body: JSON.stringify({
        query: PROFILE_QUERY,
        variables: { username },
      }),
      next: { revalidate: 300 },
    });

    if (!profileRes.ok) {
      return NextResponse.json(
        { error: `LeetCode returned ${profileRes.status}` },
        { status: 502 }
      );
    }

    const profileJson = await profileRes.json();
    const matched = profileJson?.data?.matchedUser;
    if (!matched) {
      return NextResponse.json(
        { error: "User not found on LeetCode" },
        { status: 404 }
      );
    }

    const counts: { difficulty: string; count: number }[] =
      matched.submitStats?.acSubmissionNum ?? [];
    const byDiff = Object.fromEntries(counts.map((c) => [c.difficulty, c.count]));

    let recentTitles: string[] = [];
    try {
      const recentRes = await fetch(LEETCODE_GRAPHQL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://leetcode.com",
        },
        body: JSON.stringify({
          query: RECENT_QUERY,
          variables: { username, limit: 10 },
        }),
        next: { revalidate: 300 },
      });
      if (recentRes.ok) {
        const recentJson = await recentRes.json();
        const list = recentJson?.data?.recentAcSubmissionList ?? [];
        // return objects with title and slug so callers can create links
        recentTitles = list
          .map((x: { title: string; titleSlug: string }) => ({
            title: x.title,
            titleSlug: x.titleSlug,
          }))
          .filter((x: { title: string }) => !!x.title);
      }
    } catch {
      // recent list is best-effort
    }

    return NextResponse.json({
      username: matched.username,
      totalSolved: byDiff.All ?? 0,
      easySolved: byDiff.Easy ?? 0,
      mediumSolved: byDiff.Medium ?? 0,
      hardSolved: byDiff.Hard ?? 0,
      recent: recentTitles,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to reach LeetCode",
      },
      { status: 502 }
    );
  }
}
