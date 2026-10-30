// Movimenti di giacenza come liste di operazioni (STOCK_OPS): servizio, smistamento, rifornimento.
// Funzioni pure: costruiscono le operazioni, il reducer le applica.
import { componentiOf, fmtQty, nameScore, round, toBase, type Piatto, type Prep, type StockItem } from './model'

export type Op = { id: string; delta: number; keep?: boolean; patch?: Record<string, unknown> } | { add: StockItem & Record<string, unknown> }
export type LogEntry = { id: string; at: string; piattoId: string; nome: string; porzioni: number; deltas: { id: string; delta: number }[]; undone?: boolean }
type Dim = 'm' | 'pz'

export const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
const per = (unit: string) => toBase(1, unit)
export const sameThing = (s: StockItem, recipeId: string | null | undefined, nome: string) => (!!recipeId && s.recipeId === recipeId) || nameScore(s.name, nome) >= 0.85
const fifo = (a: StockItem, b: StockItem) => (a.expiresAt || '9999').localeCompare(b.expiresAt || '9999')
export const magazzino = (k: any): StockItem[] => [...(k?.fridge || []), ...(k?.freezer || []), ...(k?.dry || [])]

/** preleva baseQty dalle voci (prima quelle che scadono prima) */
function take(items: StockItem[], baseQty: number, dim: Dim, keep: boolean) {
  const ops: Op[] = []
  let left = baseQty
  for (const it of [...items].sort(fifo)) {
    const u = per(it.unit); if (!u || u.dim !== dim || left <= 1e-9) continue
    const have = it.quantity * u.q
    if (have <= 1e-9) continue
    const t = Math.min(have, left)
    ops.push({ id: it.id, delta: -round(t / u.q, 4), keep })
    left -= t
  }
  return { ops, taken: baseQty - Math.max(0, left), left: Math.max(0, left) }
}

/** porzioni servite: scala dalla linea ogni preparazione del piatto */
export function fireOps(p: Piatto, porzioni: number, linea: StockItem[]) {
  const ops: Op[] = []
  const short: { nome: string; missing: number; dim: Dim }[] = []
  const notInLinea: string[] = []
  for (const c of componentiOf(p)) {
    const b = toBase(c.qty, c.unit); if (!b || b.q <= 0) continue
    const items = linea.filter((s) => sameThing(s, c.recipeId, c.nome))
    if (!items.length) { if (c.tipo === 'ricetta') notInLinea.push(c.nome); continue }
    const r = take(items, b.q * porzioni, b.dim, true)
    ops.push(...r.ops)
    if (r.left > 1e-6) short.push({ nome: c.nome, missing: r.left, dim: b.dim })
  }
  return { ops, short, notInLinea }
}

export function applyPreview(items: StockItem[], ops: Op[]) {
  const m = new Map(items.map((i) => [i.id, i.quantity]))
  for (const o of ops) if ('id' in o && m.has(o.id)) m.set(o.id, Math.max(0, (m.get(o.id) || 0) + o.delta))
  return m
}
/** voci della linea che con queste operazioni scendono sotto il minimo impostato */
export function crossedMin(linea: StockItem[], ops: Op[]) {
  const after = applyPreview(linea, ops)
  return linea.filter((s) => (s.parLevel || 0) > 0 && s.quantity > (s.parLevel || 0) + 1e-9 && (after.get(s.id) ?? s.quantity) <= (s.parLevel || 0) + 1e-9)
}
/** arrivate al minimo (o sotto) */
export const underMin = (linea: StockItem[]) => linea.filter((s) => (s.parLevel || 0) > 0 && s.quantity <= (s.parLevel || 0) + 1e-9)

/** in magazzino (frigo, freezer, dispensa) per una voce di linea */
export function sourcesFor(item: { recipeId?: string | null; name: string; unit: string }, k: any) {
  const d = per(item.unit)?.dim
  return magazzino(k).filter((s) => sameThing(s, item.recipeId, item.name) && per(s.unit)?.dim === d).sort(fifo)
}
export function available(sources: StockItem[], unit: string) {
  const u = per(unit); if (!u) return 0
  return sources.reduce((t, s) => { const x = per(s.unit); return x && x.dim === u.dim ? t + s.quantity * x.q : t }, 0) / u.q
}

/** dal magazzino alla linea: qty nell'unità della voce di linea */
export function refillOps(target: StockItem, qty: number, sources: StockItem[]) {
  const u = per(target.unit); if (!u || qty <= 0) return { ops: [] as Op[], moved: 0 }
  const r = take(sources, qty * u.q, u.dim, false)
  const moved = r.taken / u.q
  if (moved <= 1e-9) return { ops: [] as Op[], moved: 0 }
  // la linea eredita la scadenza più vicina tra quelle prelevate
  const exp = sources.filter((s) => r.ops.some((o) => 'id' in o && o.id === s.id)).map((s) => s.expiresAt).filter(Boolean).sort()[0]
  const ops: Op[] = [...r.ops, { id: target.id, delta: round(moved, 4), keep: true, patch: exp && (!target.expiresAt || exp < target.expiresAt) ? { expiresAt: exp } : undefined }]
  return { ops, moved }
}

export type Part = { location: 'counter' | 'fridge' | 'freezer' | 'dry'; partita?: string; qty: number; days: number }
export const LOC_LABEL: Record<string, string> = { counter: 'linea', fridge: 'frigo', freezer: 'freezer', dry: 'dispensa' }

/** preparazione finita: smistata tra linea e magazzino (si somma alle voci uguali) */
export function smistaOps(p: Prep, parts: Part[], k: any) {
  const ops: Op[] = []
  const unit = p.unitaMisura
  const all: StockItem[] = [...(k?.counter || []), ...magazzino(k)]
  for (const part of parts) {
    if (!(part.qty > 0)) continue
    const exp = new Date(Date.now() + part.days * 864e5).toISOString()
    const same = all.find((s) => s.location === part.location && (part.location !== 'counter' || (s.partita || '') === (part.partita || '')) && s.unit === unit && sameThing(s, p.recipeId, p.nome))
    // si somma alla voce uguale; resta la scadenza più vicina (la merce vecchia va usata prima)
    if (same) ops.push({ id: same.id, delta: round(part.qty, 4), keep: true, patch: !same.expiresAt ? { expiresAt: exp } : undefined })
    else ops.push({ add: {
      id: uid(), name: p.nome, quantity: round(part.qty, 4), unit, location: part.location, partita: part.location === 'counter' ? part.partita : p.partita,
      recipeId: p.recipeId ?? undefined, expiresAt: exp, insertedAt: new Date().toISOString(), notes: 'Da preparazione',
      parLevel: part.location === 'counter' ? null : null,
    } as any })
  }
  const dest = parts.filter((x) => x.qty > 0).map((x) => `${LOC_LABEL[x.location]}${x.location === 'counter' && x.partita ? ` ${x.partita}` : ''}`).join(', ')
  return { ops, dest }
}

export const describe = (q: number, unit: string) => {
  const b = toBase(q, unit); return b ? fmtQty(b.q, b.dim, unit) : `${q} ${unit}`
}
