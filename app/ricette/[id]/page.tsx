import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import RecipeView from '@/components/RecipeView'
import { getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'
import { RECIPE_SELECT, sortParts, type Recipe } from '@/lib/recipes'

export const dynamic = 'force-dynamic'

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = (await getSession())!
  const [{ data }, { books, sections }] = await Promise.all([
    s.supabase.from('recipes').select(RECIPE_SELECT).eq('id', id).maybeSingle(),
    loadCatalog(s.supabase),
  ])
  if (!data) notFound()
  const recipe = sortParts(data as unknown as Recipe)
  const sec = sections.find((x) => x.id === recipe.section_id)
  const book = books.find((b) => b.id === sec?.book_id)
  return (
    <>
      <Header active="ricette" />
      <main className="narrow page">
        <RecipeView recipe={recipe} bookName={book?.name ?? ''} sectionName={sec?.name ?? ''}
          backHref={`/ricette?ricettario=${book?.id ?? ''}&sezione=${sec?.id ?? ''}`} canEdit={s.canEdit} />
      </main>
    </>
  )
}
