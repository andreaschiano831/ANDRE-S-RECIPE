import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import ImportClient from '@/components/ImportClient'
import { getSession } from '@/lib/supabase/server'
import { loadEditorData } from '@/lib/editor-data'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const s = (await getSession())!
  if (!s.canEdit) redirect('/ricette')
  const data = await loadEditorData(s.supabase)
  if (!data.sections.length) redirect(s.isAdmin ? '/ricettari' : '/')
  return (
    <>
      <Header active="importa" />
      <main className="narrow page"><ImportClient {...data} /></main>
    </>
  )
}
