import { NextResponse } from 'next/server'
import { getSession } from '@/lib/supabase/server'
import { AIError, extractRecipes } from '@/lib/import-ai'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!s.canEdit) return NextResponse.json({ error: 'Serve il ruolo chef o admin' }, { status: 403 })

  let body: { image?: string; text?: string; book_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 }) }

  const { data: secs } = await s.supabase.from('sections').select('id, name').eq('book_id', body.book_id ?? '')
  if (!secs?.length) return NextResponse.json({ error: 'Il ricettario scelto non ha sezioni' }, { status: 400 })
  const findSection = (name: unknown) => {
    const n = String(name ?? '').trim().toLowerCase()
    return (secs.find((x) => x.name.toLowerCase() === n) ?? secs.find((x) => n && (x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase()))) ?? secs[0]).id
  }

  if (body.image && !/^data:image\/(jpeg|png|webp);base64,/.test(body.image)) {
    return NextResponse.json({ error: 'Formato immagine non supportato' }, { status: 400 })
  }
  if (!body.image && !body.text?.trim()) return NextResponse.json({ error: 'Nessun contenuto da analizzare' }, { status: 400 })

  try {
    const raw = await extractRecipes({ image: body.image, text: body.text, sections: secs.map((x) => x.name) })
    const recipes = raw.map((r: any) => ({ ...r, section_hint: r?.section ?? '', section_id: findSection(r?.section) }))
    return NextResponse.json({ recipes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e instanceof AIError ? e.status : 500 })
  }
}
