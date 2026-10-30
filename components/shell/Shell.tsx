'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { BookOpen, ChefHat, Home, Menu, Plus, Search, Sparkles, PenLine, Camera, Library, Printer, Settings, Wrench, Globe } from 'lucide-react'
import { KITCHEN_SECTIONS } from '@/lib/nav'
import { APP_ICON, SECTION_ICON } from './icons'
import CommandPalette from './CommandPalette'
import { kitchenNav } from './kitchen-nav'

type Kitchen = { id: string; name: string }
type User = { name: string; role: string; canEdit: boolean; isAdmin: boolean }

function useCurrentKitchen(kitchens: Kitchen[]) {
  const pathname = usePathname()
  const fromPath = pathname.match(/^\/cucine\/([0-9a-f-]{36})/)?.[1]
  const [stored, setStored] = useState<string | null>(null)
  useEffect(() => { try { setStored(localStorage.getItem('rc_kitchen')) } catch {} }, [])
  useEffect(() => { if (fromPath) try { localStorage.setItem('rc_kitchen', fromPath); setStored(fromPath) } catch {} }, [fromPath])
  const id = fromPath ?? (kitchens.some((k) => k.id === stored) ? stored : kitchens[0]?.id) ?? null
  return kitchens.find((k) => k.id === id) ?? null
}

