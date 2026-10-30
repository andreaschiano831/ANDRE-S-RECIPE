'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, ChevronLeft, ChevronRight, Copy, Highlighter, List, NotebookPen, Search, Sparkles, Trash2, Type, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { HL_COLORS, type LibBook, type LibMark, type LibProgress, type ReaderSettings } from '@/lib/library'
import EpubView from './EpubView'
import PdfView from './PdfView'

export type Toc = { label: string; location: string; level: number }
export type Hit = { location: string; excerpt: string; label: string }
export type Sel = { location: string; text: string; x: number; y: number }
export type ViewApi = {
  next(): void; prev(): void; goTo(location: string): void; goPercent(p: number): void
  toc(): Promise<Toc[]>
  search(q: string, onHit: (h: Hit) => void, stop: { v: boolean }): Promise<void>
  setMarks(marks: LibMark[]): void
  clearSelection(): void
}
export type ViewProps = {
  url: string; bookId: string; initial: string | null; settings: ReaderSettings
  onReady: (api: ViewApi, info?: { pages?: number }) => void
  onLocation: (l: { location: string; percent: number; label: string }) => void
  onSelect: (s: Sel | null) => void
  onTap: (zone: 'left' | 'right' | 'center') => void
  onError: (msg: string) => void
}

const DEFAULTS: ReaderSettings = { size: 100, font: 'serif', theme: 'carta', spacing: 1.5, fit: 'page' }

