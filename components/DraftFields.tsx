'use client'
import { useState } from 'react'
import { CATEGORIES, UNITS, type Book, type RecipeDraft, type Section } from '@/lib/recipes'

type Ing = RecipeDraft['ingredients'][number]
type St = RecipeDraft['steps'][number]

/** Riconosce righe tipo "250 g burro", "burro 250g", "3 n° uova", "sale q.b." */
export function parseIngredientLines(text: string): Ing[] {
  const UNIT = '(kg|g|gr|grammi|ml|l|lt|cl|n°|n\\.|nr|pz|q\\.?b\\.?|fogli[o]?|bacc[ah]e?|cucchiai[no]?|%)'
  const out: Ing[] = []
  for (const raw of text.split(/\n/)) {
    const line = raw.replace(/^[\s\-•*·]+/, '').trim()
    if (!line) continue
    let m = line.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*${UNIT}?\\.?\\s+(?:di\\s+)?(.+)$`, 'i'))
    if (m) { out.push({ name: m[3].trim(), quantity: m[1].replace(',', '.'), unit: normUnit(m[2]), note: '' }); continue }
    m = line.match(new RegExp(`^(.+?)[\\s:]+(\\d+(?:[.,]\\d+)?)\\s*${UNIT}?\\.?$`, 'i'))
    if (m) { out.push({ name: m[1].trim(), quantity: m[2].replace(',', '.'), unit: normUnit(m[3]), note: '' }); continue }
    if (/q\.?\s?b\.?/i.test(line)) { out.push({ name: line.replace(/q\.?\s?b\.?/i, '').trim(), quantity: '', unit: 'q.b.', note: '' }); continue }
    out.push({ name: line, quantity: '', unit: 'g', note: '' })
  }
  return out
}
function normUnit(u?: string) {
  if (!u) return 'g'
  const x = u.toLowerCase().replace(/\.$/, '')
  if (x === 'gr' || x === 'grammi') return 'g'
  if (x === 'lt') return 'l'
  if (x === 'n' || x === 'nr' || x === 'pz' || x === 'n°') return 'n°'
  if (x.startsWith('q')) return 'q.b.'
  return x
}

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const a = [...arr]; [a[i], a[j]] = [a[j], a[i]]; return a
}

export default function DraftFields({ draft, onChange, books, sections, groups = [], ingredientNames = [] }: {
  draft: RecipeDraft
  onChange: (d: RecipeDraft) => void
  books: Book[]
  sections: Section[]
  groups?: string[]
  ingredientNames?: string[]
}) {
  const [paste, setPaste] = useState<string | null>(null)
  const set = (patch: Partial<RecipeDraft>) => onChange({ ...draft, ...patch })
  const setIng = (i: number, patch: Partial<Ing>) => set({ ingredients: draft.ingredients.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const setStep = (i: number, patch: Partial<St>) => set({ steps: draft.steps.map((x, k) => (k === i ? { ...x, ...patch } : x)) })
  const uid = draft.id ?? 'new'

  function applyPaste() {
    if (!paste?.trim()) { setPaste(null); return }
    const parsed = parseIngredientLines(paste)
    const kept = draft.ingredients.filter((i) => i.name.trim())
    set({ ingredients: [...kept, ...parsed] })
    setPaste(null)
  }
  function splitSteps(i: number) {
    const parts = draft.steps[i].body.split(/\n+|(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).map((s) => s.trim()).filter(Boolean)
    if (parts.length < 2) return
    const steps = [...draft.steps]
    steps.splice(i, 1, ...parts.map((body, k) => ({ body, duration_min: k === 0 ? draft.steps[i].duration_min : '', temperature: k === 0 ? draft.steps[i].temperature : '' })))
    set({ steps })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <datalist id={`groups-${uid}`}>{groups.map((g) => <option key={g} value={g} />)}</datalist>
      <datalist id="ing-names">{ingredientNames.map((g) => <option key={g} value={g} />)}</datalist>
      <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>

      <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label className="field"><span className="label">Nome ricetta</span>
          <input className="input serif" style={{ fontSize: '1.25rem', fontStyle: 'italic' }} value={draft.name}
            onChange={(e) => set({ name: e.target.value })} placeholder="Es. Crema pasticciera al cioccolato" />
        </label>
        <div className="grid3">
          <label className="field"><span className="label">{books.length > 1 ? 'Ricettario › Sezione' : 'Sezione'}</span>
            <select className="select" value={draft.section_id} onChange={(e) => set({ section_id: e.target.value })}>
              {!draft.section_id && <option value="">— scegli —</option>}
              {books.length > 1
                ? books.map((b) => (
                    <optgroup key={b.id} label={b.name}>
                      {sections.filter((x) => x.book_id === b.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </optgroup>
                  ))
                : sections.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
          <label className="field"><span className="label">Categoria</span>
            <select className="select" value={draft.category} onChange={(e) => set({ category: e.target.value })}>
              {Array.from(new Set([...CATEGORIES, draft.category])).map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field"><span className="label">Piatto / Gruppo</span>
            <input className="input" list={`groups-${uid}`} value={draft.dish_group} onChange={(e) => set({ dish_group: e.target.value })} placeholder="facoltativo" />
          </label>
        </div>
        <label className="field"><span className="label">Resa</span>
          <input className="input" value={draft.yield_note} onChange={(e) => set({ yield_note: e.target.value })} placeholder="Es. per 60 madeleine · stampo Ø 20 cm" />
        </label>
      </section>

      <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span className="label">Ingredienti · {draft.ingredients.filter((i) => i.name.trim()).length}</span>
          <button type="button" className="btn btn-sm" onClick={() => setPaste(paste === null ? '' : null)}>{paste === null ? '📋 Incolla elenco' : 'Chiudi'}</button>
        </div>
        {paste !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea className="textarea" rows={5} autoFocus value={paste} onChange={(e) => setPaste(e.target.value)}
              placeholder={'Una riga per ingrediente:\n250 g burro\nzucchero 200g\n3 n° uova\nvaniglia q.b.'} />
            <button type="button" className="btn btn-sm" onClick={applyPaste}>Aggiungi righe</button>
          </div>
        )}
        <div className="ed-row muted sc" style={{ fontSize: '.55rem' }}>
          <span>Ingrediente</span><span>Quantità</span><span>Unità</span><span /><span /><span />
        </div>
        {draft.ingredients.map((ing, i) => (
          <div key={i} className="ed-row">
            <input className="input" list="ing-names" value={ing.name} placeholder="Ingrediente" onChange={(e) => setIng(i, { name: e.target.value })} />
            <input className="input" inputMode="decimal" value={ing.quantity} placeholder="q.b." onChange={(e) => setIng(i, { quantity: e.target.value })} />
            <input className="input" list="units" value={ing.unit} onChange={(e) => setIng(i, { unit: e.target.value })} />
            <button type="button" className="icon-btn up" disabled={i === 0} onClick={() => set({ ingredients: move(draft.ingredients, i, -1) })} aria-label="Su">↑</button>
            <button type="button" className="icon-btn down" disabled={i === draft.ingredients.length - 1} onClick={() => set({ ingredients: move(draft.ingredients, i, 1) })} aria-label="Giù">↓</button>
            <button type="button" className="icon-btn" onClick={() => set({ ingredients: draft.ingredients.length > 1 ? draft.ingredients.filter((_, k) => k !== i) : [{ name: '', quantity: '', unit: 'g', note: '' }] })} aria-label="Rimuovi">×</button>
          </div>
        ))}
        <button type="button" className="add-row" onClick={() => set({ ingredients: [...draft.ingredients, { name: '', quantity: '', unit: 'g', note: '' }] })}>+ Ingrediente</button>
      </section>

      <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="label">Procedimento · {draft.steps.filter((s) => s.body.trim()).length} passaggi</span>
        {draft.steps.map((st, i) => (
          <div key={i} className="ed-step">
            <span className="num">{i + 1}</span>
            <div>
              <textarea className="textarea" rows={2} value={st.body} placeholder={i === 0 ? 'Es. Portare a bollore latte e panna con la vaniglia…' : 'Passaggio successivo…'}
                onChange={(e) => setStep(i, { body: e.target.value })} />
              <div className="ed-step-meta">
                <input className="input" inputMode="numeric" value={st.duration_min} placeholder="⏱ minuti" onChange={(e) => setStep(i, { duration_min: e.target.value })} />
                <input className="input" value={st.temperature} placeholder="🌡 es. 170°C ventilato" onChange={(e) => setStep(i, { temperature: e.target.value })} />
                <button type="button" className="icon-btn" title="Dividi in più passaggi" onClick={() => splitSteps(i)}>✂</button>
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => set({ steps: move(draft.steps, i, -1) })}>↑</button>
                <button type="button" className="icon-btn" disabled={i === draft.steps.length - 1} onClick={() => set({ steps: move(draft.steps, i, 1) })}>↓</button>
                <button type="button" className="icon-btn" onClick={() => set({ steps: draft.steps.length > 1 ? draft.steps.filter((_, k) => k !== i) : [{ body: '', duration_min: '', temperature: '' }] })}>×</button>
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="add-row" onClick={() => set({ steps: [...draft.steps, { body: '', duration_min: '', temperature: '' }] })}>+ Passaggio</button>
      </section>

      <section className="panel panel-pad">
        <label className="field"><span className="label">Note</span>
          <textarea className="textarea" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Conservazione, varianti, abbinamenti…" />
        </label>
      </section>
    </div>
  )
}
