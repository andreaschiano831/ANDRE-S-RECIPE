'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowDown, ArrowUp, ChevronLeft, FileDown, Printer, X } from 'lucide-react'
import { fmtDose, scaleQty, type Recipe } from '@/lib/recipes'
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
  /** Esporta un .doc (HTML che Word apre e modifica), come nel vecchio ricettario */
  function exportWord() {
    const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const body = items.map((it, i) => {
      const r = it.recipe
      const meta = [r.category, r.dish_group, r.yield_note, it.dose !== 1 ? `dose ×${fmtDose(it.dose)}` : ''].filter(Boolean).join(' · ')
      const rows = r.recipe_ingredients.map((x) => `<tr><td>${esc(x.name)}${x.note ? ` <i style="color:#888">${esc(x.note)}</i>` : ''}</td><td style="text-align:right;white-space:nowrap">${x.quantity == null ? 'q.b.' : esc(scaleQty(x.quantity, it.dose)) + ' ' + esc(x.unit)}</td></tr>`).join('')
      const steps = r.recipe_steps.map((x) => `<li>${esc(x.body)}${x.duration_min ? ` <b>(${x.duration_min}′)</b>` : ''}${x.temperature ? ` <b>${esc(x.temperature)}</b>` : ''}</li>`).join('')
      return `<div${onePer && i < items.length - 1 ? ' style="page-break-after:always"' : ''}>
<h2>${esc(r.name)}</h2><p class="meta">${esc(meta)}</p>
<table>${rows}</table>${steps ? `<ol>${steps}</ol>` : ''}${r.notes ? `<p><i>${esc(r.notes)}</i></p>` : ''}</div>`
    }).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(name)}</title>
<style>body{font-family:Georgia,serif;font-size:11pt}h1{font-style:italic;font-weight:normal;text-align:center}h2{font-style:italic;font-weight:normal;border-bottom:1px solid #ccc;margin-top:18pt}
.meta{color:#8B6914;font-size:9pt}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #eee;padding:3pt 4pt}ol{padding-left:18pt}li{margin:3pt 0}</style></head>
<body><p style="text-align:center;color:#8B6914;font-size:9pt">${esc(appName)}</p><h1>${esc(name)}</h1>${body}</body></html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${name.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'documento'}.doc`
    a.click(); URL.revokeObjectURL(a.href)
  }
  async function del() {
    if (!confirm(`Eliminare il documento «${name}»? Le ricette restano nel ricettario.`)) return
    await sb().from('print_documents').delete().eq('id', doc.id)
    router.replace('/documenti'); router.refresh()
  }

  return (
    <>
      <div className="no-print">
        <Link href="/documenti" className="btn btn-ghost btn-sm"><ChevronLeft size={16} /> Documenti</Link>
        <h1 className="h1" style={{ margin: '12px 0 4px' }}>{name}</h1>
        <p className="muted small" style={{ marginBottom: 16 }}>{items.length} {items.length === 1 ? 'ricetta' : 'ricette'}, nell’ordine di stampa</p>

        {items.length === 0 ? <p className="empty">Documento vuoto. Apri una ricetta e tocca «Stampa» per aggiungerla.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((it, i) => (
              <div key={it.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                <span className="chip num">{i + 1}</span>
                <Link href={`/ricette/${it.recipe.id}`} style={{ flex: 1, minWidth: 0 }}>
                  <p className="dish" style={{ fontSize: '1.12rem' }}>{it.recipe.name}</p>
                  <p className="muted" style={{ fontSize: '.7rem' }}>{it.recipe.recipe_ingredients.length} ingredienti · {it.recipe.category}</p>
                </Link>
                <div className="dose">
                  <button onClick={() => setDose(i, it.dose - (it.dose <= 1 ? 0.25 : 1))}>−</button>
                  <input readOnly value={'×' + fmtDose(it.dose)} />
                  <button onClick={() => setDose(i, it.dose + (it.dose < 1 ? 0.25 : 1))}>+</button>
                </div>
                <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Sposta su"><ArrowUp size={16} /></button>
                <button className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Sposta giù"><ArrowDown size={16} /></button>
                <button className="icon-btn" onClick={() => remove(i)} aria-label="Togli dal documento"><X size={16} /></button>
              </div>
            ))}
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0', fontSize: '.86rem' }}>
          <input type="checkbox" checked={onePer} onChange={(e) => togglePage(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
          Una ricetta per pagina
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn" onClick={rename}>Rinomina</button>
          <button className="btn btn-danger" onClick={del}>Elimina</button>
          <button className="btn" style={{ marginLeft: 'auto' }} disabled={!items.length} onClick={exportWord}><FileDown size={16} /> Word</button>
          <button className="btn btn-gold" disabled={!items.length} onClick={() => window.print()}><Printer size={16} /> Stampa o PDF</button>
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
