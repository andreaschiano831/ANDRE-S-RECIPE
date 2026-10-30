/* Gestione economica: fatture, vendite, costi, aggregazioni per periodo */
import { bestMatch, norm, type ListinoItem, type Piatto } from '../hub/model'

export type EKind = 'fattura' | 'vendita' | 'costo'
export type ERec<T = any> = { id: string; kitchen_id: string; kind: EKind; at: string; data: T; by_user?: string | null; by_name?: string | null }

export type Cat = 'food' | 'bev' | 'nonfood'
export const CAT_LABEL: Record<Cat, string> = { food: 'Food', bev: 'Beverage', nonfood: 'Non food' }
export type Riga = {
  descr: string; nome: string; qta: number; um: string; prezzo: number; totale: number; iva?: number | null
  cat: Cat; lotto?: string; base?: { prezzo: number; unita: 'kg' | 'l' | 'pz' } | null
  listino: boolean; carica: boolean; prezzoPrima?: number | null
}
export type Fattura = {
  numero: string; data: string; fornitore: string; piva?: string; righe: Riga[]
  imponibile: number; iva: number; totale: number; scadenza?: string | null; pagata: boolean; pagataIl?: string | null
  fonte: 'xml' | 'foto' | 'manuale'; caricata?: boolean; nota?: string
}
export type VRiga = { piattoId?: string | null; nome: string; qta: number; prezzo: number; costo?: number | null }
export type Vendita = { data: string; coperti?: number | null; incasso: number; righe: VRiga[]; fonte: 'servizio' | 'manuale'; logFino?: string | null; nota?: string }
export type CostoCat = 'personale' | 'affitto' | 'utenze' | 'altro'
export const COSTO_LABEL: Record<CostoCat, string> = { personale: 'Personale', affitto: 'Affitto e locali', utenze: 'Utenze', altro: 'Altri costi' }
export type Costo = { mese: string; voce: string; categoria: CostoCat; importo: number; ricorrente: boolean; fino?: string | null; reparto?: string }

/* ── numeri e date ── */
export const eur0 = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0)
export const eur2 = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
export const pct = (n: number | null | undefined, d = 1) => (n == null || !isFinite(n) ? '—' : `${(Math.round(n * 10 ** d) / 10 ** d).toString().replace('.', ',')}%`)
/** numeri scritti all'italiana ("1.250,50") o con il punto decimale ("1.464") */
export const num = (s: string | number | null | undefined) => {
  if (typeof s === 'number') return isFinite(s) ? s : 0
  let t = String(s ?? '').replace(/[\s€]/g, '')
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(t); return isFinite(n) ? n : 0
}
export const r2 = (n: number) => Math.round(n * 100) / 100
export const dayKey = (d: string | Date = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
export const monthKey = (d: string | Date = new Date()) => dayKey(d).slice(0, 7)
export const atOf = (day: string) => new Date(`${day}T12:00:00`).toISOString()
export const fmtDay = (d: string) => new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: new Date(d).getFullYear() === new Date().getFullYear() ? undefined : '2-digit' })
export const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
export const monthLabel = (m: string) => `${MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`

export type Period = { key: string; from: Date; to: Date; label: string; days: number }
export function period(key: string): Period {
  const now = new Date(); const end = new Date(now); end.setHours(23, 59, 59, 999)
  const mk = (from: Date, to: Date, label: string) => ({ key, from, to, label, days: Math.max(1, Math.round((to.getTime() - from.getTime()) / 864e5)) })
  if (key === 'mese') return mk(new Date(now.getFullYear(), now.getMonth(), 1), end, `${MESI[now.getMonth()]} ${now.getFullYear()}`)
  if (key === 'anno') return mk(new Date(now.getFullYear(), 0, 1), end, `Anno ${now.getFullYear()}`)
  if (/^\d{4}-\d{2}$/.test(key)) { const f = new Date(`${key}-01T00:00`); const t = new Date(f.getFullYear(), f.getMonth() + 1, 0, 23, 59, 59); return mk(f, t, monthLabel(key)) }
  const n = Number(key) || 30; const f = new Date(now); f.setDate(f.getDate() - n + 1); f.setHours(0, 0, 0, 0)
  return mk(f, end, `Ultimi ${n} giorni`)
}
export const inP = (at: string, p: Period) => { const t = new Date(at).getTime(); return t >= p.from.getTime() && t <= p.to.getTime() }

