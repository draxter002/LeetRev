-- 009_revision_disabled.sql
-- Add revision_disabled column to problems table, default false

ALTER TABLE public.problems
ADD COLUMN IF NOT EXISTS revision_disabled boolean DEFAULT false;
