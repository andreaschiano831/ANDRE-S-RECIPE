'use client'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ChefHat, Copy, FilePlus2, MoreHorizontal, Pencil, Printer, RotateCcw, Thermometer, Timer, Trash2, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fmtDose, scaleQty, totalWeight, type Recipe } from '@/lib/recipes'
import AddToDocument from './AddToDocument'
import { useToast } from './useToast'

/* ── versioni semplici usate anche nei documenti di stampa ── */
export function IngredientTable({ recipe, dose }: { recipe: Recipe; dose: number }) {
  const tot = totalWeight(recipe.recipe_ingredients, dose)
  return (
    <table className="ing-table">
      <thead><tr><th>Ingrediente</th><th className="r">Quantità</th><th></th></tr></thead>
      <tbody>
        {recipe.recipe_ingredients.map((i, k) => (
          <tr key={k}>
            <td>{i.name}{i.note && <span className="note">{i.note}</span>}</td>
            <td className="r q">{i.quantity == null ? 'q.b.' : scaleQty(i.quantity, dose)}</td>
            <td className="u">{i.quantity == null ? '' : i.unit}</td>
          </tr>
        ))}
        {tot != null && <tr><td className="muted">Totale</td><td className="r q">{tot}</td><td className="u">g</td></tr>}
      </tbody>
    </table>
  )
}

export function StepList({ recipe }: { recipe: Recipe }) {
  if (!recipe.recipe_steps.length) return null
  return (
    <ol className="steps">
      {recipe.recipe_steps.map((s, k) => (
        <li key={k}><div><p>{s.body}</p>
          {(s.duration_min || s.temperature) && (
            <div className="row" style={{ marginTop: 6, gap: 6 }}>
              {s.duration_min ? <span className="chip">{s.duration_min} min</span> : null}
              {s.temperature ? <span className="chip">{s.temperature}</span> : null}
            </div>
          )}
        </div></li>
      ))}
    </ol>
  )
}

/* ── dose: posizioni del cursore ── */
const STOPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 20]
const nearestStop = (d: number) => STOPS.reduce((best, s, i) => (Math.abs(s - d) < Math.abs(STOPS[best] - d) ? i : best), 0)

