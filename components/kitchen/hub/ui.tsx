'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus, Search, X } from 'lucide-react'
import { getBridge, useK, useToast } from '../KitchenPro'
import { nameScore, norm, type Ctx, type KRecipe, type ListinoItem, type StockItem } from './model'

/** dati della cucina + ricette del ricettario, pronti per i calcoli */
export function useHub() {
  const api: any = useK()
  const toast = useToast() as unknown as (m: string, kind?: string) => void
  const k = api.kitchen || {}
  const recipes: KRecipe[] = getBridge()?.recipes || []
  const stock: StockItem[] = api.allItems ? api.allItems() : []
  const listino: ListinoItem[] = k.listino || []
  const ctx: Ctx = useMemo(() => ({ recipes, listino, stock }), [recipes, listino, stock])
  const canEdit: boolean = api.canEdit ? api.canEdit() : true
  return { api, k, recipes, stock, listino, ctx, toast, canEdit, bridge: getBridge() }
}

export const recipeUrl = (id: string) => getBridge()?.urls?.recipe?.(id) || `/ricette/${id}`
export const go = (sec: string) => window.dispatchEvent(new CustomEvent('kp-nav', { detail: sec }))

export function Drawer({ title, onClose, children, foot }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode; foot?: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev }
  }, [onClose])
  if (typeof document === 'undefined') return null
  // portale su body: dentro Kitchen Pro c'è un contenitore animato che "intrappola" position:fixed
  return createPortal(
    <div className="drawer-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div style={{ flex: 1, minWidth: 0 }}>{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi"><X /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {foot && <div className="drawer-foot">{foot}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Stepper({ value, onChange, step = 1, unit, min = 0 }: { value: number; onChange: (v: number) => void; step?: number; unit?: string; min?: number }) {
  const [txt, setTxt] = useState(String(value).replace('.', ','))
  useEffect(() => { setTxt(String(value).replace('.', ',')) }, [value])
  const commit = () => { const n = parseFloat(txt.replace(',', '.')); if (isFinite(n) && n !== value) onChange(Math.max(min, n)); else setTxt(String(value).replace('.', ',')) }
  return (
    <span className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, +(value - step).toFixed(3)))} aria-label="Meno"><Minus size={15} /></button>
      <input inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      {unit && <span>{unit}</span>}
      <button type="button" onClick={() => onChange(+(value + step).toFixed(3))} aria-label="Più"><Plus size={15} /></button>
    </span>
  )
}

export type Pick = { kind: 'ricetta'; recipe: KRecipe } | { kind: 'ingrediente'; nome: string }

/** cerca tra ricette del ricettario e ingredienti noti; Invio aggiunge anche un nome libero */
export function ItemCombo({ placeholder, onPick, onlyRecipes = false, autoFocus = false }: { placeholder: string; onPick: (p: Pick) => void; onlyRecipes?: boolean; autoFocus?: boolean }) {
  const { recipes, listino, stock } = useHub()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const ingNames = useMemo(() => {
    const s = new Map<string, string>()
    for (const l of listino) s.set(norm(l.nome), l.nome)
    for (const r of recipes) for (const i of r.ingredients) if (!s.has(norm(i.name))) s.set(norm(i.name), i.name)
    for (const x of stock) if (!s.has(norm(x.name))) s.set(norm(x.name), x.name)
    return [...s.values()]
  }, [listino, recipes, stock])
  const results = useMemo(() => {
    const t = q.trim()
    if (!t) return recipes.slice(0, 8).map((r) => ({ kind: 'ricetta' as const, recipe: r, label: r.name, sub: r.section }))
    const nq = norm(t)
    const rs = recipes.map((r) => ({ r, s: norm(r.name).includes(nq) ? 2 : nameScore(t, r.name) })).filter((x) => x.s > 0.3)
      .sort((a, b) => b.s - a.s).slice(0, 8).map(({ r }) => ({ kind: 'ricetta' as const, recipe: r, label: r.name, sub: r.section }))
    if (onlyRecipes) return rs
    const is = ingNames.filter((n) => norm(n).includes(nq)).slice(0, 6).map((n) => ({ kind: 'ingrediente' as const, nome: n, label: n, sub: 'ingrediente' }))
    const exact = [...rs, ...is].some((x) => norm(x.label) === nq)
    return [...rs, ...is, ...(exact ? [] : [{ kind: 'ingrediente' as const, nome: t, label: `Aggiungi «${t}»`, sub: 'ingrediente nuovo' }])]
  }, [q, recipes, ingNames, onlyRecipes])
  useEffect(() => { setHi(0) }, [q])
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [])
  const choose = (x: (typeof results)[number]) => {
    onPick(x.kind === 'ricetta' ? { kind: 'ricetta', recipe: x.recipe } : { kind: 'ingrediente', nome: x.nome })
    setQ(''); setOpen(false)
  }
  return (
    <div className="combo hub-search" ref={ref}>
      <Search />
      <input className="input" value={q} placeholder={placeholder} autoFocus={autoFocus}
        onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(results.length - 1, h + 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
          if (e.key === 'Enter' && results[hi]) { e.preventDefault(); choose(results[hi]) }
          if (e.key === 'Escape') setOpen(false)
        }} />
      {open && results.length > 0 && (
        <div className="combo-list" role="listbox">
          {results.map((x, i) => (
            <button key={x.kind + x.label} type="button" className={i === hi ? 'hi' : ''} onMouseEnter={() => setHi(i)} onClick={() => choose(x)}>
              <span className={`kind ${x.kind === 'ricetta' ? 'r' : 'i'}`}>{x.kind === 'ricetta' ? 'R' : 'I'}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.label}</span>
              <small>{x.sub}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** ridimensiona una foto e restituisce base64 JPEG (senza prefisso) */
export function shrinkImage(file: File, max = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto non leggibile')) }
    img.src = url
  })
}

export async function askAI(system: string, text: string, images: string[] = [], max_tokens = 2500): Promise<any> {
  const res = await fetch('/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system, max_tokens,
      messages: [{ role: 'user', content: [{ type: 'text', text }, ...images.map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } }))] }],
    }),
  })
  const j = await res.json().catch(() => null)
  if (!res.ok) throw new Error(j?.error?.message || j?.error || `Errore AI (${res.status})`)
  const txt: string = j?.content?.[0]?.text || ''
  try { return JSON.parse(txt) } catch { throw new Error('L’AI non ha risposto in un formato leggibile, riprova') }
}
