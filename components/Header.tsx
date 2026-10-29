import Link from 'next/link'
import { getSession } from '@/lib/supabase/server'

export default async function Header({ active }: { active?: string }) {
  const s = await getSession()
  const { data: app } = s
    ? await s.supabase.from('app_settings').select('name, tagline').eq('id', 1).maybeSingle()
    : { data: null }
  const link = (href: string, label: string, key: string, cls = '') => (
    <Link href={href} className={`${active === key ? 'on' : ''} ${cls}`}>{label}</Link>
  )
  return (
    <header className="hd no-print">
      <div className="wrap hd-in">
        <Link href="/" className="brand">
          <b>{app?.name ?? 'Ricettario'}</b>
          <small>{app?.tagline ?? ''}</small>
        </Link>
        <nav className="nav">
          {link('/ricette', 'Ricette', 'ricette')}
          {link('/cucine', 'Cucina', 'cucine')}
          {s?.canEdit && link('/importa', 'Importa', 'importa')}
          {link('/documenti', 'Stampa', 'documenti', 'hide-sm')}
          {s?.isAdmin && link('/ricettari', 'Ricettari', 'ricettari', 'hide-sm')}
          {link('/impostazioni', '⚙', 'impostazioni')}
        </nav>
      </div>
    </header>
  )
}
