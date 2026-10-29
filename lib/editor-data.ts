import type { SupabaseClient } from '@supabase/supabase-js'
import { loadCatalog } from './catalog'

/** Dati di supporto per l'editor: ricettari/sezioni, gruppi esistenti, nomi ingredienti */
export async function loadEditorData(supabase: SupabaseClient) {
  const [{ books, sections }, { data: groups }, { data: ings }] = await Promise.all([
    loadCatalog(supabase),
    supabase.from('recipes').select('dish_group').not('dish_group', 'is', null),
    supabase.from('recipe_ingredients').select('name').limit(5000),
  ])
  const uniq = (xs: (string | null)[]) =>
    Array.from(new Set(xs.filter(Boolean).map((x) => x!.trim()))).sort((a, b) => a.localeCompare(b, 'it'))
  return {
    books,
    sections,
    groups: uniq((groups ?? []).map((g) => g.dish_group)),
    ingredientNames: uniq((ings ?? []).map((i) => i.name)),
  }
}
