import { supabaseKey, supabaseUrl } from '@/lib/env'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

/** Utente corrente + ruolo. Restituisce null se non loggato. */
export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()
  const role = (profile?.role ?? 'staff') as 'admin' | 'chef' | 'staff'
  return {
    supabase,
    user,
    name: profile?.full_name ?? user.email ?? '',
    role,
    canEdit: role === 'admin' || role === 'chef',
    isAdmin: role === 'admin',
  }
}
