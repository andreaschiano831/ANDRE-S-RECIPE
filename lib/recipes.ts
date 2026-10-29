export type Ingredient = {
  name: string
  quantity: number | null
  unit: string
  note?: string | null
}

export type Step = {
  body: string
  duration_min?: number | null
  temperature?: string | null
}

export type Book = { id: string; name: string; subtitle: string | null; color: string; position: number }
export type Section = { id: string; book_id: string; name: string; subtitle: string | null; position: number }
export type AppSettings = { name: string; tagline: string }

/** Etichetta "Ricettario › Sezione" */
export function sectionLabel(sectionId: string, sections: Section[], books: Book[]) {
  const sec = sections.find((s) => s.id === sectionId)
  if (!sec) return ''
  const book = books.find((b) => b.id === sec.book_id)
  return books.length > 1 && book ? `${book.name} › ${sec.name}` : sec.name
}

export type Recipe = {
  id: string
  section_id: string
  name: string
  category: string
  dish_group: string | null
  yield_note: string | null
  notes: string | null
  source: string
  created_at: string
  updated_at: string
  recipe_ingredients: (Ingredient & { position: number })[]
  recipe_steps: (Step & { position: number })[]
}

/** Bozza modificabile nell'editor (manuale o da import AI) */
export type RecipeDraft = {
  id?: string
  section_id: string
  name: string
  category: string
  dish_group: string
  yield_note: string
  notes: string
  source?: 'manual' | 'ai_image' | 'ai_text' | 'legacy'
  ingredients: { name: string; quantity: string; unit: string; note: string }[]
  steps: { body: string; duration_min: string; temperature: string }[]
}

export const CATEGORIES = [
  'Basi', 'Creme', 'Paste', 'Lievitati', 'Torte', 'Pasticcini', 'Biscotti',
  'Ganache', 'Mousse', 'Gelatine', 'Glasse', 'Marmellate',
  'Gelati', 'Sorbetti', 'Semifreddi', 'Granite', 'Altro',
]

export const UNITS = ['g', 'kg', 'ml', 'l', 'cl', 'n°', 'q.b.', 'foglio', 'bacca', 'bastoncino', 'cucchiaio', 'cucchiaino', '%']

export const RECIPE_SELECT =
  'id, section_id, name, category, dish_group, yield_note, notes, source, created_at, updated_at, ' +
  'recipe_ingredients(name, quantity, unit, note, position), ' +
  'recipe_steps(body, duration_min, temperature, position)'

export function sortParts<T extends Recipe>(r: T): T {
  r.recipe_ingredients?.sort((a, b) => a.position - b.position)
  r.recipe_steps?.sort((a, b) => a.position - b.position)
  return r
}

export function emptyDraft(section_id = ''): RecipeDraft {
  return {
    section_id, name: '', category: 'Altro', dish_group: '', yield_note: '', notes: '',
    source: 'manual',
    ingredients: [{ name: '', quantity: '', unit: 'g', note: '' }],
    steps: [{ body: '', duration_min: '', temperature: '' }],
  }
}

export function recipeToDraft(r: Recipe): RecipeDraft {
  return {
    id: r.id,
    section_id: r.section_id,
    name: r.name,
    category: r.category,
    dish_group: r.dish_group ?? '',
    yield_note: r.yield_note ?? '',
    notes: r.notes ?? '',
    source: r.source as RecipeDraft['source'],
    ingredients: r.recipe_ingredients.map((i) => ({
      name: i.name, quantity: i.quantity == null ? '' : String(i.quantity), unit: i.unit, note: i.note ?? '',
    })),
    steps: r.recipe_steps.map((s) => ({
      body: s.body, duration_min: s.duration_min == null ? '' : String(s.duration_min), temperature: s.temperature ?? '',
    })),
  }
}

export function draftToPayload(d: RecipeDraft) {
  const num = (v: string) => {
    const n = parseFloat(String(v).replace(',', '.'))
    return isNaN(n) ? null : n
  }
  return {
    id: d.id ?? null,
    section_id: d.section_id,
    name: d.name.trim(),
    category: d.category,
    dish_group: d.dish_group,
    yield_note: d.yield_note,
    notes: d.notes,
    source: d.source ?? 'manual',
    ingredients: d.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), quantity: num(i.quantity), unit: i.unit.trim() || 'g', note: i.note })),
    steps: d.steps
      .filter((s) => s.body.trim())
      .map((s) => ({ body: s.body.trim(), duration_min: num(s.duration_min), temperature: s.temperature })),
  }
}

/** Quantità scalata per la dose, formattata all'italiana */
export function scaleQty(q: number | null, dose: number): string {
  if (q == null) return ''
  const v = Math.round(q * dose * 100) / 100
  return v.toLocaleString('it-IT', { maximumFractionDigits: 2 })
}

export function fmtDose(d: number) {
  return d.toLocaleString('it-IT', { maximumFractionDigits: 2 })
}

export function totalWeight(ings: Ingredient[], dose = 1): number | null {
  let tot = 0
  let any = false
  for (const i of ings) {
    if (i.quantity == null) continue
    const u = i.unit.toLowerCase()
    if (u === 'g' || u === 'ml') { tot += i.quantity; any = true }
    else if (u === 'kg' || u === 'l') { tot += i.quantity * 1000; any = true }
  }
  return any ? Math.round(tot * dose) : null
}
