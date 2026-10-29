'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtDose, scaleQty, totalWeight, type Recipe } from '@/lib/recipes'
import AddToDocument from './AddToDocument'
import { useToast } from './useToast'

export function IngredientTable({ recipe, dose }: { recipe: Recipe; dose: number }) {
  const tot = totalWeight(recipe.recipe_ingredients, dose)
  return (
    <table className="ing-table">
      <thead><tr><th>Ingrediente</th><th className="r">Base</th><th className="r">×{fmtDose(dose)}</th><th></th></tr></thead>
      <tbody>
        {recipe.recipe_ingredients.map((i, k) => (
          <tr key={k}>
            <td>{i.name}{i.note && <span className="note">{i.note}</span>}</td>
            <td className="r muted">{i.quantity == null ? '' : scaleQty(i.quantity, 1)}</td>
            <td className="r q">{i.quantity == null ? 'q.b.' : scaleQty(i.quantity, dose)}</td>
            <td className="u">{i.quantity == null ? '' : i.unit}</td>
          </tr>
        ))}
        {tot != null && (
          <tr><td className="sc muted" style={{ fontSize: '.6rem' }}>Totale (g / ml)</td><td className="r muted">{totalWeight(recipe.recipe_ingredients, 1)}</td><td className="r q">{tot}</td><td className="u">g</td></tr>
        )}
      </tbody>
    </table>
  )
}

export function StepList({ recipe }: { recipe: Recipe }) {
  if (!recipe.recipe_steps.length) return null
  return (
    <ol className="steps">
      {recipe.recipe_steps.map((s, k) => (
        <li key={k}>
          <div>
            <p>{s.body}</p>
            {(s.duration_min || s.temperature) && (
              <div className="tags">
                {s.duration_min ? <span className="chip">⏱ {s.duration_min} min</span> : null}
                {s.temperature ? <span className="chip">🌡 {s.temperature}</span> : null}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function RecipeView({ recipe, bookName, sectionName, backHref, canEdit }: {
  recipe: Recipe; bookName: string; sectionName: string; backHref: string; canEdit: boolean
}) {
  const router = useRouter()
  const { show, node } = useToast()
  const [dose, setDose] = useState(1)
  const [docOpen, setDocOpen] = useState(false)

  async function remove() {
    if (!confirm(`Eliminare definitivamente «${recipe.name}»?`)) return
    const { error } = await createClient().from('recipes').delete().eq('id', recipe.id)
    if (error) { show('Errore: ' + error.message, 'err'); return }
    router.replace(backHref)
    router.refresh()
  }
  async function duplicate() {
    const supabase = createClient()
    const payload = {
      section_id: recipe.section_id, name: recipe.name + ' (copia)', category: recipe.category,
      dish_group: recipe.dish_group, yield_note: recipe.yield_note, notes: recipe.notes,
      ingredients: recipe.recipe_ingredients, steps: recipe.recipe_steps,
    }
    const { data, error } = await supabase.rpc('save_recipe', { payload })
    if (error) { show('Errore: ' + error.message, 'err'); return }
    router.push(`/ricette/${data}/modifica`)
  }
  const step = (d: number) => setDose((v) => Math.max(0.25, Math.round((v + d) * 100) / 100))

  return (
    <article>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <Link href={backHref} className="btn btn-ghost btn-sm">‹ {sectionName || 'Ricette'}</Link>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href={`/ricette/${recipe.id}/cucina?dose=${dose}`} className="btn btn-sm">👨‍🍳 Cucina</Link>
          <button className="btn btn-sm" onClick={() => window.print()}>🖨 Stampa</button>
          <button className="btn btn-sm" onClick={() => setDocOpen(true)}>+ Documento</button>
          {canEdit && <Link href={`/ricette/${recipe.id}/modifica`} className="btn btn-sm">✏️ Modifica</Link>}
          {canEdit && <button className="btn btn-sm" onClick={duplicate}>⧉ Duplica</button>}
          {canEdit && <button className="btn btn-sm btn-danger" onClick={remove}>Elimina</button>}
        </div>
      </div>

      <header style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="chip">{recipe.category}</span>
          {bookName && <span className="chip">{bookName}</span>}
          {sectionName && <span className="chip">{sectionName}</span>}
          {recipe.dish_group && <span className="chip">🍽 {recipe.dish_group}</span>}
        </div>
        <h1 className="h1" style={{ marginTop: 10 }}>{recipe.name}</h1>
        {recipe.yield_note && <p className="serif muted" style={{ fontStyle: 'italic', fontSize: '1.05rem', marginTop: 4 }}>{recipe.yield_note}</p>}
      </header>

      <section className="panel" style={{ overflow: 'hidden', marginBottom: 18 }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--rim)' }}>
          <span className="label">Ingredienti · {recipe.recipe_ingredients.length}</span>
          <div className="dose">
            <button type="button" onClick={() => step(dose <= 1 ? -0.25 : -0.5)} aria-label="Meno">−</button>
            <input type="number" step="0.25" min="0.25" value={dose} onChange={(e) => setDose(Math.max(0.25, parseFloat(e.target.value) || 1))} aria-label="Dose" />
            <button type="button" onClick={() => step(dose < 1 ? 0.25 : 0.5)} aria-label="Più">+</button>
          </div>
        </div>
        <IngredientTable recipe={recipe} dose={dose} />
      </section>

      {recipe.recipe_steps.length > 0 && (
        <section className="panel panel-pad" style={{ marginBottom: 18 }}>
          <p className="label" style={{ marginBottom: 14 }}>Procedimento</p>
          <StepList recipe={recipe} />
        </section>
      )}

      {recipe.notes && (
        <section className="panel panel-pad" style={{ borderLeft: '3px solid var(--gold2)' }}>
          <p className="label" style={{ marginBottom: 6 }}>Note</p>
          <p className="serif" style={{ fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>{recipe.notes}</p>
        </section>
      )}

      {docOpen && <AddToDocument recipeIds={[recipe.id]} dose={dose} onClose={() => setDocOpen(false)} />}
      {node}
    </article>
  )
}
