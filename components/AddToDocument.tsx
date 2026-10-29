'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtDose } from '@/lib/recipes'

type Doc = { id: string; name: string; updated_at: string; print_document_items: { count: number }[] }

export default function AddToDocument({ recipeIds, dose: initialDose = 1, onClose }: {
  recipeIds: string[]; dose?: number; onClose: (done: boolean) => void
}) {
  const router = useRouter()
  const [docs, setDocs] = useState<Doc[] | null>(null)
  const [choice, setChoice] = useState<string>('__new')
  const [newName, setNewName] = useState('')
  const [dose, setDose] = useState(initialDose)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    createClient().from('print_documents').select('id, name, updated_at, print_document_items(count)')
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        const d = (data ?? []) as Doc[]
        setDocs(d)
        if (d.length) setChoice(d[0].id)
      })
  }, [])

  async function confirm() {
    setBusy(true); setErr('')
    const supabase = createClient()
    let docId = choice
    if (choice === '__new') {
      const name = newName.trim() || `Documento ${new Date().toLocaleDateString('it-IT')}`
      const { data, error } = await supabase.from('print_documents').insert({ name }).select('id').single()
      if (error || !data) { setErr(error?.message ?? 'Errore'); setBusy(false); return }
      docId = data.id
    }
    const { data: existing } = await supabase.from('print_document_items').select('recipe_id, position').eq('document_id', docId)
    const already = new Set((existing ?? []).map((e) => e.recipe_id))
    let pos = Math.max(-1, ...(existing ?? []).map((e) => e.position)) + 1
    const rows = recipeIds.filter((id) => !already.has(id)).map((id) => ({ document_id: docId, recipe_id: id, position: pos++, dose }))
    if (rows.length) {
      const { error } = await supabase.from('print_document_items').insert(rows)
      if (error) { setErr(error.message); setBusy(false); return }
    }
    await supabase.from('print_documents').update({ updated_at: new Date().toISOString() }).eq('id', docId)
    onClose(true)
    router.push(`/documenti/${docId}`)
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal">
        <h2 className="h2">Aggiungi a documento</h2>
        <p className="sc muted" style={{ fontSize: '.6rem', margin: '4px 0 14px' }}>{recipeIds.length === 1 ? '1 ricetta' : `${recipeIds.length} ricette`}</p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span className="label">Dose da stampare</span>
          <div className="dose">
            <button type="button" onClick={() => setDose((d) => (d <= 1 ? Math.max(0.25, d - 0.25) : d - 1))}>−</button>
            <input readOnly value={'×' + fmtDose(dose)} />
            <button type="button" onClick={() => setDose((d) => (d < 1 ? d + 0.25 : d + 1))}>+</button>
          </div>
        </div>

        {docs === null ? <span className="spin" /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {docs.map((d) => (
              <label key={d.id} className="opt">
                <input type="radio" name="doc" checked={choice === d.id} onChange={() => setChoice(d.id)} />
                <span><b>{d.name}</b><small>{d.print_document_items?.[0]?.count ?? 0} ricette</small></span>
              </label>
            ))}
            <label className="opt">
              <input type="radio" name="doc" checked={choice === '__new'} onChange={() => setChoice('__new')} />
              <span style={{ flex: 1 }}><b>+ Nuovo documento</b>
                <input className="input" style={{ marginTop: 6 }} placeholder="Es. Carta dessert autunno" value={newName}
                  onFocus={() => setChoice('__new')} onChange={(e) => setNewName(e.target.value)} />
              </span>
            </label>
          </div>
        )}
        {err && <p className="err" style={{ marginTop: 10 }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => onClose(false)}>Annulla</button>
          <button className="btn btn-gold" style={{ flex: 1 }} disabled={busy || docs === null} onClick={confirm}>{busy ? '…' : 'Aggiungi'}</button>
        </div>
      </div>
    </div>
  )
}
