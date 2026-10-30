-- ═══════════════════════════════════════════════════════════════
--  BIBLIOTECA: ebook (EPUB e PDF) da sfogliare nell'app
--  Incolla tutto nel SQL Editor di Supabase e premi Run. Si può rieseguire.
-- ═══════════════════════════════════════════════════════════════

-- libri: visibili a tutti gli utenti, caricati da chef e admin
create table if not exists public.library_books (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  author      text,
  kind        text not null check (kind in ('epub','pdf')),
  file_path   text not null,
  cover_path  text,
  size_bytes  bigint,
  pages       int,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- dove sono arrivato (per utente, sincronizzato tra dispositivi)
create table if not exists public.library_progress (
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  book_id     uuid not null references public.library_books(id) on delete cascade,
  location    text,
  percent     real not null default 0,
  settings    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- segnalibri, evidenziazioni e note (per utente)
create table if not exists public.library_marks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  book_id     uuid not null references public.library_books(id) on delete cascade,
  kind        text not null check (kind in ('bookmark','highlight')),
  location    text not null,
  label       text,
  text        text,
  note        text,
  color       text default 'yellow',
  created_at  timestamptz not null default now()
);
create index if not exists library_marks_book_idx on public.library_marks(user_id, book_id);

alter table public.library_books    enable row level security;
alter table public.library_progress enable row level security;
alter table public.library_marks    enable row level security;

drop policy if exists lb_read  on public.library_books;
drop policy if exists lb_write on public.library_books;
create policy lb_read  on public.library_books for select to authenticated using (true);
create policy lb_write on public.library_books for all    to authenticated using (public.is_editor()) with check (public.is_editor());

drop policy if exists lp_own on public.library_progress;
create policy lp_own on public.library_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists lm_own on public.library_marks;
create policy lm_own on public.library_marks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- archivio dei file (privato: si apre solo dall'app con il login)
insert into storage.buckets (id, name, public, file_size_limit)
values ('library', 'library', false, 52428800)
on conflict (id) do nothing;

drop policy if exists library_read   on storage.objects;
drop policy if exists library_insert on storage.objects;
drop policy if exists library_update on storage.objects;
drop policy if exists library_delete on storage.objects;
create policy library_read   on storage.objects for select to authenticated using (bucket_id = 'library');
create policy library_insert on storage.objects for insert to authenticated with check (bucket_id = 'library' and public.is_editor());
create policy library_update on storage.objects for update to authenticated using (bucket_id = 'library' and public.is_editor());
create policy library_delete on storage.objects for delete to authenticated using (bucket_id = 'library' and public.is_editor());

-- ═══ Fine biblioteca: se vedi questa riga hai copiato tutto ═══
