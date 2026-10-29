'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AppSettingsForm({ initial }: { initial: { name: string; tagline: string } }) {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [msg, setMsg] = useState('')
  async function save() {
    if (!v.name.trim()) return
    const { error } = await createClient().from('app_settings').update({ name: v.name.trim(), tagline: v.tagline.trim() }).eq('id', 1)
    setMsg(error ? error.message : 'Salvato'); router.refresh()
    setTimeout(() => setMsg(''), 1800)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="grid2">
        <label className="field"><span className="label">Nome dell’app</span>
          <input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Ricettario" />
        </label>
        <label className="field"><span className="label">Sottotitolo</span>
          <input className="input" value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} placeholder="Es. Brigata di pasticceria" />
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="btn btn-sm" onClick={save}>Salva</button>
        {msg && <span className="gold" style={{ fontSize: '.78rem' }}>{msg}</span>}
      </div>
    </div>
  )
}
