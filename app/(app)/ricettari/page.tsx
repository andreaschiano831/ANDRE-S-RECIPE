import { redirect } from 'next/navigation'
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
      <main className="narrow page">
        <header className="ph"><div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="h1">Ricettari</h1>
          <p>Ogni ricettario è un libro con le sue sezioni: di uno chef, di un ristorante, di una stagione o personale.
          Puoi aggiungerne quanti vuoi; per spostare ricette selezionale dall’elenco e scegli «Sposta».</p>
        </div></header>
        <BooksManager initialBooks={books} initialSections={sections} counts={counts} />
      </main>
    </>
  )
}
