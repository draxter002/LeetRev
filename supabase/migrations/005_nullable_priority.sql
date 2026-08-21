-- 005_nullable_priority.sql
-- Allow priority to be NULL for LeetCode-imported problems that haven't been manually
-- assigned a priority yet. The original NOT NULL constraint blocks import inserts.

ALTER TABLE public.problems
  ALTER COLUMN priority DROP NOT NULL;

-- Replace the old check constraint (if it exists by that name) with one that allows NULL
ALTER TABLE public.problems
  DROP CONSTRAINT IF EXISTS problems_priority_check;

ALTER TABLE public.problems
  ADD CONSTRAINT problems_priority_check
    CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high'));
