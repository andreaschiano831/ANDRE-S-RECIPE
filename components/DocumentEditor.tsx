'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowDown, ArrowUp, ChevronLeft, FileDown, Printer, X } from 'lucide-react'
import { fmtDose, type Recipe } from '@/lib/recipes'
import PrintSheet from './PrintSheet'
import { toPrintItem, wordFile } from '@/lib/print-doc'

type Item = { id: string; dose: number; recipe: Recipe }

export default function DocumentEditor({ doc, initialItems, appName, sectionNames }: { doc: { id: string; name: string; one_per_page: boolean }; initialItems: Item[]; appName: string; sectionNames?: Record<string, string> }) {
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
  const printItems = items.map((it) => toPrintItem(it.recipe, it.dose, sectionNames?.[it.recipe.section_id]))
  const exportWord = () => wordFile({ brand: appName, title: name, items: printItems, onePerPage: onePer })
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
              <div key={it.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', flexWrap: 'wrap' }}>
                <span className="chip num">{i + 1}</span>
                <Link href={`/ricette/${it.recipe.id}`} style={{ flex: '1 1 200px', minWidth: 0 }}>
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

      <h2 className="h2 no-print" style={{ fontSize: '1.2rem', margin: '26px 0 10px' }}>Anteprima di stampa</h2>
      {items.length > 0
        ? <PrintSheet brand={appName} title={name} items={printItems} onePerPage={onePer} />
        : <p className="muted small no-print">L’anteprima compare quando aggiungi delle ricette.</p>}
    </>
  )
}
