-- Apply to existing projects to add privacy-safe user behavior events.
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 80),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.activity_events enable row level security;

drop policy if exists "Users can read their own activity events"
  on public.activity_events;
create policy "Users can read their own activity events"
  on public.activity_events for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own activity events"
  on public.activity_events;
create policy "Users can create their own activity events"
  on public.activity_events for insert
  with check ((select auth.uid()) = user_id);

create index if not exists activity_events_user_created_idx
  on public.activity_events (user_id, created_at desc);
