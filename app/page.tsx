import Link from 'next/link'
import Header from '@/components/Header'
import ThemePicker from '@/components/ThemePicker'
import { getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'
import { bookGradient } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const s = (await getSession())!
  const [{ settings, books, sections }, { data: rows }] = await Promise.all([
    loadCatalog(s.supabase),
    s.supabase.from('recipes').select('section_id'),
  ])
  const bookOf = new Map(sections.map((x) => [x.id, x.book_id]))
  const counts: Record<string, number> = {}
  for (const r of rows ?? []) {
    const b = bookOf.get(r.section_id)
    if (b) counts[b] = (counts[b] ?? 0) + 1
  }
  const total = rows?.length ?? 0

  return (
    <>
      <Header />
      <main className="wrap page">
        <section className="hero">
          <p className="eyebrow">{settings.tagline.toUpperCase()}</p>
          <h1>{settings.name}</h1>
          <div className="rule" style={{ maxWidth: 220, margin: '14px auto' }}>✦ ✦ ✦</div>
          <p className="muted" style={{ fontSize: '.85rem' }}>
            Ciao {s.name} · {books.length} {books.length === 1 ? 'ricettario' : 'ricettari'} · {total} ricette
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}><ThemePicker /></div>
        </section>

        {books.length === 0 ? (
          <div className="panel panel-pad" style={{ textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
            <p className="h2">Nessun ricettario ancora</p>
            <p className="muted" style={{ fontSize: '.86rem', margin: '8px 0 16px' }}>
              Un ricettario è un libro di ricette con le sue sezioni: quello di uno chef, di un ristorante, il tuo personale.
            </p>
            {s.isAdmin
              ? <Link href="/ricettari" className="btn btn-gold">+ Crea il primo ricettario</Link>
              : <p className="muted" style={{ fontSize: '.8rem' }}>Chiedi all’amministratore di crearne uno.</p>}
          </div>
        ) : (
          <div className="sec-grid">
            {books.map((b, i) => {
              const secs = sections.filter((x) => x.book_id === b.id)
              return (
                <Link key={b.id} href={`/ricette?ricettario=${b.id}`} className="sec-card" style={{ background: bookGradient(b.color) }}>
                  <span className="count">{counts[b.id] ?? 0}</span>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{b.name}</h3>
                  <p>{b.subtitle || secs.map((x) => x.name).join(' · ') || 'Nessuna sezione'}</p>
                </Link>
              )
            })}
            {books.length > 1 && (
              <Link href="/ricette" className="sec-card sec-tutti">
                <span className="count">{total}</span>
                <span className="n">∗</span>
                <h3>Tutte le ricette</h3>
                <p>Cerca in tutti i ricettari</p>
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          {s.canEdit && books.length > 0 && <Link href="/ricette/nuova" className="btn btn-gold">✍︎ Nuova ricetta</Link>}
          {s.canEdit && books.length > 0 && <Link href="/importa" className="btn">✨ Importa da screenshot o testo</Link>}
          <Link href="/cucine" className="btn">🔪 Gestione cucina</Link>
          {s.isAdmin && books.length > 0 && <Link href="/ricettari" className="btn btn-ghost">Gestisci ricettari</Link>}
        </div>
      </main>
    </>
  )
}
