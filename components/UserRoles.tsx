'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type U = { id: string; full_name: string | null; role: string }

export default function UserRoles({ users, me }: { users: U[]; me: string }) {
  const [list, setList] = useState(users)
  const [msg, setMsg] = useState('')
  async function change(id: string, role: string) {
    if (id === me && role !== 'admin' && !confirm('Togli a te stesso i permessi di amministratore?')) return
    const { error } = await createClient().from('profiles').update({ role }).eq('id', id)
    if (error) { setMsg(error.message); return }
    setList(list.map((u) => (u.id === id ? { ...u, role } : u))); setMsg('Salvato')
    setTimeout(() => setMsg(''), 1500)
  }
  return (
    <>
      <table className="table">
        <tbody>
          {list.map((u) => (
            <tr key={u.id}>
              <td className="serif" style={{ fontStyle: 'italic', fontSize: '1.02rem' }}>{u.full_name || '—'}{u.id === me && <span className="muted"> (tu)</span>}</td>
              <td style={{ width: 170 }}>
                <select className="select" value={u.role} onChange={(e) => change(u.id, e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="chef">Chef</option>
                  <option value="staff">Brigata</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <p className="gold" style={{ fontSize: '.78rem', marginTop: 6 }}>{msg}</p>}
    </>
  )
}
