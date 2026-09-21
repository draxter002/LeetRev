-- Migration 011: Add platform_links column to problems
-- Stores a JSON map of { platform_key: url } so one problem can link to multiple platforms.
-- e.g. { "leetcode": "https://leetcode.com/problems/two-sum", "codeforces": "https://..." }

ALTER TABLE problems
  ADD COLUMN IF NOT EXISTS platform_links jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN problems.platform_links IS
  'JSON object mapping platform key (leetcode, codeforces, atcoder, codechef, geeksforgeeks) to problem URL. '
  'The primary problem_link column holds the canonical/first-seen link; platform_links holds all per-platform URLs.';
