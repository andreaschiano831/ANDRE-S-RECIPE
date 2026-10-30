import { notFound } from 'next/navigation'
import KitchenApp, { type KPRecipe } from '@/components/kitchen/KitchenApp'
import { getSession } from '@/lib/supabase/server'
import { loadKitchen } from '@/lib/kitchens'

export const dynamic = 'force-dynamic'

export default async function KitchenAppPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ id }, { s: sec }] = await Promise.all([params, searchParams])
  const s = (await getSession())!
  // tutto in parallelo: cucina e brigata, stato condiviso, ricettari collegati, ricette
  const [k, { data: state }, { data: kb }, { data: rs }] = await Promise.all([
    loadKitchen(s.supabase, id, s.user.id),
    s.supabase.from('kitchen_state').select('data, version').eq('kitchen_id', id).maybeSingle(),
    s.supabase.from('kitchen_books').select('book_id').eq('kitchen_id', id),
    s.supabase.from('recipes').select('id, name, section_id, sections!inner(name, book_id), recipe_ingredients(name, quantity, unit, position)').order('name'),
  ])
  if (!k) notFound()
  // ricettari collegati alla cucina; se nessuno è collegato, tutti quelli visibili
  const bookIds = new Set((kb ?? []).map((b) => b.book_id))
  const recipes: KPRecipe[] = (rs ?? [])
    .filter((r: any) => !bookIds.size || bookIds.has(r.sections?.book_id))
    .map((r: any) => ({
      id: r.id, name: r.name, section: r.sections?.name ?? '',
      ingredients: (r.recipe_ingredients ?? []).sort((a: any, b: any) => a.position - b.position)
        .map((i: any) => ({ name: i.name, quantity: i.quantity == null ? null : Number(i.quantity), unit: i.unit })),
    }))

  return (
    <KitchenApp
      kitchen={k.kitchen}
      userId={s.user.id}
      members={k.members}
      initialData={(state?.data as Record<string, unknown>) ?? null}
      initialVersion={Number(state?.version ?? 0)}
      recipes={recipes}
      canManage={k.canManage}
      section={sec ?? 'dashboard'}
    />
  )
}
