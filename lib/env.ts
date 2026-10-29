/** Controlla le variabili di Supabase e restituisce un messaggio chiaro se qualcosa non va */
/** Accetta anche l'indirizzo copiato con /rest/v1/ o con lo slash finale */
export function cleanSupabaseUrl(raw: string | undefined) {
  return (raw ?? '').trim().replace(/\/(rest|auth)\/v1\/?.*$/i, '').replace(/\/+$/, '')
}

export function supabaseEnvProblem(): string | null {
  const url = cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
  if (!url) return 'Manca la variabile NEXT_PUBLIC_SUPABASE_URL su Vercel.'
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url))
    return `NEXT_PUBLIC_SUPABASE_URL non è nel formato giusto. Deve essere tipo https://abcdefgh.supabase.co (adesso inizia con "${url.slice(0, 30)}").`
  if (!key) return 'Manca la variabile NEXT_PUBLIC_SUPABASE_ANON_KEY su Vercel.'
  if (!/^(eyJ|sb_publishable_)/.test(key))
    return `NEXT_PUBLIC_SUPABASE_ANON_KEY non sembra la chiave giusta: deve iniziare con "eyJ" (anon) o "sb_publishable_" (adesso inizia con "${key.slice(0, 8)}").`
  return null
}

export function supabaseUrl() { return cleanSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) }
export function supabaseKey() { return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim() }

export function configErrorPage(msg: string, detail = '') {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Configurazione</title></head>
<body style="font-family:Georgia,serif;background:#F5EFE0;color:#1A1410;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:20px">
<div style="background:#fff;border-radius:16px;padding:28px;max-width:560px;box-shadow:0 8px 30px rgba(0,0,0,.08)">
<h1 style="font-style:italic;font-weight:400;margin:0 0 12px">L’app non riesce a collegarsi a Supabase</h1>
<p style="font-size:17px;line-height:1.5"><b>${esc(msg)}</b></p>
${detail ? `<pre style="white-space:pre-wrap;background:#f4f1ea;padding:10px;border-radius:8px;font-size:12px">${esc(detail)}</pre>` : ''}
<p style="color:#6E6050;font-size:14px;line-height:1.5">Correggi su Vercel → Project → Settings → Environment Variables, poi Deployments → ⋯ → <b>Redeploy</b> (le variabili NEXT_PUBLIC entrano nell’app solo con un nuovo deploy).</p>
</div></body></html>`
}