/* ── categorie e prezzi dalle righe ── */
const NONFOOD = /deters|detergent|sgrassa|sanific|candeggin|pellicol|alluminio|carta |carta$|rotolo|tovagliol|guant|sacch|sacchett|spugn|scottex|bicchier|piatti monouso|vaschett|contenitor|etichett|cancelleria|sapone|igienizz|brillantante|anticalcare/i
const BEV = /\bvino\b|vini\b|prosecco|champagne|spumante|birra|\bacqua\b|bibit|coca|aranciata|succo|liquor|amaro|grappa|whisky|gin\b|vodka|rum\b|vermouth|tonica|sciropp/i
export const guessCat = (s: string): Cat => (NONFOOD.test(s) ? 'nonfood' : BEV.test(s) ? 'bev' : 'food')
export const lottoOf = (s: string) => s.match(/lott?o[:.\s]*([A-Z0-9][A-Z0-9\-/]{2,})/i)?.[1] || ''

/** prezzo per kg / litro / pezzo, anche per confezioni ("6 x 2500 GR", "25 KG") */
export function basePrice(descr: string, um: string, prezzo: number): Riga['base'] {
  if (!prezzo) return null
  const u = norm(um || '')
  if (/^(kg|kgm|chil)/.test(u)) return { prezzo, unita: 'kg' }
  if (/^(g|gr|grammi)$/.test(u)) return { prezzo: prezzo * 1000, unita: 'kg' }
  if (/^(l|lt|litr)/.test(u)) return { prezzo, unita: 'l' }
  if (/^ml$/.test(u)) return { prezzo: prezzo * 1000, unita: 'l' }
  const d = descr.toLowerCase().replace(',', '.')
  const multi = d.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|gr|g|lt|l|ml|cl)\b/)
  const single = d.match(/(\d+(?:\.\d+)?)\s*(kg|gr|g|lt|l|ml|cl)\b/)
  const toBase = (q: number, unit: string) => (unit === 'kg' || unit === 'l' || unit === 'lt' ? q : unit === 'cl' ? q / 100 : q / 1000)
  const isL = (unit: string) => /^(l|lt|ml|cl)$/.test(unit)
  if (multi) { const tot = Number(multi[1]) * toBase(Number(multi[2]), multi[3]); if (tot > 0) return { prezzo: prezzo / tot, unita: isL(multi[3]) ? 'l' : 'kg' } }
  if (single) { const tot = toBase(Number(single[1]), single[2]); if (tot > 0) return { prezzo: prezzo / tot, unita: isL(single[2]) ? 'l' : 'kg' } }
  return { prezzo, unita: 'pz' }
}
/** nome breve per il listino: toglie lotti, codici e formati */
export function shortName(descr: string) {
  return descr.replace(/lott?o[:.\s]*\S+/ig, '').replace(/\b\d+\s*[x×]\s*\d+[.,]?\d*\s*(kg|gr|g|lt|l|ml|cl)\b/ig, '').replace(/\b\d+[.,]?\d*\s*(kg|gr|g|lt|l|ml|cl)\.?\b/ig, '')
    .replace(/conf\.?|confezione|cartone|\bct\b/ig, '').split(/[.;]/)[0].replace(/\s{2,}/g, ' ').trim().slice(0, 60)
}
export function makeRiga(descr: string, qta: number, um: string, prezzo: number, totale: number | null, iva: number | null, listino: ListinoItem[], cat?: Cat): Riga {
  const base = basePrice(descr, um, prezzo)
  const match = bestMatch(shortName(descr) || descr, listino, (l) => l.nome, 0.72)
  return {
    descr, nome: match?.nome || shortName(descr) || descr, qta, um: um || 'pz', prezzo, totale: totale ?? r2(qta * prezzo), iva,
    cat: cat || guessCat(descr), lotto: lottoOf(descr), base, listino: (cat || guessCat(descr)) !== 'nonfood', carica: (cat || guessCat(descr)) === 'food',
    prezzoPrima: match && base && match.unita === base.unita ? match.prezzo : null,
  }
}

