-- Margin stores one markdown note per account. Deleting an auth user deletes their note.
create table public.notes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  content text not null default '' check (char_length(content) <= 20000)
);

-- Browser clients use a publishable key; row-level security restricts every row to its owner.
alter table public.notes enable row level security;

create policy "Users can read their own note"
  on public.notes for select
  using ((select auth.uid()) = user_id);

create policy "Users can create their own note"
  on public.notes for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own note"
  on public.notes for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- User behavior events omit note content and credentials; users can read only their own events.
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 80),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.activity_events enable row level security;

create policy "Users can read their own activity events"
  on public.activity_events for select
  using ((select auth.uid()) = user_id);

create policy "Users can create their own activity events"
  on public.activity_events for insert
  with check ((select auth.uid()) = user_id);

create index activity_events_user_created_idx
  on public.activity_events (user_id, created_at desc);
