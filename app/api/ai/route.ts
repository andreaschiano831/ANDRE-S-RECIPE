import { NextResponse } from 'next/server'
import { getSession } from '@/lib/supabase/server'

// Endpoint AI usato dai pannelli di Kitchen Pro (stesso formato della vecchia /api/ai,
// ora protetto dal login e con supporto alle immagini tramite il modello vision di Groq).
export const runtime = 'nodejs'
export const maxDuration = 60

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'

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
  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'GROQ_API_KEY mancante su Vercel' }, { status: 500 })

  let body: { system?: string; messages?: { content: string | Part[] }[]; max_tokens?: number }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 }) }

  const content = body.messages?.[0]?.content
  const parts: Part[] = Array.isArray(content) ? content : [{ type: 'text', text: String(content ?? '') }]
  const texts = parts.filter((p) => p.type === 'text').map((p) => p.text ?? '')
  const images = parts
    .filter((p) => p.type === 'image' && p.source?.data && /^image\/(jpeg|png|webp|gif)$/.test(p.source.media_type ?? ''))
    .slice(0, 5)
  if (parts.some((p) => p.type === 'document')) texts.push('(Nota: i PDF non sono leggibili direttamente; usa una foto o il testo.)')

  const userText = texts.join('\n') || 'Analizza e rispondi.'
  const messages: unknown[] = []
  if (body.system) messages.push({ role: 'system', content: body.system })
  messages.push(images.length
    ? { role: 'user', content: [
        { type: 'text', text: userText },
        ...images.map((p) => ({ type: 'image_url', image_url: { url: `data:${p.source!.media_type};base64,${p.source!.data}` } })),
      ] }
    : { role: 'user', content: userText })

  const upstream = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: images.length ? VISION_MODEL : TEXT_MODEL,
      messages,
      max_completion_tokens: Math.min(body.max_tokens || 1024, 8192),
      temperature: 0.1,
    }),
  })
  const data = await upstream.json().catch(() => null)
  if (!upstream.ok || data?.error) {
    return NextResponse.json({ error: { message: data?.error?.message || `Groq ${upstream.status}` } }, { status: upstream.status === 429 ? 429 : 502 })
  }
  let text: string = data?.choices?.[0]?.message?.content || ''
  if (!text) return NextResponse.json({ error: { message: 'Risposta vuota' } }, { status: 502 })
  if (text.includes('{')) text = extractJSON(text)
  return NextResponse.json({ content: [{ type: 'text', text }], role: 'assistant' })
}