function Nav({ appName, tagline, user, kitchens, onSearch }: { appName: string; tagline: string; user: User; kitchens: Kitchen[]; onSearch: () => void }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()
  const kitchen = useCurrentKitchen(kitchens)
  const inKitchenApp = /^\/cucine\/[^/]+\/app/.test(pathname)
  const section = inKitchenApp ? params.get('s') ?? 'dashboard' : null
  const isOn = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  const link = (href: string, label: string, Icon: React.ComponentType<{ size?: number }>, on = isOn(href)) => (
    <Link key={href} href={href} className={`side-link ${on ? 'on' : ''}`} onClick={(e) => kitchenNav(e, href)}><Icon size={18} /> {label}</Link>
  )

  return (
    <aside className="side">
      <Link href="/" className="side-brand"><b>{appName}</b>{tagline && <small>{tagline}</small>}</Link>
      <button className="side-search" onClick={onSearch}><Search size={15} /> Cerca o vai a… <kbd>⌘K</kbd></button>
      <div className="side-scroll">
        <div className="side-group">
          <p>Ricettario</p>
          {link('/', 'Home', APP_ICON.home)}
          {link('/ricette', 'Ricette', APP_ICON.ricette, pathname.startsWith('/ricette'))}
          {user.canEdit && link('/importa', 'Importa con AI', APP_ICON.importa)}
          {user.isAdmin && link('/ricettari', 'Ricettari', APP_ICON.ricettari)}
          {link('/documenti', 'Stampa', APP_ICON.documenti)}
          {user.canEdit && link('/strumenti', 'Strumenti', APP_ICON.strumenti)}
        </div>
        <div className="side-group">
          <p>Cucina</p>
          {kitchens.length > 1 && kitchen && (
            <label className="side-kitchen">
              <ChefHat size={16} />
              <select value={kitchen.id} onChange={(e) => router.push(`/cucine/${e.target.value}/app${section ? `?s=${section}` : ''}`)} aria-label="Cucina">
                {kitchens.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </label>
          )}
          {kitchen ? (
            KITCHEN_SECTIONS.map((sec) => {
              const Icon = SECTION_ICON[sec.id]
              return link(`/cucine/${kitchen.id}/app?s=${sec.id}`, sec.label, Icon, inKitchenApp && section === sec.id)
            })
          ) : (
            link('/cucine', 'Crea o entra in una cucina', ChefHat)
          )}
          {kitchen && link('/cucine', 'Tutte le cucine', ChefHat, pathname === '/cucine' || (/^\/cucine\/[^/]+$/.test(pathname)))}
        </div>
      </div>
      <Link href="/impostazioni" className="side-foot">
        <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontWeight: 600, fontSize: '.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
          <span style={{ display: 'block', fontSize: '.76rem', color: 'var(--nav-muted)' }}>Impostazioni</span>
        </span>
        <Settings size={16} />
      </Link>
    </aside>
  )
}

function MobileBars({ appName, user, kitchens, onSearch }: { appName: string; user: User; kitchens: Kitchen[]; onSearch: () => void }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const kitchen = useCurrentKitchen(kitchens)
  const [sheet, setSheet] = useState<null | 'menu' | 'add'>(null)
  useEffect(() => { setSheet(null) }, [pathname, params])
  const inKitchen = pathname.startsWith('/cucine')
  const section = params.get('s')
  const title = useMemo(() => {
    if (/^\/cucine\/[^/]+\/app/.test(pathname)) return KITCHEN_SECTIONS.find((s) => s.id === (section ?? 'dashboard'))?.label ?? 'Cucina'
    if (pathname.startsWith('/ricette')) return 'Ricette'
    if (pathname.startsWith('/importa')) return 'Importa'
    if (pathname.startsWith('/documenti')) return 'Stampa'
    if (pathname.startsWith('/ricettari')) return 'Ricettari'
    if (pathname.startsWith('/impostazioni')) return 'Impostazioni'
    if (pathname.startsWith('/cucine')) return 'Cucina'
    return appName
  }, [pathname, section, appName])
  const kitchenHref = kitchen ? `/cucine/${kitchen.id}/app` : '/cucine'

  return (
    <>
      <header className="topbar no-print">
        <b style={{ flex: 1 }}>{title}</b>
        <button className="icon-btn" onClick={onSearch} aria-label="Cerca"><Search size={17} /></button>
      </header>
      <nav className="tabbar no-print" aria-label="Navigazione">
        <Link href="/" className={pathname === '/' ? 'on' : ''}><Home /> Home</Link>
        <Link href="/ricette" className={pathname.startsWith('/ricette') ? 'on' : ''}><BookOpen /> Ricette</Link>
        {user.canEdit
          ? <button className="plus" onClick={() => setSheet('add')} aria-label="Aggiungi"><Plus /> Nuova</button>
          : <button onClick={onSearch}><Search /> Cerca</button>}
        <Link href={kitchenHref} className={inKitchen ? 'on' : ''}><ChefHat /> Cucina</Link>
        <button onClick={() => setSheet('menu')} className={sheet === 'menu' ? 'on' : ''}><Menu /> Altro</button>
      </nav>
      {sheet && (
        <>
          <div className="sheet-bg" onClick={() => setSheet(null)} />
          <div className="sheet" role="dialog">
            {sheet === 'add' ? (
              <>
                <p className="h2" style={{ marginBottom: 14 }}>Aggiungi</p>
                <div className="sheet-grid">
                  <Link href="/ricette/nuova"><PenLine /> Scrivi una ricetta</Link>
                  <Link href="/importa"><Camera /> Da screenshot o foto</Link>
                  <Link href="/importa?tab=text"><Sparkles /> Da testo o file</Link>
                  <Link href="/importa?tab=link"><Globe /> Da link (ricettari interi)</Link>
                </div>
              </>
            ) : (
              <>
                {kitchen && (
                  <>
                    <p className="label" style={{ margin: '0 2px 8px' }}>{kitchen.name}</p>
                    <div className="sheet-grid" style={{ marginBottom: 18 }}>
                      {KITCHEN_SECTIONS.map((s) => {
                        const Icon = SECTION_ICON[s.id]
                        return <Link key={s.id} href={`/cucine/${kitchen.id}/app?s=${s.id}`} onClick={(e) => kitchenNav(e, `/cucine/${kitchen.id}/app?s=${s.id}`)}><Icon size={22} /> {s.label}</Link>
                      })}
                    </div>
                  </>
                )}
                <p className="label" style={{ margin: '0 2px 8px' }}>Ricettario e app</p>
                <div className="sheet-grid">
                  {user.isAdmin && <Link href="/ricettari"><Library /> Ricettari</Link>}
                  <Link href="/documenti"><Printer /> Stampa</Link>
                  {user.canEdit && <Link href="/strumenti"><Wrench /> Strumenti</Link>}
                  <Link href="/cucine"><ChefHat /> Cucine</Link>
                  <Link href="/impostazioni"><Settings /> Impostazioni</Link>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default function Shell({ appName, tagline, user, kitchens, children }: {
  appName: string; tagline: string; user: User; kitchens: Kitchen[]; children: React.ReactNode
}) {
  const [cmd, setCmd] = useState(false)
  // la cucina è un modulo grande: lo scarico in anticipo quando il telefono è libero
  useEffect(() => {
    if (!kitchens.length) return
    const w = window as any
    const load = () => { import('@/components/kitchen/KitchenPro').catch(() => {}) }
    const id = w.requestIdleCallback ? w.requestIdleCallback(load, { timeout: 5000 }) : setTimeout(load, 3000)
    return () => { if (w.cancelIdleCallback) w.cancelIdleCallback(id); else clearTimeout(id) }
  }, [kitchens.length])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmd((v) => !v) }
      else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName) && !(e.target as HTMLElement)?.isContentEditable) { e.preventDefault(); setCmd(true) }
    }
    const open = () => setCmd(true)
    const click = (e: MouseEvent) => { if ((e.target as HTMLElement)?.closest?.('[data-open-search]')) setCmd(true) }
    document.addEventListener('click', click)
    window.addEventListener('keydown', h)
    window.addEventListener('rc-search', open)
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('rc-search', open); document.removeEventListener('click', click) }
  }, [])
  return (
    <div className="shell">
      <Suspense>
        <Nav appName={appName} tagline={tagline} user={user} kitchens={kitchens} onSearch={() => setCmd(true)} />
        <MobileBars appName={appName} user={user} kitchens={kitchens} onSearch={() => setCmd(true)} />
      </Suspense>
      <div className="main">{children}</div>
      {cmd && <Suspense><CommandPalette onClose={() => setCmd(false)} user={user} kitchens={kitchens} /></Suspense>}
    </div>
  )
}
