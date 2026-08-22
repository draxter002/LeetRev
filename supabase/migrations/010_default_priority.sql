-- Add default_priority column to profiles
alter table public.profiles
  add column if not exists default_priority text not null default 'medium';

-- Recreate signup trigger to seed default intervals and priority from user metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  interval_days integer;
  intervals integer[];
  def_priority text;
begin
  interval_days := null;
  if (new.raw_user_meta_data->>'default_revision_interval') ~ '^[0-9]+$' then
    interval_days := (new.raw_user_meta_data->>'default_revision_interval')::integer;
  end if;
  if interval_days is null or interval_days < 1 then
    interval_days := 5;
  end if;
  intervals := array[interval_days];

  def_priority := new.raw_user_meta_data->>'default_priority';
  if def_priority is null or def_priority not in ('low', 'medium', 'high') then
    def_priority := 'medium';
  end if;

  insert into public.profiles (id, display_name, default_revision_intervals, default_priority)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    intervals,
    def_priority
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    default_revision_intervals = coalesce(public.profiles.default_revision_intervals, excluded.default_revision_intervals),
    default_priority = coalesce(public.profiles.default_priority, excluded.default_priority);

  return new;
end;
$$;
