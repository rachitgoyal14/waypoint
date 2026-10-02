-- waypoint — Supabase schema
--
-- Run this once in the Supabase dashboard (SQL Editor) or with
-- `supabase db push`. Every table is guarded by row-level security so
-- each user only ever sees their own rows.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  folder_id uuid,
  is_daily boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  parent_folder_id uuid references public.folders (id) on delete cascade
);

create table if not exists public.note_links (
  source_note_id uuid not null references public.notes (id) on delete cascade,
  target_note_id uuid not null references public.notes (id) on delete cascade,
  primary key (source_note_id, target_note_id)
);

create index if not exists notes_user_idx on public.notes (user_id);
create index if not exists notes_folder_idx on public.notes (folder_id);
create index if not exists folders_user_idx on public.folders (user_id);
create index if not exists note_links_target_idx on public.note_links (target_note_id);


alter table public.notes enable row level security;
alter table public.folders enable row level security;
alter table public.note_links enable row level security;


create policy "own notes"
  on public.notes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own folders"
  on public.folders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Links belong to the owner of the source note; the target is any note
-- the user can see, which for a single-user vault means their own.
-- (Client code also stamps user_id explicitly on every insert, so writes
-- work even on databases created before the auth.uid() defaults below.)

-- If your tables predate the `default auth.uid()` on user_id, run once:
--   alter table public.notes alter column user_id set default auth.uid();
--   alter table public.folders alter column user_id set default auth.uid();
create policy "own links"
  on public.note_links for all
  using (
    exists (
      select 1 from public.notes n
      where n.id = source_note_id and n.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.notes n
      where n.id = source_note_id and n.user_id = auth.uid()
    )
  );
