import type { SupabaseClient } from '@supabase/supabase-js'

export const KITCHEN_ROLES = [
  { id: 'admin', label: 'Admin' }, { id: 'chef', label: 'Chef' }, { id: 'sous-chef', label: 'Sous-chef' },
  { id: 'capo-partita', label: 'Capo partita' }, { id: 'commis', label: 'Commis' }, { id: 'stagista', label: 'Stagista' },
  { id: 'staff', label: 'Staff' }, { id: 'fb', label: 'F&B' }, { id: 'mm', label: 'Manutenzione' },
]
export const MANAGER_ROLES = ['admin', 'chef', 'sous-chef']

/** Cucina + brigata con i nomi; null se l'utente non ne fa parte */
export async function loadKitchen(supabase: SupabaseClient, id: string, userId: string) {
  const [{ data: kitchen }, { data: km }] = await Promise.all([
    supabase.from('kitchens').select('id, name, code').eq('id', id).maybeSingle(),
    supabase.from('kitchen_members').select('user_id, role, joined_at').eq('kitchen_id', id).order('joined_at'),
  ])
  if (!kitchen) return null
  const ids = (km ?? []).map((m) => m.user_id)
  const { data: profiles } = ids.length ? await supabase.from('profiles').select('id, full_name').in('id', ids) : { data: [] }
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string]))
  const members = (km ?? []).map((m) => ({ id: m.user_id as string, name: nameOf.get(m.user_id) || 'Utente', role: m.role as string }))
  const myRole = members.find((m) => m.id === userId)?.role ?? null
  return { kitchen, members, myRole, canManage: !!myRole && MANAGER_ROLES.includes(myRole) }
}
