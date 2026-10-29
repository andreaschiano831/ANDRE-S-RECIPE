/** Accetta anche l'indirizzo copiato con /rest/v1/ o con lo slash finale */
export function cleanSupabaseUrl(raw: string | undefined) {
  return (raw ?? '').trim().replace(/\/(rest|auth)\/v1\/?.*$/i, '').replace(/\/+$/, '')
}

// Lettura a runtime (non inlined al build): funziona anche se la variabile è stata
// aggiunta su Vercel dopo l'ultimo deploy. Accetta anche i nomi dell'integrazione Supabase.
const env = (name: string): string => {
  const e = (globalThis as any).process?.env ?? {}
  return (e[name] ?? '').toString()
}
const firstOf = (...names: string[]) => names.map(env).find((v) => v.trim()) ?? ''

export function supabaseUrl() {
  return cleanSupabaseUrl(
    process.env.NEXT_PUBLIC_SUPABASE_URL || firstOf('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PROJECT_URL'),
  )
}
export function supabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    firstOf('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY')
  ).trim()
}

/** Nomi (non valori) delle variabili rilevanti presenti sul server, per la diagnosi */
export function visibleEnvNames(): string[] {
  const e = (globalThis as any).process?.env ?? {}
  return Object.keys(e).filter((k) => /SUPA|GROQ/i.test(k)).sort()
}

export function supabaseEnvProblem(): string | null {
  const url = supabaseUrl()
  const key = supabaseKey()
  if (!url) return 'Manca la variabile NEXT_PUBLIC_SUPABASE_URL su Vercel.'
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))
    return `NEXT_PUBLIC_SUPABASE_URL non è nel formato giusto. Deve essere tipo https://abcdefgh.supabase.co (adesso inizia con "${url.slice(0, 30)}").`
  if (!key) return 'Manca la variabile NEXT_PUBLIC_SUPABASE_ANON_KEY su Vercel.'
  if (!/^(eyJ|sb_publishable_)/.test(key))
    return `NEXT_PUBLIC_SUPABASE_ANON_KEY non sembra la chiave giusta: deve iniziare con "eyJ" (anon) o "sb_publishable_" (adesso inizia con "${key.slice(0, 8)}").`
  return null
}

export function configErrorPage(msg: string, detail = '') {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
  const names = visibleEnvNames()
  const seen = names.length
    ? `Variabili che l’app vede adesso: <b>${names.map(esc).join(', ')}</b>`
    : 'L’app non vede <b>nessuna</b> variabile con SUPABASE o GROQ nel nome.'
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurazione</title></head>
<body style="font-family:Georgia,serif;background:#F5EFE0;color:#1A1410;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:20px">
<div style="background:#fff;border-radius:16px;padding:28px;max-width:600px;box-shadow:0 8px 30px rgba(0,0,0,.08)">
<h1 style="font-style:italic;font-weight:400;margin:0 0 12px">L’app non riesce a collegarsi a Supabase</h1>
<p style="font-size:17px;line-height:1.5"><b>${esc(msg)}</b></p>
${detail ? `<pre style="white-space:pre-wrap;background:#f4f1ea;padding:10px;border-radius:8px;font-size:12px">${esc(detail)}</pre>` : ''}
<p style="font-size:14px;line-height:1.5;background:#f4f1ea;padding:10px;border-radius:8px">${seen}<br><small>Ambiente Vercel: ${esc(env('VERCEL_ENV') || 'sconosciuto')}</small></p>
<p style="color:#6E6050;font-size:14px;line-height:1.5">Correggi su Vercel → Project → Settings → Environment Variables (ambiente <b>Production</b> spuntato), poi Deployments → ⋯ → <b>Redeploy</b>.</p>
</div></body></html>`
}
