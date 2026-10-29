import Link from 'next/link'
import { ChefHat, ChevronRight, Users } from 'lucide-react'
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
      <main className="narrow page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <header className="ph" style={{ marginBottom: 6 }}><div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="h1">Cucine</h1>
          <p>Ogni cucina ha la sua brigata e i suoi dati condivisi: giacenze, preparazioni e MEP, spesa e ordini, servizio, HACCP, food cost.</p>
        </div></header>

        {(kitchens ?? []).length === 0 && <div className="panel empty"><ChefHat size={28} strokeWidth={1.4} /><span className="dish">Nessuna cucina</span><p>Creane una qui sotto o entra con il codice che ti ha dato lo chef.</p></div>}
        {(kitchens ?? []).map((k: any) => {
          const st = (states ?? []).find((x: any) => x.kitchen_id === k.id) as any
          const n = (counts ?? []).filter((c: any) => c.kitchen_id === k.id).length
          return (
            <div key={k.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', flexWrap: 'wrap' }}>
              <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'var(--accent-soft)', color: 'var(--accent)' }}><ChefHat size={22} /></span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p className="dish" style={{ fontSize: '1.4rem' }}>{k.name}</p>
                <p className="muted small">
                  {label(roleOf.get(k.id) ?? '')} · {n} {n === 1 ? 'persona' : 'persone'}
                  {st?.version > 0 && ` · aggiornata ${new Date(st.updated_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}`}
                </p>
              </div>
              <Link href={`/cucine/${k.id}`} className="btn btn-sm"><Users size={15} /> Brigata e impostazioni</Link>
              <Link href={`/cucine/${k.id}/app`} className="btn btn-gold">Apri la cucina <ChevronRight size={16} /></Link>
            </div>
          )
        })}

        <KitchenJoinCreate canCreate={s.canEdit} />
      </main>
    </>
  )
}
