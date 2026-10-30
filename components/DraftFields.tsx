'use client'
import { useRef, useState } from 'react'
import { ClipboardPaste, GripVertical, Plus, Scissors, Thermometer, Timer, X } from 'lucide-react'
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

function moveTo<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= arr.length) return arr
  const a = [...arr]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a
}

/** Riordino trascinando la maniglia: funziona con mouse e dito */
function useDrag(onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)
  const ref = useRef<{ from: number; over: number } | null>(null)
  const start = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    ref.current = { from: i, over: i }; setDrag(ref.current)
  }
  const move = (group: string) => (e: React.PointerEvent) => {
    if (!ref.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest(`[data-drag="${group}"]`) as HTMLElement | null
    const idx = el ? Number(el.dataset.idx) : ref.current.over
    if (idx !== ref.current.over) { ref.current = { ...ref.current, over: idx }; setDrag(ref.current) }
  }
  const end = () => { if (ref.current) onMove(ref.current.from, ref.current.over); ref.current = null; setDrag(null) }
  const key = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); onMove(i, i - 1) }
    if (e.key === 'ArrowDown') { e.preventDefault(); onMove(i, i + 1) }
  }
  const cls = (i: number) => (drag?.from === i ? 'dragging' : drag && drag.over === i && drag.from !== i ? 'over' : '')
  return { start, move, end, key, cls }
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
  const ingDrag = useDrag((a, b) => set({ ingredients: moveTo(draft.ingredients, a, b) }))
  const stepDrag = useDrag((a, b) => set({ steps: moveTo(draft.steps, a, b) }))
  const filledIngs = draft.ingredients.filter((i) => i.name.trim()).length
  const filledSteps = draft.steps.filter((s) => s.body.trim()).length

  function applyPaste() {
    if (!paste?.trim()) { setPaste(null); return }
    const kept = draft.ingredients.filter((i) => i.name.trim())
    set({ ingredients: [...kept, ...parseIngredientLines(paste)] })
    setPaste(null)
  }
  function splitSteps(i: number) {
    const parts = draft.steps[i].body.split(/\n+|(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).map((s) => s.trim()).filter(Boolean)
    if (parts.length < 2) return
    const steps = [...draft.steps]
    steps.splice(i, 1, ...parts.map((body, k) => ({ body, duration_min: k === 0 ? draft.steps[i].duration_min : '', temperature: k === 0 ? draft.steps[i].temperature : '' })))
    set({ steps })
  }
  function addIngAfter(i: number) {
    const a = [...draft.ingredients]; a.splice(i + 1, 0, { name: '', quantity: '', unit: 'g', note: '' }); set({ ingredients: a })
    setTimeout(() => (document.querySelector(`[data-ing-name="${i + 1}"]`) as HTMLInputElement | null)?.focus(), 0)
  }

  return (
    <div className="stack ed-wrap" style={{ gap: 18 }}>
      <datalist id={`groups-${uid}`}>{groups.map((g) => <option key={g} value={g} />)}</datalist>
      <datalist id="ing-names">{ingredientNames.map((g) => <option key={g} value={g} />)}</datalist>
      <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>

      <section className="panel panel-pad stack" style={{ gap: 14 }}>
        <input className="input dish" style={{ fontSize: '1.7rem', border: 'none', padding: '4px 0', background: 'transparent', boxShadow: 'none' }}
          value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nome della ricetta" aria-label="Nome della ricetta" />
        <div className="grid3">
          <label className="field"><span className="label">{books.length > 1 ? 'Ricettario e sezione' : 'Sezione'}</span>
            <select className="select" value={draft.section_id} onChange={(e) => set({ section_id: e.target.value })}>
              {!draft.section_id && <option value="">Scegli…</option>}
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
          <label className="field"><span className="label">Piatto o gruppo</span>
            <input className="input" list={`groups-${uid}`} value={draft.dish_group} onChange={(e) => set({ dish_group: e.target.value })} placeholder="Es. Paris Brest" />
          </label>
        </div>
        <label className="field"><span className="label">Resa</span>
          <input className="input" value={draft.yield_note} onChange={(e) => set({ yield_note: e.target.value })} placeholder="Es. 60 madeleine, stampo da 20 cm" />
        </label>
      </section>

      <section className="panel panel-pad stack" style={{ gap: 6 }}>
        <div className="row" style={{ marginBottom: 6 }}>
          <h2 className="h2" style={{ flex: 1 }}>Ingredienti <span className="muted small" style={{ fontFamily: 'var(--f-ui)' }}>{filledIngs}</span></h2>
          <button type="button" className="btn btn-sm" onClick={() => setPaste(paste === null ? '' : null)}><ClipboardPaste size={14} /> {paste === null ? 'Incolla un elenco' : 'Chiudi'}</button>
        </div>
        {paste !== null && (
          <div className="stack" style={{ gap: 8, marginBottom: 10 }}>
            <textarea className="textarea" rows={5} autoFocus value={paste} onChange={(e) => setPaste(e.target.value)}
              placeholder={'Una riga per ingrediente:\n250 g burro\nzucchero 200g\n3 n° uova\nvaniglia q.b.'} />
            <button type="button" className="btn btn-sm btn-gold" style={{ alignSelf: 'flex-start' }} onClick={applyPaste}>Aggiungi {paste.split('\n').filter((l) => l.trim()).length || ''} righe</button>
          </div>
        )}
        <div className="ed-row label" style={{ padding: 0 }}><span /><span>Ingrediente</span><span>Quantità</span><span>Unità</span><span /></div>
        {draft.ingredients.map((ing, i) => (
          <div key={i} className={`ed-row ${ingDrag.cls(i)}`} data-drag="ing" data-idx={i}>
            <span className="grip" role="button" tabIndex={0} aria-label={`Sposta ${ing.name || 'ingrediente'} (frecce su e giù)`}
              onPointerDown={ingDrag.start(i)} onPointerMove={ingDrag.move('ing')} onPointerUp={ingDrag.end} onKeyDown={ingDrag.key(i)}><GripVertical /></span>
            <input className="input" list="ing-names" data-ing-name={i} value={ing.name} placeholder="Ingrediente" onChange={(e) => setIng(i, { name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngAfter(i) } }} />
            <input className="input num" inputMode="decimal" value={ing.quantity} placeholder="q.b." onChange={(e) => setIng(i, { quantity: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIngAfter(i) } }} />
            <input className="input" list="units" value={ing.unit} onChange={(e) => setIng(i, { unit: e.target.value })} />
            <button type="button" className="icon-btn" aria-label="Rimuovi" onClick={() => set({ ingredients: draft.ingredients.length > 1 ? draft.ingredients.filter((_, k) => k !== i) : [{ name: '', quantity: '', unit: 'g', note: '' }] })}><X /></button>
          </div>
        ))}
        <button type="button" className="add-row" onClick={() => addIngAfter(draft.ingredients.length - 1)}><Plus size={14} style={{ verticalAlign: '-2px' }} /> Ingrediente <span className="kbd" style={{ marginLeft: 6 }}>Invio</span></button>
      </section>

      <section className="panel panel-pad stack" style={{ gap: 10 }}>
        <h2 className="h2">Procedimento <span className="muted small" style={{ fontFamily: 'var(--f-ui)' }}>{filledSteps} passaggi</span></h2>
        {draft.steps.map((st, i) => (
          <div key={i} className={`ed-step ${stepDrag.cls(i)}`} data-drag="step" data-idx={i}>
            <span className="grip" role="button" tabIndex={0} aria-label={`Sposta il passaggio ${i + 1}`}
              onPointerDown={stepDrag.start(i)} onPointerMove={stepDrag.move('step')} onPointerUp={stepDrag.end} onKeyDown={stepDrag.key(i)}><GripVertical /></span>
            <span className="num">{i + 1}</span>
            <div>
              <textarea className="textarea" rows={2} value={st.body} placeholder={i === 0 ? 'Es. Portare a bollore latte e panna con la vaniglia' : 'Passaggio successivo'}
                onChange={(e) => setStep(i, { body: e.target.value })} />
              <div className="ed-step-meta">
                <span className="row" style={{ flex: 1, gap: 6, minWidth: 120 }}><Timer size={15} color="var(--muted)" />
                  <input className="input num" inputMode="numeric" value={st.duration_min} placeholder="minuti" aria-label="Minuti" onChange={(e) => setStep(i, { duration_min: e.target.value })} /></span>
                <span className="row" style={{ flex: 1.4, gap: 6, minWidth: 150 }}><Thermometer size={15} color="var(--muted)" />
                  <input className="input" value={st.temperature} placeholder="es. 170 °C ventilato" aria-label="Temperatura" onChange={(e) => setStep(i, { temperature: e.target.value })} /></span>
                <button type="button" className="icon-btn" title="Dividi in più passaggi" aria-label="Dividi in più passaggi" onClick={() => splitSteps(i)}><Scissors /></button>
                <button type="button" className="icon-btn" aria-label="Rimuovi passaggio" onClick={() => set({ steps: draft.steps.length > 1 ? draft.steps.filter((_, k) => k !== i) : [{ body: '', duration_min: '', temperature: '' }] })}><X /></button>
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="add-row" onClick={() => set({ steps: [...draft.steps, { body: '', duration_min: '', temperature: '' }] })}><Plus size={14} style={{ verticalAlign: '-2px' }} /> Passaggio</button>
      </section>

      <section className="panel panel-pad">
        <label className="field"><span className="label">Note</span>
          <textarea className="textarea" rows={3} value={draft.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Conservazione, varianti, abbinamenti" />
        </label>
      </section>
    </div>
  )
}
