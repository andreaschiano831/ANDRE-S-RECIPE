'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { KITCHEN_ROLES } from '@/lib/kitchens'
import type { Book } from '@/lib/recipes'
import { useToast } from './useToast'

type M = { id: string; name: string; role: string }

function newCode() {
  const a = Math.random().toString(16).slice(2, 5).toUpperCase()
  return `${a}-${Math.floor(1000 + Math.random() * 9000)}`
}

export default function KitchenSettings({ kitchen, members: initial, me, myRole, canManage, books, linkedBooks }: {
  kitchen: { id: string; name: string; code: string }; members: M[]; me: string; myRole: string; canManage: boolean
  books: Book[]; linkedBooks: string[]
}) {
  const router = useRouter()
  const { show, node } = useToast()
  const [name, setName] = useState(kitchen.name)
  const [code, setCode] = useState(kitchen.code)
  const [members, setMembers] = useState(initial)
  const [linked, setLinked] = useState<string[]>(linkedBooks)
  const sb = () => createClient()
  const admins = members.filter((m) => m.role === 'admin').length

  async function saveName() {
    if (!name.trim() || name === kitchen.name) return
    const { error } = await sb().from('kitchens').update({ name: name.trim() }).eq('id', kitchen.id)
    if (error) show(error.message, 'err'); else { show('Nome aggiornato', 'ok'); router.refresh() }
  }
  async function regen() {
    if (!confirm('Generare un nuovo codice? Il vecchio smetterà di funzionare.')) return
    const c = newCode()
    const { error } = await sb().from('kitchens').update({ code: c }).eq('id', kitchen.id)
    if (error) show(error.message, 'err'); else setCode(c)
  }
  async function setRole(m: M, role: string) {
    if (m.role === 'admin' && role !== 'admin' && admins <= 1) { show('Serve almeno un admin nella cucina', 'err'); return }
    const { error } = await sb().from('kitchen_members').update({ role }).eq('kitchen_id', kitchen.id).eq('user_id', m.id)
    if (error) { show(error.message, 'err'); return }
    setMembers(members.map((x) => (x.id === m.id ? { ...x, role } : x)))
  }
  async function remove(m: M) {
    const self = m.id === me
    if (m.role === 'admin' && admins <= 1) { show('Sei l’unico admin: nomina prima un altro admin', 'err'); return }
    if (!confirm(self ? `Uscire dalla cucina «${kitchen.name}»?` : `Togliere ${m.name} dalla brigata?`)) return
    const { error } = await sb().from('kitchen_members').delete().eq('kitchen_id', kitchen.id).eq('user_id', m.id)
    if (error) { show(error.message, 'err'); return }
    if (self) { router.replace('/cucine'); router.refresh(); return }
    setMembers(members.filter((x) => x.id !== m.id))
  }
  async function toggleBook(id: string, on: boolean) {
    const q = on
      ? sb().from('kitchen_books').insert({ kitchen_id: kitchen.id, book_id: id })
      : sb().from('kitchen_books').delete().eq('kitchen_id', kitchen.id).eq('book_id', id)
    const { error } = await q
    if (error) { show(error.message, 'err'); return }
    setLinked(on ? [...linked, id] : linked.filter((x) => x !== id))
  }
  async function del() {
    if (prompt(`Per eliminare definitivamente la cucina e TUTTI i suoi dati scrivi il suo nome:`) !== kitchen.name) return
    const { error } = await sb().from('kitchens').delete().eq('id', kitchen.id)
    if (error) { show(error.message, 'err'); return }
    router.replace('/cucine'); router.refresh()
  }

  return (
    <>
      <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {canManage
          ? <input className="input serif" style={{ fontSize: '1.5rem', fontStyle: 'italic' }} value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} aria-label="Nome cucina" />
          : <h1 className="h1">{kitchen.name}</h1>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="label">Codice invito</span>
          <span className="gold num" style={{ fontSize: '1.4rem', letterSpacing: '.25em', fontWeight: 600 }}>{code}</span>
          <button className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(code); show('Codice copiato', 'ok') }}>Copia</button>
          {canManage && <button className="btn btn-sm btn-ghost" onClick={regen}>Nuovo codice</button>}
        </div>
        <p className="muted" style={{ fontSize: '.78rem' }}>
          Chi ha il codice si registra all’app, va in «Cucina» e lo inserisce: entra come commis. Qui puoi cambiargli il ruolo.
        </p>
      </section>

      <section className="panel panel-pad">
        <span className="label">Brigata · {members.length}</span>
        <table className="table" style={{ marginTop: 8 }}>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td className="serif" style={{ fontStyle: 'italic', fontSize: '1.05rem' }}>{m.name}{m.id === me && <span className="muted"> (tu)</span>}</td>
                <td style={{ width: 170 }}>
                  {canManage
                    ? <select className="select" value={m.role} onChange={(e) => setRole(m, e.target.value)}>
                        {KITCHEN_ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      </select>
                    : <span className="chip">{KITCHEN_ROLES.find((r) => r.id === m.role)?.label ?? m.role}</span>}
                </td>
                <td style={{ width: 40 }}>
                  {(canManage || m.id === me) && <button className="icon-btn" title={m.id === me ? 'Esci' : 'Togli'} onClick={() => remove(m)}>×</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: '.74rem', marginTop: 8 }}>Admin, Chef, Sous-chef e Capo partita possono modificare i dati della cucina; gli altri li consultano e aggiornano le preparazioni.</p>
      </section>

      <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="label">Ricettari collegati</span>
        <p className="muted" style={{ fontSize: '.78rem' }}>Le ricette di questi ricettari compaiono nella cucina: nell’autocompletamento delle preparazioni, nei piatti del servizio e nel food cost.</p>
        {books.length === 0 && <p className="muted" style={{ fontSize: '.8rem' }}>Nessun ricettario creato.</p>}
        {books.map((b) => (
          <label key={b.id} className="opt" style={{ alignItems: 'center' }}>
            <input type="checkbox" disabled={!canManage} checked={linked.includes(b.id)} onChange={(e) => toggleBook(b.id, e.target.checked)}
              style={{ width: 18, height: 18, accentColor: 'var(--gold2)' }} />
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
            <span><b>{b.name}</b></span>
          </label>
        ))}
      </section>

      {myRole === 'admin' && (
        <button className="btn btn-danger" style={{ alignSelf: 'flex-start' }} onClick={del}>Elimina cucina</button>
      )}
      {node}
    </>
  )
}
