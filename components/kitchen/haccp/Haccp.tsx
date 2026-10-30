'use client'
import { useEffect, useState } from 'react'
import { Archive, CalendarClock, ClipboardCheck, Copy, Droplets, LayoutDashboard, Loader2, PackageCheck, Printer, RefreshCw, ShieldAlert, Snowflake, SprayCan, Tag, Thermometer } from 'lucide-react'
import { useHub } from '../hub/ui'
import { HaccpProvider, useHaccp } from './store'
import { NavCtx, type Tab } from './nav'
import { HACCP_SQL } from './sql'
import Oggi, { useOverview } from './Oggi'
import Temperature, { TempEntry } from './Temperature'
import Sanificazione from './Sanificazione'
import Ricevimento from './Ricevimento'
import NonConformita, { NcEditor } from './NonConformita'
import Abbattimenti from './Abbattimenti'
import Etichette from './Etichette'
import Olio from './Olio'
import Scadenze from './Scadenze'
import Registri from './Registri'
import type { EtiData, NcData } from './model'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'oggi', label: 'Oggi', icon: <LayoutDashboard /> },
  { key: 'temp', label: 'Temperature', icon: <Thermometer /> },
  { key: 'sanif', label: 'Sanificazione', icon: <SprayCan /> },
  { key: 'merci', label: 'Merci', icon: <PackageCheck /> },
  { key: 'abb', label: 'Abbattimenti', icon: <Snowflake /> },
  { key: 'eti', label: 'Etichette', icon: <Tag /> },
  { key: 'olio', label: 'Olio', icon: <Droplets /> },
  { key: 'nc', label: 'Non conformità', icon: <ShieldAlert /> },
  { key: 'scad', label: 'Scadenze', icon: <CalendarClock /> },
]

export default function HaccpHub({ legacy }: { legacy?: React.ReactNode }) {
  return <HaccpProvider><Shell legacy={legacy} /></HaccpProvider>
}

function readParam(name: string) { try { return new URL(window.location.href).searchParams.get(name) } catch { return null } }
function writeParam(name: string, v: string | null) {
  try { const u = new URL(window.location.href); if (v) u.searchParams.set(name, v); else u.searchParams.delete(name); window.history.replaceState(window.history.state, '', u) } catch {}
}

function Shell({ legacy }: { legacy?: React.ReactNode }) {
  const { status, error, reload } = useHaccp()
  const [tab, setTab] = useState<Tab>(() => (readParam('h') as Tab) || 'oggi')
  const [nc, setNc] = useState<(Partial<NcData> & { id?: string }) | null>(null)
  const [eti, setEti] = useState<Partial<EtiData> | null>(null)
  const [temp, setTemp] = useState<string | null>(null)
  const [print, setPrint] = useState(false)
  const go = (t: Tab) => { setTab(t); writeParam('h', t === 'oggi' ? null : t); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  // dal QR sul frigo: ?s=haccp&t=<frigo>
  useEffect(() => { const t = readParam('t'); if (t) { setTemp(t); writeParam('t', null) } }, [])
  const nav = { go, openNc: (p: any = {}) => setNc(p), openEtichetta: (p: any = {}) => { setEti(p); go('eti') }, openTemp: (id: string) => setTemp(id) }

  return (
    <NavCtx.Provider value={nav}>
      <div className="hub hz">
        <div className="hz-top">
          <nav className="tabs-hub hz-tabs" aria-label="Registri HACCP">
            {TABS.map((t) => <TabBtn key={t.key} t={t} on={tab === t.key} onClick={() => go(t.key)} />)}
            {legacy && <button className={tab === 'archivio' ? 'on' : ''} onClick={() => go('archivio')}><Archive /> Archivio</button>}
            {status === 'ready' && <button className="hz-print" onClick={() => setPrint(true)}><Printer /> Stampa registri</button>}
          </nav>
        </div>

        {tab === 'archivio' ? legacy
          : status === 'loading' ? <div className="panel empty"><Loader2 className="hz-spin" /><span>Apro i registri…</span></div>
          : status === 'missing' ? <Setup onRetry={reload} />
          : status === 'error' ? <div className="panel empty"><span className="dish">Registri non raggiungibili</span><p className="small">{error}</p><button className="btn btn-sm" onClick={reload}><RefreshCw /> Riprova</button></div>
          : <>
            {tab === 'oggi' && <Oggi />}
            {tab === 'temp' && <Temperature />}
            {tab === 'sanif' && <Sanificazione />}
            {tab === 'merci' && <Ricevimento />}
            {tab === 'nc' && <NonConformita />}
            {tab === 'abb' && <Abbattimenti />}
            {tab === 'eti' && <Etichette prefill={eti} onUsed={() => setEti(null)} />}
            {tab === 'olio' && <Olio />}
            {tab === 'scad' && <Scadenze />}
          </>}

        {status === 'ready' && nc && <NcEditor prefill={nc} onClose={() => setNc(null)} />}
        {status === 'ready' && temp && <TempEntry unitId={temp} onClose={() => setTemp(null)} />}
        {print && <Registri onClose={() => setPrint(false)} />}
      </div>
    </NavCtx.Provider>
  )
}

function TabBtn({ t, on, onClick }: { t: (typeof TABS)[number]; on: boolean; onClick: () => void }) {
  const { status } = useHaccp()
  const o = useOverview()
  const n = status !== 'ready' ? 0
    : t.key === 'oggi' ? o.alarms.length
    : t.key === 'temp' ? o.units.filter((x) => x.status === 'alarm').length
    : t.key === 'nc' ? o.nc.length
    : t.key === 'abb' ? o.abbLive.length
    : t.key === 'scad' ? o.tasks.filter((x) => x.d < 0).length : 0
  return <button className={on ? 'on' : ''} onClick={onClick}>{t.icon} {t.label}{n > 0 && <span className="badge">{n}</span>}</button>
}

function Setup({ onRetry }: { onRetry: () => void }) {
  const { toast, canEdit } = useHub()
  return (
    <section className="panel hz-setup">
      <ClipboardCheck size={30} strokeWidth={1.4} />
      <h2 className="dish">Attiva i registri HACCP condivisi</h2>
      <p>I registri si salvano nel database, così tutta la brigata li vede e restano per i controlli. Serve un passaggio una tantum su Supabase:</p>
      <ol>
        <li>Apri il progetto su supabase.com › <b>SQL Editor</b> › <b>New query</b></li>
        <li>Incolla il codice (bottone qui sotto) e premi <b>Run</b></li>
        <li>Torna qui e premi <b>Ho fatto, riprova</b></li>
      </ol>
      <div className="row">
        {canEdit && <button className="btn" onClick={() => navigator.clipboard.writeText(HACCP_SQL).then(() => toast('Codice SQL copiato', 'success'), () => toast('Copia non riuscita: trovi il file in supabase/haccp.sql', 'error'))}><Copy /> Copia il codice SQL</button>}
        <button className="btn btn-gold" onClick={onRetry}><RefreshCw /> Ho fatto, riprova</button>
      </div>
      <p className="small muted">La vecchia sezione resta disponibile nella scheda Archivio.</p>
    </section>
  )
}
