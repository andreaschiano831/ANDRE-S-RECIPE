import { redirect } from 'next/navigation'
import RecipeEditor from '@/components/RecipeEditor'
import { getSession } from '@/lib/supabase/server'
import { loadEditorData } from '@/lib/editor-data'
import { emptyDraft } from '@/lib/recipes'

export const dynamic = 'force-dynamic'

export default async function NewRecipe({ searchParams }: { searchParams: Promise<{ sezione?: string; ricettario?: string }> }) {
  const { sezione, ricettario } = await searchParams
  const s = (await getSession())!
  if (!s.canEdit) redirect('/ricette')
  const data = await loadEditorData(s.supabase)
  if (!data.sections.length) redirect(s.isAdmin ? '/ricettari' : '/')
  const sec = data.sections.find((x) => x.id === sezione)?.id
    ?? data.sections.find((x) => x.book_id === ricettario)?.id
    ?? data.sections[0].id
  return (
    <>
      <main className="narrow page"><RecipeEditor initial={emptyDraft(sec)} {...data} /></main>
    </>
  )
}
