// stesso contenuto di supabase/haccp.sql: si copia dall'app se la tabella manca
export const HACCP_SQL = `-- ═══════════════════════════════════════════════════════════════
--  REGISTRI HACCP: temperature, sanificazione, ricevimento merci,
--  non conformità, abbattimenti, etichette, olio frittura, scadenze.
--  Una riga per registrazione, condivisa da tutta la brigata della cucina.
--  Incolla tutto nel SQL Editor di Supabase e premi Run. Si può rieseguire.
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.haccp_records (
  id          uuid primary key default gen_random_uuid(),
  kitchen_id  uuid not null references public.kitchens(id) on delete cascade,
  kind        text not null check (kind in ('temp','sanif','ricevimento','nc','abbattimento','etichetta','olio','task')),
  at          timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb,
  by_user     uuid references auth.users(id) on delete set null default auth.uid(),
  by_name     text,
  updated_at  timestamptz not null default now()
);
create index if not exists haccp_records_k_at on public.haccp_records (kitchen_id, at desc);
create index if not exists haccp_records_k_kind_at on public.haccp_records (kitchen_id, kind, at desc);

alter table public.haccp_records enable row level security;
drop policy if exists hr_read   on public.haccp_records;
drop policy if exists hr_insert on public.haccp_records;
drop policy if exists hr_update on public.haccp_records;
drop policy if exists hr_delete on public.haccp_records;
-- tutta la brigata legge e registra; correggere una registrazione: chi l'ha fatta o chef/sous-chef/admin
create policy hr_read   on public.haccp_records for select to authenticated using (public.is_kitchen_member(kitchen_id));
create policy hr_insert on public.haccp_records for insert to authenticated with check (public.is_kitchen_member(kitchen_id));
create policy hr_update on public.haccp_records for update to authenticated
  using (public.is_kitchen_member(kitchen_id) and (by_user = auth.uid() or public.is_kitchen_manager(kitchen_id)))
  with check (public.is_kitchen_member(kitchen_id));
create policy hr_delete on public.haccp_records for delete to authenticated
  using (public.is_kitchen_manager(kitchen_id) or by_user = auth.uid());

-- aggiornamenti in tempo reale tra i telefoni della brigata
do \$\$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'haccp_records') then
    execute 'alter publication supabase_realtime add table public.haccp_records';
  end if;
end \$\$;
`
