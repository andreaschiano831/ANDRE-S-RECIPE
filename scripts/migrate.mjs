// ═══════════════════════════════════════════════════════════════
//  Migrazione dal vecchio ricettario (HTML + Supabase "ricette")
//  al nuovo database.  Uso:  npm run migrate   (dalla cartella del progetto)
//
//  Legge da .env.local:
//    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  → nuovo progetto
//    OLD_SUPABASE_URL, OLD_SUPABASE_ANON_KEY              → vecchio progetto (facoltativo)
//
//  Fonti, in ordine di priorità (la successiva sovrascrive la precedente con lo stesso nome):
//    1. data/legacy-builtin.json  → le 181 ricette scritte nel codice del vecchio HTML
//    2. tabella "ricette" del vecchio Supabase → quelle aggiunte/modificate dall'app
//  Rieseguibile: salta le ricette già presenti (stesso nome nella stessa sezione).
//  Aggiungi --dry per vedere cosa farebbe senza scrivere nulla.
// ═══════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
for (const f of ['.env.local', '.env']) {
  const p = path.join(root, f)
  if (!fs.existsSync(p)) continue
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const DRY = process.argv.includes('--dry')
const argIdx = process.argv.indexOf('--ricettario')
const BOOK_NAME = (argIdx > -1 && process.argv[argIdx + 1]) || 'Michele Di Leva'
const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!NEW_URL || !SERVICE) {
  console.error('✗ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' }

async function rest(method, table, { query = '', body, prefer } = {}) {
  const res = await fetch(`${NEW_URL}/rest/v1/${table}${query}`, {
    method, headers: { ...H, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined,
  })
  const txt = await res.text()
  if (!res.ok) throw new Error(`${method} ${table}: ${res.status} ${txt}`)
  return txt ? JSON.parse(txt) : null
}

const LEGACY_SECTIONS = {
  colazioni: 'Colazioni', 'fine-dining': 'Fine Dining', gelateria: 'Gelateria', torte: 'Torte & Pasticceria',
}
const norm = (s) => String(s || '').trim().toLowerCase()

function splitSteps(p) {
  if (!p || !String(p).trim()) return []
  let parts = String(p).split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length === 1 && parts[0].length > 220) {
    parts = parts[0].split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/).map((s) => s.trim()).filter(Boolean)
  }
  return parts
}

function fromLegacy(r) {
  return {
    section: LEGACY_SECTIONS[r.s] ? r.s : 'colazioni',
    name: String(r.n || '').trim(),
    category: r.c || 'Altro',
    dish_group: r.piatto && String(r.piatto).trim() ? String(r.piatto).trim() : null,
    ingredients: (Array.isArray(r.i) ? r.i : [])
      .filter((x) => Array.isArray(x) && String(x[0] || '').trim() && !/^\(nessun ingrediente\)$/.test(x[0]))
      .map((x) => ({
        name: String(x[0]).trim(),
        quantity: x[1] === null || x[1] === undefined || x[1] === '' || isNaN(Number(x[1])) ? null : Number(x[1]),
        unit: String(x[2] || (x[1] == null ? 'q.b.' : 'g')).trim(),
      })),
    steps: splitSteps(r.p),
  }
}

async function main() {
  // 1. ricette built-in
  const builtin = JSON.parse(fs.readFileSync(path.join(root, 'data/legacy-builtin.json'), 'utf8'))
  const byName = new Map()
  for (const r of builtin) byName.set(norm(r.n), fromLegacy(r))
  console.log(`• ${builtin.length} ricette dal vecchio HTML`)

  // 2. ricette dal vecchio Supabase (sovrascrivono le built-in con lo stesso nome)
  if (process.env.OLD_SUPABASE_URL && process.env.OLD_SUPABASE_ANON_KEY) {
    const k = process.env.OLD_SUPABASE_ANON_KEY
    const res = await fetch(`${process.env.OLD_SUPABASE_URL}/rest/v1/ricette?select=id,data&order=id.asc`, {
      headers: { apikey: k, Authorization: `Bearer ${k}` },
    })
    if (!res.ok) {
      console.warn(`! Vecchio Supabase non raggiungibile (${res.status}). Se è in pausa, riattivalo dalla dashboard e rilancia.`)
    } else {
      const rows = await res.json()
      let n = 0
      for (const row of rows) {
        const r = row.data
        if (!r?.n) continue
        byName.set(norm(r.n), fromLegacy(r)); n++
      }
      console.log(`• ${n} ricette dal vecchio Supabase`)
    }
  } else {
    console.log('• OLD_SUPABASE_URL non impostato: importo solo le ricette del vecchio HTML')
  }

  // 3. ricettario e sezioni di destinazione
  let book = (await rest('GET', 'books', { query: `?select=id,name&name=eq.${encodeURIComponent(BOOK_NAME)}` }))[0]
  if (!book && !DRY) {
    const all = await rest('GET', 'books', { query: '?select=id' })
    book = (await rest('POST', 'books', { body: { name: BOOK_NAME, color: '#7A4214', position: all.length }, prefer: 'return=representation' }))[0]
    console.log(`• creato il ricettario «${BOOK_NAME}»`)
  }
  const sectionId = {}
  if (book) {
    const secs = await rest('GET', 'sections', { query: `?select=id,name&book_id=eq.${book.id}` })
    let pos = secs.length
    for (const [key, name] of Object.entries(LEGACY_SECTIONS)) {
      let sec = secs.find((x) => norm(x.name) === norm(name))
      if (!sec && !DRY) sec = (await rest('POST', 'sections', { body: { book_id: book.id, name, position: pos++ }, prefer: 'return=representation' }))[0]
      if (sec) sectionId[key] = sec.id
    }
  }

  // 4. salta quelle già presenti
  const existing = book ? await rest('GET', 'recipes', { query: `?select=name,section_id&section_id=in.(${Object.values(sectionId).join(',') || '00000000-0000-0000-0000-000000000000'})` }) : []
  const have = new Set(existing.map((r) => `${norm(r.name)}|${r.section_id}`))
  const todo = [...byName.values()].filter((r) => r.name && !have.has(`${norm(r.name)}|${sectionId[r.section]}`))
  console.log(`• destinazione: «${BOOK_NAME}» · ${have.size} già presenti · ${todo.length} da importare${DRY ? ' (prova, nessuna scrittura)' : ''}`)
  if (DRY || !todo.length) return

  // 5. inserimento a blocchi
  let done = 0
  for (let i = 0; i < todo.length; i += 50) {
    const chunk = todo.slice(i, i + 50)
    const inserted = await rest('POST', 'recipes', {
      body: chunk.map((r) => ({ section_id: sectionId[r.section], name: r.name, category: r.category, dish_group: r.dish_group, source: 'legacy' })),
      prefer: 'return=representation',
    })
    const ings = [], steps = []
    inserted.forEach((row, k) => {
      chunk[k].ingredients.forEach((x, p) => ings.push({ recipe_id: row.id, position: p, ...x }))
      chunk[k].steps.forEach((body, p) => steps.push({ recipe_id: row.id, position: p, body }))
    })
    if (ings.length) await rest('POST', 'recipe_ingredients', { body: ings, prefer: 'return=minimal' })
    if (steps.length) await rest('POST', 'recipe_steps', { body: steps, prefer: 'return=minimal' })
    done += chunk.length
    console.log(`  ${done}/${todo.length}`)
  }
  console.log('✓ Migrazione completata')
}

main().catch((e) => { console.error('✗', e.message); process.exit(1) })
