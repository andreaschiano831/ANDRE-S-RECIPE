// Stampa nello stesso stile della prima versione del ricettario (Cormorant + DM Sans, filetti oro).
// Un'unica fonte per anteprima a schermo, stampa/PDF e file Word.
import { fmtDose, scaleQty } from './recipes'

export type PrintItem = {
  name: string; category?: string | null; group?: string | null; section?: string | null; yield_note?: string | null; notes?: string | null
  dose: number
  ingredients: { name: string; quantity: number | null; unit: string; note?: string | null }[]
  steps: { body: string; duration_min?: number | null; temperature?: string | null }[]
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function recipeHTML(it: PrintItem, breakAfter = false) {
  const rows = it.ingredients.map((g) => {
    const q = g.quantity == null ? 'q.b.' : scaleQty(g.quantity, it.dose)
    const u = g.quantity == null || g.unit === 'q.b.' ? '' : g.unit
    return `<tr><td class="pd-i">${esc(g.name)}${g.note ? ` <span class="pd-nt">${esc(g.note)}</span>` : ''}</td><td class="pd-q">${esc(q)}</td><td class="pd-u">${esc(u)}</td></tr>`
  }).join('')
  const meta = [it.category, it.section, it.group, it.yield_note].filter(Boolean).map(esc).join(' · ')
  const doseTxt = it.dose && it.dose !== 1 ? `dose ×${esc(fmtDose(it.dose))}` : ''
  const metaLine = [meta, doseTxt].filter(Boolean).join(' · ')
  const steps = it.steps.filter((s) => s.body?.trim())
  const proc = steps.length
    ? `<div class="pd-p"><h3>Procedimento</h3>${steps.map((s, i) => `<p>${steps.length > 1 ? `<b>${i + 1}.</b> ` : ''}${esc(s.body).replace(/\n/g, '<br>')}${[s.duration_min ? `${s.duration_min}′` : '', s.temperature || ''].filter(Boolean).length ? ` <i>(${[s.duration_min ? `${s.duration_min}′` : '', esc(s.temperature || '')].filter(Boolean).join(', ')})</i>` : ''}</p>`).join('')}</div>`
    : ''
  const notes = it.notes?.trim() ? `<p class="pd-n">${esc(it.notes).replace(/\n/g, '<br>')}</p>` : ''
  return `<section class="pd-r${breakAfter ? ' pd-pb' : ''}"><h2>${esc(it.name)}</h2>${metaLine ? `<p class="pd-m">${metaLine}</p>` : ''}`
    + `<table><thead><tr><th>Ingrediente</th><th class="pd-q">Quantità</th><th class="pd-u"></th></tr></thead><tbody>${rows}</tbody></table>${proc}${notes}</section>`
}

export function docHTML(opts: { brand: string; title?: string; items: PrintItem[]; onePerPage?: boolean; noHeader?: boolean }) {
  const n = opts.items.length
  const head = opts.noHeader ? '' : `<header class="pd-hd"><div class="pd-b">${esc(opts.brand)}</div><h1>${esc(opts.title || '')}</h1><div class="pd-d">${new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} · ${n} ricett${n === 1 ? 'a' : 'e'}</div></header>`
  return head + opts.items.map((it, i) => recipeHTML(it, !!opts.onePerPage && i < n - 1)).join('')
}

export function docCSS(p = '') {
  return `${p}.pd-hd{text-align:center;border-bottom:1px solid #C4933A;padding-bottom:10pt;margin-bottom:18pt}
${p}.pd-b{font-family:"Cormorant SC",Georgia,serif;letter-spacing:.22em;font-size:8.5pt;color:#8B6914;text-transform:uppercase}
${p}h1{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:400;font-size:26pt;margin:4pt 0 2pt;color:#1a1410;letter-spacing:0}
${p}.pd-d{font-size:8.5pt;color:#888;font-family:"DM Sans",Arial,sans-serif}
${p}.pd-r{page-break-inside:avoid;break-inside:avoid;margin:0 0 20pt}
${p}.pd-pb{page-break-after:always;break-after:page}
${p}h2{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-weight:400;font-size:19pt;margin:0 0 2pt;color:#1a1410;border-bottom:.5pt solid #ddd;padding-bottom:3pt;letter-spacing:0}
${p}.pd-m{font-family:"Cormorant SC",Georgia,serif;font-size:8.5pt;color:#8B6914;letter-spacing:.08em;margin:3pt 0 7pt}
${p}table{width:100%;border-collapse:collapse;font-family:"DM Sans",Arial,sans-serif;font-size:10.5pt}
${p}th{text-align:left;font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:#999;font-weight:500;border-bottom:.75pt solid #C4933A;padding:3pt 4pt}
${p}td{padding:3.5pt 4pt;border-bottom:.5pt solid #eee;color:#222}
${p}.pd-q{text-align:right;width:22%}
${p}.pd-u{width:12%;color:#777;padding-left:6pt}
${p}.pd-nt{color:#999;font-size:9pt}
${p}.pd-p{margin-top:9pt;padding:6pt 10pt;border-left:2pt solid #C4933A;background:#faf6ec}
${p}h3{font-family:"Cormorant SC",Georgia,serif;font-size:8.5pt;letter-spacing:.16em;color:#8B6914;margin:0 0 3pt;font-weight:600}
${p}.pd-p p{font-family:"Cormorant Garamond",Georgia,serif;font-size:11.5pt;line-height:1.5;margin:0 0 3pt;color:#333}
${p}.pd-n{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;font-size:11pt;color:#555;margin-top:6pt}`
}

export function wordFile(opts: { brand: string; title: string; items: PrintItem[]; onePerPage?: boolean }) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(opts.title)}</title><style>body{font-family:Georgia,serif;color:#222}${docCSS('')}</style></head><body>${docHTML(opts)}</body></html>`
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(opts.title || 'ricette').replace(/[\\/:*?"<>|]+/g, '_')}.doc`
  document.body.appendChild(a); a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 800)
}

/** da una ricetta del database */
export function toPrintItem(r: any, dose = 1, section?: string | null): PrintItem {
  return {
    name: r.name, category: r.category, group: r.dish_group, section: section ?? null, yield_note: r.yield_note, notes: r.notes, dose,
    ingredients: [...(r.recipe_ingredients ?? [])].sort((a, b) => a.position - b.position),
    steps: [...(r.recipe_steps ?? [])].sort((a, b) => a.position - b.position),
  }
}
