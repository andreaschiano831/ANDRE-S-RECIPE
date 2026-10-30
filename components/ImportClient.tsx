'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Camera, FileText, FileUp, Globe, Sparkles } from 'lucide-react'
import LinkImport, { type Found } from './LinkImport'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, draftToPayload, sectionLabel, type Book, type RecipeDraft, type Section } from '@/lib/recipes'
import DraftFields from './DraftFields'
import RecipeSheet, { type SheetRecipe } from './RecipeSheet'
import { useToast } from './useToast'

type Img = { id: string; url: string; name: string }
type Item = { key: string; draft: RecipeDraft; open: boolean; checked: boolean; savedId?: string; error?: string }

/** Ridimensiona lo screenshot (max 1800px) e lo converte in JPEG: resta sotto i limiti di Vercel e Groq */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const max = 1800
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.86))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Immagine non leggibile')) }
    img.src = url
  })
}

function draftToSheet(d: RecipeDraft, section: string): SheetRecipe {
  const n = (v: string) => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : null }
  return {
    name: d.name, category: d.category, dish_group: d.dish_group, section, yield_note: d.yield_note, notes: d.notes,
    ingredients: d.ingredients.filter((i) => i.name.trim()).map((i) => ({ name: i.name, quantity: n(i.quantity), unit: i.unit, note: i.note })),
    steps: d.steps.filter((s) => s.body.trim()).map((s) => ({ body: s.body, duration_min: n(s.duration_min), temperature: s.temperature })),
  }
}

export function toDraft(r: any, sections: Section[], source: 'ai_image' | 'ai_text'): RecipeDraft {
  const str = (v: any) => (v == null ? '' : String(v))
  const ings = (Array.isArray(r?.ingredients) ? r.ingredients : []).map((i: any) =>
    Array.isArray(i) ? { name: str(i[0]), quantity: str(i[1] ?? ''), unit: str(i[2] || 'g'), note: '' }
      : { name: str(i?.name), quantity: i?.quantity == null ? '' : str(i.quantity), unit: str(i?.unit || (i?.quantity == null ? 'q.b.' : 'g')), note: str(i?.note) })
  let steps = (Array.isArray(r?.steps) ? r.steps : []).map((s: any) =>
    typeof s === 'string' ? { body: s, duration_min: '', temperature: '' }
      : { body: str(s?.body), duration_min: s?.duration_min ? str(s.duration_min) : '', temperature: str(s?.temperature) })
  if (!steps.length && r?.procedure) steps = [{ body: str(r.procedure), duration_min: '', temperature: '' }]
  return {
    section_id: sections.some((x) => x.id === r?.section_id) ? r.section_id : sections[0]?.id ?? '',
    name: str(r?.name).trim() || 'Ricetta senza nome',
    category: CATEGORIES.includes(r?.category) ? r.category : 'Altro',
    dish_group: str(r?.dish_group),
    yield_note: str(r?.yield_note),
    notes: str(r?.notes),
    source,
    ingredients: ings.length ? ings : [{ name: '', quantity: '', unit: 'g', note: '' }],
    steps: steps.length ? steps : [{ body: '', duration_min: '', temperature: '' }],
  }
}

