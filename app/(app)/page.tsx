import Link from 'next/link'
import { AlertTriangle, BookOpen, Camera, ChefHat, ClipboardList, Clock, PackageMinus, PenLine } from 'lucide-react'
import { getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'
import { bookGradient } from '@/lib/ui'

export const dynamic = 'force-dynamic'

type Stock = { name: string; quantity: number; unit: string; expiresAt?: string | null; parLevel?: number | null }
type Prep = { nome: string; status: string; partita?: string; reparto?: string }

/** Cosa serve sapere appena si entra: scadenze, sotto scorta, preparazioni da fare */
function kitchenSummary(data: any) {
  if (!data || typeof data !== 'object') return null
  const stock: (Stock & { where: string })[] = []
  for (const [loc, label] of [['fridge', 'frigo'], ['freezer', 'freezer'], ['dry', 'dispensa'], ['counter', 'banco']] as const) {
    for (const it of (data[loc] ?? []) as Stock[]) stock.push({ ...it, where: label })
  }
  const now = Date.now()
  const expiring = stock
    .filter((s) => s.expiresAt)
    .map((s) => ({ ...s, hours: (new Date(s.expiresAt!).getTime() - now) / 36e5 }))
    .filter((s) => s.hours <= 48)
    .sort((a, b) => a.hours - b.hours)
  const under = stock.filter((s) => s.parLevel && s.quantity < s.parLevel)
  const preps = ((data.preparazioni ?? []) as Prep[]).filter((p) => p.status === 'da_fare' || p.status === 'in_corso')
  return { expiring, under, preps, total: stock.length }
}

function when(hours: number) {
  if (hours < 0) return 'scaduto'
  if (hours < 24) return `entro ${Math.max(1, Math.round(hours))} h`
  return 'domani'
}

export default async function Home() {
  const s = (await getSession())!
  const { data: km } = await s.supabase.from('kitchen_members').select('kitchen_id').eq('user_id', s.user.id)
  const kitchenIds = (km ?? []).map((k) => k.kitchen_id)
  const [{ books, sections }, { data: rows }, { data: recent }, { data: kitchens }, { data: states }] = await Promise.all([
    loadCatalog(s.supabase),
    s.supabase.from('recipes').select('section_id'),
    s.supabase.from('recipes').select('id, name, category, section_id, updated_at').order('updated_at', { ascending: false }).limit(6),
    kitchenIds.length ? s.supabase.from('kitchens').select('id, name').in('id', kitchenIds).order('created_at') : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    kitchenIds.length ? s.supabase.from('kitchen_state').select('kitchen_id, data').in('kitchen_id', kitchenIds) : Promise.resolve({ data: [] as { kitchen_id: string; data: unknown }[] }),
  ])
  const bookOf = new Map(sections.map((x) => [x.id, x.book_id]))
  const counts: Record<string, number> = {}
  for (const r of rows ?? []) { const b = bookOf.get(r.section_id); if (b) counts[b] = (counts[b] ?? 0) + 1 }
  const total = rows?.length ?? 0
  const kitchen = (kitchens ?? [])[0]
  const summary = kitchen ? kitchenSummary((states ?? []).find((x: any) => x.kitchen_id === kitchen.id)?.data) : null
  const hour = new Date().toLocaleString('it-IT', { hour: 'numeric', hour12: false, timeZone: 'Europe/Rome' })
  const greeting = +hour < 12 ? 'Buongiorno' : +hour < 18 ? 'Buon pomeriggio' : 'Buonasera'
  const first = s.name.split(' ')[0]
  const k = (sec: string) => `/cucine/${kitchen?.id}/app?s=${sec}`

  return (
    <div className="wrap page">
      <section className="greet">
        <div className="hello">
          <h1 className="h1">{greeting}, {first}</h1>
          <p>
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })}.{' '}
            {total} ricette in {books.length} {books.length === 1 ? 'ricettario' : 'ricettari'}
            {kitchen && summary ? `, ${summary.total} prodotti in giacenza a ${kitchen.name}` : ''}.
          </p>
          <button className="side-search" style={{ margin: '18px 0 0', maxWidth: 420, width: '100%', position: 'relative', zIndex: 1 }} data-open-search>
            Cerca una ricetta o una sezione <kbd>⌘K</kbd>
          </button>
        </div>
        <div className="quick">
          {s.canEdit && <Link href="/ricette/nuova"><PenLine /><span><b>Scrivi una ricetta</b><small>Ingredienti e passaggi</small></span></Link>}
          {s.canEdit && <Link href="/importa"><Camera /><span><b>Da screenshot</b><small>L’AI la trascrive per te</small></span></Link>}
          {kitchen
            ? <Link href={k('preparazioni')}><ClipboardList /><span><b>Preparazioni</b><small>{summary?.preps.length ? `${summary.preps.length} da fare` : 'MEP per partita'}</small></span></Link>
            : <Link href="/cucine"><ChefHat /><span><b>Crea la cucina</b><small>Giacenze, MEP, HACCP</small></span></Link>}
          <Link href="/ricette"><BookOpen /><span><b>Tutte le ricette</b><small>{total} schede</small></span></Link>
        </div>
      </section>

      {kitchen && summary && (summary.expiring.length > 0 || summary.under.length > 0 || summary.preps.length > 0) && (
        <section className="panel" style={{ marginBottom: 22, overflow: 'hidden' }}>
          <div className="panel-head">
            <h2 className="h2" style={{ flex: 1 }}>Oggi a {kitchen.name}</h2>
            <Link href={k('dashboard')} className="btn btn-sm">Apri la cucina</Link>
          </div>
          <div className="grid3" style={{ gap: 0 }}>
            <div style={{ borderRight: '1px solid var(--line)' }}>
              <p className="row label" style={{ padding: '12px 16px 4px' }}><AlertTriangle size={14} color="var(--danger)" /> In scadenza</p>
              {summary.expiring.slice(0, 5).map((x, i) => (
                <Link key={i} href={k('giacenze')} className="alert-row"><span style={{ flex: 1 }}>{x.name}</span><span className={`chip ${x.hours < 0 ? 'chip-danger' : 'chip-warn'}`}>{when(x.hours)}</span></Link>
              ))}
              {!summary.expiring.length && <p className="alert-row muted small">Niente in scadenza nelle prossime 48 ore</p>}
            </div>
            <div style={{ borderRight: '1px solid var(--line)' }}>
              <p className="row label" style={{ padding: '12px 16px 4px' }}><PackageMinus size={14} color="var(--warn)" /> Sotto scorta</p>
              {summary.under.slice(0, 5).map((x, i) => (
                <Link key={i} href={k('spesa')} className="alert-row"><span style={{ flex: 1 }}>{x.name}</span><span className="small muted num">{x.quantity}/{x.parLevel} {x.unit}</span></Link>
              ))}
              {!summary.under.length && <p className="alert-row muted small">Tutto sopra il livello minimo</p>}
            </div>
            <div>
              <p className="row label" style={{ padding: '12px 16px 4px' }}><Clock size={14} color="var(--accent)" /> Da preparare</p>
              {summary.preps.slice(0, 5).map((x, i) => (
                <Link key={i} href={k('preparazioni')} className="alert-row"><span style={{ flex: 1 }}>{x.nome}</span><span className="small muted">{x.partita || x.reparto || ''}</span></Link>
              ))}
              {!summary.preps.length && <p className="alert-row muted small">Nessuna preparazione in sospeso</p>}
            </div>
          </div>
        </section>
      )}

      <div className="row" style={{ margin: '6px 0 12px' }}>
        <h2 className="h2" style={{ flex: 1 }}>Ricettari</h2>
        {s.isAdmin && <Link href="/ricettari" className="btn btn-sm btn-ghost">Gestisci</Link>}
      </div>
      {books.length === 0 ? (
        <div className="panel panel-pad empty">
          <span className="dish">Nessun ricettario ancora</span>
          <p style={{ maxWidth: '46ch' }}>Un ricettario raccoglie le ricette di uno chef, di un ristorante o le tue, divise in sezioni.</p>
          {s.isAdmin ? <Link href="/ricettari" className="btn btn-gold">Crea il primo ricettario</Link> : <p className="small">Chiedi all’amministratore di crearne uno.</p>}
        </div>
      ) : (
        <div className="sec-grid">
          {books.map((b) => (
            <Link key={b.id} href={`/ricette?ricettario=${b.id}`} className="sec-card" style={{ background: bookGradient(b.color) }}>
              <span className="count num">{counts[b.id] ?? 0} ricette</span>
              <h3>{b.name}</h3>
              <p>{b.subtitle || sections.filter((x) => x.book_id === b.id).map((x) => x.name).join(', ') || 'Nessuna sezione'}</p>
            </Link>
          ))}
        </div>
      )}

      {(recent ?? []).length > 0 && (
        <>
          <h2 className="h2" style={{ margin: '28px 0 12px' }}>Modificate di recente</h2>
          <div className="rgrid">
            {(recent ?? []).map((r) => {
              const b = books.find((x) => x.id === bookOf.get(r.section_id))
              return (
                <Link key={r.id} href={`/ricette/${r.id}`} className="rcard">
                  <span className="bar" style={{ background: b?.color ?? 'var(--accent)' }} />
                  <div className="meta"><span className="chip">{r.category}</span><span className="small muted">{sections.find((x) => x.id === r.section_id)?.name}</span></div>
                  <h3>{r.name}</h3>
                  <div className="sub"><span>{new Date(r.updated_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span></div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
