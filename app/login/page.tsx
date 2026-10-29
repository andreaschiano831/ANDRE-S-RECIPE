'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [app, setApp] = useState({ name: 'Ricettario', tagline: '' })

  useEffect(() => {
    createClient().from('app_settings').select('name, tagline').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data) setApp(data) })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg('')
    const supabase = createClient()
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setMsg(error.message === 'Invalid login credentials' ? 'Email o password non corrette' : error.message); setBusy(false); return }
      router.replace(params.get('next') || '/')
      router.refresh()
    } else {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
      })
      if (error) { setMsg(error.message); setBusy(false); return }
      if (data.session) { router.replace('/'); router.refresh() }
      else { setMsg('Controlla la tua email per confermare l’account, poi accedi.'); setMode('in'); setBusy(false) }
    }
  }

  return (
    <main className="login">
      <section className="login-brand">
        <p className="login-tag">{app.tagline}</p>
        <h1 className="login-name">{app.name}</h1>
        <p className="login-lead">Le ricette della brigata e la gestione della cucina, in un solo posto: dosi, passaggi, giacenze, MEP, HACCP.</p>
      </section>
      <form onSubmit={submit} className="login-form">
        <h2 className="h2">{mode === 'in' ? 'Accedi' : 'Crea il tuo account'}</h2>
        {mode === 'up' && (
          <label className="field"><span className="label">Nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Come ti chiama la brigata" />
          </label>
        )}
        <label className="field"><span className="label">Email</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="field"><span className="label">Password</span>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'} placeholder="Almeno 6 caratteri" />
        </label>
        {msg && <p className="err">{msg}</p>}
        <button className="btn btn-gold btn-lg" disabled={busy}>{busy ? 'Un momento…' : mode === 'in' ? 'Accedi' : 'Crea account'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>
          {mode === 'in' ? 'Prima volta qui? Crea un account' : 'Hai già un account? Accedi'}
        </button>
        {mode === 'up' && <p className="muted small" style={{ textAlign: 'center' }}>Il primo account diventa amministratore. Gli altri entrano in sola lettura finché l’amministratore non li promuove.</p>}
      </form>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
