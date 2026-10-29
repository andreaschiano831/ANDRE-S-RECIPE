import Link from 'next/link'
import { ChevronRight, Printer } from 'lucide-react'
import NewDocButton from '@/components/NewDocButton'
import { getSession } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DocsPage() {
  const s = (await getSession())!
  const { data: docs } = await s.supabase.from('print_documents')
    .select('id, name, updated_at, print_document_items(count)').order('updated_at', { ascending: false })
  return (
    <>
      <main className="narrow page">
        <header className="ph">
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 className="h1">Stampa</h1>
            <p>Raccogli più ricette, come la carta dessert o la mise en place del giorno, e stampale, salvale in PDF o esportale in Word in un colpo solo.</p>
          </div>
          <NewDocButton />
        </header>
        {!docs?.length ? (
          <div className="panel empty"><Printer size={28} strokeWidth={1.4} /><span className="dish">Nessun documento</span><p style={{ maxWidth: '44ch' }}>Apri una ricetta e scegli «Aggiungi a un documento», oppure selezionane più di una dall’elenco ricette.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map((d: any) => (
              <Link key={d.id} href={`/documenti/${d.id}`} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                <Printer size={20} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <p className="dish" style={{ fontSize: '1.15rem' }}>{d.name}</p>
                  <p className="small muted">{d.print_document_items?.[0]?.count ?? 0} ricette · aggiornato {new Date(d.updated_at).toLocaleDateString('it-IT')}</p>
                </div>
                <ChevronRight size={18} color="var(--muted)" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
