import Link from 'next/link'
import Header from '@/components/Header'
import NewDocButton from '@/components/NewDocButton'
import { getSession } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DocsPage() {
  const s = (await getSession())!
  const { data: docs } = await s.supabase.from('print_documents')
    .select('id, name, updated_at, print_document_items(count)').order('updated_at', { ascending: false })
  return (
    <>
      <Header active="documenti" />
      <main className="narrow page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 className="h1">Documenti di stampa</h1>
          <NewDocButton />
        </div>
        <p className="muted" style={{ fontSize: '.86rem', marginBottom: 18 }}>Raccogli più ricette (es. la carta dessert, la mise en place del giorno) e stampale o salvale in PDF in un colpo solo.</p>
        {!docs?.length ? (
          <p className="empty">Nessun documento. Apri una ricetta e tocca «Stampa», oppure selezionane più di una dall’elenco.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docs.map((d: any) => (
              <Link key={d.id} href={`/documenti/${d.id}`} className="rcard" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0 }}>{d.name}</h3>
                  <p className="sub">{d.print_document_items?.[0]?.count ?? 0} ricette · aggiornato {new Date(d.updated_at).toLocaleDateString('it-IT')}</p>
                </div>
                <span className="gold" style={{ fontSize: '1.3rem' }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
