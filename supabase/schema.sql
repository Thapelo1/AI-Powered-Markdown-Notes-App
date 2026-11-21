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
