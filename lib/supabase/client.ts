import { cleanSupabaseUrl } from '@/lib/env'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
  )
}
