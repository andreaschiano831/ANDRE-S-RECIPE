import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppSettings, Book, Section } from './recipes'

/** Nome app, ricettari e sezioni: servono quasi ovunque */
export async function loadCatalog(supabase: SupabaseClient) {
  const [{ data: settings }, { data: books }, { data: sections }] = await Promise.all([
    supabase.from('app_settings').select('name, tagline').eq('id', 1).maybeSingle(),
    supabase.from('books').select('*').order('position').order('created_at'),
    supabase.from('sections').select('*').order('position').order('name'),
  ])
  const b = (books ?? []) as Book[]
  const order = new Map(b.map((x, i) => [x.id, i]))
  const s = ((sections ?? []) as Section[]).sort(
    (x, y) => (order.get(x.book_id) ?? 0) - (order.get(y.book_id) ?? 0) || x.position - y.position,
  )
  return {
    settings: (settings ?? { name: 'Ricettario', tagline: 'Ricette professionali' }) as AppSettings,
    books: b,
    sections: s,
  }
}
