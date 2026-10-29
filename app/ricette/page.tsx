import Header from '@/components/Header'
import RecipeList, { type ListItem } from '@/components/RecipeList'
import { getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export default async function RicettePage({ searchParams }: { searchParams: Promise<{ ricettario?: string; sezione?: string }> }) {
  const { ricettario, sezione } = await searchParams
  const s = (await getSession())!
  const [{ books, sections }, { data: recipes, error }] = await Promise.all([
    loadCatalog(s.supabase),
    s.supabase
      .from('recipes')
      .select('id, section_id, name, category, dish_group, created_at, source, recipe_ingredients(name), recipe_steps(count)')
      .order('name'),
  ])
  const bookOf = new Map(sections.map((x) => [x.id, x.book_id]))

  const items: ListItem[] = (recipes ?? []).map((r: any) => ({
    id: r.id, section_id: r.section_id, book_id: bookOf.get(r.section_id) ?? '', name: r.name, category: r.category,
    dish_group: r.dish_group, created_at: r.created_at, source: r.source,
    ingredients: (r.recipe_ingredients ?? []).map((i: any) => i.name as string),
    steps: r.recipe_steps?.[0]?.count ?? 0,
  }))

  // se c'è un solo ricettario, è quello di default
  const initialBook = ricettario && books.some((b) => b.id === ricettario) ? ricettario : books.length === 1 ? books[0].id : 'tutti'
  const initialSection = sezione && sections.some((x) => x.id === sezione && (initialBook === 'tutti' || x.book_id === initialBook)) ? sezione : 'tutte'

  return (
    <>
      <Header active="ricette" />
      <main className="wrap page">
        {error && <p className="err">Errore database: {error.message}</p>}
        <RecipeList items={items} books={books} sections={sections} initialBook={initialBook} initialSection={initialSection} canEdit={s.canEdit} />
      </main>
    </>
  )
}
