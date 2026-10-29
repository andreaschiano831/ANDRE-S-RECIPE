'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewDocButton() {
  const router = useRouter()
  async function create() {
    const name = prompt('Nome del documento:', `Documento ${new Date().toLocaleDateString('it-IT')}`)
    if (!name?.trim()) return
    const { data, error } = await createClient().from('print_documents').insert({ name: name.trim() }).select('id').single()
    if (error) { alert(error.message); return }
    router.push(`/documenti/${data.id}`)
  }
  return <button className="btn btn-gold btn-sm" onClick={create}>+ Nuovo</button>
}
