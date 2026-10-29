import { notFound, redirect } from 'next/navigation'
import Header from '@/components/Header'
import RecipeEditor from '@/components/RecipeEditor'
import { getSession } from '@/lib/supabase/server'
import { loadEditorData } from '@/lib/editor-data'
import { RECIPE_SELECT, recipeToDraft, sortParts, type Recipe } from '@/lib/recipes'

export const dynamic = 'force-dynamic'

export default async function EditRecipe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = (await getSession())!
  if (!s.canEdit) redirect(`/ricette/${id}`)
  const [{ data: r }, data] = await Promise.all([
    s.supabase.from('recipes').select(RECIPE_SELECT).eq('id', id).maybeSingle(),
    loadEditorData(s.supabase),
  ])
  if (!r) notFound()
  const draft = recipeToDraft(sortParts(r as unknown as Recipe))
  if (!draft.steps.length) draft.steps = [{ body: '', duration_min: '', temperature: '' }]
  if (!draft.ingredients.length) draft.ingredients = [{ name: '', quantity: '', unit: 'g', note: '' }]
  return (
    <>
      <Header active="ricette" />
      <main className="narrow page"><RecipeEditor initial={draft} {...data} /></main>
    </>
  )
}
