import { NextResponse } from 'next/server'
import { getSession } from '@/lib/supabase/server'
import { groqChat, GroqError } from '@/lib/groq'

// Endpoint AI usato dai pannelli di Kitchen Pro (stesso formato della vecchia /api/ai,
// ora protetto dal login e con supporto alle immagini tramite il modello vision di Groq).
export const runtime = 'nodejs'
export const maxDuration = 60


type Part = { type: string; text?: string; source?: { type?: string; media_type?: string; data?: string } }

function extractJSON(text: string) {
  const start = text.indexOf('{')
  if (start === -1) return text
  let depth = 0
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++
    else if (text[i] === '}') { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  return text.slice(start)
}

export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  let body: { system?: string; messages?: { content: string | Part[] }[]; max_tokens?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 }) }

  const content = body.messages?.[0]?.content
  const parts: Part[] = Array.isArray(content) ? content : [{ type: 'text', text: String(content ?? '') }]
  const texts = parts.filter((p) => p.type === 'text').map((p) => p.text ?? '')
  const images = parts
    .filter((p) => p.type === 'image' && p.source?.data && /^image\/(jpeg|png|webp|gif)$/.test(p.source.media_type ?? ''))
    .slice(0, 3)
  if (parts.some((p) => p.type === 'document')) texts.push('(Nota: i PDF non sono leggibili direttamente; usa una foto o il testo.)')

  const userText = texts.join('\n') || 'Analizza e rispondi.'
  try {
    let text = await groqChat({
      system: body.system, user: userText, maxTokens: Math.min(Math.max(body.max_tokens || 1024, 4000), 8192),
      images: images.map((p) => `data:${p.source!.media_type};base64,${p.source!.data}`),
    })
    if (text.includes('{')) text = extractJSON(text)
    return NextResponse.json({ content: [{ type: 'text', text }], role: 'assistant' })
  } catch (e: any) {
    return NextResponse.json({ error: { message: e.message } }, { status: e instanceof GroqError ? (e.status === 429 ? 429 : e.status === 500 ? 500 : 502) : 502 })
  }
}
