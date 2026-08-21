-- Default revision intervals for new/imported problems
alter table public.profiles
  add column if not exists default_revision_intervals integer[] not null default '{5}';

-- Recreate signup trigger to seed default intervals from user metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  interval_days integer;
  intervals integer[];
begin
  interval_days := null;
  if (new.raw_user_meta_data->>'default_revision_interval') ~ '^[0-9]+$' then
    interval_days := (new.raw_user_meta_data->>'default_revision_interval')::integer;
  end if;
  if interval_days is null or interval_days < 1 then
    interval_days := 5;
  end if;
  intervals := array[interval_days];

  insert into public.profiles (id, display_name, default_revision_intervals)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    intervals
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    default_revision_intervals = excluded.default_revision_intervals;

  return new;
end;
$$;
