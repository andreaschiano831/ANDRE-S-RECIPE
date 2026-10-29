'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function KitchenJoinCreate({ canCreate }: { canCreate: boolean }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function join() {
    if (!code.trim()) return
    setBusy(true); setErr('')
    const { data, error } = await createClient().rpc('join_kitchen', { invite_code: code })
    setBusy(false)
    if (error) { setErr(error.message); return }
    router.push(`/cucine/${data}/app`); router.refresh()
  }
  async function create() {
    if (!name.trim()) return
    setBusy(true); setErr('')
    const { data, error } = await createClient().rpc('create_kitchen', { kitchen_name: name })
    setBusy(false)
    if (error) { setErr(error.message); return }
    router.push(`/cucine/${data}`); router.refresh()
  }

  return (
    <div className={canCreate ? 'grid2' : ''} style={{ display: canCreate ? undefined : 'block' }}>
      <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="label">Entra con un codice</span>
        <input className="input sc" style={{ letterSpacing: '.25em', fontSize: '1.1rem', textAlign: 'center' }} placeholder="ABC-1234"
          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && join()} />
        <button className="btn" disabled={busy || !code.trim()} onClick={join}>Entra nella brigata</button>
      </section>
      {canCreate && (
        <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="label">Crea una cucina</span>
          <input className="input" placeholder="Es. Un Piano nel Cielo · Pasticceria" value={name}
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <button className="btn btn-gold" disabled={busy || !name.trim()} onClick={create}>Crea cucina</button>
        </section>
      )}
      {err && <p className="err" style={{ gridColumn: '1/-1', marginTop: 8 }}>{err}</p>}
    </div>
  )
}
