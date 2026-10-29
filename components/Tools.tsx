'use client'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Download, FolderTree, Pencil, Trash2, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Book, Recipe, Section } from '@/lib/recipes'
import { useToast } from './useToast'

const norm = (s: string) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

function similarity(a: string, b: string) {
  if (a === b) return 1
  const m = a.length, n = b.length
  if (!m || !n) return 0
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return 1 - prev[n] / Math.max(m, n)
}

/** Formato del vecchio ricettario: { n, c, i:[[nome,q,u]], p, s, piatto } */
const LEGACY_SECTIONS: Record<string, string> = {
  colazioni: 'Colazioni', 'fine-dining': 'Fine Dining', gelateria: 'Gelateria', torte: 'Torte & Pasticceria',
}
function splitSteps(p: string) {
  if (!p || !String(p).trim()) return []
  let parts = String(p).split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length === 1 && parts[0].length > 220) parts = parts[0].split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).map((s) => s.trim()).filter(Boolean)
  return parts
}

type BRecipe = {
  name: string; category: string; dish_group: string | null; yield_note: string | null; notes: string | null; source: string
  ingredients: { name: string; quantity: number | null; unit: string; note?: string | null }[]
  steps: { body: string; duration_min?: number | null; temperature?: string | null }[]
}
type BBook = { name: string; subtitle: string | null; color: string; sections: { name: string; subtitle: string | null; recipes: BRecipe[] }[] }

function parseBackup(raw: any, legacyBook: string): BBook[] {
  if (raw?.format === 'ricettario-backup' && Array.isArray(raw.books)) return raw.books
  const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.recipes) ? raw.recipes : Array.isArray(raw?.ricette) ? raw.ricette : []
  const legacy = list.map((x) => (x?.data && x.data.n ? x.data : x)).filter((r) => r && r.n)
  if (!legacy.length) throw new Error('File non riconosciuto: serve un backup di questa app o del vecchio ricettario')
  const bySec = new Map<string, BRecipe[]>()
  for (const r of legacy) {
    const sec = LEGACY_SECTIONS[r.s] ?? (r.s ? String(r.s) : 'Ricette')
    const rec: BRecipe = {
      name: String(r.n).trim(), category: r.c || 'Altro', dish_group: r.piatto ? String(r.piatto).trim() : null,
      yield_note: null, notes: null, source: 'legacy',
      ingredients: (Array.isArray(r.i) ? r.i : []).filter((x: any) => Array.isArray(x) && String(x[0] || '').trim())
        .map((x: any) => ({ name: String(x[0]).trim(), quantity: x[1] == null || x[1] === '' || isNaN(Number(x[1])) ? null : Number(x[1]), unit: String(x[2] || (x[1] == null ? 'q.b.' : 'g')) })),
      steps: splitSteps(r.p).map((body) => ({ body })),
    }
    bySec.set(sec, [...(bySec.get(sec) ?? []), rec])
  }
  return [{ name: legacyBook, subtitle: null, color: '#7A4214', sections: [...bySec].map(([name, recipes]) => ({ name, subtitle: null, recipes })) }]
}

