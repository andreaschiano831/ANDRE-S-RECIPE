-- ═══════════════════════════════════════════════════════════════
--  RICETTARIO — schema Supabase (base multi-ricettario)
--  Esegui tutto questo file in: Supabase → SQL Editor → New query → Run
--  È rieseguibile (usa IF NOT EXISTS / OR REPLACE dove possibile).
-- ═══════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── PROFILI E RUOLI ─────────────────────────────────────────────
-- admin : tutto, gestisce utenti
-- chef  : crea / modifica / elimina ricette
-- staff : sola lettura (commis, brigata)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'staff' check (role in ('admin','chef','staff')),
  created_at  timestamptz not null default now()
);

-- Il primo utente registrato diventa admin, gli altri staff
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'staff' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_role_name()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_editor()
returns boolean language sql stable as $$
  select coalesce(public.current_role_name() in ('admin','chef'), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(public.current_role_name() = 'admin', false)
$$;

-- ── IMPOSTAZIONI APP (nome, sottotitolo) ───────────────────────
create table if not exists public.app_settings (
  id       int primary key default 1 check (id = 1),
  name     text not null default 'Ricettario',
  tagline  text not null default 'Ricette professionali'
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ── RICETTARI (libri) ───────────────────────────────────────────
-- Ogni ricettario è un libro autonomo: di uno chef, di un ristorante, personale…
create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subtitle    text,
  color       text not null default '#5a4e2d',
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ── SEZIONI di un ricettario (es. Colazioni, Gelateria…) ────────
create table if not exists public.sections (
  id        uuid primary key default gen_random_uuid(),
  book_id   uuid not null references public.books(id) on delete cascade,
  name      text not null,
  subtitle  text,
  position  int  not null default 0,
  unique (book_id, name)
);
create index if not exists sections_book_idx on public.sections(book_id, position);

-- ── RICETTE ─────────────────────────────────────────────────────
create table if not exists public.recipes (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null references public.sections(id) on delete restrict,
  name        text not null,
  category    text not null default 'Altro',
  dish_group  text,                 -- "Piatto / Gruppo" (es. Paris Brest, Cioccolatini)
  yield_note  text,                 -- resa (es. "per 60 madeleine", "stampo 20 cm")
  notes       text,                 -- note libere
  source      text not null default 'manual' check (source in ('manual','ai_image','ai_text','legacy')),
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists recipes_section_idx on public.recipes(section_id);
create index if not exists recipes_name_idx    on public.recipes(lower(name));

create table if not exists public.recipe_ingredients (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes(id) on delete cascade,
  position   int  not null,
  name       text not null,
  quantity   numeric,               -- null = q.b.
  unit       text not null default 'g',
  note       text
);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients(recipe_id, position);

create table if not exists public.recipe_steps (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  position      int  not null,
  body          text not null,
  duration_min  int,                -- timer facoltativo in minuti
  temperature   text                -- es. "175°C ventilato", "+4°C"
);
create index if not exists recipe_steps_recipe_idx on public.recipe_steps(recipe_id, position);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists recipes_touch on public.recipes;
create trigger recipes_touch before update on public.recipes
  for each row execute function public.touch_updated_at();

-- ── DOCUMENTI DI STAMPA ─────────────────────────────────────────
create table if not exists public.print_documents (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  one_per_page  boolean not null default false,
  owner         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.print_document_items (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.print_documents(id) on delete cascade,
  recipe_id    uuid not null references public.recipes(id) on delete cascade,
  position     int not null,
  dose         numeric not null default 1
);

drop trigger if exists print_documents_touch on public.print_documents;
create trigger print_documents_touch before update on public.print_documents
  for each row execute function public.touch_updated_at();

-- ── SALVATAGGIO ATOMICO DI UNA RICETTA ──────────────────────────
-- Un'unica chiamata salva ricetta + ingredienti + procedimento.
-- Gira con i permessi dell'utente (RLS attive).
create or replace function public.save_recipe(payload jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  rid uuid := nullif(payload->>'id','')::uuid;
begin
  if not public.is_editor() then
    raise exception 'Permesso negato: serve il ruolo chef o admin';
  end if;

  if rid is null then
    insert into recipes (section_id, name, category, dish_group, yield_note, notes, source, created_by)
    values (
      (payload->>'section_id')::uuid, trim(payload->>'name'),
      coalesce(nullif(payload->>'category',''),'Altro'),
      nullif(trim(coalesce(payload->>'dish_group','')),''),
      nullif(trim(coalesce(payload->>'yield_note','')),''),
      nullif(trim(coalesce(payload->>'notes','')),''),
      coalesce(nullif(payload->>'source',''),'manual'),
      auth.uid()
    ) returning id into rid;
  else
    update recipes set
      section_id = (payload->>'section_id')::uuid,
      name       = trim(payload->>'name'),
      category   = coalesce(nullif(payload->>'category',''),'Altro'),
      dish_group = nullif(trim(coalesce(payload->>'dish_group','')),''),
      yield_note = nullif(trim(coalesce(payload->>'yield_note','')),''),
      notes      = nullif(trim(coalesce(payload->>'notes','')),'')
    where id = rid;
    if not found then raise exception 'Ricetta non trovata'; end if;
    delete from recipe_ingredients where recipe_id = rid;
    delete from recipe_steps       where recipe_id = rid;
  end if;

  insert into recipe_ingredients (recipe_id, position, name, quantity, unit, note)
  select rid, (ord - 1)::int, trim(x->>'name'),
         nullif(x->>'quantity','')::numeric,
         coalesce(nullif(trim(x->>'unit'),''),'g'),
         nullif(trim(coalesce(x->>'note','')),'')
  from jsonb_array_elements(coalesce(payload->'ingredients','[]'::jsonb)) with ordinality as t(x, ord)
  where trim(coalesce(x->>'name','')) <> '';

  insert into recipe_steps (recipe_id, position, body, duration_min, temperature)
  select rid, (ord - 1)::int, trim(x->>'body'),
         nullif(x->>'duration_min','')::int,
         nullif(trim(coalesce(x->>'temperature','')),'')
  from jsonb_array_elements(coalesce(payload->'steps','[]'::jsonb)) with ordinality as t(x, ord)
  where trim(coalesce(x->>'body','')) <> '';

  return rid;
end $$;

-- ── SICUREZZA (Row Level Security) ──────────────────────────────
alter table public.profiles             enable row level security;
alter table public.sections             enable row level security;
alter table public.books                enable row level security;
alter table public.app_settings         enable row level security;
alter table public.recipes              enable row level security;
alter table public.recipe_ingredients   enable row level security;
alter table public.recipe_steps         enable row level security;
alter table public.print_documents      enable row level security;
alter table public.print_document_items enable row level security;

-- profili: ognuno vede tutti (per i nomi), solo l'admin cambia i ruoli
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_admin  on public.profiles;
drop policy if exists profiles_self   on public.profiles;
create policy profiles_read  on public.profiles for select to authenticated using (true);
create policy profiles_admin on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ricettari, sezioni, impostazioni: lettura per tutti, gestione per l'admin
do $$
declare t text;
begin
  foreach t in array array['books','sections','app_settings'] loop
    execute format('drop policy if exists %I_read  on public.%I', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_read  on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end $$;
-- il nome dell'app serve anche nella pagina di login
drop policy if exists app_settings_public on public.app_settings;
create policy app_settings_public on public.app_settings for select to anon using (true);

-- ricette, ingredienti, step: lettura per la brigata, scrittura per chef/admin
do $$
declare t text;
begin
  foreach t in array array['recipes','recipe_ingredients','recipe_steps'] loop
    execute format('drop policy if exists %I_read  on public.%I', t, t);
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format('create policy %I_read  on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy %I_write on public.%I for all to authenticated using (public.is_editor()) with check (public.is_editor())', t, t);
  end loop;
end $$;

-- documenti di stampa: personali
drop policy if exists docs_owner  on public.print_documents;
drop policy if exists items_owner on public.print_document_items;
create policy docs_owner on public.print_documents for all to authenticated
  using (owner = auth.uid()) with check (owner = auth.uid());
create policy items_owner on public.print_document_items for all to authenticated
  using (exists (select 1 from public.print_documents d where d.id = document_id and d.owner = auth.uid()))
  with check (exists (select 1 from public.print_documents d where d.id = document_id and d.owner = auth.uid()));

grant execute on function public.save_recipe(jsonb) to authenticated;

-- ═══════════════════════════════════════════════════════════════
--  GESTIONE CUCINA (Kitchen Pro)
--  Più cucine separate: ognuna con brigata, codice d'invito,
--  ricettari collegati e uno stato condiviso (giacenze, MEP, ordini…)
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.kitchens (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,          -- codice d'invito per la brigata
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.kitchen_members (
  kitchen_id  uuid not null references public.kitchens(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'commis'
              check (role in ('admin','chef','sous-chef','capo-partita','commis','stagista','staff','fb','mm')),
  joined_at   timestamptz not null default now(),
  primary key (kitchen_id, user_id)
);
create index if not exists kitchen_members_user_idx on public.kitchen_members(user_id);

-- ricettari visibili in una cucina (per collegare ricette a piatti, MEP, food cost)
create table if not exists public.kitchen_books (
  kitchen_id  uuid not null references public.kitchens(id) on delete cascade,
  book_id     uuid not null references public.books(id) on delete cascade,
  primary key (kitchen_id, book_id)
);

-- stato condiviso di Kitchen Pro: un documento per cucina, salvato a versioni
create table if not exists public.kitchen_state (
  kitchen_id  uuid primary key references public.kitchens(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  version     bigint not null default 0,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

create or replace function public.kitchen_role(kid uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.kitchen_members where kitchen_id = kid and user_id = auth.uid()
$$;

create or replace function public.is_kitchen_member(kid uuid)
returns boolean language sql stable as $$ select public.kitchen_role(kid) is not null $$;

create or replace function public.is_kitchen_manager(kid uuid)
returns boolean language sql stable as $$
  select coalesce(public.kitchen_role(kid) in ('admin','chef','sous-chef'), false)
$$;

-- crea una cucina: chi la crea ne diventa admin
create or replace function public.create_kitchen(kitchen_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare kid uuid; c text;
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  if not public.is_editor() then raise exception 'Serve il ruolo chef o admin per creare una cucina'; end if;
  if coalesce(trim(kitchen_name),'') = '' then raise exception 'Nome cucina mancante'; end if;
  loop
    c := upper(substr(md5(random()::text), 1, 3) || '-' || (1000 + floor(random() * 9000))::int);
    exit when not exists (select 1 from kitchens where code = c);
  end loop;
  insert into kitchens (name, code, created_by) values (trim(kitchen_name), c, auth.uid()) returning id into kid;
  insert into kitchen_members (kitchen_id, user_id, role) values (kid, auth.uid(), 'admin');
  insert into kitchen_state (kitchen_id) values (kid);
  insert into kitchen_books (kitchen_id, book_id) select kid, id from books;
  return kid;
end $$;

-- entra in una cucina con il codice d'invito
create or replace function public.join_kitchen(invite_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare kid uuid;
begin
  if auth.uid() is null then raise exception 'Non autenticato'; end if;
  select id into kid from kitchens where code = upper(trim(invite_code));
  if kid is null then raise exception 'Codice non valido'; end if;
  insert into kitchen_members (kitchen_id, user_id, role) values (kid, auth.uid(), 'commis')
  on conflict (kitchen_id, user_id) do nothing;
  return kid;
end $$;

-- salva lo stato solo se nessun altro l'ha cambiato nel frattempo (versione attesa)
create or replace function public.save_kitchen_state(kid uuid, new_data jsonb, expected_version bigint)
returns jsonb language plpgsql security definer set search_path = public as $$
declare cur bigint;
begin
  if not public.is_kitchen_member(kid) then raise exception 'Non fai parte di questa cucina'; end if;
  select version into cur from kitchen_state where kitchen_id = kid for update;
  if cur is null then
    insert into kitchen_state (kitchen_id, data, version, updated_by) values (kid, new_data, 1, auth.uid());
    return jsonb_build_object('ok', true, 'version', 1);
  end if;
  if cur <> expected_version then
    return jsonb_build_object('ok', false, 'version', cur,
      'data', (select data from kitchen_state where kitchen_id = kid));
  end if;
  update kitchen_state set data = new_data, version = cur + 1, updated_at = now(), updated_by = auth.uid()
  where kitchen_id = kid;
  return jsonb_build_object('ok', true, 'version', cur + 1);
end $$;

alter table public.kitchens        enable row level security;
alter table public.kitchen_members enable row level security;
alter table public.kitchen_books   enable row level security;
alter table public.kitchen_state   enable row level security;

drop policy if exists kitchens_read   on public.kitchens;
drop policy if exists kitchens_update on public.kitchens;
drop policy if exists kitchens_delete on public.kitchens;
create policy kitchens_read   on public.kitchens for select to authenticated using (public.is_kitchen_member(id));
create policy kitchens_update on public.kitchens for update to authenticated using (public.is_kitchen_manager(id)) with check (public.is_kitchen_manager(id));
create policy kitchens_delete on public.kitchens for delete to authenticated using (public.kitchen_role(id) = 'admin');

drop policy if exists km_read   on public.kitchen_members;
drop policy if exists km_manage on public.kitchen_members;
drop policy if exists km_leave  on public.kitchen_members;
create policy km_read   on public.kitchen_members for select to authenticated using (public.is_kitchen_member(kitchen_id));
create policy km_manage on public.kitchen_members for update to authenticated using (public.is_kitchen_manager(kitchen_id)) with check (public.is_kitchen_manager(kitchen_id));
create policy km_leave  on public.kitchen_members for delete to authenticated using (public.is_kitchen_manager(kitchen_id) or user_id = auth.uid());

drop policy if exists kb_read   on public.kitchen_books;
drop policy if exists kb_manage on public.kitchen_books;
create policy kb_read   on public.kitchen_books for select to authenticated using (public.is_kitchen_member(kitchen_id));
create policy kb_manage on public.kitchen_books for all    to authenticated using (public.is_kitchen_manager(kitchen_id)) with check (public.is_kitchen_manager(kitchen_id));

drop policy if exists ks_read on public.kitchen_state;
create policy ks_read on public.kitchen_state for select to authenticated using (public.is_kitchen_member(kitchen_id));
-- le scritture passano solo da save_kitchen_state()

grant execute on function public.create_kitchen(text) to authenticated;
grant execute on function public.join_kitchen(text) to authenticated;
grant execute on function public.save_kitchen_state(uuid, jsonb, bigint) to authenticated;

-- aggiornamenti in tempo reale tra i telefoni della brigata
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'kitchen_state') then
    execute 'alter publication supabase_realtime add table public.kitchen_state';
  end if;
end $$;

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


-- ═══ Fine dello schema: se vedi questa riga nel SQL Editor hai copiato tutto ═══