export default function ImportClient({ books: books0, sections: sections0, groups, ingredientNames, initialTab = 'img', isAdmin = false }: { books: Book[]; sections: Section[]; groups: string[]; ingredientNames: string[]; initialTab?: 'img' | 'text' | 'link'; isAdmin?: boolean }) {
  const [books, setBooks] = useState(books0)
  const [sections, setSections] = useState(sections0)
  const { show, node } = useToast()
  const [tab, setTab] = useState<'img' | 'text' | 'link'>(initialTab)
  const [imgs, setImgs] = useState<Img[]>([])
  const [text, setText] = useState('')
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [bookId, setBookId] = useState(books[0]?.id ?? '')
  const [forceSection, setForceSection] = useState('')
  const bookSections = sections.filter((x) => x.book_id === bookId)

  const addFiles = useCallback(async (files: File[]) => {
    const list = files.filter((f) => f.type.startsWith('image/'))
    for (const f of list) {
      try {
        const url = await shrink(f)
        setImgs((x) => [...x, { id: crypto.randomUUID(), url, name: f.name }])
      } catch (e: any) { show(e.message, 'err') }
    }
    const docs = files.filter((f) => !f.type.startsWith('image/') && (/\.(txt|md|docx|doc)$/i.test(f.name) || f.type.startsWith('text/')))
    const parts: string[] = []
    for (const f of docs) {
      try {
        if (/\.docx$/i.test(f.name)) {
          const mammoth = await import('mammoth')
          const { value } = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() })
          parts.push(value)
        } else if (/\.doc$/i.test(f.name)) {
          // il .doc esportato dal vecchio ricettario è HTML: togliamo i tag
          const d = new DOMParser().parseFromString(await f.text(), 'text/html')
          parts.push(d.body.innerText || d.body.textContent || '')
        } else parts.push(await f.text())
      } catch { show(`Non riesco a leggere ${f.name}`, 'err') }
    }
    if (parts.length) { setText((t) => [t.trim(), ...parts.map((x) => x.trim())].filter(Boolean).join('\n\n')); setTab('text') }
  }, [show])

  // Incolla uno screenshot direttamente con Ctrl/Cmd+V
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.some((f) => f.type.startsWith('image/'))) { e.preventDefault(); setTab('img'); addFiles(files) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  async function call(body: object) {
    const res = await fetch('/api/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, book_id: bookId }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Errore ${res.status}`)
    return (data.recipes ?? []) as any[]
  }

  async function analyse() {
    const found: RecipeDraft[] = []
    const errors: string[] = []
    if (tab === 'img') {
      if (!imgs.length) { show('Aggiungi almeno uno screenshot', 'err'); return }
      for (let i = 0; i < imgs.length; i++) {
        setBusy(`Analisi immagine ${i + 1} di ${imgs.length}…`)
        try { (await call({ image: imgs[i].url })).forEach((r) => found.push(toDraft(r, sections, 'ai_image'))) }
        catch (e: any) { errors.push(`Immagine ${i + 1}: ${e.message}`) }
      }
    } else {
      if (!text.trim()) { show('Incolla il testo della ricetta', 'err'); return }
      setBusy('Analisi del testo…')
      try { (await call({ text })).forEach((r) => found.push(toDraft(r, sections, 'ai_text'))) }
      catch (e: any) { errors.push(e.message) }
    }
    setBusy('')
    if (forceSection) found.forEach((d) => { d.section_id = forceSection })
    if (errors.length) show(errors.join(' · '), 'err')
    if (!found.length) { if (!errors.length) show('Nessuna ricetta riconosciuta. Prova con un’immagine più nitida.', 'err'); return }
    setItems((x) => [...x, ...found.map((draft, k) => ({ key: crypto.randomUUID(), draft, open: found.length === 1 && k === 0, checked: true }))])
    show(`${found.length} ${found.length === 1 ? 'ricetta trovata' : 'ricette trovate'}: controlla e salva`, 'ok')
  }

  function addFound(list: Found[]) {
    setItems((x) => [...x, ...list.map(({ raw, section_id, source }) => {
      const draft = toDraft({ ...raw, section_id }, [...sections, { id: section_id } as Section], source === 'manual' ? 'ai_text' : source)
      draft.section_id = section_id
      return { key: crypto.randomUUID(), draft, open: false, checked: true }
    })])
  }

  const [saved, setSaved] = useState<{ id: string; name: string }[]>([])
  const patch = (key: string, p: Partial<Item>) => setItems((x) => x.map((it) => (it.key === key ? { ...it, ...p } : it)))

  async function saveOne(it: Item): Promise<boolean> {
    const payload = draftToPayload(it.draft)
    if (!payload.name || !payload.ingredients.length) { patch(it.key, { error: 'Servono nome e almeno un ingrediente', open: true }); return false }
    const { data, error } = await createClient().rpc('save_recipe', { payload })
    if (error) { patch(it.key, { error: error.message, open: true }); return false }
    setSaved((x) => [...x, { id: data as string, name: it.draft.name }])
    setItems((x) => x.filter((y) => y.key !== it.key))
    return true
  }
  async function saveSelected() {
    const todo = items.filter((i) => i.checked && !i.savedId)
    if (!todo.length) return
    setBusy('Salvataggio…')
    let ok = 0
    for (const it of todo) if (await saveOne(it)) ok++
    setBusy('')
    show(`${ok} di ${todo.length} salvate`, ok === todo.length ? 'ok' : 'err')
  }

  const pending = items.filter((i) => i.checked && !i.savedId).length

  return (
    <>
      <h1 className="h1">Importa ricette</h1>
      <p className="muted" style={{ margin: '6px 0 18px', fontSize: '.88rem' }}>
        Da screenshot, testo, file o link a interi ricettari online. L’AI separa le preparazioni, divide il procedimento in passaggi e tu controlli tutto prima di salvare.
      </p>

      <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="tabs">
            <button className={tab === 'img' ? 'on' : ''} onClick={() => setTab('img')}><Camera size={15} /> Screenshot</button>
            <button className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}><FileText size={15} /> Testo o file</button>
            <button className={tab === 'link' ? 'on' : ''} onClick={() => setTab('link')}><Globe size={15} /> Da link</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {tab !== 'link' && books.length > 1 && (
              <select className="select" style={{ width: 'auto' }} value={bookId} onChange={(e) => { setBookId(e.target.value); setForceSection('') }} aria-label="Ricettario">
                {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
            {tab !== 'link' && <select className="select" style={{ width: 'auto' }} value={forceSection} onChange={(e) => setForceSection(e.target.value)} aria-label="Sezione">
              <option value="">Sezione: decide l’AI</option>
              {bookSections.map((x) => <option key={x.id} value={x.id}>Tutte in {x.name}</option>)}
            </select>}
          </div>
        </div>

        {tab === 'link' ? (
          <LinkImport books={books} sections={sections} isAdmin={isAdmin} onBooks={setBooks} onSections={setSections} onFound={addFound} show={show} />
        ) : tab === 'img' ? (
          <>
            <label className={`drop ${over ? 'over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(Array.from(e.dataTransfer.files)) }}>
              <input type="file" accept="image/*,.txt,.docx,.doc" multiple hidden onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
              <Camera size={30} strokeWidth={1.4} color="var(--accent)" />
              <p className="serif" style={{ fontStyle: 'italic', fontSize: '1.1rem' }}>Tocca per scegliere, trascina qui, o premi Ctrl/⌘+V</p>
              <p className="muted" style={{ fontSize: '.72rem', marginTop: 4 }}>Screenshot di app, foto di quaderni, schede tecniche, pagine di libri</p>
            </label>
            {imgs.length > 0 && (
              <div className="thumbs">
                {imgs.map((im) => (
                  <div key={im.id} className="thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt={im.name} />
                    <button onClick={() => setImgs((x) => x.filter((y) => y.id !== im.id))} aria-label="Rimuovi">×</button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
          <label className="btn btn-sm" style={{ alignSelf: 'flex-start' }}>
            <FileUp size={15} /> Carica .docx o .txt
            <input type="file" accept=".txt,.md,.docx,.doc,text/plain" multiple hidden onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
          </label>
          <textarea className="textarea" rows={10} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Incolla qui una o più ricette…\n\nCREMA PASTICCERA\nLatte 1000 g\nZucchero 350 g\n…'} />
          </>
        )}

        {tab !== 'link' && <button className="btn btn-gold" disabled={!!busy} onClick={analyse}>
          {busy ? <><span className="spin" /> {busy}</> : <><Sparkles size={16} /> Analizza con AI</>}
        </button>}
      </section>

      {saved.length > 0 && (
        <section className="panel panel-pad" style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="row">
            <b style={{ flex: 1 }}>{saved.length} {saved.length === 1 ? 'ricetta salvata' : 'ricette salvate'} nel ricettario</b>
            <Link href="/ricette" className="btn btn-sm">Vai alle ricette</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setSaved([])}>Nascondi</button>
          </div>
          <div className="pills">{saved.slice(-12).map((x) => <Link key={x.id} href={`/ricette/${x.id}`} className="pill">{x.name}</Link>)}</div>
        </section>
      )}

      {items.length > 0 && (
        <section style={{ marginTop: 26 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <h2 className="h2" style={{ flex: 1 }}>Anteprima · {items.length} da controllare</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setItems((x) => x.map((i) => ({ ...i, checked: !x.every((y) => y.checked) })))}>{items.every((i) => i.checked) ? 'Deseleziona tutte' : 'Seleziona tutte'}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { if (confirm('Togliere tutte le ricette dalla lista? Non verranno salvate.')) setItems([]) }}>Svuota la lista</button>
          </div>
          <div className="rsheets">
            {items.map((it) => (
              <div key={it.key} className="stack" style={{ gap: 0 }}>
                {it.open ? (
                  <div className="panel" style={{ padding: 14 }}>
                    <DraftFields draft={it.draft} onChange={(d) => patch(it.key, { draft: d })} books={books} sections={sections} groups={groups} ingredientNames={ingredientNames} />
                    {it.error && <p className="err" style={{ marginTop: 8 }}>{it.error}</p>}
                    <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
                      <button className="btn btn-sm" onClick={() => patch(it.key, { open: false })}>Vedi anteprima</button>
                      <button className="btn btn-gold btn-sm" onClick={() => saveOne(it)}>Salva questa</button>
                    </div>
                  </div>
                ) : (
                  <RecipeSheet procOpen selected={it.checked} r={draftToSheet(it.draft, sectionLabel(it.draft.section_id, sections, books))}
                    actions={<>
                      <label className="btn" style={{ cursor: 'pointer' }}><input type="checkbox" checked={it.checked} onChange={(e) => patch(it.key, { checked: e.target.checked })} style={{ accentColor: 'var(--accent)' }} /> Da salvare</label>
                      <button className="btn" onClick={() => patch(it.key, { open: true })}>Modifica</button>
                      <button className="btn" onClick={() => saveOne(it)}>Salva</button>
                      <button className="btn" onClick={() => setItems((x) => x.filter((y) => y.key !== it.key))} aria-label="Scarta">Scarta</button>
                    </>} />
                )}
                {it.error && !it.open && <p className="err" style={{ marginTop: 6 }}>{it.error}</p>}
              </div>
            ))}
          </div>
          {pending > 0 && (
            <div className="sticky-actions">
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-gold" disabled={!!busy} onClick={saveSelected}>{busy || `Salva ${pending} ${pending === 1 ? 'ricetta' : 'ricette'}`}</button>
              </div>
            </div>
          )}
        </section>
      )}
      {node}
    </>
  )
}
