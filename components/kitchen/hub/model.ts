// Calcoli condivisi della cucina: unità, abbinamento nomi, costi, copertura della linea, fabbisogno.
// Tutto puro (niente React), così piatti, linea, preparazioni e food cost usano gli stessi numeri.

export type KRecipe = {
  id: string; name: string; section: string
  ingredients: { name: string; quantity: number | null; unit: string }[]
}
export type StockItem = {
  id: string; name: string; quantity: number; unit: string; location: string
  partita?: string; recipeId?: string | null; expiresAt?: string | null; prezzoUnitario?: number | null
  category?: string; insertedAt?: string; parLevel?: number | null
}
export type ListinoItem = { id: string; nome: string; prezzo: number; unita: 'kg' | 'l' | 'pz'; fornitore?: string | null; aggiornatoIl?: string }
export type Componente = { id: string; tipo: 'ricetta' | 'ingrediente'; recipeId?: string | null; nome: string; qty: number | null; unit: string }
export type Piatto = {
  id: string; nome: string; categoria: string; attivo: boolean; prezzo?: number | null; note?: string
  componenti?: Componente[]
  // formato precedente
  ingredienti?: { nome: string; qty: number; unit: string; stockId?: string | null }[]
  copertiBase?: number; ricette?: { id: string; name: string; dose?: number }[]
  storico?: { data: string; coperti: number; ts?: string }[]
}
export type Prep = {
  id: string; nome: string; quantita: number; unitaMisura: string; status: string
  reparto?: string; partita?: string; categoriaKey?: string; recipeId?: string | null; piattoId?: string | null
  scadeIl?: string | null; note?: string | null; createdAt?: string; svoltaIl?: string | null; destinazione?: string | null
  lotto?: string; tracciabilita?: { ingrediente: string; lotto: string; fornitore?: string; doc?: string; data?: string; scadenza?: string; fonte: string }[]
}

export const PIATTO_CATEGORIE = [
  { key: 'antipasto', label: 'Antipasto' }, { key: 'primo', label: 'Primo' }, { key: 'secondo', label: 'Secondo' },
  { key: 'dessert', label: 'Dessert' }, { key: 'buffet', label: 'Buffet' }, { key: 'speciale', label: 'Speciale' },
]
export const PARTITE = [
  { key: 'antipasti', label: 'Antipasti', color: '#8B1E2F' }, { key: 'primi', label: 'Primi', color: '#2A4FA5' },
  { key: 'secondi', label: 'Secondi', color: '#8B4A1E' }, { key: 'pasticceria', label: 'Pasticceria', color: '#7A5A1E' },
  { key: 'colazioni', label: 'Colazioni', color: '#7A5A3A' }, { key: 'buffet', label: 'Buffet', color: '#3D7A4A' },
  { key: 'eventi', label: 'Eventi', color: '#555555' },
]
export const partitaLabel = (k?: string) => PARTITE.find((p) => p.key === k)?.label ?? 'Senza partita'

// ── Unità ──────────────────────────────────────────────
type Dim = 'm' | 'pz'
const MASS: Record<string, number> = { g: 1, gr: 1, kg: 1000, mg: 0.001, ml: 1, cl: 10, dl: 100, l: 1000, lt: 1000 }
/** quantità in unità base: grammi (ml ≈ g) oppure pezzi; null se non misurabile (q.b.) */
export function toBase(qty: number | null | undefined, unit: string | undefined): { q: number; dim: Dim } | null {
  if (qty == null || !isFinite(Number(qty))) return null
  const u = String(unit || 'pz').toLowerCase().replace('.', '').trim()
  if (u === 'qb' || u === 'q.b') return null
  if (MASS[u] != null) return { q: Number(qty) * MASS[u], dim: 'm' }
  return { q: Number(qty), dim: 'pz' }
}
export function fromBase(q: number, dim: Dim, prefer?: string): { qty: number; unit: string } {
  if (dim === 'pz') return { qty: round(q, 2), unit: prefer && MASS[prefer] == null ? prefer : 'pz' }
  const liquid = prefer === 'ml' || prefer === 'l' || prefer === 'cl' || prefer === 'dl'
  if (q >= 1000) return { qty: round(q / 1000, 2), unit: liquid ? 'l' : 'kg' }
  return { qty: Math.round(q), unit: liquid ? 'ml' : 'g' }
}
export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d
export function fmtQty(q: number, dim: Dim, prefer?: string) {
  const r = fromBase(q, dim, prefer)
  return `${String(r.qty).replace('.', ',')} ${r.unit}`
}
export const eur = (n: number | null | undefined, d = 2) =>
  n == null || !isFinite(n) ? '—' : n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d })

