import Link from 'next/link'
import Header from '@/components/Header'
import KitchenJoinCreate from '@/components/KitchenJoinCreate'
import { getSession } from '@/lib/supabase/server'
import { KITCHEN_ROLES } from '@/lib/kitchens'

export const dynamic = 'force-dynamic'

export default async function KitchensPage() {
  const s = (await getSession())!
  const { data: mine } = await s.supabase.from('kitchen_members').select('kitchen_id, role').eq('user_id', s.user.id)
  const ids = (mine ?? []).map((m) => m.kitchen_id)
  const [{ data: kitchens }, { data: counts }, { data: states }] = ids.length
    ? await Promise.all([
        s.supabase.from('kitchens').select('id, name, created_at').in('id', ids).order('created_at'),
        s.supabase.from('kitchen_members').select('kitchen_id').in('kitchen_id', ids),
        s.supabase.from('kitchen_state').select('kitchen_id, updated_at, version').in('kitchen_id', ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]
  const roleOf = new Map((mine ?? []).map((m) => [m.kitchen_id, m.role]))
  const label = (r: string) => KITCHEN_ROLES.find((x) => x.id === r)?.label ?? r

  return (
    <>
      <Header active="cucine" />
      <main className="narrow page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h1 className="h1">Gestione cucina</h1>
          <p className="muted" style={{ fontSize: '.86rem', marginTop: 6 }}>
            Ogni cucina ha la sua brigata e i suoi dati condivisi: giacenze, preparazioni e MEP, spesa e ordini, servizio, HACCP, food cost.
          </p>
        </div>

        {(kitchens ?? []).length === 0 && <p className="empty">Non fai ancora parte di nessuna cucina.</p>}
        {(kitchens ?? []).map((k: any) => {
          const st = (states ?? []).find((x: any) => x.kitchen_id === k.id) as any
          const n = (counts ?? []).filter((c: any) => c.kitchen_id === k.id).length
          return (
            <div key={k.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p className="serif" style={{ fontStyle: 'italic', fontSize: '1.35rem' }}>{k.name}</p>
                <p className="muted" style={{ fontSize: '.74rem' }}>
                  {label(roleOf.get(k.id) ?? '')} · {n} {n === 1 ? 'persona' : 'persone'}
                  {st?.version > 0 && ` · aggiornata ${new Date(st.updated_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}`}
                </p>
              </div>
              <Link href={`/cucine/${k.id}`} className="btn btn-sm">Brigata e impostazioni</Link>
              <Link href={`/cucine/${k.id}/app`} className="btn btn-gold">Apri ›</Link>
            </div>
          )
        })}

        <KitchenJoinCreate canCreate={s.canEdit} />
      </main>
    </>
  )
}
