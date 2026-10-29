// Chiamate a Groq con modelli di riserva: se Groq ritira un modello, si passa al successivo.
// Si possono forzare da Vercel con GROQ_VISION_MODEL / GROQ_TEXT_MODEL.
const GROQ_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions'

const VISION = [process.env.GROQ_VISION_MODEL, 'qwen/qwen3.8-27b', 'meta-models/muse-spark-open', 'meta-llama/llama-4-scout-17b-16e-instruct'].filter(Boolean) as string[]
const TEXT = [process.env.GROQ_TEXT_MODEL, 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'].filter(Boolean) as string[]

export class GroqError extends Error { status: number; constructor(msg: string, status = 502) { super(msg); this.status = status } }

const gone = (msg: string) => /does not exist|decommissioned|deprecated|not found|do not have access|model_not_found|not supported/i.test(msg)
// i modelli che "ragionano" possono mettere il ragionamento nel testo: lo togliamo
const clean = (t: string) => t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

/** chiamata chat; images = data URL (max 3) */
export async function groqChat(opts: { system?: string; user: string; images?: string[]; json?: boolean; maxTokens?: number }): Promise<string> {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new GroqError('GROQ_API_KEY non configurata su Vercel', 500)
  const images = (opts.images || []).slice(0, 3)
  const models = [...new Set(images.length ? VISION : TEXT)]
  let last = ''
  for (const model of models) {
    const content = images.length
      ? [{ type: 'text', text: opts.user }, ...images.map((url) => ({ type: 'image_url', image_url: { url } }))]
      : opts.user
    const body: Record<string, unknown> = {
      model, temperature: 0.1, max_completion_tokens: opts.maxTokens ?? 8000,
      messages: [...(opts.system ? [{ role: 'system', content: opts.system }] : []), { role: 'user', content }],
    }
    if (opts.json) body.response_format = { type: 'json_object' }
    const res = await fetch(GROQ_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.choices?.[0]?.message?.content) return clean(data.choices[0].message.content)
    const msg: string = data?.error?.message || `Errore Groq ${res.status}`
    if (res.status === 401) throw new GroqError('Chiave Groq non valida: controlla GROQ_API_KEY su Vercel', 401)
    if (res.status === 429) throw new GroqError('Troppe richieste all’AI: attendi 30 secondi e riprova.', 429)
    last = msg
    // modello ritirato o non disponibile: provo il prossimo. JSON non riuscito: riprovo senza vincolo.
    if (gone(msg) || res.status === 404) continue
    if (opts.json && /json/i.test(msg)) { opts = { ...opts, json: false }; continue }
    throw new GroqError(msg)
  }
  throw new GroqError(`Nessun modello AI disponibile su Groq (${last})`)
}
