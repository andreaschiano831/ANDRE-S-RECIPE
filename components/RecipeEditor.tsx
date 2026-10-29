'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { draftToPayload, type Book, type RecipeDraft, type Section } from '@/lib/recipes'
import DraftFields from './DraftFields'
import { useToast } from './useToast'

export default function RecipeEditor({ initial, books, sections, groups, ingredientNames }: {
  initial: RecipeDraft; books: Book[]; sections: Section[]; groups: string[]; ingredientNames: string[]
}) {
  const router = useRouter()
  const { show, node } = useToast()
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault() } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  })

  async function save() {
    if (!draft.name.trim()) { show('Inserisci il nome della ricetta', 'err'); return }
    if (!draft.section_id) { show('Scegli la sezione', 'err'); return }
    const payload = draftToPayload(draft)
    if (!payload.ingredients.length) { show('Aggiungi almeno un ingrediente', 'err'); return }
    setBusy(true)
    const { data, error } = await createClient().rpc('save_recipe', { payload })
    setBusy(false)
    if (error) { show('Errore salvataggio: ' + error.message, 'err'); return }
    setDirty(false)
    router.push(`/ricette/${data}`)
    router.refresh()
  }

  return (
    <>
      <div className="ph"><h1 className="h1">{initial.id ? 'Modifica ricetta' : 'Nuova ricetta'}</h1></div>
      <DraftFields draft={draft} onChange={(d) => { setDraft(d); setDirty(true) }} books={books} sections={sections} groups={groups} ingredientNames={ingredientNames} />
      <div className="sticky-actions">
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Link href={initial.id ? `/ricette/${initial.id}` : '/ricette'} className="btn btn-lg btn-ghost">Annulla</Link>
          <button className="btn btn-gold btn-lg" disabled={busy} onClick={save}>{busy ? 'Salvataggio…' : 'Salva ricetta'}</button>
        </div>
      </div>
      {node}
    </>
  )
}
