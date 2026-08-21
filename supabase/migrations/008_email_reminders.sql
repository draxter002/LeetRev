-- 008_email_reminders.sql
-- Add email_reminders_enabled column to profiles table, default true

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email_reminders_enabled boolean DEFAULT true;
