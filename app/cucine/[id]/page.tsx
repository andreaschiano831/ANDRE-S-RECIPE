import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import KitchenSettings from '@/components/KitchenSettings'
import { getSession } from '@/lib/supabase/server'
import { loadKitchen } from '@/lib/kitchens'
import { loadCatalog } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export default async function KitchenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = (await getSession())!
  const k = await loadKitchen(s.supabase, id, s.user.id)
  if (!k) notFound()
  const [{ books }, { data: kb }] = await Promise.all([
    loadCatalog(s.supabase),
    s.supabase.from('kitchen_books').select('book_id').eq('kitchen_id', id),
  ])
  return (
    <>
      <Header active="cucine" />
      <main className="narrow page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/cucine" className="btn btn-ghost btn-sm">‹ Cucine</Link>
          <Link href={`/cucine/${id}/app`} className="btn btn-gold">Apri la cucina ›</Link>
        </div>
        <KitchenSettings kitchen={k.kitchen} members={k.members} me={s.user.id} myRole={k.myRole!} canManage={k.canManage}
          books={books} linkedBooks={(kb ?? []).map((b) => b.book_id)} />
      </main>
    </>
  )
}
