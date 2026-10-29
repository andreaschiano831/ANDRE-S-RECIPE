// Lettura di ricette dal web: scarica una pagina (o un PDF), trova le ricette strutturate (schema.org/Recipe),
// i link alle ricette di un ricettario e, se serve, il testo da far leggere all'AI.
import { lookup } from 'node:dns/promises'
import * as cheerio from 'cheerio'

export type WebRecipe = {
  name: string; section: string; category: string; dish_group: string; yield_note: string; notes: string
  ingredients: { name: string; quantity: number | null; unit: string; note: string }[]
  steps: { body: string; duration_min: number | null; temperature: string }[]
  source_url: string; image?: string
}
export type WebLink = { url: string; title: string }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

// ── sicurezza: solo http(s) pubblici ─────────────────────
function privateIp(ip: string) {
  return /^(10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i.test(ip)
}
export async function checkUrl(raw: string): Promise<URL> {
  let u: URL
  try { u = new URL(raw.trim()) } catch { throw new Error('Indirizzo non valido') }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Serve un indirizzo http o https')
  if (process.env.ALLOW_PRIVATE_FETCH !== '1') {
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(u.hostname)) throw new Error('Indirizzo non raggiungibile')
    const addrs = await lookup(u.hostname, { all: true }).catch(() => [])
    if (!addrs.length) throw new Error(`Il sito ${u.hostname} non risponde`)
    if (addrs.some((a) => privateIp(a.address))) throw new Error('Indirizzo non raggiungibile')
  }
  return u
}

/** link speciali → versione scaricabile (Google Docs, Drive, Dropbox) */
export function directUrl(u: URL): URL {
  const doc = u.href.match(/docs\.google\.com\/document\/d\/([\w-]+)/)
  if (doc) return new URL(`https://docs.google.com/document/d/${doc[1]}/export?format=txt`)
  const drive = u.href.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/)
  if (drive) return new URL(`https://drive.google.com/uc?export=download&id=${drive[1]}`)
  if (/dropbox\.com$/.test(u.hostname)) { const d = new URL(u.href); d.searchParams.set('dl', '1'); return d }
  return u
}

