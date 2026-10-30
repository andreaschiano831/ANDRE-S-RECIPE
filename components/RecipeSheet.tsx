'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, Thermometer, UtensilsCrossed } from 'lucide-react'
import { fmtDose, scaleQty, totalWeight } from '@/lib/recipes'

export type SheetRecipe = {
  name: string; category?: string | null; dish_group?: string | null; section?: string | null; yield_note?: string | null; notes?: string | null
  ingredients: { name: string; quantity: number | null; unit: string; note?: string | null }[]
  steps: { body: string; duration_min?: number | null; temperature?: string | null }[]
}

/** scheda completa come nella prima versione: numero, categoria, gruppo, tabella Base / ×dose, procedimento */
export default function RecipeSheet({ r, n, dose = 1, actions, procOpen = false, onTitle, selected }: {
  r: SheetRecipe; n?: number; dose?: number; actions?: React.ReactNode; procOpen?: boolean; onTitle?: () => void; selected?: boolean
}) {
  const [open, setOpen] = useState(procOpen)
  const steps = r.steps.filter((s) => s.body?.trim())
  const tot = totalWeight(r.ingredients as any, dose)
  return (
    <article className={`rsheet ${selected ? 'sel' : ''}`}>
      <div className="rsheet-top">
        {n != null && <span className="rsheet-n">№ Ricetta {String(n).padStart(2, '0')}</span>}
        {r.category && <span className="rsheet-cat">{r.category}</span>}
        {r.section && <span className="small muted">{r.section}</span>}
      </div>
      <h3 className="rsheet-title" onClick={onTitle} role={onTitle ? 'link' : undefined} tabIndex={onTitle ? 0 : undefined}
        onKeyDown={(e) => { if (onTitle && e.key === 'Enter') onTitle() }}>{r.name}</h3>
      {(r.dish_group || actions) && (
        <div className="rsheet-sub">
          {r.dish_group && <span className="rsheet-group"><UtensilsCrossed size={12} /> {r.dish_group}</span>}
          {actions && <span className="rsheet-actions">{actions}</span>}
        </div>
      )}
      {steps.length > 0 && (
        <button type="button" className="rsheet-proc-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          Procedimento {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      )}
      {open && steps.length > 0 && (
        <ol className="rsheet-proc">
          {steps.map((s, i) => (
            <li key={i}>
              {s.body}
              {(s.duration_min || s.temperature) && (
                <span className="rsheet-chips">
                  {s.duration_min ? <span><Clock size={11} /> {s.duration_min}′</span> : null}
                  {s.temperature ? <span><Thermometer size={11} /> {s.temperature}</span> : null}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      <table className="rsheet-table">
        <thead><tr><th>Ingrediente</th><th className="r">Base</th><th /><th className="r">×{fmtDose(dose)}</th></tr></thead>
        <tbody>
          {r.ingredients.map((i, k) => (
            <tr key={k}>
              <td>{i.name}{i.note ? <small> {i.note}</small> : null}</td>
              <td className="r muted">{i.quantity == null ? '' : scaleQty(i.quantity, 1)}</td>
              <td className="u">{i.quantity == null ? 'q.b.' : i.unit}</td>
              <td className="r b">{i.quantity == null ? 'q.b.' : `${scaleQty(i.quantity, dose)} ${i.unit}`}</td>
            </tr>
          ))}
        </tbody>
        {tot ? <tfoot><tr><td>Totale</td><td className="r muted">{scaleQty(tot / dose, 1)}</td><td className="u">g</td><td className="r b">{scaleQty(tot, 1)} g</td></tr></tfoot> : null}
      </table>
      {r.yield_note && <p className="rsheet-note">Resa: {r.yield_note}</p>}
      {r.notes && open && <p className="rsheet-note">{r.notes}</p>}
    </article>
  )
}