// ── Nomi ───────────────────────────────────────────────
const STOP = new Set(['di', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'al', 'alla', 'allo', 'ai', 'agli', 'alle', 'con', 'e', 'in', 'da', 'la', 'il', 'lo', 'le', 'i', 'gli', 'per', 'a', 'd', 'l'])
export const norm = (s: string) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const stem = (w: string) => (w.length > 4 ? w.replace(/[aeio]$/, '') : w)
const tokens = (s: string) => norm(s).split(' ').filter((w) => w && !STOP.has(w)).map(stem)

/** somiglianza 0–1 tra due nomi di ingredienti/preparazioni */
export function nameScore(a: string, b: string) {
  const na = norm(a), nb = norm(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const A = tokens(a), B = tokens(b)
  if (!A.length || !B.length) return 0
  const SB = new Set(B)
  const inter = A.filter((x) => SB.has(x)).length
  if (!inter) return 0
  const short = Math.min(A.length, B.length)
  if (inter === short) return 0.75 + 0.2 * (short / Math.max(A.length, B.length))
  return inter / (A.length + B.length - inter)
}
export function bestMatch<T>(name: string, list: T[], get: (x: T) => string, min = 0.6): T | null {
  let best: T | null = null, score = min
  for (const x of list) { const s = nameScore(name, get(x)); if (s > score || (s === 1 && score < 1)) { best = x; score = s } }
  return best
}

// ── Prezzi e costi ─────────────────────────────────────
export type Price = { perBase: number; dim: Dim; source: 'listino' | 'giacenza' | 'ricetta'; label: string }
export type Ctx = { recipes: KRecipe[]; listino: ListinoItem[]; stock: StockItem[] }

export function listinoPrice(name: string, listino: ListinoItem[]): Price | null {
  const li = bestMatch(name, listino, (x) => x.nome, 0.72)
  if (!li || !(li.prezzo > 0)) return null
  const dim: Dim = li.unita === 'pz' ? 'pz' : 'm'
  return { perBase: dim === 'pz' ? li.prezzo : li.prezzo / 1000, dim, source: 'listino', label: li.nome }
}
function stockPrice(name: string, stock: StockItem[]): Price | null {
  const priced = stock.filter((s) => s.prezzoUnitario && s.prezzoUnitario > 0)
  const s = bestMatch(name, priced, (x) => x.name, 0.72)
  if (!s) return null
  const b = toBase(1, s.unit)
  if (!b) return null
  return { perBase: s.prezzoUnitario! / b.q, dim: b.dim, source: 'giacenza', label: s.name }
}

export type RecipeCost = {
  cost: number; weight: number; perG: number | null
  lines: { name: string; quantity: number | null; unit: string; cost: number | null; price: Price | null; reason?: string }[]
  missing: string[]
}

/** costo di una ricetta (con sotto-ricette per nome, es. "Crema pasticcera" dentro un dolce) */
export function recipeCost(r: KRecipe, ctx: Ctx, seen: Set<string> = new Set(), cache: Map<string, RecipeCost> = new Map()): RecipeCost {
  if (cache.has(r.id)) return cache.get(r.id)!
  seen = new Set(seen).add(r.id)
  let cost = 0, weight = 0
  const missing: string[] = []
  const lines: RecipeCost['lines'] = []
  for (const i of r.ingredients) {
    const b = toBase(i.quantity, i.unit)
    if (b?.dim === 'm') weight += b.q
    if (!b) { lines.push({ ...i, cost: null, price: null, reason: 'q.b.' }); continue }
    let price = priceFor(i.name, ctx, seen, cache, r.id)
    if (price && price.dim !== b.dim) price = null
    if (!price) { missing.push(i.name); lines.push({ ...i, cost: null, price: null, reason: 'prezzo mancante' }); continue }
    const c = b.q * price.perBase
    cost += c
    lines.push({ ...i, cost: c, price })
  }
  const out = { cost, weight, perG: weight > 0 ? cost / weight : null, lines, missing }
  cache.set(r.id, out)
  return out
}

export function priceFor(name: string, ctx: Ctx, seen: Set<string> = new Set(), cache?: Map<string, RecipeCost>, selfId?: string): Price | null {
  const p = listinoPrice(name, ctx.listino) || stockPrice(name, ctx.stock)
  if (p) return p
  // sotto-ricetta con lo stesso nome
  const sub = ctx.recipes.find((x) => x.id !== selfId && !seen.has(x.id) && nameScore(name, x.name) >= 0.9)
  if (sub) {
    const rc = recipeCost(sub, ctx, seen, cache)
    if (rc.perG != null && !rc.missing.length) return { perBase: rc.perG, dim: 'm', source: 'ricetta', label: sub.name }
  }
  return null
}

/** componenti del piatto, convertendo il vecchio formato (ingredienti per N coperti) */
export function componentiOf(p: Piatto): Componente[] {
  if (Array.isArray(p.componenti)) return p.componenti
  const base = p.copertiBase || 1
  const out: Componente[] = (p.ingredienti || []).map((i, k) => ({
    id: `old-${k}`, tipo: 'ingrediente', nome: i.nome, qty: i.qty != null ? round(i.qty / base, 3) : null, unit: i.unit || 'g',
  }))
  for (const r of p.ricette || []) if (!out.some((c) => c.recipeId === r.id)) out.push({ id: `old-r-${r.id}`, tipo: 'ricetta', recipeId: r.id, nome: r.name, qty: null, unit: 'g' })
  return out
}

export type PiattoCost = {
  cost: number; fc: number | null; margin: number | null; complete: boolean
  lines: { c: Componente; cost: number | null; reason?: string }[]
}
export function piattoCost(p: Piatto, ctx: Ctx, cache: Map<string, RecipeCost> = new Map()): PiattoCost {
  let cost = 0, complete = true
  const lines: PiattoCost['lines'] = []
  for (const c of componentiOf(p)) {
    const b = toBase(c.qty, c.unit)
    if (!b) { complete = false; lines.push({ c, cost: null, reason: 'quantità mancante' }); continue }
    let perBase: number | null = null, reason = ''
    if (c.tipo === 'ricetta') {
      const r = ctx.recipes.find((x) => x.id === c.recipeId) || ctx.recipes.find((x) => nameScore(x.name, c.nome) >= 0.9)
      if (!r) reason = 'ricetta non trovata'
      else {
        const rc = recipeCost(r, ctx, new Set(), cache)
        if (b.dim === 'pz') reason = 'indica i grammi'
        else if (rc.perG == null) reason = 'ricetta senza pesi'
        else { perBase = rc.perG; if (rc.missing.length) reason = `${rc.missing.length} prezzi mancanti` }
      }
    } else {
      const pr = priceFor(c.nome, ctx, new Set(), cache)
      if (!pr) reason = 'prezzo mancante'
      else if (pr.dim !== b.dim) reason = 'unità diversa dal listino'
      else perBase = pr.perBase
    }
    if (perBase == null) { complete = false; lines.push({ c, cost: null, reason }); continue }
    if (reason) complete = false
    const v = b.q * perBase
    cost += v
    lines.push({ c, cost: v, reason: reason || undefined })
  }
  const price = Number(p.prezzo) || 0
  return { cost, fc: price > 0 ? (cost / price) * 100 : null, margin: price > 0 ? price - cost : null, complete, lines }
}
export function fcTone(fc: number | null, target = 30): 'ok' | 'warn' | 'danger' | '' {
  if (fc == null) return ''
  return fc <= target ? 'ok' : fc <= target + 8 ? 'warn' : 'danger'
}

// ── Linea ──────────────────────────────────────────────
export const lineaItems = (k: any): StockItem[] => (k?.counter || []) as StockItem[]

/** quanto c'è in linea per un componente (stessa ricetta o stesso nome) */
export function lineaFor(c: { recipeId?: string | null; nome: string }, linea: StockItem[], partita?: string) {
  const items = linea.filter((s) => (!partita || s.partita === partita) &&
    ((c.recipeId && s.recipeId === c.recipeId) || nameScore(s.name, c.nome) >= 0.85))
  let q = 0, dim: Dim | null = null
  for (const s of items) { const b = toBase(s.quantity, s.unit); if (b) { q += b.q; dim = b.dim } }
  return { items, q, dim }
}

/** porzioni coperte dalla linea per un piatto (solo componenti che si tengono in linea) */
export function copertura(p: Piatto, linea: StockItem[]) {
  let min = Infinity, tracked = 0
  const per: { c: Componente; porzioni: number; have: number }[] = []
  for (const c of componentiOf(p)) {
    const b = toBase(c.qty, c.unit)
    if (!b || b.q <= 0) continue
    const l = lineaFor(c, linea)
    if (c.tipo === 'ingrediente' && !l.items.length) continue
    tracked++
    const porz = l.dim === b.dim ? Math.floor(l.q / b.q + 1e-9) : 0
    per.push({ c, porzioni: porz, have: l.q })
    min = Math.min(min, porz)
  }
  return { porzioni: tracked ? min : null, per }
}

// ── Fabbisogno di servizio ─────────────────────────────
export type Need = {
  key: string; recipeId: string | null; nome: string; dim: Dim; need: number; linea: number; inPrep: number; magazzino: number
  missing: number; piatti: string[]
}
export function fabbisogno(piatti: Piatto[], porzioni: (p: Piatto) => number, k: any, recipes: KRecipe[]): Need[] {
  const map = new Map<string, Need>()
  const linea = lineaItems(k)
  const store: StockItem[] = [...(k?.fridge || []), ...(k?.freezer || [])]
  const preps: Prep[] = (k?.preparazioni || []).filter((x: Prep) => x.status === 'da_fare' || x.status === 'in_corso')
  for (const p of piatti) {
    const n = porzioni(p)
    if (!n) continue
    for (const c of componentiOf(p)) {
      if (c.tipo !== 'ricetta') continue
      const b = toBase(c.qty, c.unit)
      if (!b) continue
      const r = recipes.find((x) => x.id === c.recipeId)
      const key = c.recipeId || norm(c.nome)
      const cur = map.get(key) || { key, recipeId: c.recipeId || null, nome: r?.name || c.nome, dim: b.dim, need: 0, linea: 0, inPrep: 0, magazzino: 0, missing: 0, piatti: [] }
      cur.need += b.q * n
      if (!cur.piatti.includes(p.nome)) cur.piatti.push(p.nome)
      map.set(key, cur)
    }
  }
  for (const nd of map.values()) {
    const comp = { recipeId: nd.recipeId, nome: nd.nome }
    nd.linea = lineaFor(comp, linea).q
    nd.magazzino = lineaFor(comp, store).q
    for (const pr of preps) {
      if ((nd.recipeId && pr.recipeId === nd.recipeId) || nameScore(pr.nome, nd.nome) >= 0.9) {
        const b = toBase(pr.quantita, pr.unitaMisura); if (b && b.dim === nd.dim) nd.inPrep += b.q
      }
    }
    nd.missing = Math.max(0, nd.need - nd.linea - nd.inPrep)
  }
  return [...map.values()].sort((a, b) => b.missing - a.missing || a.nome.localeCompare(b.nome, 'it'))
}

/** peso totale (g) della ricetta a dose 1 */
export function recipeWeight(r: KRecipe) {
  return r.ingredients.reduce((s, i) => { const b = toBase(i.quantity, i.unit); return b?.dim === 'm' ? s + b.q : s }, 0)
}
