'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, Archive, CalendarClock, CheckCircle2, ClipboardCheck, Copy, Droplets, LayoutDashboard, Loader2, PackageCheck, Printer, RefreshCw, ShieldAlert, Siren, Snowflake, Sparkles, SprayCan, Tag, Thermometer } from 'lucide-react'
import { Drawer } from '../hub/ui'
import { AskDrawer, Launcher, LauncherButton, MC, QuickBar, mc, type QAction } from '../quick/Quick'
import { fmtWhen, num } from './model'
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

export const TABS: { key: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'oggi', label: 'Oggi', icon: <LayoutDashboard />, color: MC.ardesia },
  { key: 'temp', label: 'Temperature', icon: <Thermometer />, color: MC.blu },
  { key: 'sanif', label: 'Sanificazione', icon: <SprayCan />, color: MC.verde },
  { key: 'merci', label: 'Merci', icon: <PackageCheck />, color: MC.arancio },
  { key: 'abb', label: 'Abbattimenti', icon: <Snowflake />, color: MC.viola },
  { key: 'eti', label: 'Etichette', icon: <Tag />, color: MC.rosso },
  { key: 'olio', label: 'Olio', icon: <Droplets />, color: MC.oro },
  { key: 'nc', label: 'Non conformità', icon: <ShieldAlert />, color: MC.rosa },
  { key: 'scad', label: 'Scadenze', icon: <CalendarClock />, color: MC.teal },
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
  const [pick, setPick] = useState(false)
  const [print, setPrint] = useState(false)
  const [tools, setTools] = useState(false)
  const [ask, setAsk] = useState(false)
  const [intent, setIntent] = useState<string | null>(null)
  const go = (t: Tab) => { setTab(t); writeParam('h', t === 'oggi' ? null : t); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  // dal QR sul frigo: ?s=haccp&t=<frigo>
  useEffect(() => { const t = readParam('t'); if (t) { setTemp(t); writeParam('t', null) } }, [])
  const nav = { go, openNc: (p: any = {}) => setNc(p), openEtichetta: (p: any = {}) => { setEti(p); go('eti') }, openTemp: (id: string) => setTemp(id), intent, clearIntent: () => setIntent(null) }
  const ready = status === 'ready'

  return (
    <NavCtx.Provider value={nav}>
      <div className="hub hz">
        <div className="qk-head-row">
          {ready && tab !== 'oggi' ? <StatusPill onClick={() => go('oggi')} /> : <span />}
          <div className="qk-head-btns">
            {ready && <button className="btn btn-sm qk-ask" onClick={() => setAsk(true)}><Sparkles /> Chiedi</button>}
            <LauncherButton onClick={() => setTools(true)} />
            {ready && <button className="btn btn-sm qk-panic" onClick={() => setPrint(true)}><Siren /> Ispezione</button>}
          </div>
        </div>
        {ready && <HaccpQuick go={go} setIntent={setIntent} onTemp={() => setPick(true)} onNc={() => setNc({})} onEti={() => { setEti({}); go('eti') }} />}

        <nav className="tabs-hub hz-tabs qk-tabs" aria-label="Registri HACCP">
          {TABS.map((t) => <TabBtn key={t.key} t={t} on={tab === t.key} onClick={() => go(t.key)} />)}
          {legacy && <button className={tab === 'archivio' ? 'on' : ''} onClick={() => go('archivio')}><Archive /> Archivio</button>}
        </nav>

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

        {ready && nc && <NcEditor prefill={nc} onClose={() => setNc(null)} />}
        {ready && temp && <TempEntry unitId={temp} onClose={() => setTemp(null)} />}
        {ready && pick && <UnitPicker onPick={(id) => { setPick(false); setTemp(id) }} onClose={() => setPick(false)} />}
        {print && <Registri onClose={() => setPrint(false)} />}
        {tools && <Launcher title="Strumenti HACCP" onClose={() => setTools(false)} actions={[
          ...(ready ? quickActions({ go, setIntent, onTemp: () => setPick(true), onNc: () => setNc({}), onEti: () => { setEti({}); go('eti') } }).map((a) => ({ ...a, group: 'Registra adesso' })) : []),
          ...TABS.map((t) => ({ key: 'tab-' + t.key, label: t.label, icon: t.icon, color: t.color, run: () => go(t.key), group: 'Registri' })),
          ...(ready ? [{ key: 'print', label: 'Stampa registri', sub: 'PDF per ispettore o consulente', icon: <Printer />, color: MC.ardesia, run: () => setPrint(true), group: 'Documenti' }] : []),
          ...(legacy ? [{ key: 'arch', label: 'Archivio', sub: 'la vecchia sezione', icon: <Archive />, color: MC.ardesia, run: () => go('archivio'), group: 'Documenti' }] : []),
        ]} />}
        {ask && <HaccpAsk onClose={() => setAsk(false)} go={go} />}
      </div>
    </NavCtx.Provider>
  )
}

