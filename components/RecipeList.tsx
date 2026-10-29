'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, ChefHat, FilePlus2, FolderInput, LayoutGrid, List, ListOrdered, Plus, Search, ShoppingBasket, Trash2, X } from 'lucide-react'
import type { Book, Section } from '@/lib/recipes'
import { createClient } from '@/lib/supabase/client'
import AddToDocument from './AddToDocument'
import { useToast } from './useToast'

export type ListItem = {
  id: string; section_id: string; book_id: string; name: string; category: string; dish_group: string | null
  created_at: string; source: string; ingredients: string[]; steps: number
}

type Sort = 'az' | 'za' | 'new' | 'group'
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function RecipeList({ items: initialItems, books, sections, initialBook, initialSection, initialQ = '', canEdit }: {
  items: ListItem[]; books: Book[]; sections: Section[]; initialBook: string; initialSection: string; initialQ?: string; canEdit: boolean
}) {
  const router = useRouter()
  const { show, node } = useToast()
  const [items, setItems] = useState(initialItems)
  const [book, setBook] = useState(initialBook)
  const [sec, setSec] = useState(initialSection)
  const [cat, setCat] = useState('Tutte')
  const [q, setQ] = useState(initialQ)
  const [sort, setSort] = useState<Sort>('group')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [docOpen, setDocOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)

  useEffect(() => { setItems(initialItems) }, [initialItems])
  useEffect(() => {
    try {
      const s = localStorage.getItem('rc_sort') as Sort; if (s) setSort(s)
      const v = localStorage.getItem('rc_view') as 'grid' | 'list'; if (v) setView(v)
    } catch {}
  }, [])
  const persist = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} }

  function syncUrl(b: string, sc: string) {
    const p = new URLSearchParams()
    if (b !== 'tutti') p.set('ricettario', b)
    if (sc !== 'tutte') p.set('sezione', sc)
    router.replace(`/ricette${p.size ? '?' + p : ''}`, { scroll: false })
  }
  const changeBook = (v: string) => { setBook(v); setSec('tutte'); setCat('Tutte'); syncUrl(v, 'tutte') }
  const changeSec = (v: string) => { setSec(v); setCat('Tutte'); syncUrl(book, v) }

  const bookById = useMemo(() => new Map(books.map((b) => [b.id, b])), [books])
  const secById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections])
  const bookSections = sections.filter((x) => book === 'tutti' || x.book_id === book)
  const inBook = useMemo(() => items.filter((r) => book === 'tutti' || r.book_id === book), [items, book])
  const inSec = useMemo(() => inBook.filter((r) => sec === 'tutte' || r.section_id === sec), [inBook, sec])
  const cats = useMemo(() => {
    const m = new Map<string, number>()
    inSec.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + 1))
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0], 'it'))
  }, [inSec])

  const filtered = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean)
    let out = inSec.filter((r) => cat === 'Tutte' || r.category === cat)
    if (words.length) {
      out = out.filter((r) => {
        const hay = norm(`${r.name} ${r.dish_group ?? ''} ${r.category} ${r.ingredients.join(' ')}`)
        return words.every((w) => hay.includes(w))
      })
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

  const matchedIng = (r: ListItem) => {
    const words = norm(q).split(/\s+/).filter(Boolean)
    if (!words.length || words.every((w) => norm(r.name).includes(w))) return null
    return r.ingredients.find((i) => words.some((w) => norm(i).includes(w))) ?? null
  }
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  async function bulkDelete() {
    if (!confirm(`Eliminare definitivamente ${sel.length} ricette?`)) return
    const { error } = await createClient().from('recipes').delete().in('id', sel)
    if (error) { show('Non riesco a eliminarle: ' + error.message, 'err'); return }
    setItems((xs) => xs.filter((x) => !sel.includes(x.id))); show(`${sel.length} ricette eliminate`, 'ok')
    setSel([]); setSelecting(false); router.refresh()
  }
  async function bulkMove(sectionId: string) {
    const { error } = await createClient().from('recipes').update({ section_id: sectionId }).in('id', sel)
    if (error) { show('Non riesco a spostarle: ' + error.message, 'err'); return }
    const target = secById.get(sectionId)!
    setItems((xs) => xs.map((x) => (sel.includes(x.id) ? { ...x, section_id: sectionId, book_id: target.book_id } : x)))
    show(`${sel.length} ricette spostate in ${target.name}`, 'ok')
    setMoveOpen(false); setSel([]); setSelecting(false); router.refresh()
  }

  const card = (r: ListItem) => {
    const b = bookById.get(r.book_id)
    const s = secById.get(r.section_id)
    const ing = matchedIng(r)
    const where = [books.length > 1 && book === 'tutti' ? b?.name : null, sec === 'tutte' ? s?.name : null].filter(Boolean).join(' › ')
    const body = (
      <>
        <span className="bar" style={{ background: b?.color ?? 'var(--accent)' }} />
        <div className="meta">
          <span className="chip">{r.category}</span>
          {where && <span className="small muted">{where}</span>}
        </div>
        <h3>{r.name}</h3>
        <div className="sub">
          <span><ShoppingBasket /> {r.ingredients.length}</span>
          <span><ListOrdered /> {r.steps ? r.steps : 'nessun passaggio'}</span>
          {ing && <span className="gold">contiene {ing}</span>}
        </div>
        {selecting && <input type="checkbox" className="chk check" checked={sel.includes(r.id)} readOnly tabIndex={-1} />}
      </>
    )
    if (selecting) return <div key={r.id} className={`rcard ${sel.includes(r.id) ? 'sel' : ''}`} onClick={() => toggle(r.id)} role="checkbox" aria-checked={sel.includes(r.id)} tabIndex={0}>{body}</div>
    return (
      <Link key={r.id} href={`/ricette/${r.id}`} className="rcard">
        {body}
        <span className="peek">
          <span className="icon-btn" role="button" title="Modalità cucina" onClick={(e) => { e.preventDefault(); router.push(`/ricette/${r.id}/cucina`) }}><ChefHat size={15} /></span>
        </span>
      </Link>
    )
  }

  const currentBook = books.find((b) => b.id === book)

  return (
    <div className="wrap page">
      <div className="ph">
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="h1">{currentBook ? currentBook.name : 'Tutte le ricette'}</h1>
          <p>{currentBook?.subtitle || `${inBook.length} ricette${books.length > 1 && !currentBook ? ` in ${books.length} ricettari` : ''}`}</p>
        </div>
        {canEdit && sections.length > 0 && (
          <Link href={`/ricette/nuova${sec !== 'tutte' ? `?sezione=${sec}` : book !== 'tutti' ? `?ricettario=${book}` : ''}`} className="btn btn-gold"><Plus size={16} /> Nuova ricetta</Link>
        )}
      </div>

      {books.length > 1 && (
        <div className="pills">
          <button className={`pill ${book === 'tutti' ? 'on' : ''}`} onClick={() => changeBook('tutti')}>Tutti i ricettari</button>
          {books.map((b) => (
            <button key={b.id} className={`pill ${book === b.id ? 'on' : ''}`} onClick={() => changeBook(b.id)}>
              <span className="dot" style={{ background: b.color, marginRight: 6 }} />{b.name}
            </button>
          ))}
        </div>
      )}
      {bookSections.length > 1 && (
        <div className="pills">
          <button className={`pill ${sec === 'tutte' ? 'on' : ''}`} onClick={() => changeSec('tutte')}>Tutte le sezioni</button>
          {bookSections.map((x) => (
            <button key={x.id} className={`pill ${sec === x.id ? 'on' : ''}`} onClick={() => changeSec(x.id)}>
              {x.name}<span className="cnt">{inBook.filter((r) => r.section_id === x.id).length}</span>
            </button>
          ))}
        </div>
      )}

      <div className="toolbar">
        <div className="search">
          <Search />
          <input className="input" type="search" placeholder="Cerca per nome, gruppo o ingrediente" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cerca ricette" />
        </div>
        <select className="select" style={{ width: 'auto', height: 42 }} value={sort} onChange={(e) => { setSort(e.target.value as Sort); persist('rc_sort', e.target.value) }} aria-label="Ordina">
          <option value="group">Per gruppo</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
          <option value="new">Più recenti</option>
        </select>
        <div className="seg" role="group" aria-label="Vista">
          <button className={view === 'grid' ? 'on' : ''} onClick={() => { setView('grid'); persist('rc_view', 'grid') }} aria-label="Griglia"><LayoutGrid size={16} /></button>
          <button className={view === 'list' ? 'on' : ''} onClick={() => { setView('list'); persist('rc_view', 'list') }} aria-label="Elenco"><List size={16} /></button>
        </div>
        <button className={`btn ${selecting ? 'btn-gold' : ''}`} style={{ height: 42 }} onClick={() => { setSelecting(!selecting); setSel([]) }}>
          {selecting ? <><X size={15} /> Fine</> : <><CheckSquare size={15} /> Seleziona</>}
        </button>
      </div>

      {cats.length > 1 && (
        <div className="pills">
          <button className={`pill ${cat === 'Tutte' ? 'on' : ''}`} onClick={() => setCat('Tutte')}>Tutte<span className="cnt">{inSec.length}</span></button>
          {cats.map(([c, n]) => <button key={c} className={`pill ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{c}<span className="cnt">{n}</span></button>)}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty">
          <span className="dish">{items.length === 0 ? 'Il ricettario è ancora vuoto' : 'Nessuna ricetta corrisponde'}</span>
          {items.length === 0 && canEdit
            ? <div className="row"><Link href="/ricette/nuova" className="btn btn-gold">Scrivi la prima ricetta</Link><Link href="/importa" className="btn">Importa da screenshot</Link></div>
            : q && <button className="btn btn-sm" onClick={() => { setQ(''); setCat('Tutte') }}>Azzera la ricerca</button>}
        </div>
      ) : (
        <div className={`rgrid ${view === 'list' ? 'list' : ''}`}>
          {groups
            ? groups.map(([g, list]) => (
                <div key={g || '_'} style={{ display: 'contents' }}>
                  {(groups.length > 1 || g) && <div className="group-hd"><span>{g || 'Senza gruppo'}</span><small>{list.length}</small></div>}
                  {list.map(card)}
                </div>
              ))
            : filtered.map(card)}
        </div>
      )}

      {selecting && (
        <div className="selbar">
          <span style={{ fontWeight: 600 }}>{sel.length} selezionate</span>
          <button className="btn btn-sm" onClick={() => setSel(sel.length === filtered.length ? [] : filtered.map((r) => r.id))}>{sel.length === filtered.length ? 'Nessuna' : 'Tutte'}</button>
          <button className="btn btn-sm" disabled={!sel.length} onClick={() => setDocOpen(true)}><FilePlus2 size={15} /> Documento</button>
          {canEdit && <button className="btn btn-sm" disabled={!sel.length} onClick={() => setMoveOpen(true)}><FolderInput size={15} /> Sposta</button>}
          {canEdit && <button className="btn btn-sm" disabled={!sel.length} onClick={bulkDelete}><Trash2 size={15} /> Elimina</button>}
        </div>
      )}
      {docOpen && <AddToDocument recipeIds={sel} onClose={(done) => { setDocOpen(false); if (done) { setSelecting(false); setSel([]) } }} />}
      {moveOpen && (
        <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && setMoveOpen(false)}>
          <div className="modal">
            <h2 className="h2">Sposta {sel.length} ricette</h2>
            <p className="muted small" style={{ margin: '4px 0 14px' }}>Scegli la sezione di destinazione.</p>
            <div className="stack" style={{ gap: 6 }}>
              {books.map((b) => (
                <div key={b.id}>
                  {books.length > 1 && <p className="label" style={{ margin: '8px 2px 6px' }}><span className="dot" style={{ background: b.color, marginRight: 6 }} />{b.name}</p>}
                  <div className="stack" style={{ gap: 6 }}>
                    {sections.filter((x) => x.book_id === b.id).map((x) => (
                      <button key={x.id} className="opt" onClick={() => bulkMove(x.id)}><b>{x.name}</b></button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="btn" style={{ width: '100%', marginTop: 16 }} onClick={() => setMoveOpen(false)}>Annulla</button>
          </div>
        </div>
      )}
      {node}
    </div>
  )
}
