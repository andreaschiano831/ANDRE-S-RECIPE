import ThemePicker from '@/components/ThemePicker'
import UserRoles from '@/components/UserRoles'
import AppSettingsForm from '@/components/AppSettingsForm'
import Link from 'next/link'
import { ChevronRight, LogOut } from 'lucide-react'
import { getSession } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ROLE_LABEL = { admin: 'Amministratore', chef: 'Chef (può modificare)', staff: 'Brigata (sola lettura)' }

export default async function Settings() {
  const s = (await getSession())!
  const { data: users } = s.isAdmin
    ? await s.supabase.from('profiles').select('id, full_name, role, created_at').order('created_at')
    : { data: null }
  const { data: app } = await s.supabase.from('app_settings').select('name, tagline').eq('id', 1).maybeSingle()
  return (
    <>
      <main className="narrow page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <header className="ph" style={{ marginBottom: 6 }}><div style={{ flex: 1 }}><h1 className="h1">Impostazioni</h1><p>Account, aspetto e permessi della brigata.</p></div></header>
        <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="label">Account</span>
          <p className="dish" style={{ fontSize: '1.4rem' }}>{s.name}</p>
          <p className="muted small">{s.user.email} · {ROLE_LABEL[s.role]}</p>
          <form action="/auth/signout" method="post"><button className="btn btn-sm"><LogOut size={15} /> Esci</button></form>
        </section>
        <section className="panel panel-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span className="label">Tema</span><ThemePicker />
        </section>
        {s.isAdmin && (
          <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="label">Personalizza</span>
            <AppSettingsForm initial={{ name: app?.name ?? 'Ricettario', tagline: app?.tagline ?? '' }} />
            <div className="row">
              <Link href="/ricettari" className="btn btn-sm">Ricettari e sezioni <ChevronRight size={15} /></Link>
              <Link href="/strumenti" className="btn btn-sm">Backup e doppioni <ChevronRight size={15} /></Link>
            </div>
          </section>
        )}
        {s.isAdmin && users && (
          <section className="panel panel-pad">
            <span className="label">Brigata e permessi</span>
            <p className="muted small" style={{ margin: '4px 0 12px' }}>Chi si registra entra come «Brigata». Promuovi a Chef chi deve poter inserire e modificare ricette.</p>
            <UserRoles users={users as any} me={s.user.id} />
          </section>
        )}
      </main>
    </>
  )
}
