'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Book, Section } from '@/lib/recipes'
import AddToDocument from './AddToDocument'

export type ListItem = {
  id: string; section_id: string; book_id: string; name: string; category: string; dish_group: string | null
  created_at: string; source: string; ingredients: string[]; steps: number
}

type Sort = 'az' | 'za' | 'new' | 'group'

export default function RecipeList({ items, books, sections, initialBook, initialSection, canEdit }: {
  items: ListItem[]; books: Book[]; sections: Section[]; initialBook: string; initialSection: string; canEdit: boolean
}) {
  const router = useRouter()
  const [book, setBook] = useState(initialBook)
  const [sec, setSec] = useState(initialSection)
  const [cat, setCat] = useState('Tutte')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('group')
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [docOpen, setDocOpen] = useState(false)

  useEffect(() => { try { const v = localStorage.getItem('rc_sort') as Sort; if (v) setSort(v) } catch {} }, [])
  function changeSort(v: Sort) { setSort(v); try { localStorage.setItem('rc_sort', v) } catch {} }
  function syncUrl(b: string, sc: string) {
    const p = new URLSearchParams()
    if (b !== 'tutti') p.set('ricettario', b)
    if (sc !== 'tutte') p.set('sezione', sc)
    router.replace(`/ricette${p.size ? '?' + p : ''}`, { scroll: false })
  }
  function changeBook(v: string) { setBook(v); setSec('tutte'); setCat('Tutte'); syncUrl(v, 'tutte') }
  function changeSec(v: string) { setSec(v); setCat('Tutte'); syncUrl(book, v) }

  const bookSections = sections.filter((x) => book === 'tutti' || x.book_id === book)
  const label = (r: ListItem) => {
    const sc = sections.find((x) => x.id === r.section_id)
    const bk = books.find((x) => x.id === r.book_id)
    if (book === 'tutti' && books.length > 1) return `${bk?.name ?? ''} › ${sc?.name ?? ''}`
    return sec === 'tutte' ? sc?.name ?? '' : ''
  }
  const inSec = useMemo(() => items.filter((r) =>
    (book === 'tutti' || r.book_id === book) && (sec === 'tutte' || r.section_id === sec)), [items, book, sec])
  const cats = useMemo(() => ['Tutte', ...Array.from(new Set(inSec.map((r) => r.category))).sort((a, b) => a.localeCompare(b, 'it'))], [inSec])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = inSec.filter((r) => cat === 'Tutte' || r.category === cat)
    if (needle) {
      out = out.filter((r) =>
        r.name.toLowerCase().includes(needle) ||
        (r.dish_group ?? '').toLowerCase().includes(needle) ||
        r.ingredients.some((i) => i.toLowerCase().includes(needle)))
    }
    const byName = (a: ListItem, b: ListItem) => a.name.localeCompare(b.name, 'it', { sensitivity: 'base', numeric: true })
    if (sort === 'az' || sort === 'group') out = [...out].sort(byName)
    if (sort === 'za') out = [...out].sort((a, b) => byName(b, a))
    if (sort === 'new') out = [...out].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return out
  }, [inSec, cat, q, sort])

  const groups = useMemo(() => {
    if (sort !== 'group') return null
    const map = new Map<string, ListItem[]>()
    for (const r of filtered) {
      const k = r.dish_group?.trim() || ''
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(r)
    }
    return Array.from(map.entries()).sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, 'it')))
  }, [filtered, sort])

  function toggle(id: string) { setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id])) }

  const card = (r: ListItem) => {
    const body = (
      <>
        <div className="meta">
          <span className="chip">{r.category}</span>
          {label(r) && <span className="muted" style={{ fontSize: '.68rem' }}>{label(r)}</span>}
        </div>
        <h3>{r.name}</h3>
        <p className="sub">{r.ingredients.length} ingredienti · {r.steps ? `${r.steps} ${r.steps === 1 ? 'passaggio' : 'passaggi'}` : 'senza procedimento'}</p>
        {selecting && <input type="checkbox" className="chk" checked={sel.includes(r.id)} readOnly />}
      </>
    )
    return selecting
      ? <div key={r.id} className={`rcard ${sel.includes(r.id) ? 'sel' : ''}`} onClick={() => toggle(r.id)} role="button">{body}</div>
      : <Link key={r.id} href={`/ricette/${r.id}`} className="rcard">{body}</Link>
  }

  return (
    <>
      {books.length > 1 && (
        <div className="pills" style={{ marginTop: 6 }}>
          <button className={`pill ${book === 'tutti' ? 'on' : ''}`} onClick={() => changeBook('tutti')}>Tutti i ricettari</button>
          {books.map((b) => (
            <button key={b.id} className={`pill ${book === b.id ? 'on' : ''}`} onClick={() => changeBook(b.id)}
              style={book === b.id ? { background: b.color, borderColor: b.color } : undefined}>{b.name}</button>
          ))}
        </div>
      )}
      {book !== 'tutti' && (
        <>
          <h1 className="h1" style={{ margin: '10px 0 6px' }}>{books.find((b) => b.id === book)?.name}</h1>
          {bookSections.length > 1 && (
            <div className="pills">
              <button className={`pill ${sec === 'tutte' ? 'on' : ''}`} onClick={() => changeSec('tutte')}>Tutte le sezioni</button>
              {bookSections.map((x) => (
                <button key={x.id} className={`pill ${sec === x.id ? 'on' : ''}`} onClick={() => changeSec(x.id)}>{x.name}</button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="toolbar">
        <div className="search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input className="input" type="search" placeholder="Cerca ricetta, gruppo o ingrediente…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto', borderRadius: 50 }} value={sort} onChange={(e) => changeSort(e.target.value as Sort)} aria-label="Ordina">
          <option value="group">Per gruppo</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="new">Più recenti</option>
        </select>
        <button className="btn" onClick={() => { setSelecting(!selecting); setSel([]) }}>{selecting ? 'Annulla' : 'Seleziona'}</button>
        {canEdit && sections.length > 0 && <Link href={`/ricette/nuova${sec !== 'tutte' ? `?sezione=${sec}` : book !== 'tutti' ? `?ricettario=${book}` : ''}`} className="btn btn-gold">+ Nuova</Link>}
      </div>

      <div className="pills">
        {cats.map((c) => <button key={c} className={`pill ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}</button>)}
      </div>

      <p className="sc muted" style={{ fontSize: '.6rem', margin: '4px 0 10px' }}>{filtered.length} / {inSec.length} ricette</p>

      {filtered.length === 0 ? (
        <p className="empty">❦ Nessuna ricetta trovata ❦</p>
      ) : groups ? (
        <div className="rgrid">
          {groups.map(([g, list]) => (
            <div key={g || '_'} style={{ display: 'contents' }}>
              {(groups.length > 1 || g) && <div className="group-hd"><span>{g || 'Senza gruppo'}</span><small className="muted">{list.length}</small></div>}
              {list.map(card)}
            </div>
          ))}
        </div>
      ) : (
        <div className="rgrid">{filtered.map(card)}</div>
      )}

      {selecting && sel.length > 0 && (
        <div className="selbar">
          <span className="serif" style={{ fontStyle: 'italic' }}>{sel.length} selezionate</span>
          <button className="btn btn-sm" onClick={() => setDocOpen(true)}>Aggiungi a documento</button>
        </div>
      )}
      {docOpen && (
        <AddToDocument recipeIds={sel} onClose={(done) => { setDocOpen(false); if (done) { setSelecting(false); setSel([]) } }} />
      )}
    </>
  )
}
