import { notFound } from 'next/navigation'
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
    <RecipeView recipe={recipe} bookName={books.length > 1 ? book?.name ?? '' : ''} sectionName={sec?.name ?? ''}
      backHref={`/ricette?ricettario=${book?.id ?? ''}&sezione=${sec?.id ?? ''}`} canEdit={s.canEdit} />
  )
}
