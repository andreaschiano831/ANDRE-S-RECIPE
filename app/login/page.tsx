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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <form onSubmit={submit} className="panel panel-pad" style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <p className="sc gold" style={{ fontSize: '.6rem', letterSpacing: '.4em' }}>{app.tagline}</p>
          <h1 className="h1" style={{ marginTop: 6 }}>{app.name}</h1>
          <div className="rule">✦ ✦ ✦</div>
        </div>
        {mode === 'up' && (
          <label className="field"><span className="label">Nome</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label className="field"><span className="label">Email</span>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </label>
        <label className="field"><span className="label">Password</span>
          <input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        </label>
        {msg && <p className="err">{msg}</p>}
        <button className="btn btn-gold" disabled={busy}>{busy ? '…' : mode === 'in' ? 'Accedi' : 'Crea account'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg('') }}>
          {mode === 'in' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>
        {mode === 'up' && <p className="muted" style={{ fontSize: '.72rem', textAlign: 'center' }}>Il primo account creato diventa amministratore. I successivi entrano in sola lettura finché l’admin non li promuove.</p>}
      </form>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>
}