/* ── fattura elettronica (FatturaPA XML, anche .p7m firmato) ── */
export function xmlFromFile(buf: ArrayBuffer): string {
  let s = new TextDecoder('latin1').decode(new Uint8Array(buf))
  if (!/FatturaElettronica/.test(s) && /^[A-Za-z0-9+/=\s]+$/.test(s.slice(0, 200))) { try { s = atob(s.replace(/\s/g, '')) } catch {} }
  const a = s.search(/<(\w+:)?FatturaElettronica[\s>]/), m = s.match(/<\/(\w+:)?FatturaElettronica>/)
  if (a < 0 || !m) return new TextDecoder('utf-8').decode(new Uint8Array(buf))
  // nei .p7m il testo può essere spezzato da byte di controllo: li tolgo
  const x = s.slice(a, s.indexOf(m[0], a) + m[0].length).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').replace(/[\x80-\x9F][\x00-\xFF]?(?=[^<]*>)/g, '')
  try { return decodeURIComponent(escape(x)) } catch { return x }
}
export function parseFatturaPA(xml: string, listino: ListinoItem[]): Fattura[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Il file non è una fattura elettronica leggibile')
  const all = (el: Element | Document, n: string) => Array.from(el.getElementsByTagNameNS('*', n).length ? el.getElementsByTagNameNS('*', n) : el.getElementsByTagName(n))
  const t = (el: Element | Document | undefined, n: string) => (el ? all(el, n)[0]?.textContent?.trim() || '' : '')
  const ced = all(doc, 'CedentePrestatore')[0]
  const fornitore = t(ced, 'Denominazione') || `${t(ced, 'Nome')} ${t(ced, 'Cognome')}`.trim()
  const piva = t(all(ced!, 'IdFiscaleIVA')[0], 'IdCodice')
  const bodies = all(doc, 'FatturaElettronicaBody')
  if (!bodies.length) throw new Error('Nessun documento trovato nel file')
  return bodies.map((b) => {
    const g = all(b, 'DatiGeneraliDocumento')[0]
    const righe = all(b, 'DettaglioLinee').map((l) => {
      const qta = num(t(l, 'Quantita')) || 1
      const prezzo = num(t(l, 'PrezzoUnitario'))
      return makeRiga(t(l, 'Descrizione'), qta, t(l, 'UnitaMisura'), prezzo, num(t(l, 'PrezzoTotale')), num(t(l, 'AliquotaIVA')), listino)
    }).filter((r) => r.descr && (r.totale || r.prezzo))
    const rie = all(b, 'DatiRiepilogo')
    const imponibile = rie.length ? rie.reduce((s, x) => s + num(t(x, 'ImponibileImporto')), 0) : righe.reduce((s, r) => s + r.totale, 0)
    const iva = rie.reduce((s, x) => s + num(t(x, 'Imposta')), 0)
    const totale = num(t(g, 'ImportoTotaleDocumento')) || r2(imponibile + iva)
    const scad = all(b, 'DataScadenzaPagamento').map((x) => x.textContent?.trim() || '').filter(Boolean).sort()[0] || null
    const tipo = t(g, 'TipoDocumento')
    const sign = tipo === 'TD04' ? -1 : 1 // nota di credito
    return {
      numero: t(g, 'Numero'), data: t(g, 'Data') || dayKey(), fornitore, piva,
      righe: sign < 0 ? righe.map((r) => ({ ...r, totale: -Math.abs(r.totale), listino: false, carica: false })) : righe,
      imponibile: r2(sign * imponibile), iva: r2(sign * iva), totale: r2(sign * totale), scadenza: scad, pagata: false, fonte: 'xml',
      nota: sign < 0 ? 'Nota di credito' : undefined,
    } as Fattura
  })
}

/* ── aggregazioni ── */
export const fatture = (recs: ERec[]) => recs.filter((r) => r.kind === 'fattura') as ERec<Fattura>[]
export const vendite = (recs: ERec[]) => recs.filter((r) => r.kind === 'vendita') as ERec<Vendita>[]
export const costi = (recs: ERec[]) => recs.filter((r) => r.kind === 'costo') as ERec<Costo>[]

