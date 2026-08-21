-- 006_leetcode_session_cookie.sql
-- Store optional leetcode_session cookie on profiles table so users can sync
-- their entire solved problem catalog at any time with a single click.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leetcode_session text;
