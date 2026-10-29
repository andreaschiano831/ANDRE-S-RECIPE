import { redirect } from 'next/navigation'
import ImportClient from '@/components/ImportClient'
import { getSession } from '@/lib/supabase/server'
import { loadEditorData } from '@/lib/editor-data'

export const dynamic = 'force-dynamic'

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const s = (await getSession())!
  if (!s.canEdit) redirect('/ricette')
  const data = await loadEditorData(s.supabase)
  if (!data.sections.length) redirect(s.isAdmin ? '/ricettari' : '/')
  return (
    <>
      <main className="narrow page"><ImportClient {...data} initialTab={tab === 'text' ? 'text' : 'img'} /></main>
    </>
  )
}
