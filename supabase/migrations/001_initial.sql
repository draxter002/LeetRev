-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  leetcode_username text,
  default_revision_intervals integer[] not null default '{5}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Problems
create table if not exists public.problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  topic text not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  problem_link text,
  date_added date not null default (current_date),
  date_solved date,
  revision_intervals integer[] not null default '{}',
  solutions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists problems_user_id_idx on public.problems (user_id);
create index if not exists problems_date_solved_idx on public.problems (user_id, date_solved);

-- Revision schedule entries (one row per track occurrence)
create table if not exists public.revision_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  scheduled_date date not null,
  interval_days integer not null check (interval_days > 0),
  interval_label text not null,
  status text not null check (status in ('pending', 'done', 'missed')) default 'pending',
  completed_date date,
  created_at timestamptz not null default now()
);

create index if not exists revision_entries_due_idx
  on public.revision_entries (user_id, status, scheduled_date);
create index if not exists revision_entries_problem_idx
  on public.revision_entries (problem_id, status, scheduled_date);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.revision_entries enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "problems_select_own" on public.problems
  for select using (auth.uid() = user_id);
create policy "problems_insert_own" on public.problems
  for insert with check (auth.uid() = user_id);
create policy "problems_update_own" on public.problems
  for update using (auth.uid() = user_id);
create policy "problems_delete_own" on public.problems
  for delete using (auth.uid() = user_id);

create policy "revisions_select_own" on public.revision_entries
  for select using (auth.uid() = user_id);
create policy "revisions_insert_own" on public.revision_entries
  for insert with check (auth.uid() = user_id);
create policy "revisions_update_own" on public.revision_entries
  for update using (auth.uid() = user_id);
create policy "revisions_delete_own" on public.revision_entries
  for delete using (auth.uid() = user_id);