export default function Reader({ book, url, progress, marks: initialMarks, canImport }: { book: LibBook; url: string; progress: LibProgress | null; marks: LibMark[]; canImport: boolean }) {
  const router = useRouter()
  const sb = useMemo(() => createClient(), [])
  const api = useRef<ViewApi | null>(null)
  const [settings, setSettings] = useState<ReaderSettings>({ ...DEFAULTS, ...(progress?.settings || {}) })
  const [loc, setLoc] = useState({ location: progress?.location ?? '', percent: progress?.percent ?? 0, label: '' })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [chrome, setChrome] = useState(true)
  const [panel, setPanel] = useState<null | 'toc' | 'notes' | 'search' | 'settings'>(null)
  const [toc, setToc] = useState<Toc[] | null>(null)
  const [marks, setMarks] = useState<LibMark[]>(initialMarks)
  const [sel, setSel] = useState<Sel | null>(null)
  const [noteFor, setNoteFor] = useState<LibMark | null>(null)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [searching, setSearching] = useState(false)
  const stopSearch = useRef({ v: false })
  const [toast, setToast] = useState('')

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2200) }

  // ── salvataggio posizione (sincronizzata tra dispositivi) ──
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persist = useCallback((l: { location: string; percent: number }, s: ReaderSettings) => {
    if (saveT.current) clearTimeout(saveT.current)
    saveT.current = setTimeout(() => {
      sb.from('library_progress').upsert({ book_id: book.id, location: l.location, percent: Math.min(1, Math.max(0, l.percent)), settings: s, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book_id' }).then(() => {})
    }, 1200)
  }, [sb, book.id])
  useEffect(() => { if (ready) persist(loc, settings) }, [loc.location, settings, ready, persist]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.current?.setMarks(marks) }, [marks, ready])

  // tastiera
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); api.current?.next() }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); api.current?.prev() }
      if (e.key === 'Escape') { if (panel) setPanel(null); else router.push('/biblioteca') }
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [panel, router])
  useEffect(() => { const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = prev } }, [])

  const onTap = useCallback((z: 'left' | 'right' | 'center') => {
    if (z === 'left') api.current?.prev()
    else if (z === 'right') api.current?.next()
    else { setChrome((c) => !c); setPanel(null) }
  }, [])

  // ── segni ──
  const bookmarkHere = marks.find((m) => m.kind === 'bookmark' && m.location === loc.location)
  async function toggleBookmark() {
    if (bookmarkHere) {
      await sb.from('library_marks').delete().eq('id', bookmarkHere.id)
      setMarks((x) => x.filter((m) => m.id !== bookmarkHere.id)); flash('Segnalibro tolto')
    } else {
      const { data, error } = await sb.from('library_marks').insert({ book_id: book.id, kind: 'bookmark', location: loc.location, label: loc.label || `${Math.round(loc.percent * 100)}%` }).select().single()
      if (error) { flash(error.message); return }
      setMarks((x) => [...x, data as LibMark]); flash('Segnalibro aggiunto')
    }
  }
  async function highlight(color: string, withNote = false) {
    if (!sel) return
    const { data, error } = await sb.from('library_marks').insert({ book_id: book.id, kind: 'highlight', location: sel.location, label: loc.label, text: sel.text.slice(0, 4000), color }).select().single()
    api.current?.clearSelection(); setSel(null)
    if (error) { flash(error.message); return }
    setMarks((x) => [...x, data as LibMark])
    if (withNote) setNoteFor(data as LibMark)
  }
  async function saveNote(m: LibMark, note: string) {
    await sb.from('library_marks').update({ note }).eq('id', m.id)
    setMarks((x) => x.map((y) => (y.id === m.id ? { ...y, note } : y))); setNoteFor(null)
  }
  async function removeMark(m: LibMark) {
    await sb.from('library_marks').delete().eq('id', m.id)
    setMarks((x) => x.filter((y) => y.id !== m.id))
  }
  function toRecipe() {
    if (!sel) return
    try { sessionStorage.setItem('rc_import_text', `${sel.text}\n\n(Da «${book.title}»${book.author ? `, ${book.author}` : ''})`) } catch {}
    router.push('/importa?tab=text')
  }

  async function openToc() {
    setPanel('toc')
    if (!toc && api.current) setToc(await api.current.toc().catch(() => []))
  }
  async function runSearch(e?: React.FormEvent) {
    e?.preventDefault()
    if (!q.trim() || !api.current) return
    stopSearch.current.v = true
    const stop = { v: false }; stopSearch.current = stop
    setHits([]); setSearching(true)
    await api.current.search(q.trim(), (h) => setHits((x) => (x && x.length < 300 ? [...x, h] : x)), stop).catch(() => {})
    if (!stop.v) setSearching(false)
  }
  const go = (l: string) => { api.current?.goTo(l); setPanel(null) }
  const set = (p: Partial<ReaderSettings>) => setSettings((s) => ({ ...s, ...p }))

  const Props: ViewProps = {
    url, bookId: book.id, initial: progress?.location ?? null, settings,
    onReady: (a) => { api.current = a; setReady(true); a.setMarks(marks) },
    onLocation: (l) => setLoc(l),
    onSelect: (s) => setSel(s),
    onTap, onError: setError,
  }
  const pct = Math.round(loc.percent * 100)
  const bookmarks = marks.filter((m) => m.kind === 'bookmark')
  const hls = marks.filter((m) => m.kind === 'highlight')

  return (
    <div className={`rd ${chrome ? '' : 'hide'}`} data-theme={settings.theme}>
      <div className="rd-stage">
        {book.kind === 'epub' ? <EpubView {...Props} /> : <PdfView {...Props} />}
        {!ready && !error && <div className="rd-msg">Apro il libro…</div>}
        {error && <div className="rd-msg">{error}</div>}
      </div>

      <div className="rd-bar rd-top">
        <button className="rd-btn" onClick={() => router.push('/biblioteca')} aria-label="Torna alla biblioteca"><ChevronLeft /></button>
        <span className="rd-title">{book.title}</span>
        <button className={`rd-btn ${panel === 'toc' ? 'on' : ''}`} onClick={() => (panel === 'toc' ? setPanel(null) : openToc())} aria-label="Indice"><List size={19} /></button>
        <button className={`rd-btn ${panel === 'search' ? 'on' : ''}`} onClick={() => setPanel(panel === 'search' ? null : 'search')} aria-label="Cerca nel libro"><Search size={19} /></button>
        <button className={`rd-btn ${panel === 'notes' ? 'on' : ''}`} onClick={() => setPanel(panel === 'notes' ? null : 'notes')} aria-label="Note e segnalibri"><NotebookPen size={19} /></button>
        <button className={`rd-btn ${panel === 'settings' ? 'on' : ''}`} onClick={() => setPanel(panel === 'settings' ? null : 'settings')} aria-label="Testo e tema"><Type size={19} /></button>
        <button className={`rd-btn ${bookmarkHere ? 'on' : ''}`} onClick={toggleBookmark} aria-label={bookmarkHere ? 'Togli segnalibro' : 'Aggiungi segnalibro'}><Bookmark size={19} fill={bookmarkHere ? 'currentColor' : 'none'} /></button>
      </div>

      <div className="rd-bar rd-bottom">
        <div className="rd-progress">
          <button className="rd-btn" onClick={() => api.current?.prev()} aria-label="Pagina precedente"><ChevronLeft size={18} /></button>
          <input type="range" min={0} max={1000} value={Math.round(loc.percent * 1000)} aria-label="Posizione nel libro"
            onChange={(e) => setLoc((l) => ({ ...l, percent: +e.target.value / 1000 }))} onMouseUp={(e) => api.current?.goPercent(+(e.target as HTMLInputElement).value / 1000)}
            onTouchEnd={(e) => api.current?.goPercent(+(e.target as HTMLInputElement).value / 1000)} onKeyUp={(e) => api.current?.goPercent(+(e.target as HTMLInputElement).value / 1000)} />
          <button className="rd-btn" onClick={() => api.current?.next()} aria-label="Pagina successiva"><ChevronRight size={18} /></button>
        </div>
        <div className="rd-progress" style={{ justifyContent: 'space-between' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loc.label}</span>
          <span>{pct}% letto</span>
        </div>
      </div>

      {panel === 'settings' && (
        <div className="rd-settings">
          {book.kind === 'epub' ? (
            <>
              <div><div className="lbl">Dimensione del testo</div>
                <div className="rd-seg"><button onClick={() => set({ size: Math.max(70, (settings.size ?? 100) - 10) })}>A−</button><button disabled>{settings.size}%</button><button onClick={() => set({ size: Math.min(220, (settings.size ?? 100) + 10) })}>A+</button></div></div>
              <div><div className="lbl">Carattere</div>
                <div className="rd-seg">{([['serif', 'Serif'], ['sans', 'Moderno'], ['orig', 'Del libro']] as const).map(([k, l]) => <button key={k} className={settings.font === k ? 'on' : ''} onClick={() => set({ font: k })} style={{ fontFamily: k === 'serif' ? 'Georgia,serif' : k === 'sans' ? 'var(--f-ui)' : undefined }}>{l}</button>)}</div></div>
              <div><div className="lbl">Interlinea</div>
                <div className="rd-seg">{[1.3, 1.5, 1.8].map((v) => <button key={v} className={settings.spacing === v ? 'on' : ''} onClick={() => set({ spacing: v })}>{v === 1.3 ? 'Stretta' : v === 1.5 ? 'Normale' : 'Ampia'}</button>)}</div></div>
            </>
          ) : (
            <div><div className="lbl">Adatta la pagina</div>
              <div className="rd-seg"><button className={settings.fit === 'width' ? 'on' : ''} onClick={() => set({ fit: 'width' })}>Alla larghezza</button><button className={settings.fit === 'page' ? 'on' : ''} onClick={() => set({ fit: 'page' })}>Pagina intera</button></div></div>
          )}
          <div><div className="lbl">Tema</div>
            <div className="rd-seg">{([['carta', 'Carta', '#FBF8F1', '#1d1a16'], ['seppia', 'Seppia', '#F4ECD8', '#3b2f20'], ['notte', 'Notte', '#121212', '#d8d3c8']] as const).map(([k, l, bg, fg]) => (
              <button key={k} className={settings.theme === k ? 'on' : ''} onClick={() => set({ theme: k })} style={{ background: bg, color: fg }}>{l}</button>))}</div></div>
        </div>
      )}

      {panel && panel !== 'settings' && (
        <aside className="rd-panel">
          <div className="rd-panel-head">
            <b>{panel === 'toc' ? 'Indice' : panel === 'search' ? 'Cerca nel libro' : 'Note e segnalibri'}</b>
            <button className="rd-btn" onClick={() => setPanel(null)} aria-label="Chiudi"><X size={18} /></button>
          </div>
          {panel === 'search' && (
            <form onSubmit={runSearch} style={{ padding: '12px 14px', borderBottom: '1px solid var(--rd-line)' }}>
              <input className="rd-input" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Parola o ingrediente, poi Invio" />
              {hits && <p style={{ fontSize: '.78rem', color: 'var(--rd-muted)', marginTop: 8 }}>{searching ? `Cerco… ${hits.length} risultati` : `${hits.length} risultati`}</p>}
            </form>
          )}
          <div className="rd-panel-body">
            {panel === 'toc' && (toc === null ? <p className="rd-row">Carico l’indice…</p> : !toc.length ? <p className="rd-row">Questo libro non ha un indice.</p>
              : toc.map((t, i) => <button key={i} className={`rd-row ${t.level ? 'sub' : ''}`} onClick={() => go(t.location)}>{t.label}</button>))}
            {panel === 'search' && hits?.map((h, i) => {
              const k = h.excerpt.toLowerCase().indexOf(q.trim().toLowerCase())
              return (
                <button key={i} className="rd-row" onClick={() => go(h.location)}>
                  {k >= 0 ? <>{h.excerpt.slice(0, k)}<mark>{h.excerpt.slice(k, k + q.trim().length)}</mark>{h.excerpt.slice(k + q.trim().length)}</> : h.excerpt}
                  <small>{h.label}</small>
                </button>
              )
            })}
            {panel === 'notes' && (
              <>
                {!bookmarks.length && !hls.length && <p className="rd-row" style={{ color: 'var(--rd-muted)' }}>Seleziona del testo per evidenziarlo o aggiungere una nota; tocca il segnalibro in alto per ricordare una pagina.</p>}
                {bookmarks.map((m) => (
                  <div key={m.id} className="rd-row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Bookmark size={15} fill="currentColor" color="var(--accent)" />
                    <button style={{ flex: 1, textAlign: 'left', color: 'inherit' }} onClick={() => go(m.location)}>{m.label || 'Segnalibro'}<small>{new Date(m.created_at).toLocaleDateString('it-IT')}</small></button>
                    <button className="rd-btn" onClick={() => removeMark(m)} aria-label="Togli"><Trash2 size={15} /></button>
                  </div>
                ))}
                {hls.map((m) => (
                  <div key={m.id} className="rd-row" style={{ display: 'flex', gap: 8 }}>
                    <span style={{ width: 4, borderRadius: 2, background: HL_COLORS[m.color || 'yellow'], flexShrink: 0 }} />
                    <button style={{ flex: 1, textAlign: 'left', color: 'inherit', minWidth: 0 }} onClick={() => go(m.location)}>
                      «{(m.text || '').slice(0, 220)}{(m.text || '').length > 220 ? '…' : ''}»
                      {m.note && <span style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}>{m.note}</span>}
                      <small>{m.label}</small>
                    </button>
                    <span style={{ display: 'flex', flexDirection: 'column' }}>
                      <button className="rd-btn" onClick={() => setNoteFor(m)} aria-label="Nota"><NotebookPen size={15} /></button>
                      <button className="rd-btn" onClick={() => removeMark(m)} aria-label="Togli"><Trash2 size={15} /></button>
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>
      )}

      {sel && (
        <div className="rd-sel" style={{ left: Math.min(Math.max(sel.x, 150), (typeof window !== 'undefined' ? window.innerWidth : 800) - 150), top: Math.max(sel.y - 10, 70) }} onMouseDown={(e) => e.preventDefault()}>
          {Object.entries(HL_COLORS).map(([k, c]) => <button key={k} className="dot" style={{ background: c }} onClick={() => highlight(k)} aria-label={`Evidenzia ${k}`} />)}
          <button onClick={() => highlight('yellow', true)}><Highlighter size={14} /> Nota</button>
          <button onClick={() => { navigator.clipboard?.writeText(sel.text); api.current?.clearSelection(); setSel(null); flash('Copiato') }}><Copy size={14} /> Copia</button>
          {canImport && <button onClick={toRecipe}><Sparkles size={14} /> Ricetta</button>}
        </div>
      )}

      {noteFor && <NoteBox mark={noteFor} onSave={saveNote} onClose={() => setNoteFor(null)} />}
      {toast && <div className="toast" role="status" style={{ zIndex: 260 }}>{toast}</div>}
    </div>
  )
}

function NoteBox({ mark, onSave, onClose }: { mark: LibMark; onSave: (m: LibMark, n: string) => void; onClose: () => void }) {
  const [v, setV] = useState(mark.note || '')
  return (
    <div className="modal-bg" style={{ zIndex: 250 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal stack" style={{ gap: 12 }}>
        <b className="h2" style={{ fontSize: '1.2rem' }}>Nota</b>
        <p className="small muted" style={{ fontStyle: 'italic' }}>«{(mark.text || '').slice(0, 300)}»</p>
        <textarea className="textarea" autoFocus rows={4} value={v} onChange={(e) => setV(e.target.value)} placeholder="Es. provare con il 20% di zucchero in meno" />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-gold" onClick={() => onSave(mark, v.trim())}>Salva nota</button>
        </div>
      </div>
    </div>
  )
}