export function acquisti(fs: ERec<Fattura>[]) {
  const by: Record<Cat, number> = { food: 0, bev: 0, nonfood: 0 }
  for (const f of fs) {
    const lines = f.data.righe || []
    const sum = lines.reduce((s, r) => s + r.totale, 0)
    if (!lines.length) { by.food += f.data.imponibile; continue }
    // eventuali spese non in riga (trasporto, sconti) ripartite sulle righe
    const k = sum ? f.data.imponibile / sum : 1
    for (const r of lines) by[r.cat] += r.totale * (isFinite(k) ? k : 1)
  }
  return { ...by, tot: by.food + by.bev + by.nonfood }
}
export function ricavi(vs: ERec<Vendita>[]) {
  const incasso = vs.reduce((s, v) => s + (v.data.incasso || 0), 0)
  const coperti = vs.reduce((s, v) => s + (v.data.coperti || 0), 0)
  const righe = vs.flatMap((v) => v.data.righe || [])
  const teorico = righe.reduce((s, r) => s + r.qta * r.prezzo, 0)
  const costo = righe.reduce((s, r) => s + r.qta * (r.costo || 0), 0)
  const conCosto = righe.filter((r) => r.costo != null).reduce((s, r) => s + r.qta * r.prezzo, 0)
  return { incasso, coperti, teorico, costo, fcTeorico: conCosto ? (costo / conCosto) * 100 : null }
}
/** costi fissi del mese, contando quelli ricorrenti */
export function costiMese(cs: ERec<Costo>[], mese: string) {
  return cs.filter((c) => c.data.mese === mese || (c.data.ricorrente && c.data.mese <= mese && (!c.data.fino || c.data.fino >= mese)))
}
export function abc(fs: ERec<Fattura>[], cat: Cat | 'tutto' = 'food') {
  const m = new Map<string, { nome: string; spesa: number; qta: number; um: string }>()
  for (const f of fs) for (const r of f.data.righe || []) {
    if (cat !== 'tutto' && r.cat !== cat) continue
    const key = norm(r.nome); const cur = m.get(key) || { nome: r.nome, spesa: 0, qta: 0, um: r.base?.unita || r.um }
    cur.spesa += r.totale; cur.qta += r.qta; m.set(key, cur)
  }
  const list = [...m.values()].filter((x) => x.spesa > 0).sort((a, b) => b.spesa - a.spesa)
  const tot = list.reduce((s, x) => s + x.spesa, 0)
  let cum = 0
  return { tot, list: list.map((x) => { cum += x.spesa; const c = (cum / tot) * 100; return { ...x, quota: (x.spesa / tot) * 100, classe: (c - (x.spesa / tot) * 100 < 80 ? 'A' : c - (x.spesa / tot) * 100 < 95 ? 'B' : 'C') as 'A' | 'B' | 'C' } }) }
}

/** uscite del servizio non ancora chiuse in una giornata di vendita */
export function servizioAperto(k: any, vs: ERec<Vendita>[], piatti: Piatto[]) {
  const fino = vs.filter((v) => v.data.fonte === 'servizio' && v.data.logFino).map((v) => v.data.logFino!).sort().pop() || ''
  const log = ((k.servizioLog || []) as { at: string; piattoId: string; nome: string; porzioni: number; undone?: boolean }[]).filter((l) => !l.undone && l.at > fino)
  const m = new Map<string, VRiga>()
  for (const l of log) {
    const p = piatti.find((x) => x.id === l.piattoId)
    const cur = m.get(l.piattoId) || { piattoId: l.piattoId, nome: p?.nome || l.nome, qta: 0, prezzo: Number(p?.prezzo) || 0 }
    cur.qta += l.porzioni; m.set(l.piattoId, cur)
  }
  return { righe: [...m.values()], ultimo: log.map((l) => l.at).sort().pop() || null, giorni: [...new Set(log.map((l) => dayKey(l.at)))] }
}

/** raggruppa importi per settimana o mese dentro il periodo */
export function buckets(p: Period) {
  const out: { key: string; label: string; from: number; to: number }[] = []
  if (p.days <= 31) {
    const d = new Date(p.from)
    while (d <= p.to) { const f = new Date(d); const t = new Date(d); t.setHours(23, 59, 59, 999); out.push({ key: dayKey(f), label: String(f.getDate()), from: f.getTime(), to: t.getTime() }); d.setDate(d.getDate() + 1) }
  } else if (p.days <= 120) {
    const d = new Date(p.from)
    while (d <= p.to) { const f = new Date(d); const t = new Date(d); t.setDate(t.getDate() + 6); t.setHours(23, 59, 59, 999); out.push({ key: dayKey(f), label: `${f.getDate()}/${f.getMonth() + 1}`, from: f.getTime(), to: Math.min(t.getTime(), p.to.getTime()) }); d.setDate(d.getDate() + 7) }
  } else {
    const d = new Date(p.from.getFullYear(), p.from.getMonth(), 1)
    while (d <= p.to) { const f = new Date(d); const t = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59); out.push({ key: monthKey(f), label: MESI[f.getMonth()], from: f.getTime(), to: t.getTime() }); d.setMonth(d.getMonth() + 1) }
  }
  return out
}
export const sumIn = <T,>(recs: ERec<T>[], b: { from: number; to: number }, f: (r: ERec<T>) => number) =>
  recs.filter((r) => { const t = new Date(r.at).getTime(); return t >= b.from && t <= b.to }).reduce((s, r) => s + f(r), 0)
