import RecipeList, { type ListItem } from '@/components/RecipeList'
import { getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export default async function RicettePage({ searchParams }: { searchParams: Promise<{ ricettario?: string; sezione?: string; q?: string }> }) {
  const { ricettario, sezione, q } = await searchParams
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
  const initialBook = ricettario && books.some((b) => b.id === ricettario) ? ricettario : books.length === 1 ? books[0].id : 'tutti'
  const initialSection = sezione && sections.some((x) => x.id === sezione && (initialBook === 'tutti' || x.book_id === initialBook)) ? sezione : 'tutte'
  return (
    <>
      {error && <p className="err wrap" style={{ paddingTop: 16 }}>Il database non risponde: {error.message}</p>}
      <RecipeList items={items} books={books} sections={sections} initialBook={initialBook} initialSection={initialSection} initialQ={q ?? ''} canEdit={s.canEdit} />
    </>
  )
}
