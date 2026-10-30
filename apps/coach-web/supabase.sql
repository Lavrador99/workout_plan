-- Coach app sync table. Run once in Supabase → SQL Editor.
-- Each row is one client / exercise / session stored as JSON; only the
-- signed-in owner can read or write their rows (Row Level Security).

create table if not exists public.coach_records (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text not null check (kind in ('client', 'exercise', 'session')),
  data        jsonb not null,
  updated_at  bigint not null,
  deleted     boolean not null default false,
  server_ts   timestamptz not null default now()
);

create index if not exists coach_records_user_ts on public.coach_records (user_id, server_ts);

-- server_ts is set by the server on every write, so devices with a wrong
-- clock still pull each other's changes.
create or replace function public.coach_touch() returns trigger
language plpgsql as $$
begin
  new.server_ts := clock_timestamp();
  new.user_id := auth.uid();
  return new;
end $$;

drop trigger if exists coach_touch on public.coach_records;
create trigger coach_touch before insert or update on public.coach_records
  for each row execute function public.coach_touch();

alter table public.coach_records enable row level security;

drop policy if exists "own rows" on public.coach_records;
create policy "own rows" on public.coach_records
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
