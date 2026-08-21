-- 004_leetcode_slug_and_source.sql

-- Add leetcode_slug and source to problems; add unique index on user_id + leetcode_slug
ALTER TABLE public.problems
  ADD COLUMN IF NOT EXISTS leetcode_slug text NULL,
  ADD COLUMN IF NOT EXISTS source text NULL;

-- Use a partial unique index to dedupe imports by slug per user
CREATE UNIQUE INDEX IF NOT EXISTS ux_problems_user_leetcode_slug
  ON public.problems (user_id, leetcode_slug)
  WHERE leetcode_slug IS NOT NULL AND leetcode_slug <> '';

-- Backfill `source` for existing leetcode-linked problems
UPDATE public.problems
SET source = 'leetcode_import',
    leetcode_slug = regexp_replace(problem_link, '^.*/problems/([^/]+)/?.*$', '\\1')
WHERE problem_link ILIKE '%leetcode.com/problems/%' AND (source IS NULL OR source = '');
