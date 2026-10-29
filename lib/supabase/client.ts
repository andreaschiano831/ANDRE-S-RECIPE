import { createBrowserClient } from '@supabase/ssr'
import { cleanSupabaseUrl } from '@/lib/env'

export function createClient() {
  const injected = typeof window !== 'undefined' ? (window as any).__SB : null
  return createBrowserClient(
    cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || injected?.url),
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || injected?.key || '').trim(),
  )
}