export default function Tools({ recipes, books, sections, isAdmin }: { recipes: Recipe[]; books: Book[]; sections: Section[]; isAdmin: boolean }) {
  const router = useRouter()
  const { show, node } = useToast()
  const sb = () => createClient()
  const [busy, setBusy] = useState('')
  const [gone, setGone] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)
  const [legacyBook, setLegacyBook] = useState(books[0]?.name ?? 'Ricettario importato')
  const live = recipes.filter((r) => !gone.has(r.id))
  const secName = (id: string) => {
    const s = sections.find((x) => x.id === id)
    const b = books.find((x) => x.id === s?.book_id)
    return books.length > 1 && b ? `${b.name} › ${s?.name}` : s?.name ?? ''
  }

  // ── Backup ─────────────────────────────────────────────
  function exportJson() {
    const out = {
      format: 'ricettario-backup', version: 1, exported_at: new Date().toISOString(),
      books: books.map((b) => ({
        name: b.name, subtitle: b.subtitle, color: b.color,
        sections: sections.filter((s) => s.book_id === b.id).map((s) => ({
          name: s.name, subtitle: s.subtitle,
          recipes: recipes.filter((r) => r.section_id === s.id).map((r) => ({
            name: r.name, category: r.category, dish_group: r.dish_group, yield_note: r.yield_note, notes: r.notes, source: r.source,
            ingredients: r.recipe_ingredients.map(({ name, quantity, unit, note }) => ({ name, quantity, unit, note: note ?? null })),
            steps: r.recipe_steps.map(({ body, duration_min, temperature }) => ({ body, duration_min: duration_min ?? null, temperature: temperature ?? null })),
          })),
        })),
      })),
    }
    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ricettario-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(a.href)
    show(`Backup scaricato: ${recipes.length} ricette`, 'ok')
  }

  async function importJson(file: File) {
    let data: BBook[]
    try { data = parseBackup(JSON.parse(await file.text()), legacyBook.trim() || 'Ricettario importato') }
    catch (e: any) { show(e.message || 'File non valido', 'err'); return }
    const total = data.reduce((n, b) => n + b.sections.reduce((m, s) => m + s.recipes.length, 0), 0)
    if (!confirm(`Importare ${total} ricette? Quelle con lo stesso nome nella stessa sezione vengono saltate.`)) return
    const c = sb()
    let added = 0, skipped = 0, failed = 0
    const bookList = [...books]; const secList = [...sections]
    try {
      for (const b of data) {
        let book = bookList.find((x) => norm(x.name) === norm(b.name))
        if (!book) {
          const { data: nb, error } = await c.from('books').insert({ name: b.name, subtitle: b.subtitle, color: b.color || '#5a4e2d', position: bookList.length }).select().single()
          if (error) throw new Error(`Non posso creare il ricettario «${b.name}»: ${error.message}`)
          book = nb as Book; bookList.push(book)
        }
        for (const s of b.sections) {
          let sec = secList.find((x) => x.book_id === book!.id && norm(x.name) === norm(s.name))
          if (!sec) {
            const { data: ns, error } = await c.from('sections').insert({ book_id: book.id, name: s.name, subtitle: s.subtitle, position: secList.filter((x) => x.book_id === book!.id).length }).select().single()
            if (error) throw new Error(`Non posso creare la sezione «${s.name}»: ${error.message}`)
            sec = ns as Section; secList.push(sec)
          }
          const existing = new Set(recipes.filter((r) => r.section_id === sec!.id).map((r) => norm(r.name)))
          for (const r of s.recipes) {
            setBusy(`Importo ${added + skipped + failed + 1} di ${total}…`)
            if (existing.has(norm(r.name))) { skipped++; continue }
            const { error } = await c.rpc('save_recipe', {
              payload: {
                section_id: sec.id, name: r.name, category: r.category, dish_group: r.dish_group ?? '', yield_note: r.yield_note ?? '',
                notes: r.notes ?? '', source: ['manual', 'ai_image', 'ai_text', 'legacy'].includes(r.source) ? r.source : 'legacy',
                ingredients: r.ingredients.map((i) => ({ name: i.name, quantity: i.quantity == null ? '' : String(i.quantity), unit: i.unit, note: i.note ?? '' })),
                steps: r.steps.map((x) => ({ body: x.body, duration_min: x.duration_min ? String(x.duration_min) : '', temperature: x.temperature ?? '' })),
              },
            })
            if (error) failed++; else { added++; existing.add(norm(r.name)) }
          }
        }
      }
      show(`Importate ${added} ricette${skipped ? `, ${skipped} già presenti` : ''}${failed ? `, ${failed} con errori` : ''}`, failed ? 'err' : 'ok')
      router.refresh()
    } catch (e: any) { show(e.message, 'err') }
    finally { setBusy('') }
  }

  // ── Doppioni ───────────────────────────────────────────
  const dupes = useMemo(() => {
    const groups = new Map<string, Recipe[]>()
    for (const r of live) { const k = norm(r.name); groups.set(k, [...(groups.get(k) ?? []), r]) }
    const exact = [...groups.values()].filter((g) => g.length > 1)
    const keys = [...groups.keys()]
    const near: { a: Recipe; b: Recipe; why: string }[] = []
    const ingSet = (r: Recipe) => new Set(r.recipe_ingredients.map((i) => norm(i.name)))
    for (let i = 0; i < keys.length && near.length < 60; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = groups.get(keys[i])![0], b = groups.get(keys[j])![0]
        const sim = similarity(keys[i], keys[j])
        if (sim >= 0.82 && Math.min(keys[i].length, keys[j].length) > 4) { near.push({ a, b, why: 'nome quasi uguale' }); continue }
        const A = ingSet(a), B = ingSet(b)
        if (A.size >= 3 && B.size >= 3) {
          let inter = 0; A.forEach((x) => { if (B.has(x)) inter++ })
          const jac = inter / (A.size + B.size - inter)
          if (jac >= 0.9) near.push({ a, b, why: 'stessi ingredienti' })
        }
      }
    }
    return { exact, near }
  }, [live])

  async function remove(r: Recipe) {
    if (!confirm(`Eliminare «${r.name}» (${secName(r.section_id)})?`)) return
    const { error } = await sb().from('recipes').delete().eq('id', r.id)
    if (error) return show(error.message, 'err')
    setGone((g) => new Set(g).add(r.id)); show('Ricetta eliminata', 'ok'); router.refresh()
  }

  // ── Gruppi piatto ──────────────────────────────────────
  const groupCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of live) if (r.dish_group) m.set(r.dish_group, (m.get(r.dish_group) ?? 0) + 1)
    return [...m].sort((a, b) => a[0].localeCompare(b[0], 'it'))
  }, [live])
  const [overrides, setOverrides] = useState<Record<string, string | null>>({})
  const shownGroups = groupCounts
    .map(([g, n]) => [overrides[g] === undefined ? g : overrides[g], n, g] as const)
    .filter(([g]) => g !== null)

  async function renameGroup(old: string, current: string) {
    const next = prompt(`Nuovo nome per il gruppo «${current}».\nSe scrivi il nome di un gruppo esistente, i due vengono uniti.`, current)?.trim()
    if (!next || next === current) return
    const { error } = await sb().from('recipes').update({ dish_group: next }).eq('dish_group', current)
    if (error) return show(error.message, 'err')
    setOverrides((o) => ({ ...o, [old]: next })); show(`Gruppo rinominato in «${next}»`, 'ok'); router.refresh()
  }
  async function dropGroup(old: string, current: string) {
    if (!confirm(`Togliere il gruppo «${current}» da tutte le ricette? Le ricette restano.`)) return
    const { error } = await sb().from('recipes').update({ dish_group: null }).eq('dish_group', current)
    if (error) return show(error.message, 'err')
    setOverrides((o) => ({ ...o, [old]: null })); show('Gruppo rimosso', 'ok'); router.refresh()
  }

  const RLink = ({ r }: { r: Recipe }) => (
    <Link href={`/ricette/${r.id}`} style={{ flex: 1, minWidth: 0 }}>
      <span className="dish" style={{ fontSize: '1.05rem' }}>{r.name}</span>
      <span className="small muted" style={{ display: 'block' }}>{secName(r.section_id)} · {r.recipe_ingredients.length} ingredienti</span>
    </Link>
  )

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head"><Download size={18} color="var(--accent)" /><h2 className="h2" style={{ flex: 1 }}>Backup</h2></div>
        <div className="panel-pad stack" style={{ gap: 12 }}>
          <p className="muted small" style={{ maxWidth: '62ch' }}>
            Scarica tutti i ricettari in un file JSON da tenere al sicuro. Puoi reimportarlo qui, anche in un altro account:
            le ricette già presenti con lo stesso nome vengono saltate. Funziona anche con il backup JSON del vecchio ricettario.
          </p>
          <div className="row">
            <button className="btn btn-gold" onClick={exportJson} disabled={!recipes.length}><Download size={16} /> Scarica backup ({recipes.length})</button>
            {isAdmin && <button className="btn" onClick={() => fileRef.current?.click()} disabled={!!busy}>{busy ? <><span className="spin" /> {busy}</> : <><Upload size={16} /> Importa backup</>}</button>}
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = '' }} />
          </div>
          {isAdmin && (
            <label className="row small muted">
              Ricette del vecchio ricettario in:
              <input className="input" style={{ width: 'auto', minWidth: 200 }} value={legacyBook} onChange={(e) => setLegacyBook(e.target.value)} list="book-names" />
              <datalist id="book-names">{books.map((b) => <option key={b.id} value={b.name} />)}</datalist>
            </label>
          )}
        </div>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head">
          <Copy size={18} color="var(--accent)" />
          <h2 className="h2" style={{ flex: 1 }}>Doppioni</h2>
          <span className={`chip ${dupes.exact.length + dupes.near.length ? 'chip-warn' : 'chip-ok'}`}>
            {dupes.exact.length + dupes.near.length ? `${dupes.exact.length + dupes.near.length} da controllare` : 'Nessun doppione'}
          </span>
        </div>
        {dupes.exact.map((g, k) => (
          <div key={'e' + k} style={{ borderTop: '1px solid var(--line)', padding: '10px 16px' }}>
            <p className="label" style={{ marginBottom: 6 }}>Stesso nome, {g.length} copie</p>
            {g.map((r) => (
              <div key={r.id} className="row" style={{ padding: '4px 0', flexWrap: 'nowrap' }}>
                <RLink r={r} />
                <button className="icon-btn" onClick={() => remove(r)} aria-label={`Elimina ${r.name}`}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        ))}
        {dupes.near.map(({ a, b, why }, k) => (
          <div key={'n' + k} style={{ borderTop: '1px solid var(--line)', padding: '10px 16px' }}>
            <p className="label" style={{ marginBottom: 6 }}>Simili: {why}</p>
            {[a, b].map((r) => (
              <div key={r.id} className="row" style={{ padding: '4px 0', flexWrap: 'nowrap' }}>
                <RLink r={r} />
                <button className="icon-btn" onClick={() => remove(r)} aria-label={`Elimina ${r.name}`}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        ))}
        {!dupes.exact.length && !dupes.near.length && <p className="alert-row muted small" style={{ borderTop: '1px solid var(--line)' }}>Ho confrontato {live.length} ricette per nome e ingredienti: nessuna sembra ripetuta.</p>}
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head"><FolderTree size={18} color="var(--accent)" /><h2 className="h2" style={{ flex: 1 }}>Gruppi piatto</h2><span className="small muted">{shownGroups.length}</span></div>
        <p className="muted small" style={{ padding: '10px 16px 4px' }}>I gruppi legano le preparazioni di uno stesso piatto. Rinomina per correggere un nome, o dai lo stesso nome a due gruppi per unirli.</p>
        {shownGroups.map(([g, n, old]) => (
          <div key={old} className="alert-row" style={{ flexWrap: 'nowrap' }}>
            <Link href={`/ricette?q=${encodeURIComponent(g!)}`} style={{ flex: 1, minWidth: 0 }}><span className="dish" style={{ fontSize: '1.05rem' }}>{g}</span></Link>
            <span className="small muted num">{n} {n === 1 ? 'ricetta' : 'ricette'}</span>
            <button className="icon-btn" onClick={() => renameGroup(old, g!)} aria-label={`Rinomina ${g}`}><Pencil size={15} /></button>
            <button className="icon-btn" onClick={() => dropGroup(old, g!)} aria-label={`Rimuovi ${g}`}><X size={16} /></button>
          </div>
        ))}
        {!shownGroups.length && <p className="alert-row muted small">Nessun gruppo: assegnalo dall’editor della ricetta, nel campo «Gruppo piatto».</p>}
      </section>
      {node}
    </div>
  )
}
