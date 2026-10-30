import { supabaseKey, supabaseUrl } from '@/lib/env'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    supabaseUrl(),
    supabaseKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // chiamato da un Server Component: il refresh lo fa proxy.ts
          }
        },
      },
    },
  )
}

/** Utente corrente + ruolo. Restituisce null se non loggato.
 *  Una sola volta per richiesta (layout e pagina la condividono) e con verifica locale del token quando possibile. */
export const getSession = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null
  const user = { id: claims.sub as string, email: (claims.email as string) ?? '' }
  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
  const role = (profile?.role ?? 'staff') as 'admin' | 'chef' | 'staff'
  return {
    supabase,
    user,
    name: profile?.full_name ?? user.email ?? '',
    role,
    canEdit: role === 'admin' || role === 'chef',
    isAdmin: role === 'admin',
  }
})

/** cucine dell'utente (condiviso tra layout e pagine nella stessa richiesta) */
export const getMyKitchens = cache(async () => {
  const s = await getSession()
  if (!s) return [] as { id: string; name: string }[]
  const { data } = await s.supabase.from('kitchen_members').select('kitchen_id, joined_at, kitchens(id, name, created_at)').eq('user_id', s.user.id)
  return (data ?? []).map((r: any) => r.kitchens).filter(Boolean)
    .sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((k: any) => ({ id: k.id as string, name: k.name as string }))
})

export const getAppSettings = cache(async () => {
  const s = await getSession()
  if (!s) return null
  const { data } = await s.supabase.from('app_settings').select('name, tagline').eq('id', 1).maybeSingle()
  return data
})
