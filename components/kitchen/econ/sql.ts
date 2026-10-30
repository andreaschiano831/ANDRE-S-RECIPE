// stesso contenuto di supabase/economia.sql
export const ECON_SQL = `-- ═══════════════════════════════════════════════════════════════
--  GESTIONE ECONOMICA: fatture d'acquisto, vendite, costi fissi.
--  Visibili e modificabili solo da admin, chef e sous-chef della cucina.
--  Incolla tutto nel SQL Editor di Supabase e premi Run. Si può rieseguire.
-- ═══════════════════════════════════════════════════════════════
create table if not exists public.econ_records (
  id          uuid primary key default gen_random_uuid(),
  kitchen_id  uuid not null references public.kitchens(id) on delete cascade,
  kind        text not null check (kind in ('fattura','vendita','costo')),
  at          timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb,
  by_user     uuid references auth.users(id) on delete set null default auth.uid(),
  by_name     text,
  updated_at  timestamptz not null default now()
);
create index if not exists econ_records_k_at on public.econ_records (kitchen_id, at desc);

alter table public.econ_records enable row level security;
drop policy if exists er_all on public.econ_records;
create policy er_all on public.econ_records for all to authenticated
  using (public.is_kitchen_manager(kitchen_id)) with check (public.is_kitchen_manager(kitchen_id));

do \$\$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'econ_records') then
    execute 'alter publication supabase_realtime add table public.econ_records';
  end if;
end \$\$;
`
