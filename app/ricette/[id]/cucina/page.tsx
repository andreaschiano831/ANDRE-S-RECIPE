import { notFound } from 'next/navigation'
import CookMode from '@/components/CookMode'
import { getSession } from '@/lib/supabase/server'
import { RECIPE_SELECT, sortParts, type Recipe } from '@/lib/recipes'

export const dynamic = 'force-dynamic'

export default async function CookPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ dose?: string }>
}) {
  const [{ id }, { dose }] = await Promise.all([params, searchParams])
  const s = (await getSession())!
  const { data } = await s.supabase.from('recipes').select(RECIPE_SELECT).eq('id', id).maybeSingle()
  if (!data) notFound()
  return <CookMode recipe={sortParts(data as unknown as Recipe)} initialDose={Math.max(0.25, parseFloat(dose ?? '1') || 1)} />
}
