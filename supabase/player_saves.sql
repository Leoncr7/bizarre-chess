-- Progress storage for authenticated players. The same migration was applied
-- to the connected Supabase project.
create table public.player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  active_match jsonb,
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

grant select, insert, update on public.player_saves to authenticated;

create policy "Players can read their own saves"
  on public.player_saves for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Players can create their own saves"
  on public.player_saves for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Players can update their own saves"
  on public.player_saves for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
