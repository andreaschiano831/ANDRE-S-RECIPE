import { NextResponse } from 'next/server'
import { getSession } from '@/lib/supabase/server'
import { CATEGORIES } from '@/lib/recipes'

export const runtime = 'nodejs'
export const maxDuration = 60

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct'
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL || 'llama-3.3-70b-versatile'

function prompt(sections: string[]) {
  return `Sei l'assistente di un pastry chef stellato. Estrai TUTTE le ricette presenti nel materiale e restituisci SOLO un oggetto JSON, senza testo fuori dal JSON, in questo formato:
{"recipes":[{"name":"","section":"","category":"","dish_group":"","yield_note":"","ingredients":[{"name":"","quantity":0,"unit":"g","note":""}],"steps":[{"body":"","duration_min":null,"temperature":""}],"notes":""}]}
REGOLE:
1. Ogni preparazione con un proprio titolo (es. "Massa macaron", "Cremoso pesca", "Glassa") è una ricetta SEPARATA nell'array. Se fanno parte dello stesso dolce, metti il nome del dolce in "dish_group".
2. Leggi ogni riga: non saltare ingredienti. "quantity" è un numero (usa il punto come decimale) oppure null se q.b.
3. Unità ammesse: g, kg, ml, l, cl, n°, q.b., foglio, bacca, %. Converti "gr" in "g", uova/tuorli contati in "n°". Se le quantità sono in once/cup convertile in g/ml.
4. Traduci tutto in italiano professionale di pasticceria.
5. "steps": dividi il procedimento in passaggi brevi e ordinati, uno per azione. Se un passaggio indica un tempo, metti i minuti in "duration_min" (numero intero); se indica una temperatura di forno/abbattitore/cottura scrivila in "temperature" (es. "170°C ventilato", "82°C").
6. "section" deve essere ESATTAMENTE uno di questi nomi: ${sections.map((x) => `"${x}"`).join(', ')}. Scegli il più adatto.
7. "category" deve essere una di: ${CATEGORIES.join(', ')}.
8. "yield_note" è la resa se indicata (es. "per 60 pezzi", "stampo 20 cm"), altrimenti "".
9. Non inventare ingredienti o quantità che non vedi.`
}

function extractJson(text: string): any {
  const clean = text.replace(/```json|```/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const obj = clean.match(/\{[\s\S]*\}/)
  if (obj) { try { return JSON.parse(obj[0]) } catch {} }
  const arr = clean.match(/\[[\s\S]*\]/)
  if (arr) { try { return { recipes: JSON.parse(arr[0]) } } catch {} }
  return null
}

export async function POST(req: Request) {
  const s = await getSession()
  if (!s) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  if (!s.canEdit) return NextResponse.json({ error: 'Serve il ruolo chef o admin' }, { status: 403 })

  const key = process.env.GROQ_API_KEY
  if (!key) return NextResponse.json({ error: 'GROQ_API_KEY non configurata su Vercel' }, { status: 500 })

  let body: { image?: string; text?: string; book_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 }) }

  const { data: secs } = await s.supabase.from('sections').select('id, name').eq('book_id', body.book_id ?? '')
  if (!secs?.length) return NextResponse.json({ error: 'Il ricettario scelto non ha sezioni' }, { status: 400 })
  const sys = prompt(secs.map((x) => x.name))
  const findSection = (name: unknown) => {
    const n = String(name ?? '').trim().toLowerCase()
    return (secs.find((x) => x.name.toLowerCase() === n) ?? secs.find((x) => n && (x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase()))) ?? secs[0]).id
  }

  let payload: any
  if (body.image) {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(body.image)) {
      return NextResponse.json({ error: 'Formato immagine non supportato' }, { status: 400 })
    }
    payload = {
      model: VISION_MODEL,
      temperature: 0.05,
      max_completion_tokens: 4096,
      messages: [{ role: 'user', content: [
        { type: 'text', text: sys },
        { type: 'image_url', image_url: { url: body.image } },
      ] }],
    }
  } else if (body.text?.trim()) {
    payload = {
      model: TEXT_MODEL,
      temperature: 0.05,
      max_completion_tokens: 6000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: body.text.slice(0, 24000) },
      ],
    }
  } else {
    return NextResponse.json({ error: 'Nessun contenuto da analizzare' }, { status: 400 })
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.error?.message || `Errore Groq ${res.status}`
    const friendly = res.status === 429 ? 'Troppe richieste a Groq: attendi 30 secondi e riprova.'
      : res.status === 401 ? 'Chiave Groq non valida.' : msg
    return NextResponse.json({ error: friendly }, { status: 502 })
  }

  const parsed = extractJson(data?.choices?.[0]?.message?.content ?? '')
  const raw = Array.isArray(parsed?.recipes) ? parsed.recipes : Array.isArray(parsed) ? parsed : parsed?.name ? [parsed] : []
  const recipes = raw.map((r: any) => ({ ...r, section_id: findSection(r?.section) }))
  return NextResponse.json({ recipes })
}
