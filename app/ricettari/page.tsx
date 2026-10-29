import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import BooksManager from '@/components/BooksManager'
import { getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export default async function BooksPage() {
  const s = (await getSession())!
  if (!s.isAdmin) redirect('/')
  const [{ books, sections }, { data: rows }] = await Promise.all([
    loadCatalog(s.supabase),
    s.supabase.from('recipes').select('section_id'),
  ])
  const counts: Record<string, number> = {}
  for (const r of rows ?? []) counts[r.section_id] = (counts[r.section_id] ?? 0) + 1
  return (
    <>
      <Header active="ricettari" />
      <main className="narrow page">
        <h1 className="h1">Ricettari</h1>
        <p className="muted" style={{ fontSize: '.86rem', margin: '6px 0 18px' }}>
          Ogni ricettario è un libro con le sue sezioni: di uno chef, di un ristorante, di una stagione o personale.
          Puoi aggiungerne quanti vuoi; le ricette si spostano da uno all’altro cambiando la sezione nell’editor.
        </p>
        <BooksManager initialBooks={books} initialSections={sections} counts={counts} />
      </main>
    </>
  )
}