export async function fetchUrl(raw: string): Promise<{ url: URL; type: 'html' | 'pdf' | 'text'; html?: string; text?: string; buf?: ArrayBuffer }> {
  const u = directUrl(await checkUrl(raw))
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 15000)
  let res: Response
  try {
    res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8', 'Accept-Language': 'it-IT,it;q=0.9,en;q=0.6' }, redirect: 'follow', signal: ctl.signal })
  } catch (e: any) {
    throw new Error(e?.name === 'AbortError' ? 'Il sito ci mette troppo a rispondere' : `Non riesco ad aprire ${u.hostname}`)
  } finally { clearTimeout(t) }
  if (res.status === 401 || res.status === 403) throw new Error(`${u.hostname} non permette la lettura automatica (o la pagina è privata)`)
  if (res.status === 404) throw new Error('Pagina non trovata (404)')
  if (!res.ok) throw new Error(`${u.hostname} ha risposto con errore ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  const len = Number(res.headers.get('content-length') || 0)
  if (len > 40e6) throw new Error('File troppo grande (oltre 40 MB)')
  const finalUrl = new URL(res.url || u.href)
  if (ct.includes('pdf') || /\.pdf($|\?)/i.test(finalUrl.pathname)) return { url: finalUrl, type: 'pdf', buf: await res.arrayBuffer() }
  if (ct.includes('text/plain')) return { url: finalUrl, type: 'text', text: (await res.text()).slice(0, 2e6) }
  return { url: finalUrl, type: 'html', html: (await res.text()).slice(0, 6e6) }
}

export async function pdfText(buf: ArrayBuffer): Promise<{ text: string; pages: number }> {
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(buf))
  const { text, totalPages } = await extractText(pdf, { mergePages: false })
  return { text: (text as string[]).join('\n\n'), pages: totalPages }
}

/** divide un testo lungo in blocchi per l'AI, tagliando tra paragrafi */
export function chunkText(text: string, size = 9000): string[] {
  const out: string[] = []
  let cur = ''
  for (const para of text.replace(/\r/g, '').split(/\n{2,}/)) {
    if (cur.length + para.length > size && cur) { out.push(cur); cur = '' }
    if (para.length > size) { for (let i = 0; i < para.length; i += size) out.push(para.slice(i, i + size)); continue }
    cur += (cur ? '\n\n' : '') + para
  }
  if (cur.trim()) out.push(cur)
  return out.filter((c) => c.trim().length > 40)
}

// ── schema.org/Recipe ────────────────────────────────────
const asArr = (v: any) => (v == null ? [] : Array.isArray(v) ? v : [v])
const txt = (v: any): string => {
  if (v == null) return ''
  if (typeof v === 'string') return cheerio.load(`<b>${v}</b>`).text().replace(/\s+/g, ' ').trim()
  if (Array.isArray(v)) return v.map(txt).filter(Boolean).join(', ')
  if (typeof v === 'object') return txt(v.text ?? v.name ?? '')
  return String(v)
}
const isType = (o: any, t: string) => asArr(o?.['@type']).some((x: any) => String(x).toLowerCase() === t.toLowerCase())

function collectLd(html: string): any[] {
  const $ = cheerio.load(html)
  const out: any[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text().trim()
    if (!raw) return
    let j: any
    try { j = JSON.parse(raw) } catch { try { j = JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' ')) } catch { return } }
    const walk = (o: any) => {
      if (!o || typeof o !== 'object') return
      if (Array.isArray(o)) { o.forEach(walk); return }
      out.push(o)
      if (o['@graph']) walk(o['@graph'])
      if (o.mainEntity) walk(o.mainEntity)
      if (o.itemListElement) walk(o.itemListElement)
      if (o.item && typeof o.item === 'object') walk(o.item)
    }
    walk(j)
  })
  return out
}

// ── ingredienti: "200 g di farina 00" → { quantity, unit, name } ──
const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125 }
const UNIT_MAP: [RegExp, string, number][] = [
  [/^(kg|kilo|chili|chilogrammi?)$/i, 'kg', 1], [/^(g|gr|grammi?|gramm?s?)$/i, 'g', 1], [/^(mg)$/i, 'g', 0.001],
  [/^(l|lt|litri?|liters?|litres?)$/i, 'l', 1], [/^(ml|millilitri?)$/i, 'ml', 1], [/^(cl|centilitri?)$/i, 'cl', 1], [/^(dl|decilitri?)$/i, 'ml', 100],
  [/^(cucchiai|cucchiaio|tbsp|tablespoons?|cucchiai da tavola)$/i, 'ml', 15], [/^(cucchiain[oi]|tsp|teaspoons?)$/i, 'ml', 5],
  [/^(cups?|tazze?)$/i, 'ml', 240], [/^(oz|ounces?|once)$/i, 'g', 28.35], [/^(lbs?|pounds?|libbre?)$/i, 'g', 453.6],
  [/^(pz|pezzi|pezzo|n°|n\.|nr|pcs?|pieces?)$/i, 'n°', 1], [/^(fogli[oe]?|sheets?)$/i, 'foglio', 1], [/^(bacca|bacche|baccell[oi])$/i, 'bacca', 1],
  [/^(spicchi?|cloves?)$/i, 'n°', 1], [/^(uova|uovo|eggs?|tuorli|tuorlo|albumi|albume)$/i, '__count', 1],
]
function num(s: string): number | null {
  s = s.trim()
  if (FRACTIONS[s]) return FRACTIONS[s]
  const mixed = s.match(/^(\d+)\s*([½¼¾⅓⅔⅛])$/)
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]]
  const fr = s.match(/^(\d+)\/(\d+)$/)
  if (fr) return Number(fr[1]) / Number(fr[2])
  const range = s.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/)
  if (range) return (parseFloat(range[1].replace(',', '.')) + parseFloat(range[2].replace(',', '.'))) / 2
  const n = parseFloat(s.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
  return isFinite(n) ? n : null
}
export function parseIngredient(line: string): { name: string; quantity: number | null; unit: string; note: string } {
  let s = line.replace(/\s+/g, ' ').trim()
  let note = ''
  const par = s.match(/\(([^)]*)\)\s*$/); if (par && !/\d\s*(g|ml|kg)\b/i.test(par[1])) { note = par[1]; s = s.slice(0, par.index).trim() }
  if (/\bq\.?\s?b\.?\b|quanto basta|to taste/i.test(s)) return { name: s.replace(/[,:]?\s*\bq\.?\s?b\.?|quanto basta|to taste/ig, '').replace(/^\s*[-–•]\s*|[\s.,:]+$/g, '').trim(), quantity: null, unit: 'q.b.', note }
  // "Farina 00 200 g" (quantità in fondo, stile scheda tecnica)
  const tail = s.match(/^(.*?)[\s:]+(\d+(?:[.,]\d+)?|\d+\/\d+)\s*([a-zA-Z°.]+)?\.?$/)
  const head = s.match(/^(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?|\d+\/\d+|\d+\s*[½¼¾⅓⅔⅛]|[½¼¾⅓⅔⅛])\s*([a-zA-Zàèéìòù°.]+(?:\s+da\s+tavola)?)?\.?\s+(di\s+|d['’]\s*|of\s+)?(.*)$/)
  let qty: number | null = null, unitRaw = '', name = s, linked = false
  if (head) { qty = num(head[1]); unitRaw = (head[2] || '').replace(/\.$/, ''); linked = !!head[3]; name = head[4] }
  else if (tail && UNIT_MAP.some(([re]) => re.test((tail[3] || '').replace(/\.$/, '')))) { name = tail[1]; qty = num(tail[2]); unitRaw = (tail[3] || '').replace(/\.$/, '') }
  else if (tail && !tail[3]) { name = tail[1]; qty = num(tail[2]); unitRaw = '' }
  let unit = 'g'
  const m = UNIT_MAP.find(([re]) => re.test(unitRaw))
  if (m) {
    if (m[1] === '__count') { unit = 'n°'; name = `${unitRaw} ${name}`.trim() }
    else { unit = m[1]; if (qty != null && m[2] !== 1) qty = Math.round(qty * m[2] * 10) / 10 }
  } else if (unitRaw && linked) { note = [unitRaw, note].filter(Boolean).join(', '); unit = 'n°' } // "1 bustina di lievito"
  else if (unitRaw) { name = `${unitRaw} ${name}`.trim(); unit = 'n°' } // "2 mele golden"
  else if (qty == null) unit = 'q.b.'
  else if (qty != null) unit = 'n°'
  name = name.replace(/^[-–•,:\s]+|[,:\s]+$/g, '')
  name = name.charAt(0).toUpperCase() + name.slice(1)
  return { name, quantity: qty, unit, note }
}

function isoMinutes(v: any): number | null {
  const m = String(v || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!m) return null
  const n = (Number(m[1] || 0) * 1440) + Number(m[2] || 0) * 60 + Number(m[3] || 0)
  return n || null
}
function stepFrom(body: string) {
  const min = body.match(/(\d+)\s*(?:minuti|min\.?|minutes?)\b/i)
  const hrs = body.match(/(\d+(?:[.,]\d+)?)\s*(?:ore|ora|hours?|h)\b/i)
  const temp = body.match(/(\d{2,3})\s*°\s*(C|F)?/i)
  return {
    body, duration_min: min ? Number(min[1]) : hrs ? Math.round(parseFloat(hrs[1].replace(',', '.')) * 60) : null,
    temperature: temp ? `${temp[1]}°${(temp[2] || 'C').toUpperCase()}` : '',
  }
}
function instructions(v: any): string[] {
  const out: string[] = []
  const walk = (x: any) => {
    if (!x) return
    if (typeof x === 'string') { out.push(...txt(x).split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])|\n+/).map((s) => s.trim()).filter(Boolean)); return }
    if (Array.isArray(x)) { x.forEach(walk); return }
    if (isType(x, 'HowToSection')) { walk(x.itemListElement); return }
    if (x.itemListElement) { walk(x.itemListElement); return }
    const t = txt(x.text || x.name); if (t) out.push(t)
  }
  walk(v)
  // passaggi troppo corti uniti al precedente
  return out.reduce<string[]>((a, s) => { if (a.length && s.length < 25) a[a.length - 1] += ' ' + s; else a.push(s); return a }, [])
}

export function recipeFromLd(o: any, pageUrl: string): WebRecipe | null {
  const ing = asArr(o.recipeIngredient || o.ingredients).map((x: any) => txt(x)).filter(Boolean)
  const name = txt(o.name)
  if (!name || !ing.length) return null
  const cat = txt(asArr(o.recipeCategory)[0] || '')
  return {
    name, section: cat, category: cat, dish_group: '', yield_note: txt(asArr(o.recipeYield).slice(-1)[0] || ''),
    notes: [txt(o.description).slice(0, 400), `Fonte: ${o.url || pageUrl}`].filter(Boolean).join('\n'),
    ingredients: ing.map(parseIngredient).filter((i) => i.name),
    steps: instructions(o.recipeInstructions).map(stepFrom).map((s, k, all) => (k === all.length - 1 && !s.duration_min && isoMinutes(o.cookTime) && all.length === 1 ? { ...s, duration_min: isoMinutes(o.cookTime) } : s)),
    source_url: o.url || pageUrl,
    image: typeof o.image === 'string' ? o.image : asArr(o.image)[0]?.url || (typeof asArr(o.image)[0] === 'string' ? asArr(o.image)[0] : undefined),
  }
}

// ── pagina: ricette, link, testo ─────────────────────────
const SKIP = /(login|logout|signin|signup|register|account|carrello|cart|checkout|privacy|cookie|contatti|contact|about|chi-siamo|newsletter|shop|negozio|abbonati|subscribe|tag\/|author\/|autore\/|\/feed|wp-json|\.(jpg|jpeg|png|gif|webp|svg|zip|mp4)$|#|mailto:|tel:|javascript:|share|facebook|twitter|pinterest|whatsapp|instagram)/i
const RECIPE_HINT = /(ricett|recipe|recette|receta|rezept|\/r\/|preparazion|dolc|torta|crema|pasta|risotto|gelato|salsa)/i

export function analysePage(html: string, pageUrl: URL, lang?: string) {
  const ld = collectLd(html)
  const recipes = ld.filter((o) => isType(o, 'Recipe')).map((o) => recipeFromLd(o, pageUrl.href)).filter(Boolean) as WebRecipe[]
  const $ = cheerio.load(html)
  const title = ($('meta[property="og:site_name"]').attr('content') || $('title').first().text() || pageUrl.hostname).replace(/\s+/g, ' ').trim().slice(0, 120)
  const pageTitle = ($('h1').first().text() || $('title').first().text() || '').replace(/\s+/g, ' ').trim().slice(0, 140)
  const htmlLang = (lang || $('html').attr('lang') || '').toLowerCase()

  // link da ItemList strutturate
  const links = new Map<string, WebLink>()
  for (const o of ld) {
    if (isType(o, 'ListItem') && (o.url || o.item?.url || typeof o.item === 'string')) {
      const href = o.url || o.item?.url || o.item
      try { const u = new URL(href, pageUrl); links.set(u.href.split('#')[0], { url: u.href.split('#')[0], title: txt(o.name || o.item?.name) || u.pathname }) } catch {}
    }
  }
  // link nella pagina: stesso sito, che sembrano ricette
  const counts = new Map<string, number>()
  const cands: (WebLink & { score: number })[] = []
  $('main a[href], article a[href], .content a[href], #content a[href], body a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    let u: URL
    try { u = new URL(href, pageUrl) } catch { return }
    if (u.hostname.replace(/^www\./, '') !== pageUrl.hostname.replace(/^www\./, '')) return
    const clean = (u.origin + u.pathname).replace(/\/$/, '')
    if (clean === (pageUrl.origin + pageUrl.pathname).replace(/\/$/, '') || SKIP.test(u.href) || u.pathname.length < 3) return
    if (/\/(page|pagina)\/\d+|[?&](page|pg|p)=\d+/i.test(u.href)) return
    if ($(el).closest('nav, header, footer, aside, .menu, .navbar, .sidebar, .breadcrumb, [role=navigation]').length) return
    const text = ($(el).attr('title') || $(el).text() || $(el).find('img').attr('alt') || '').replace(/\s+/g, ' ').trim()
    const depth = u.pathname.split('/').filter(Boolean).length
    let score = 0
    if (RECIPE_HINT.test(u.pathname)) score += 2
    if ($(el).closest('article, .recipe, .card, li, .post, .entry, [class*=recipe], [class*=ricett]').length) score += 2
    if ($(el).find('img').length) score += 1
    if (text.length > 8 && text.length < 120) score += 1
    if (depth >= 2) score += 1
    counts.set(clean, (counts.get(clean) || 0) + 1)
    if (!cands.some((c) => c.url === clean)) cands.push({ url: clean, title: text.slice(0, 120) || decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '').replace(/[-_]/g, ' '), score })
    else { const c = cands.find((c) => c.url === clean)!; if (!c.title && text) c.title = text.slice(0, 120); c.score = Math.max(c.score, score) }
  })
  for (const c of cands.filter((c) => c.score >= 4)) if (!links.has(c.url)) links.set(c.url, { url: c.url, title: c.title })

  // pagina successiva
  let next: string | null = null
  const rel = $('link[rel=next], a[rel=next]').attr('href') || $('a.next, .pagination a.next, a[aria-label*=succ i], a[aria-label*=next i]').attr('href')
  if (rel) { try { next = new URL(rel, pageUrl).href } catch {} }

  // testo principale (per l'AI quando mancano dati strutturati)
  $('script, style, noscript, nav, header, footer, aside, form, iframe, svg, .comments, #comments, .share, .social, .related, .advertisement, .ads, [class*=cookie]').remove()
  const main = $('article').first().length ? $('article').first() : $('main').first().length ? $('main').first() : $('body')
  main.find('br').replaceWith('\n')
  main.find('p, li, h1, h2, h3, h4, tr, div').each((_, el) => { $(el).append('\n') })
  const text = main.text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*/g, '\n\n').trim().slice(0, 60000)

  return { title, pageTitle, lang: htmlLang, recipes, links: [...links.values()].slice(0, 400), next, text }
}
