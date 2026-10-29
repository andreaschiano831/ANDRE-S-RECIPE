import { notFound } from 'next/navigation'
import KitchenApp, { type KPRecipe } from '@/components/kitchen/KitchenApp'
import { getSession } from '@/lib/supabase/server'
import { loadKitchen } from '@/lib/kitchens'

export const dynamic = 'force-dynamic'

export default async function KitchenAppPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ s?: string }> }) {
  const [{ id }, { s: sec }] = await Promise.all([params, searchParams])
  const s = (await getSession())!
  const k = await loadKitchen(s.supabase, id, s.user.id)
  if (!k) notFound()

  const [{ data: state }, { data: kb }] = await Promise.all([
    s.supabase.from('kitchen_state').select('data, version').eq('kitchen_id', id).maybeSingle(),
    s.supabase.from('kitchen_books').select('book_id').eq('kitchen_id', id),
  ])
  const bookIds = (kb ?? []).map((b) => b.book_id)
  // ricettari collegati alla cucina; se nessuno è collegato, tutti quelli visibili
  const { data: secs } = bookIds.length
    ? await s.supabase.from('sections').select('id, name').in('book_id', bookIds)
    : await s.supabase.from('sections').select('id, name')
  const secName = new Map((secs ?? []).map((x) => [x.id, x.name as string]))
  let recipes: KPRecipe[] = []
  if (secName.size) {
    const { data: rs } = await s.supabase.from('recipes')
      .select('id, name, section_id, recipe_ingredients(name, quantity, unit, position)')
      .in('section_id', Array.from(secName.keys())).order('name')
    recipes = (rs ?? []).map((r: any) => ({
      id: r.id, name: r.name, section: secName.get(r.section_id) ?? '',
      ingredients: (r.recipe_ingredients ?? []).sort((a: any, b: any) => a.position - b.position)
        .map((i: any) => ({ name: i.name, quantity: i.quantity == null ? null : Number(i.quantity), unit: i.unit })),
    }))
  }

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
