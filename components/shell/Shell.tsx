'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { BookOpen, ChefHat, ChevronDown, ChevronsUpDown, Home, Menu, PanelLeftClose, PanelLeftOpen, Plus, Search, Sparkles, PenLine, Camera, Library, Printer, Settings, Wrench, Globe } from 'lucide-react'
import { KITCHEN_SECTIONS } from '@/lib/nav'
import { APP_COLOR, APP_ICON, KITCHEN_GROUPS, SECTION_COLOR, SECTION_ICON } from './icons'
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

const ls = { get: (k: string) => { try { return localStorage.getItem(k) } catch { return null } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch {} } }

/** contatori dalle sezioni della cucina (scadenze, preparazioni, spesa…), inviati da Kitchen Pro */
function useBadges() {
  const [b, setB] = useState<Record<string, number>>({})
  useEffect(() => { const h = (e: Event) => setB((e as CustomEvent).detail || {}); window.addEventListener('kp-badges', h); return () => window.removeEventListener('kp-badges', h) }, [])
  return b
}

function Nav({ appName, tagline, user, kitchens, onSearch, mini, onMini }: { appName: string; tagline: string; user: User; kitchens: Kitchen[]; onSearch: () => void; mini: boolean; onMini: () => void }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()
  const kitchen = useCurrentKitchen(kitchens)
  const badges = useBadges()
  const inKitchenApp = /^\/cucine\/[^/]+\/app/.test(pathname)
  const section = inKitchenApp ? params.get('s') ?? 'dashboard' : null
  const isOn = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  useEffect(() => { try { setClosed(JSON.parse(ls.get('rc_nav_closed') || '{}')) } catch {} }, [])
  const toggle = (g: string) => setClosed((c) => { const n = { ...c, [g]: !c[g] }; ls.set('rc_nav_closed', JSON.stringify(n)); return n })

  const link = (href: string, label: string, Icon: React.ComponentType<{ size?: number }>, color: string, on = isOn(href), badge?: number) => (
    <Link key={href} href={href} className={`side-link ${on ? 'on' : ''}`} style={{ ['--c' as any]: color }} title={mini ? label : undefined} aria-current={on ? 'page' : undefined} onClick={(e) => kitchenNav(e, href)}>
      <span className="side-ic"><Icon size={16} /></span><span className="side-tx">{label}</span>
      {!!badge && <span className="side-badge">{badge > 99 ? '99+' : badge}</span>}
    </Link>
  )
  const group = (id: string, label: string, children: React.ReactNode) => (
    <div className={`side-group ${closed[id] && !mini ? 'closed' : ''}`} key={id}>
      <button className="side-gh" onClick={() => toggle(id)} aria-expanded={!closed[id]}><span>{label}</span><ChevronDown size={13} /></button>
      <div className="side-gb">{children}</div>
    </div>
  )
  const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className={`side ${mini ? 'mini' : ''}`}>
      <div className="side-top">
        <Link href="/" className="side-brand" title={appName}>
          <span className="side-mono">{appName.slice(0, 1)}</span>
          <span className="side-brand-t"><b>{appName}</b>{tagline && <small>{tagline}</small>}</span>
        </Link>
        <button className="side-mini" onClick={onMini} aria-label={mini ? 'Allarga la barra' : 'Stringi la barra'} title={mini ? 'Allarga' : 'Stringi'}>{mini ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
      </div>
      <button className="side-search" onClick={onSearch} title="Cerca (⌘K)"><Search size={15} /><span className="side-tx">Cerca o vai a…</span><kbd>⌘K</kbd></button>
      <div className="side-scroll">
        {group('ricettario', 'Ricettario', <>
          {link('/', 'Home', APP_ICON.home, APP_COLOR.home)}
          {link('/ricette', 'Ricette', APP_ICON.ricette, APP_COLOR.ricette, pathname.startsWith('/ricette'))}
          {user.canEdit && link('/importa', 'Importa con AI', APP_ICON.importa, APP_COLOR.importa)}
          {user.isAdmin && link('/ricettari', 'Ricettari', APP_ICON.ricettari, APP_COLOR.ricettari)}
          {link('/biblioteca', 'Biblioteca', APP_ICON.biblioteca, APP_COLOR.biblioteca)}
          {link('/documenti', 'Stampa', APP_ICON.documenti, APP_COLOR.documenti)}
          {user.canEdit && link('/strumenti', 'Strumenti', APP_ICON.strumenti, APP_COLOR.strumenti)}
        </>)}
        {kitchen ? <>
          <div className="side-kcard" title={kitchen.name}>
            <span className="side-kav">{initials(kitchen.name)}</span>
            <span className="side-tx side-kname"><small>Cucina</small><b>{kitchen.name}</b></span>
            {kitchens.length > 1 && <ChevronsUpDown size={14} className="side-tx" />}
            {kitchens.length > 1
              ? <select value={kitchen.id} onChange={(e) => router.push(`/cucine/${e.target.value}/app${section ? `?s=${section}` : ''}`)} aria-label="Cambia cucina">{kitchens.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>
              : <Link href={`/cucine/${kitchen.id}`} aria-label="Impostazioni della cucina" className="side-kcover" />}
          </div>
          {KITCHEN_GROUPS.map((g) => group('k-' + g.label, g.label, g.ids.map((id) => {
            const sec = KITCHEN_SECTIONS.find((x) => x.id === id)!
            return link(`/cucine/${kitchen.id}/app?s=${id}`, sec.label, SECTION_ICON[id], SECTION_COLOR[id], inKitchenApp && section === id, badges[id])
          })))}
          <div className="side-group">{link('/cucine', 'Tutte le cucine', ChefHat, APP_COLOR.cucine, pathname === '/cucine' || /^\/cucine\/[^/]+$/.test(pathname))}</div>
        </> : group('cucina', 'Cucina', link('/cucine', 'Crea o entra in una cucina', ChefHat, APP_COLOR.cucine))}
      </div>
      <Link href="/impostazioni" className="side-foot" title="Impostazioni">
        <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
        <span className="side-tx" style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontWeight: 600, fontSize: '.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</span>
          <span style={{ display: 'block', fontSize: '.76rem', color: 'var(--nav-muted)' }}>{user.isAdmin ? 'Amministratore' : user.canEdit ? 'Chef' : 'Brigata'} · impostazioni</span>
        </span>
        <Settings size={16} className="side-tx" />
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
    if (pathname.startsWith('/biblioteca')) return 'Biblioteca'
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
                        return <Link key={s.id} href={`/cucine/${kitchen.id}/app?s=${s.id}`} style={{ ['--c' as any]: SECTION_COLOR[s.id] }} onClick={(e) => kitchenNav(e, `/cucine/${kitchen.id}/app?s=${s.id}`)}><span className="sheet-ic"><Icon size={20} /></span> {s.label}</Link>
                      })}
                    </div>
                  </>
                )}
                <p className="label" style={{ margin: '0 2px 8px' }}>Ricettario e app</p>
                <div className="sheet-grid">
                  {user.isAdmin && <Link href="/ricettari"><Library /> Ricettari</Link>}
                  <Link href="/biblioteca"><APP_ICON.biblioteca /> Biblioteca</Link>
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
  const [mini, setMini] = useState(false)
  useEffect(() => { setMini(ls.get('rc_nav_mini') === '1') }, [])
  const flipMini = () => setMini((m) => { ls.set('rc_nav_mini', m ? '0' : '1'); return !m })
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
    <div className={`shell ${mini ? 'shell-mini' : ''}`}>
      <Suspense>
        <Nav appName={appName} tagline={tagline} user={user} kitchens={kitchens} onSearch={() => setCmd(true)} mini={mini} onMini={flipMini} />
        <MobileBars appName={appName} user={user} kitchens={kitchens} onSearch={() => setCmd(true)} />
      </Suspense>
      <div className="main">{children}</div>
      {cmd && <Suspense><CommandPalette onClose={() => setCmd(false)} user={user} kitchens={kitchens} /></Suspense>}
    </div>
  )
}
