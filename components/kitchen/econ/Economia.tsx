'use client'
import { useState } from 'react'
import { BarChart3, Copy, Landmark, Loader2, Percent, ReceiptText, RefreshCw, ShoppingCart, Warehouse } from 'lucide-react'
import { useHub } from '../hub/ui'
import FoodCostView from '../hub/FoodCost'
import { EconProvider, useEcon } from './store'
import { EnavCtx, type ETab } from './nav'
import { ECON_SQL } from './sql'
import { period } from './model'
import Panoramica from './Panoramica'
import Acquisti from './Acquisti'
import Vendite from './Vendite'
import Magazzino from './Magazzino'
import Conto from './Conto'
import { fatture } from './model'

const TABS: { key: ETab; label: string; icon: React.ReactNode }[] = [
  { key: 'panoramica', label: 'Panoramica', icon: <BarChart3 /> },
  { key: 'acquisti', label: 'Fatture e acquisti', icon: <ShoppingCart /> },
  { key: 'vendite', label: 'Vendite', icon: <ReceiptText /> },
  { key: 'foodcost', label: 'Food cost piatti', icon: <Percent /> },
  { key: 'magazzino', label: 'Magazzino', icon: <Warehouse /> },
  { key: 'conto', label: 'Conto economico', icon: <Landmark /> },
]
const PERIODS = [['mese', 'Questo mese'], ['30', '30 giorni'], ['90', '90 giorni'], ['anno', 'Anno']] as const

function read() { try { return new URL(location.href).searchParams.get('e') as ETab | null } catch { return null } }
function write(v: string | null) { try { const u = new URL(location.href); if (v) u.searchParams.set('e', v); else u.searchParams.delete('e'); history.replaceState(history.state, '', u) } catch {} }

export default function Economia() { return <EconProvider><Shell /></EconProvider> }

function Shell() {
  const { status, error, reload, recs } = useEcon()
  const [tab, setTab] = useState<ETab>(() => read() || 'panoramica')
  const [pk, setPk] = useState<string>('mese')
  const go = (t: ETab) => { setTab(t); write(t === 'panoramica' ? null : t); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const p = period(pk)
  const unpaid = fatture(recs).filter((f) => !f.data.pagata && f.data.totale > 0 && f.data.scadenza && f.data.scadenza < new Date().toISOString().slice(0, 10)).length
  const needsData = tab !== 'foodcost'
  return (
    <EnavCtx.Provider value={{ go }}>
      <div className="hub hz ec">
        <nav className="tabs-hub hz-tabs" aria-label="Gestione economica">
          {TABS.map((t) => <button key={t.key} className={tab === t.key ? 'on' : ''} onClick={() => go(t.key)}>{t.icon} {t.label}{t.key === 'acquisti' && unpaid > 0 && <span className="badge">{unpaid}</span>}</button>)}
        </nav>
        {needsData && tab !== 'conto' && status === 'ready' && (
          <div className="ec-period">
            <div className="seg">{PERIODS.map(([k, l]) => <button key={k} className={pk === k ? 'on' : ''} onClick={() => setPk(k)}>{l}</button>)}</div>
            <input className="input" type="month" aria-label="Scegli un mese" value={/^\d{4}-\d{2}$/.test(pk) ? pk : ''} onChange={(e) => e.target.value && setPk(e.target.value)} />
          </div>
        )}
        {!needsData ? <FoodCostView />
          : status === 'loading' ? <div className="panel empty"><Loader2 className="hz-spin" /><span>Apro i conti…</span></div>
          : status === 'missing' ? <Setup onRetry={reload} />
          : status === 'error' ? <div className="panel empty"><span className="dish">Dati non raggiungibili</span><p className="small">{error}</p><button className="btn btn-sm" onClick={reload}><RefreshCw /> Riprova</button></div>
          : <>
            {tab === 'panoramica' && <Panoramica p={p} />}
            {tab === 'acquisti' && <Acquisti p={p} />}
            {tab === 'vendite' && <Vendite p={p} />}
            {tab === 'magazzino' && <Magazzino p={p} />}
            {tab === 'conto' && <Conto />}
          </>}
      </div>
    </EnavCtx.Provider>
  )
}

function Setup({ onRetry }: { onRetry: () => void }) {
  const { toast } = useHub()
  return (
    <section className="panel hz-setup">
      <Landmark size={30} strokeWidth={1.4} />
      <h2 className="dish">Attiva la gestione economica</h2>
      <p>Fatture, vendite e costi si salvano nel database e li vedono solo admin, chef e sous-chef. Serve un passaggio una tantum su Supabase:</p>
      <ol>
        <li>Apri il progetto su supabase.com › <b>SQL Editor</b> › <b>New query</b></li>
        <li>Incolla il codice (bottone qui sotto) e premi <b>Run</b></li>
        <li>Torna qui e premi <b>Ho fatto, riprova</b></li>
      </ol>
      <div className="row">
        <button className="btn" onClick={() => navigator.clipboard.writeText(ECON_SQL).then(() => toast('Codice SQL copiato', 'success'), () => toast('Copia non riuscita: trovi il file in supabase/economia.sql', 'error'))}><Copy /> Copia il codice SQL</button>
        <button className="btn btn-gold" onClick={onRetry}><RefreshCw /> Ho fatto, riprova</button>
      </div>
      <p className="small muted">Intanto il food cost dei piatti funziona già, nella scheda «Food cost piatti».</p>
    </section>
  )
}
