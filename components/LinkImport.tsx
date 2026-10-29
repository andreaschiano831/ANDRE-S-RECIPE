'use client'
import { useRef, useState } from 'react'
import { BookPlus, ChevronDown, ChevronUp, FileText, Globe, Link2, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Book, Section } from '@/lib/recipes'

type Link = { url: string; title: string; on: boolean }
type Scan = {
  id: string; url: string; status: 'loading' | 'ok' | 'error'; error?: string
  kind?: 'recipe' | 'index' | 'page' | 'document'; title?: string; pageTitle?: string; pages?: number
  recipes: any[]; links: Link[]; next?: string | null; chunks: string[]; open: boolean; pagesRead: number
}
export type Found = { raw: any; section_id: string; source: 'ai_text' | 'manual' }

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function post(path: string, body: object) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) { const e: any = new Error(data.error?.message || data.error || `Errore ${res.status}`); e.status = res.status; throw e }
  return data
}

export default function LinkImport({ books, sections, isAdmin, onBooks, onSections, onFound, show }: {
  books: Book[]; sections: Section[]; isAdmin: boolean
  onBooks: (b: Book[]) => void; onSections: (s: Section[]) => void
  onFound: (f: Found[]) => void; show: (m: string, k?: 'ok' | 'err' | '') => void
}) {
  const [urls, setUrls] = useState('')
  const [scans, setScans] = useState<Scan[]>([])
  const [dest, setDest] = useState<string>(books[0]?.id ?? '__new')
  const [newName, setNewName] = useState('')
  const [autoSec, setAutoSec] = useState(true)
  const [run, setRun] = useState<{ done: number; total: number; found: number; errors: string[] } | null>(null)
  const [showErr, setShowErr] = useState(false)
  const stop = useRef(false)
  const destSections = sections.filter((s) => s.book_id === dest)

  const patch = (id: string, p: Partial<Scan>) => setScans((x) => x.map((s) => (s.id === id ? { ...s, ...p } : s)))

  async function study() {
    const list = [...new Set(urls.split(/[\s,]+/).map((u) => u.trim()).filter((u) => /^https?:\/\//i.test(u) || /^[\w-]+\.[\w.-]+\//.test(u)))]
      .map((u) => (/^https?:/i.test(u) ? u : `https://${u}`))
    if (!list.length) { show('Incolla almeno un indirizzo che inizia con https://', 'err'); return }
    setUrls('')
    for (const url of list) {
      const id = crypto.randomUUID()
      setScans((x) => [...x, { id, url, status: 'loading', recipes: [], links: [], chunks: [], open: false, pagesRead: 1 }])
      try {
        const d = await post('/api/import-url', { action: 'scan', url, sections: destSections.map((s) => s.name) })
        const links: Link[] = (d.links || []).map((l: any) => ({ ...l, on: !!d.preselectLinks }))
        patch(id, { status: 'ok', kind: d.kind, title: d.title, pageTitle: d.pageTitle, pages: d.pages, recipes: d.recipes || [], links, next: d.next, chunks: d.chunks || [], open: links.length > 0 && links.length <= 30 })
        if (d.kind === 'index' || d.kind === 'document') setNewName((n) => n || d.title || host(url))
      } catch (e: any) { patch(id, { status: 'error', error: e.message }) }
    }
  }

  async function morePages(sc: Scan, max = 1) {
    let next = sc.next, links = [...sc.links], read = sc.pagesRead
    for (let i = 0; i < max && next; i++) {
      patch(sc.id, { status: 'loading' })
      try {
        const d = await post('/api/import-url', { action: 'scan', url: next, sections: [] })
        for (const l of d.links || []) if (!links.some((x) => x.url === l.url)) links.push({ ...l, on: true })
        next = d.next; read++
      } catch (e: any) { show(e.message, 'err'); break }
    }
    patch(sc.id, { status: 'ok', links, next, pagesRead: read })
  }

  // sezione per un suggerimento ("Primi piatti", "Gelateria"…): esistente, creata, o la prima
  const secCache = useRef<Section[]>([])
  const lock = useRef<Promise<unknown>>(Promise.resolve())
  // una alla volta: due ricette della stessa categoria non devono creare due sezioni uguali
  function sectionFor(bookId: string, hint: string): Promise<string> {
    const p = lock.current.then(() => sectionForNow(bookId, hint))
    lock.current = p.catch(() => {})
    return p
  }
  async function sectionForNow(bookId: string, hint: string): Promise<string> {
    const all = [...sections, ...secCache.current].filter((s) => s.book_id === bookId)
    const h = norm(hint)
    if (h) {
      const hit = all.find((s) => norm(s.name) === h) || all.find((s) => norm(s.name).includes(h) || h.includes(norm(s.name)))
      if (hit) return hit.id
      if (autoSec && isAdmin && h.length > 2 && all.length < 40) {
        const name = hint.trim().replace(/\s+/g, ' ').slice(0, 60)
        const { data, error } = await createClient().from('sections').insert({ book_id: bookId, name: name.charAt(0).toUpperCase() + name.slice(1), position: all.length }).select().single()
        if (!error && data) { secCache.current.push(data as Section); onSections([...sections, ...secCache.current]); return data.id }
      }
    }
    if (all[0]) return all[0].id
    const { data, error } = await createClient().from('sections').insert({ book_id: bookId, name: 'Ricette', position: 0 }).select().single()
    if (error || !data) throw new Error('Non riesco a creare una sezione nel ricettario')
    secCache.current.push(data as Section); onSections([...sections, ...secCache.current])
    return data.id
  }

  async function importAll() {
    const ok = scans.filter((s) => s.status === 'ok')
    const links = ok.flatMap((s) => s.links.filter((l) => l.on))
    const direct = ok.flatMap((s) => s.recipes)
    const chunks = ok.flatMap((s) => s.chunks)
    const total = links.length + direct.length + chunks.length
    if (!total) { show('Niente da importare: seleziona almeno una ricetta', 'err'); return }

    // ricettario di destinazione
    let bookId = dest
    if (dest === '__new') {
      const name = (newName || ok[0]?.title || 'Ricettario importato').trim()
      const { data, error } = await createClient().from('books').insert({ name, subtitle: host(ok[0]?.url || ''), color: '#5a4e2d', position: books.length }).select().single()
      if (error || !data) { show(`Non posso creare il ricettario: ${error?.message ?? ''}`, 'err'); return }
      bookId = data.id; onBooks([...books, data as Book]); setDest(data.id)
    }
    stop.current = false
    const seen = new Set<string>()
    const state = { done: 0, total, found: 0, errors: [] as string[] }
    setRun({ ...state })
    const emit = async (list: any[], source: 'ai_text' | 'manual') => {
      const out: Found[] = []
      for (const r of list) {
        const key = norm(r?.name)
        if (!key || seen.has(key)) continue
        seen.add(key)
        out.push({ raw: r, section_id: await sectionFor(bookId, r.section || r.category || ''), source })
      }
      if (out.length) { onFound(out); state.found += out.length }
    }
    const tick = (err?: string) => { state.done++; if (err) state.errors.push(err); setRun({ ...state, errors: [...state.errors] }) }

    await emit(direct.filter((r) => !r.ai), 'manual'); await emit(direct.filter((r) => r.ai), 'ai_text')
    state.done += direct.length; setRun({ ...state })

    const secNames = () => [...sections, ...secCache.current].filter((s) => s.book_id === bookId).map((s) => s.name)
    // pagine delle ricette: 3 alla volta
    let i = 0
    const worker = async () => {
      while (i < links.length && !stop.current) {
        const l = links[i++]
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const d = await post('/api/import-url', { action: 'recipe', url: l.url, sections: secNames() })
            const rs = d.recipes || []
            await emit(rs.filter((r: any) => !r.ai), 'manual'); await emit(rs.filter((r: any) => r.ai), 'ai_text')
            tick(rs.length ? undefined : `${l.title || l.url}: nessuna ricetta`)
            break
          } catch (e: any) {
            if (e.status === 429 && attempt === 0) { await sleep(20000); continue }
            tick(`${l.title || l.url}: ${e.message}`); break
          }
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])

    // documenti (PDF, Google Doc, pagine senza dati strutturati): un blocco alla volta con l'AI
    if (chunks.length) await sectionFor(bookId, '')
    for (const text of chunks) {
      if (stop.current) break
      try {
        const d = await post('/api/import', { text, book_id: bookId })
        await emit((d.recipes || []).map((r: any) => ({ ...r, section: r.section_hint || r.section })), 'ai_text')
        tick()
      } catch (e: any) {
        if (e.status === 502 && /Troppe richieste/.test(e.message)) { await sleep(25000); try { const d = await post('/api/import', { text, book_id: bookId }); await emit(d.recipes || [], 'ai_text'); tick(); continue } catch {} }
        tick(`Parte del documento: ${e.message}`)
      }
    }
    setRun({ ...state })
    show(stop.current ? `Interrotto: ${state.found} ricette pronte da controllare` : `${state.found} ricette pronte da controllare qui sotto`, state.found ? 'ok' : 'err')
    setScans([])
  }

  const ok = scans.filter((s) => s.status === 'ok')
  const count = ok.reduce((n, s) => n + s.recipes.length + s.links.filter((l) => l.on).length + s.chunks.length, 0)
  const busy = run && run.done < run.total && !stop.current

  return (
    <div className="stack" style={{ gap: 14 }}>
      <label className="stack" style={{ gap: 6 }}>
        <span className="label">Link di ricettari o ricette (uno per riga)</span>
        <textarea className="textarea" rows={3} value={urls} onChange={(e) => setUrls(e.target.value)}
          placeholder={'https://www.sito.it/ricette/dolci/\nhttps://www.sito.it/ricetta/crema-pasticcera\nhttps://drive.google.com/… (PDF o Google Doc condiviso)'} />
      </label>
      <p className="small muted" style={{ marginTop: -6 }}>
        Funziona con pagine di ricette, elenchi e categorie di blog o siti, PDF e Google Doc condivisi con link. Le ricette con dati strutturati si importano esatte; il resto lo legge l’AI.
      </p>
      <button className="btn btn-gold" onClick={study} disabled={!urls.trim() || !!busy}><Globe size={16} /> Studia i link</button>

      {scans.map((s) => (
        <div key={s.id} className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head" style={{ flexWrap: 'wrap' }}>
            {s.kind === 'document' ? <FileText size={17} color="var(--accent)" /> : <Link2 size={17} color="var(--accent)" />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.status === 'ok' ? (s.pageTitle || s.title) : host(s.url)}</b>
              <span className="small muted">
                {s.status === 'loading' && 'Sto leggendo la pagina…'}
                {s.status === 'error' && <span className="err">{s.error}</span>}
                {s.status === 'ok' && s.kind === 'document' && `Documento${s.pages ? ` di ${s.pages} pagine` : ''}: lo legge l’AI in ${s.chunks.length} parti`}
                {s.status === 'ok' && s.kind === 'page' && 'Nessuna ricetta strutturata: la pagina la legge l’AI'}
                {s.status === 'ok' && (s.kind === 'recipe' || s.kind === 'index') && [
                  s.recipes.length ? `${s.recipes.length} ${s.recipes.length === 1 ? 'ricetta' : 'ricette'} in questa pagina` : '',
                  s.links.length ? `${s.links.length} link a ricette${s.pagesRead > 1 ? ` (${s.pagesRead} pagine lette)` : ''}` : '',
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
            {s.status === 'loading' && <span className="spin" />}
            <button className="icon-btn" onClick={() => setScans((x) => x.filter((y) => y.id !== s.id))} aria-label="Togli"><X size={15} /></button>
          </div>
          {s.status === 'ok' && s.recipes.length > 0 && (
            <div style={{ padding: '8px 16px' }} className="small">
              {s.recipes.slice(0, 5).map((r, k) => <div key={k}>· <b>{r.name}</b> <span className="muted">{(r.ingredients || []).length} ingredienti</span></div>)}
            </div>
          )}
          {s.status === 'ok' && s.links.length > 0 && (
            <>
              <div className="row" style={{ padding: '8px 16px', borderTop: '1px solid var(--line)' }}>
                <span className="small" style={{ flex: 1 }}>{s.links.filter((l) => l.on).length} di {s.links.length} selezionate</span>
                <button className="btn btn-ghost btn-sm" onClick={() => patch(s.id, { links: s.links.map((l) => ({ ...l, on: true })) })}>Tutte</button>
                <button className="btn btn-ghost btn-sm" onClick={() => patch(s.id, { links: s.links.map((l) => ({ ...l, on: false })) })}>Nessuna</button>
                <button className="btn btn-ghost btn-sm" onClick={() => patch(s.id, { open: !s.open })}>{s.open ? <ChevronUp /> : <ChevronDown />} Elenco</button>
              </div>
              {s.open && (
                <div style={{ maxHeight: 320, overflowY: 'auto', borderTop: '1px solid var(--line)' }}>
                  {s.links.map((l, k) => (
                    <label key={l.url} className="row small" style={{ padding: '6px 16px', flexWrap: 'nowrap', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}>
                      <input type="checkbox" checked={l.on} onChange={(e) => patch(s.id, { links: s.links.map((x, j) => (j === k ? { ...x, on: e.target.checked } : x)) })} style={{ accentColor: 'var(--accent)' }} />
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.title || l.url}</span>
                      <span className="muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{new URL(l.url).pathname}</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
          {s.status === 'ok' && s.next && (
            <div className="row" style={{ padding: '8px 16px', borderTop: '1px solid var(--line)' }}>
              <span className="small muted" style={{ flex: 1 }}>Il ricettario continua in altre pagine</span>
              <button className="btn btn-sm" onClick={() => morePages(s, 1)}>Leggi la pagina dopo</button>
              <button className="btn btn-sm" onClick={() => morePages(s, 10)}>Leggi fino a 10 pagine</button>
            </div>
          )}
        </div>
      ))}

      {ok.length > 0 && count > 0 && !busy && (
        <section className="panel panel-pad stack" style={{ gap: 12 }}>
          <b>Dove le metto</b>
          <div className="row">
            <select className="select" style={{ width: 'auto', minWidth: 220 }} value={dest} onChange={(e) => setDest(e.target.value)} aria-label="Ricettario di destinazione">
              {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              {isAdmin && <option value="__new">Nuovo ricettario…</option>}
            </select>
            {dest === '__new' && <input className="input" style={{ flex: 1, minWidth: 200 }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome del nuovo ricettario" />}
          </div>
          {isAdmin && (
            <label className="row small" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={autoSec} onChange={(e) => setAutoSec(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 17, height: 17 }} />
              Crea le sezioni dalle categorie del sito (altrimenti uso quelle che ci sono)
            </label>
          )}
          <button className="btn btn-gold btn-lg" onClick={importAll}><BookPlus size={17} /> Importa {count} {count === 1 ? 'elemento' : 'elementi'}</button>
          <p className="small muted">Le ricette arrivano qui sotto da controllare: niente viene salvato finché non premi «Salva».</p>
        </section>
      )}

      {run && (
        <section className="panel panel-pad stack" style={{ gap: 10 }}>
          <div className="row">
            <b style={{ flex: 1 }}>{run.done < run.total && !stop.current ? `Importo… ${run.done} di ${run.total}` : `Fatto: ${run.done} di ${run.total} letti`}</b>
            <span className="small muted">{run.found} ricette trovate</span>
            {busy && <button className="btn btn-sm" onClick={() => { stop.current = true; setRun((r) => (r ? { ...r } : r)) }}><Square size={13} /> Ferma</button>}
          </div>
          <div className="progress"><span style={{ width: `${(run.done / Math.max(1, run.total)) * 100}%`, background: 'var(--accent)' }} /></div>
          {run.errors.length > 0 && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setShowErr((v) => !v)}>{showErr ? <ChevronUp /> : <ChevronDown />} {run.errors.length} non importate</button>
              {showErr && <ul className="small muted" style={{ paddingLeft: 18 }}>{run.errors.map((e, k) => <li key={k}>{e}</li>)}</ul>}
            </>
          )}
        </section>
      )}
    </div>
  )
}
