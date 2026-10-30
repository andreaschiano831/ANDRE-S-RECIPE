import { getAppSettings, getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'
import { RECIPE_SELECT } from '@/lib/recipes'
import { toPrintItem } from '@/lib/print-doc'
import QuickPrint from '@/components/QuickPrint'

export const dynamic = 'force-dynamic'

// Stampa subito: una o più ricette, senza creare un documento
export default async function StampaPage({ searchParams }: { searchParams: Promise<{ ids?: string; dose?: string; auto?: string }> }) {
  const { ids = '', dose = '1', auto } = await searchParams
  const s = (await getSession())!
  const list = ids.split(',').filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 100)
  const d = Math.min(100, Math.max(0.1, parseFloat(dose.replace(',', '.')) || 1))
  const [app, { sections }, { data }] = await Promise.all([
    getAppSettings(), loadCatalog(s.supabase),
    list.length ? s.supabase.from('recipes').select(RECIPE_SELECT).in('id', list) : Promise.resolve({ data: [] as any[] }),
  ])
  const secName = new Map(sections.map((x) => [x.id, x.name]))
  const byId = new Map((data ?? []).map((r: any) => [r.id, r]))
  const items = list.map((id) => byId.get(id)).filter(Boolean).map((r: any) => toPrintItem(r, d, secName.get(r.section_id)))
  return <main className="narrow page"><QuickPrint brand={app?.name ?? 'Ricettario'} items={items} ids={list} dose={d} auto={auto === '1'} /></main>
}