/* ── timer flottanti ── */
type T = { id: number; label: string; total: number; left: number; run: boolean }
function useTimers() {
  const [timers, setTimers] = useState<T[]>([])
  useEffect(() => {
    if (!timers.some((t) => t.run)) return
    const iv = window.setInterval(() => {
      setTimers((ts) => ts.map((t) => {
        if (!t.run) return t
        if (t.left <= 1) { beep(); return { ...t, left: 0, run: false } }
        return { ...t, left: t.left - 1 }
      }))
    }, 1000)
    return () => window.clearInterval(iv)
  }, [timers])
  return {
    timers,
    start: (label: string, min: number) => setTimers((ts) => [...ts, { id: Date.now(), label, total: min * 60, left: min * 60, run: true }]),
    toggle: (id: number) => setTimers((ts) => ts.map((t) => (t.id === id ? { ...t, run: !t.run && t.left > 0 } : t))),
    remove: (id: number) => setTimers((ts) => ts.filter((t) => t.id !== id)),
  }
}
function beep() {
  try { navigator.vibrate?.([300, 150, 300]) } catch {}
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;[0, 0.3, 0.6].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.22, ctx.currentTime + t); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18)
    })
  } catch {}
}
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function RecipeView({ recipe, bookName, sectionName, backHref, canEdit }: {
  recipe: Recipe; bookName: string; sectionName: string; backHref: string; canEdit: boolean
}) {
  const router = useRouter()
  const { show, node } = useToast()
  const [dose, setDose] = useState(1)
  const [weighed, setWeighed] = useState<Set<number>>(new Set())
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set())
  const [docOpen, setDocOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [target, setTarget] = useState('')
  const [flashKey, setFlashKey] = useState(0)
  const { timers, start, toggle, remove } = useTimers()
  const menuRef = useRef<HTMLDivElement>(null)

  const baseTotal = useMemo(() => totalWeight(recipe.recipe_ingredients, 1), [recipe])
  const ings = recipe.recipe_ingredients
  const steps = recipe.recipe_steps

  function changeDose(d: number) { const v = Math.max(0.05, Math.round(d * 1000) / 1000); setDose(v); setFlashKey((k) => k + 1) }

  // scorciatoie: + e − cambiano la dose
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName)) return
      if (e.key === '+' || e.key === '=') changeDose(STOPS[Math.min(STOPS.length - 1, nearestStop(dose) + 1)])
      if (e.key === '-') changeDose(STOPS[Math.max(0, nearestStop(dose) - 1)])
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [dose])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])

  async function remove_() {
    if (!confirm(`Eliminare definitivamente «${recipe.name}»?`)) return
    const { error } = await createClient().from('recipes').delete().eq('id', recipe.id)
    if (error) { show('Non riesco a eliminarla: ' + error.message, 'err'); return }
    router.replace(backHref); router.refresh()
  }
  async function duplicate() {
    const payload = {
      section_id: recipe.section_id, name: recipe.name + ' (copia)', category: recipe.category,
      dish_group: recipe.dish_group, yield_note: recipe.yield_note, notes: recipe.notes,
      ingredients: recipe.recipe_ingredients, steps: recipe.recipe_steps,
    }
    const { data, error } = await createClient().rpc('save_recipe', { payload })
    if (error) { show('Non riesco a duplicarla: ' + error.message, 'err'); return }
    router.push(`/ricette/${data}/modifica`)
  }
  function applyTarget() {
    const n = parseFloat(target.replace(',', '.'))
    if (!baseTotal || !n) return
    changeDose(n / baseTotal)
  }

  const toggleSet = (set: Set<number>, i: number) => { const n = new Set(set); n.has(i) ? n.delete(i) : n.add(i); return n }
  const pct = (nearestStop(dose) / (STOPS.length - 1)) * 100
  const tot = totalWeight(ings, dose)

  return (
    <article className="wrap page">
      <div className="row no-print" style={{ marginBottom: 18 }}>
        <Link href={backHref} className="btn btn-ghost btn-sm"><ArrowLeft size={15} /> {sectionName || 'Ricette'}</Link>
        <span className="spacer" />
        <Link href={`/ricette/${recipe.id}/cucina?dose=${dose}`} className="btn btn-sm btn-gold"><ChefHat size={15} /> Modalità cucina</Link>
        <button className="btn btn-sm" onClick={() => window.print()}><Printer size={15} /> Stampa</button>
        {canEdit && <Link href={`/ricette/${recipe.id}/modifica`} className="btn btn-sm"><Pencil size={15} /> Modifica</Link>}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button className="icon-btn" onClick={() => setMenu(!menu)} aria-label="Altre azioni"><MoreHorizontal size={17} /></button>
          {menu && (
            <div className="panel" style={{ position: 'absolute', right: 0, top: 40, zIndex: 20, padding: 6, minWidth: 210, display: 'flex', flexDirection: 'column' }}>
              <button className="cmd-item" onClick={() => { setMenu(false); setDocOpen(true) }}><FilePlus2 size={16} /> Aggiungi a un documento</button>
              {canEdit && <button className="cmd-item" onClick={duplicate}><Copy size={16} /> Duplica</button>}
              {canEdit && <button className="cmd-item" style={{ color: 'var(--danger)' }} onClick={remove_}><Trash2 size={16} /> Elimina</button>}
            </div>
          )}
        </div>
      </div>

      <header className="rx-hero">
        <div className="row" style={{ gap: 6 }}>
          {bookName && <span className="chip chip-accent">{bookName}</span>}
          {sectionName && <span className="chip">{sectionName}</span>}
          <span className="chip">{recipe.category}</span>
          {recipe.dish_group && <span className="chip">{recipe.dish_group}</span>}
        </div>
        <h1 className="h1" style={{ marginTop: 12 }}>{recipe.name}</h1>
        {recipe.yield_note && <p className="muted" style={{ marginTop: 6, fontSize: '1.02rem' }}>Resa: {recipe.yield_note}</p>}
      </header>

      <div className="rx">
        <aside className="rx-side panel" style={{ overflow: 'hidden' }}>
          <div className="scale no-print">
            <div className="scale-top">
              <span className="label">Dose</span>
              <span className="scale-val num">×{fmtDose(dose)}{tot != null && <small>{tot.toLocaleString('it-IT')} g in totale</small>}</span>
            </div>
            <input className="range" type="range" min={0} max={STOPS.length - 1} step={1} value={nearestStop(dose)}
              style={{ ['--p' as string]: `${pct}%` }} onChange={(e) => changeDose(STOPS[+e.target.value])} aria-label="Dose" />
            <div className="presets">
              {[0.5, 1, 2, 3, 5].map((d) => <button key={d} className={dose === d ? 'on' : ''} onClick={() => changeDose(d)}>×{fmtDose(d)}</button>)}
            </div>
            {baseTotal != null && (
              <form className="row" style={{ marginTop: 12, gap: 6 }} onSubmit={(e) => { e.preventDefault(); applyTarget() }}>
                <input className="input" style={{ flex: 1, padding: '7px 10px', fontSize: '.86rem' }} inputMode="decimal" placeholder={`Peso finale voluto (base ${baseTotal} g)`}
                  value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Peso finale voluto in grammi" />
                <button className="btn btn-sm" disabled={!target}>Calcola</button>
              </form>
            )}
          </div>

          <div className="row" style={{ padding: '12px 18px 8px' }}>
            <span className="label">Ingredienti</span>
            <span className="spacer" />
            {weighed.size > 0 && (
              <button className="btn btn-ghost btn-sm no-print" onClick={() => setWeighed(new Set())}><RotateCcw size={13} /> {weighed.size}/{ings.length} pesati</button>
            )}
          </div>
          <ul className="ing-list">
            {ings.map((i, k) => (
              <li key={k} className={`ing ${weighed.has(k) ? 'done' : ''}`} onClick={() => setWeighed(toggleSet(weighed, k))}
                role="checkbox" aria-checked={weighed.has(k)} tabIndex={0} onKeyDown={(e) => e.key === ' ' && (e.preventDefault(), setWeighed(toggleSet(weighed, k)))}>
                <span className="box">{weighed.has(k) && '✓'}</span>
                <span className="nm">{i.name}{i.note && <small>{i.note}</small>}</span>
                <span className="q num">
                  <span key={flashKey} className={flashKey ? 'flash' : ''}>{i.quantity == null ? 'q.b.' : scaleQty(i.quantity, dose)}</span>
                  {i.quantity != null && <small>{i.unit}</small>}
                  {dose !== 1 && i.quantity != null && <span className="base">base {scaleQty(i.quantity, 1)}</span>}
                </span>
              </li>
            ))}
          </ul>
          {tot != null && <div className="ing-tot"><span>Totale</span><span className="num">{tot.toLocaleString('it-IT')} g</span></div>}
        </aside>

        <div className="stack">
          {steps.length > 0 ? (
            <section className="panel panel-pad">
              <div className="row" style={{ marginBottom: 10 }}>
                <h2 className="h2" style={{ flex: 1 }}>Procedimento</h2>
                <span className="small muted">{doneSteps.size} di {steps.length}</span>
              </div>
              <div className="progress no-print" style={{ marginBottom: 10 }}><span style={{ width: `${(doneSteps.size / steps.length) * 100}%` }} /></div>
              <ol className="steps">
                {steps.map((s, k) => (
                  <li key={k} className={`step ${doneSteps.has(k) ? 'done' : ''}`} onClick={() => setDoneSteps(toggleSet(doneSteps, k))}>
                    <div>
                      <p>{s.body}</p>
                      {(s.duration_min || s.temperature) && (
                        <div className="tags">
                          {s.duration_min ? (
                            <button className="chip chip-accent no-print" onClick={(e) => { e.stopPropagation(); start(`Passaggio ${k + 1}`, s.duration_min!) }} title="Avvia timer">
                              <Timer size={13} /> {s.duration_min} min, avvia
                            </button>
                          ) : null}
                          {s.temperature ? <span className="chip"><Thermometer size={13} /> {s.temperature}</span> : null}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <section className="panel panel-pad empty">
              <span className="dish">Procedimento non ancora scritto</span>
              {canEdit && <Link href={`/ricette/${recipe.id}/modifica`} className="btn btn-sm"><Pencil size={14} /> Aggiungi i passaggi</Link>}
            </section>
          )}
          {recipe.notes && (
            <section className="panel panel-pad" style={{ borderLeft: '3px solid var(--accent)' }}>
              <p className="label" style={{ marginBottom: 6 }}>Note</p>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{recipe.notes}</p>
            </section>
          )}
        </div>
      </div>

      {timers.length > 0 && (
        <div className="no-print" style={{ position: 'fixed', right: 16, bottom: 'calc(96px + env(safe-area-inset-bottom))', zIndex: 80, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {timers.map((t) => (
            <div key={t.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px 8px 14px', borderColor: t.left === 0 ? 'var(--danger)' : undefined }}>
              <span>
                <span className="small muted" style={{ display: 'block' }}>{t.label}</span>
                <span className="num" style={{ fontWeight: 700, fontSize: '1.3rem', color: t.left === 0 ? 'var(--danger)' : 'var(--accent-ink)' }}>{mmss(t.left)}</span>
              </span>
              <button className="btn btn-sm" onClick={() => toggle(t.id)}>{t.run ? 'Pausa' : t.left === 0 ? 'Finito' : 'Riprendi'}</button>
              <button className="icon-btn" onClick={() => remove(t.id)} aria-label="Chiudi timer"><X size={15} /></button>
            </div>
          ))}
        </div>
      )}

      {docOpen && <AddToDocument recipeIds={[recipe.id]} dose={dose} onClose={() => setDocOpen(false)} />}
      {node}
    </article>
  )
}
