create extension if not exists pgcrypto;

create table if not exists public.pairs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.pair_members (
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (pair_id, user_id)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pair_id uuid not null references public.pairs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  author text not null check (author in ('Me','You')),
  mood text not null check (mood in ('great','good','ok','meh','rough')),
  text text not null check (char_length(text) <= 220)
);

create unique index if not exists entries_unique on public.entries(pair_id, date, author);

alter table public.pair_members enable row level security;
alter table public.entries enable row level security;

create policy if not exists "pair_members_select" on public.pair_members
for select using (user_id = auth.uid());

create policy if not exists "entries_select_pair_members" on public.entries
for select using (
  exists (
    select 1 from public.pair_members pm
    where pm.pair_id = entries.pair_id
      and pm.user_id = auth.uid()
  )
);

create policy if not exists "entries_insert_self" on public.entries
for insert with check (
  auth.uid() = user_id and
  exists (
    select 1 from public.pair_members pm
    where pm.pair_id = entries.pair_id
      and pm.user_id = auth.uid()
  )
);

create policy if not exists "entries_update_self" on public.entries
for update using (
  user_id = auth.uid() and 
  exists (
    select 1 from public.pair_members pm
    where pm.pair_id = entries.pair_id
      and pm.user_id = auth.uid()
  )
) with check (
  user_id = auth.uid() and 
  exists (
    select 1 from public.pair_members pm
    where pm.pair_id = entries.pair_id
      and pm.user_id = auth.uid()
  )
);

create policy if not exists "entries_delete_self" on public.entries
for delete using (
  user_id = auth.uid() and 
  exists (
    select 1 from public.pair_members pm
    where pm.pair_id = entries.pair_id
      and pm.user_id = auth.uid()
  )
);