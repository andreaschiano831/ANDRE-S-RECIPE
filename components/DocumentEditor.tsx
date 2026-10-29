'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtDose, type Recipe } from '@/lib/recipes'
import { IngredientTable, StepList } from './RecipeView'

type Item = { id: string; dose: number; recipe: Recipe }

export default function DocumentEditor({ doc, initialItems, appName }: { doc: { id: string; name: string; one_per_page: boolean }; initialItems: Item[]; appName: string }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [name, setName] = useState(doc.name)
  const [onePer, setOnePer] = useState(doc.one_per_page)
  const sb = () => createClient()

  async function persistOrder(next: Item[]) {
    setItems(next)
    await Promise.all(next.map((it, k) => sb().from('print_document_items').update({ position: k }).eq('id', it.id)))
  }
  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= items.length) return
    const a = [...items]; [a[i], a[j]] = [a[j], a[i]]; persistOrder(a)
  }
  async function remove(i: number) {
    await sb().from('print_document_items').delete().eq('id', items[i].id)
    setItems(items.filter((_, k) => k !== i))
  }
  async function setDose(i: number, dose: number) {
    dose = Math.max(0.25, dose)
    setItems(items.map((it, k) => (k === i ? { ...it, dose } : it)))
    await sb().from('print_document_items').update({ dose }).eq('id', items[i].id)
  }
  async function rename() {
    const n = prompt('Nuovo nome:', name); if (!n?.trim()) return
    setName(n.trim()); await sb().from('print_documents').update({ name: n.trim() }).eq('id', doc.id)
  }
  async function togglePage(v: boolean) {
    setOnePer(v); await sb().from('print_documents').update({ one_per_page: v }).eq('id', doc.id)
  }
  async function del() {
    if (!confirm(`Eliminare il documento «${name}»? Le ricette restano nel ricettario.`)) return
    await sb().from('print_documents').delete().eq('id', doc.id)
    router.replace('/documenti'); router.refresh()
  }

  return (
    <>
      <div className="no-print">
        <Link href="/documenti" className="btn btn-ghost btn-sm">‹ Documenti</Link>
        <h1 className="h1" style={{ margin: '12px 0 4px' }}>{name}</h1>
        <p className="sc muted" style={{ fontSize: '.6rem', marginBottom: 16 }}>{items.length} ricette</p>

        {items.length === 0 ? <p className="empty">Documento vuoto. Apri una ricetta e tocca «Stampa» per aggiungerla.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((it, i) => (
              <div key={it.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                <span className="chip">{i + 1}</span>
                <Link href={`/ricette/${it.recipe.id}`} style={{ flex: 1, minWidth: 0 }}>
                  <p className="serif" style={{ fontStyle: 'italic', fontSize: '1.08rem' }}>{it.recipe.name}</p>
                  <p className="muted" style={{ fontSize: '.7rem' }}>{it.recipe.recipe_ingredients.length} ingredienti · {it.recipe.category}</p>
                </Link>
                <div className="dose">
                  <button onClick={() => setDose(i, it.dose - (it.dose <= 1 ? 0.25 : 1))}>−</button>
                  <input readOnly value={'×' + fmtDose(it.dose)} />
                  <button onClick={() => setDose(i, it.dose + (it.dose < 1 ? 0.25 : 1))}>+</button>
                </div>
                <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button className="icon-btn" onClick={() => remove(i)}>×</button>
              </div>
            ))}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0', fontSize: '.86rem' }}>
          <input type="checkbox" checked={onePer} onChange={(e) => togglePage(e.target.checked)} style={{ accentColor: 'var(--gold2)', width: 16, height: 16 }} />
          Una ricetta per pagina
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={rename}>Rinomina</button>
          <button className="btn btn-danger" onClick={del}>Elimina</button>
          <button className="btn btn-gold" style={{ marginLeft: 'auto' }} disabled={!items.length} onClick={() => window.print()}>🖨 Stampa / PDF</button>
        </div>
      </div>

      <div className="print-only">
        <header style={{ textAlign: 'center', borderBottom: '1px solid #C4933A', paddingBottom: 10, marginBottom: 18 }}>
          <p className="sc" style={{ fontSize: '8pt', color: '#8B6914' }}>{appName}</p>
          <h1 className="serif" style={{ fontStyle: 'italic', fontWeight: 400, fontSize: '24pt' }}>{name}</h1>
          <p style={{ fontSize: '8pt', color: '#888' }}>{new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </header>
        {items.map((it, i) => (
          <section key={it.id} className={`print-rec ${onePer && i < items.length - 1 ? 'pb' : ''}`}>
            <h2 className="serif" style={{ fontStyle: 'italic', fontWeight: 400, fontSize: '18pt', borderBottom: '.5pt solid #ddd', paddingBottom: 3 }}>{it.recipe.name}</h2>
            <p className="sc" style={{ fontSize: '7.5pt', color: '#8B6914', margin: '3pt 0 6pt' }}>
              {[it.recipe.category, it.recipe.dish_group, it.recipe.yield_note, it.dose !== 1 ? `dose ×${fmtDose(it.dose)}` : ''].filter(Boolean).join(' · ')}
            </p>
            <IngredientTable recipe={it.recipe} dose={it.dose} />
            {it.recipe.recipe_steps.length > 0 && <div style={{ marginTop: 10 }}><StepList recipe={it.recipe} /></div>}
            {it.recipe.notes && <p className="serif" style={{ marginTop: 8, fontStyle: 'italic' }}>{it.recipe.notes}</p>}
          </section>
        ))}
      </div>
    </>
  )
}
