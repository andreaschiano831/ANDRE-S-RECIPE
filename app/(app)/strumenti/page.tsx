import { redirect } from 'next/navigation'
import Tools from '@/components/Tools'
import { getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'
import { RECIPE_SELECT, sortParts, type Recipe } from '@/lib/recipes'

export const dynamic = 'force-dynamic'

export default async function ToolsPage() {
  const s = (await getSession())!
  if (!s.canEdit) redirect('/')
  const [{ books, sections }, { data }] = await Promise.all([
    loadCatalog(s.supabase),
    s.supabase.from('recipes').select(RECIPE_SELECT).order('name'),
  ])
  const recipes = ((data ?? []) as unknown as Recipe[]).map(sortParts)
  return (
    <main className="narrow page">
      <header className="ph">
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="h1">Strumenti</h1>
          <p>Backup dei ricettari, controllo dei doppioni e ordine nei gruppi piatto.</p>
        </div>
      </header>
      <Tools recipes={recipes} books={books} sections={sections} isAdmin={s.isAdmin} />
    </main>
  )
}
