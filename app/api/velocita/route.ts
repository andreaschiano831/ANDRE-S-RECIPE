import { NextResponse } from 'next/server'
import { getSession } from '@/lib/supabase/server'

// Diagnostica: dove gira il server e quanto ci mette a parlare col database
export const dynamic = 'force-dynamic'

export async function GET() {
  const t0 = Date.now()
  const s = await getSession()
  const auth = Date.now() - t0
  if (!s) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  const times: number[] = []
  for (let i = 0; i < 3; i++) {
    const t = Date.now()
    await s.supabase.from('app_settings').select('name').eq('id', 1).maybeSingle()
    times.push(Date.now() - t)
  }
  const db = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  return NextResponse.json({
    server: process.env.VERCEL_REGION || 'sconosciuto',
    database_ms: db,
    login_ms: auth,
    giudizio: db < 40 ? 'ottimo: server e database sono vicini' : db < 100 ? 'discreto' : 'lento: server e database sono lontani, scegli su Vercel la regione del tuo progetto Supabase',
  })
}