type QArgs = { go: (t: Tab) => void; setIntent: (s: string) => void; onTemp: () => void; onNc: () => void; onEti: () => void }
function quickActions({ go, setIntent, onTemp, onNc, onEti }: QArgs, o?: ReturnType<typeof useOverview>): QAction[] {
  const tTodo = o ? o.units.filter((x) => x.status === 'todo').length : 0
  const sTodo = o ? o.sanif.filter((x) => !x.done).length : 0
  const fTodo = o ? o.fryers.filter((x) => !x.today).length : 0
  return [
    { key: 'q-temp', label: 'Temperatura', sub: tTodo ? `${tTodo} da rilevare` : 'registra una lettura', icon: <Thermometer />, color: MC.blu, run: onTemp, hot: tTodo > 0 },
    { key: 'q-sanif', label: 'Sanificazione', sub: sTodo ? `${sTodo} da fare oggi` : 'piano completato', icon: <SprayCan />, color: MC.verde, run: () => go('sanif'), hot: sTodo > 0 },
    { key: 'q-merci', label: 'Consegna', sub: 'foto del DDT', icon: <PackageCheck />, color: MC.arancio, run: () => { go('merci'); setIntent('merci-foto') } },
    { key: 'q-abb', label: 'Abbattimento', sub: o?.abbLive.length ? `${o.abbLive.length} in corso` : 'avvia ora', icon: <Snowflake />, color: MC.viola, run: () => { go('abb'); if (!o?.abbLive.length) setIntent('abb-new') }, hot: !!o?.abbLive.length },
    { key: 'q-eti', label: 'Etichetta', sub: 'stampa con QR', icon: <Tag />, color: MC.rosso, run: onEti },
    { key: 'q-olio', label: 'Olio frittura', sub: fTodo ? `${fTodo} da controllare` : 'controllato', icon: <Droplets />, color: MC.oro, run: () => go('olio'), hot: fTodo > 0 },
    { key: 'q-nc', label: 'Non conformità', sub: o?.nc.length ? `${o.nc.length} aperte` : 'segnala un problema', icon: <ShieldAlert />, color: MC.rosa, run: onNc },
  ]
}
function HaccpQuick(a: QArgs) { const o = useOverview(); return <QuickBar actions={quickActions(a, o)} /> }

function StatusPill({ onClick }: { onClick: () => void }) {
  const o = useOverview()
  const n = o.alarms.length
  return (
    <button className={`qk-status ${n ? 'danger' : 'ok'}`} onClick={onClick}>
      {n ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
      <span><b>{n ? (n === 1 ? '1 punto da sistemare' : `${n} punti da sistemare`) : 'Tutto sotto controllo'}</b>
        <small>{n ? o.alarms[0].text : `${o.units.filter((x) => x.status !== 'todo').length}/${o.units.length} temperature · ${o.sanif.filter((x) => x.done).length}/${o.sanif.length} pulizie oggi`}</small></span>
    </button>
  )
}

function UnitPicker({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const o = useOverview()
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Quale frigo?</span>}>
      <div className="qk-units">
        {o.units.map((x) => (
          <button key={x.u.id} className={`qk-unit ${x.status}`} style={mc(MC.blu)} onClick={() => onPick(x.u.id)}>
            <b>{x.u.nome}</b>
            <span className="qk-unit-v">{x.last ? `${num(x.last.data.valore)} °C` : '—'}</span>
            <small>{x.status === 'todo' ? 'da rilevare oggi' : x.status === 'alarm' ? 'in allarme' : `fatto ${fmtWhen(x.today[0].at)}`}</small>
          </button>
        ))}
      </div>
    </Drawer>
  )
}

function HaccpAsk({ onClose, go }: { onClose: () => void; go: (t: Tab) => void }) {
  const o = useOverview()
  const { recs } = useHaccp()
  const ctx = () => ({
    oggi: new Date().toISOString().slice(0, 10),
    allarmi: o.alarms.map((a) => a.text),
    temperature: o.units.map((x) => ({ frigo: x.u.nome, limiti: [x.u.min, x.u.max], ultima: x.last?.data.valore, quando: x.last?.at, oggi: x.today.length, stato: x.status })),
    sanificazione: o.sanif.map((x) => ({ voce: x.e.nome, frequenza: x.e.freq, fatta: x.done, rimandata: x.posticipato })),
    nonConformitaAperte: o.nc.map((r) => ({ tipo: r.data.tipo, fornitore: r.data.fornitore, descrizione: r.data.descrizione, azione: r.data.azione, aperta: r.at })),
    abbattimentiInCorso: o.abbLive.map((r) => ({ prodotto: r.data.prodotto, inizio: r.data.inizio, modo: r.data.modo })),
    olioOggi: o.fryers.map((x) => ({ friggitrice: x.f.nome, caso: x.today?.data.caso ?? null })),
    scadenze: o.tasks.map((x) => ({ attivita: x.t.nome, traGiorni: x.d })),
    consegne30gg: o.ric.map((r) => ({ data: r.data.data, fornitore: r.data.fornitore, esito: r.data.esito, temperatura: r.data.temperatura })),
    registrazioniUltimi30gg: recs.filter((r) => Date.now() - new Date(r.at).getTime() < 30 * 864e5).length,
  })
  return <AskDrawer title="Assistente HACCP" onClose={onClose} context={ctx}
    intro="Sei un consulente HACCP (Reg. CE 852/2004) per un ristorante italiano e conosci i registri della cucina."
    suggestions={['Cosa devo fare oggi per essere in regola?', 'Se arriva un ispettore adesso, cosa rischio?', 'Quali fornitori mi danno più problemi?', 'Riassumi le non conformità aperte e come chiuderle']}
    tabs={TABS.map((t) => ({ key: t.key, label: t.label }))} onAction={(t) => go(t as Tab)} />
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
  return <button className={on ? 'on' : ''} style={mc(t.color)} onClick={onClick}><span className="qk-tab-ic">{t.icon}</span> {t.label}{n > 0 && <span className="badge">{n}</span>}</button>
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
