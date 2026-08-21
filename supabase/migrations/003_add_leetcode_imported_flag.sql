-- 003_add_leetcode_imported_flag.sql

-- Add a flag to profiles to record whether LeetCode recent solves have been imported
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leetcode_imported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS leetcode_imported_at timestamptz NULL;

-- Recommend a unique index on problems by user_id + problem_link to avoid duplicate imports
-- This index is partial: only applies when problem_link is non-empty
CREATE UNIQUE INDEX IF NOT EXISTS ux_problems_user_link
  ON public.problems (user_id, problem_link)
  WHERE problem_link IS NOT NULL AND problem_link <> '';

-- Backfill: mark profiles as imported if the user already has problems with leetcode links
UPDATE public.profiles p
SET leetcode_imported = true,
    leetcode_imported_at = NOW()
WHERE EXISTS (
  SELECT 1 FROM public.problems pr
  WHERE pr.user_id = p.id
    AND pr.problem_link ILIKE '%leetcode.com%'
);
