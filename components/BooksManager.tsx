'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Book, Section } from '@/lib/recipes'
import { bookGradient } from '@/lib/ui'
import { useToast } from './useToast'

const PRESETS: Record<string, string[]> = {
  pasticceria: ['Colazioni', 'Fine Dining', 'Gelateria', 'Torte & Pasticceria'],
  cucina: ['Antipasti', 'Primi', 'Secondi', 'Contorni', 'Basi e fondi', 'Dessert'],
  vuoto: ['Generale'],
}
const COLORS = ['#7A4214', '#1C1A16', '#165468', '#6A1840', '#3E5A2A', '#5a4e2d', '#7A2E1E', '#2E3A6A']

export default function BooksManager({ initialBooks, initialSections, counts }: {
  initialBooks: Book[]; initialSections: Section[]; counts: Record<string, number>
}) {
  const router = useRouter()
  const { show, node } = useToast()
  const [books, setBooks] = useState(initialBooks)
  const [sections, setSections] = useState(initialSections)
  const [form, setForm] = useState({ name: '', subtitle: '', color: COLORS[0], preset: 'pasticceria' })
  const [busy, setBusy] = useState(false)
  const [newSec, setNewSec] = useState<Record<string, string>>({})
  const sb = () => createClient()
  const bookCount = (id: string) => sections.filter((x) => x.book_id === id).reduce((n, x) => n + (counts[x.id] ?? 0), 0)

  async function createBook() {
    if (!form.name.trim()) { show('Dai un nome al ricettario', 'err'); return }
    setBusy(true)
    const { data: b, error } = await sb().from('books')
      .insert({ name: form.name.trim(), subtitle: form.subtitle.trim() || null, color: form.color, position: books.length })
      .select('*').single()
    if (error || !b) { setBusy(false); show(error?.message ?? 'Errore', 'err'); return }
    const { data: secs, error: e2 } = await sb().from('sections')
      .insert(PRESETS[form.preset].map((name, i) => ({ book_id: b.id, name, position: i }))).select('*')
    setBusy(false)
    if (e2) { show(e2.message, 'err'); return }
    setBooks([...books, b as Book]); setSections([...sections, ...((secs ?? []) as Section[])])
    setForm({ name: '', subtitle: '', color: COLORS[(books.length + 1) % COLORS.length], preset: 'pasticceria' })
    show('Ricettario creato', 'ok'); router.refresh()
  }

  async function updateBook(id: string, patch: Partial<Book>) {
    setBooks(books.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    const { error } = await sb().from('books').update(patch).eq('id', id)
    if (error) show(error.message, 'err'); else router.refresh()
  }
  async function moveBook(i: number, d: number) {
    const j = i + d; if (j < 0 || j >= books.length) return
    const a = [...books]; [a[i], a[j]] = [a[j], a[i]]; setBooks(a)
    await Promise.all(a.map((b, k) => sb().from('books').update({ position: k }).eq('id', b.id)))
    router.refresh()
  }
  async function deleteBook(b: Book) {
    const n = bookCount(b.id)
    if (n > 0) { show(`«${b.name}» contiene ${n} ricette: spostale o eliminale prima`, 'err'); return }
    if (!confirm(`Eliminare il ricettario «${b.name}» e le sue sezioni vuote?`)) return
    const { error } = await sb().from('books').delete().eq('id', b.id)
    if (error) { show(error.message, 'err'); return }
    setBooks(books.filter((x) => x.id !== b.id)); setSections(sections.filter((x) => x.book_id !== b.id)); router.refresh()
  }

  async function addSection(bookId: string) {
    const name = (newSec[bookId] ?? '').trim(); if (!name) return
    const pos = sections.filter((x) => x.book_id === bookId).length
    const { data, error } = await sb().from('sections').insert({ book_id: bookId, name, position: pos }).select('*').single()
    if (error) { show(error.code === '23505' ? 'Esiste già una sezione con questo nome' : error.message, 'err'); return }
    setSections([...sections, data as Section]); setNewSec({ ...newSec, [bookId]: '' }); router.refresh()
  }
  async function renameSection(x: Section) {
    const name = prompt('Nuovo nome della sezione:', x.name)?.trim(); if (!name || name === x.name) return
    const { error } = await sb().from('sections').update({ name }).eq('id', x.id)
    if (error) { show(error.message, 'err'); return }
    setSections(sections.map((y) => (y.id === x.id ? { ...y, name } : y))); router.refresh()
  }
  async function moveSection(bookId: string, i: number, d: number) {
    const list = sections.filter((x) => x.book_id === bookId)
    const j = i + d; if (j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    const reordered = list.map((x, k) => ({ ...x, position: k }))
    setSections([...sections.filter((x) => x.book_id !== bookId), ...reordered])
    await Promise.all(reordered.map((x) => sb().from('sections').update({ position: x.position }).eq('id', x.id)))
    router.refresh()
  }
  async function deleteSection(x: Section) {
    if (counts[x.id]) { show(`La sezione contiene ${counts[x.id]} ricette: spostale prima`, 'err'); return }
    if (!confirm(`Eliminare la sezione «${x.name}»?`)) return
    const { error } = await sb().from('sections').delete().eq('id', x.id)
    if (error) { show(error.message, 'err'); return }
    setSections(sections.filter((y) => y.id !== x.id)); router.refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {books.map((b, i) => {
        const secs = sections.filter((x) => x.book_id === b.id).sort((x, y) => x.position - y.position)
        return (
          <section key={b.id} className="panel" style={{ overflow: 'hidden' }}>
            <div style={{ background: bookGradient(b.color), color: '#fff', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input className="serif" value={b.name} aria-label="Nome ricettario"
                  onChange={(e) => setBooks(books.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))}
                  onBlur={(e) => e.target.value.trim() && updateBook(b.id, { name: e.target.value.trim() })}
                  style={{ background: 'none', border: 'none', color: '#fff', fontStyle: 'italic', fontSize: '1.6rem', width: '100%', outline: 'none' }} />
                <input value={b.subtitle ?? ''} placeholder="Sottotitolo (facoltativo)" aria-label="Sottotitolo"
                  onChange={(e) => setBooks(books.map((x) => (x.id === b.id ? { ...x, subtitle: e.target.value } : x)))}
                  onBlur={(e) => updateBook(b.id, { subtitle: e.target.value.trim() || null })}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.75)', fontSize: '.78rem', width: '100%', outline: 'none' }} />
              </div>
              <span className="serif" style={{ fontStyle: 'italic', opacity: .85 }}>{bookCount(b.id)} ricette</span>
            </div>
            <div className="panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="label" style={{ marginRight: 4 }}>Colore</span>
                {COLORS.map((c) => (
                  <button key={c} onClick={() => updateBook(b.id, { color: c })} aria-label={c}
                    style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: b.color === c ? '2px solid var(--gold2)' : '2px solid transparent', padding: 0 }} />
                ))}
                <input type="color" value={b.color} onChange={(e) => updateBook(b.id, { color: e.target.value })} style={{ width: 26, height: 26, border: 'none', background: 'none' }} aria-label="Colore personalizzato" />
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button className="icon-btn" disabled={i === 0} onClick={() => moveBook(i, -1)} aria-label="Su">↑</button>
                  <button className="icon-btn" disabled={i === books.length - 1} onClick={() => moveBook(i, 1)} aria-label="Giù">↓</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteBook(b)}>Elimina</button>
                </span>
              </div>

              <span className="label" style={{ marginTop: 6 }}>Sezioni</span>
              {secs.map((x, k) => (
                <div key={x.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--ctrl)', borderRadius: 10 }}>
                  <span className="serif" style={{ flex: 1, fontStyle: 'italic', fontSize: '1.05rem' }}>{x.name}</span>
                  <span className="muted" style={{ fontSize: '.72rem' }}>{counts[x.id] ?? 0}</span>
                  <button className="icon-btn" onClick={() => renameSection(x)} aria-label="Rinomina">✎</button>
                  <button className="icon-btn" disabled={k === 0} onClick={() => moveSection(b.id, k, -1)} aria-label="Su">↑</button>
                  <button className="icon-btn" disabled={k === secs.length - 1} onClick={() => moveSection(b.id, k, 1)} aria-label="Giù">↓</button>
                  <button className="icon-btn" onClick={() => deleteSection(x)} aria-label="Elimina">×</button>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="input" placeholder="Nuova sezione…" value={newSec[b.id] ?? ''}
                  onChange={(e) => setNewSec({ ...newSec, [b.id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addSection(b.id)} />
                <button className="btn" onClick={() => addSection(b.id)}>Aggiungi</button>
              </div>
            </div>
          </section>
        )
      })}

      <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderStyle: 'dashed' }}>
        <h2 className="h2">+ Nuovo ricettario</h2>
        <div className="grid2">
          <label className="field"><span className="label">Nome</span>
            <input className="input" value={form.name} placeholder="Es. Pasticceria, Cucina calda, Personale"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field"><span className="label">Sottotitolo</span>
            <input className="input" value={form.subtitle} placeholder="facoltativo" onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          </label>
        </div>
        <label className="field"><span className="label">Sezioni di partenza</span>
          <select className="select" value={form.preset} onChange={(e) => setForm({ ...form, preset: e.target.value })}>
            <option value="pasticceria">Pasticceria — {PRESETS.pasticceria.join(', ')}</option>
            <option value="cucina">Cucina — {PRESETS.cucina.join(', ')}</option>
            <option value="vuoto">Una sola sezione «Generale»</option>
          </select>
        </label>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="label" style={{ marginRight: 4 }}>Colore</span>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setForm({ ...form, color: c })} aria-label={c}
              style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: form.color === c ? '2px solid var(--gold2)' : '2px solid transparent', padding: 0 }} />
          ))}
        </div>
        <button className="btn btn-gold" disabled={busy} onClick={createBook}>{busy ? '…' : 'Crea ricettario'}</button>
      </section>
      {node}
    </div>
  )
}
