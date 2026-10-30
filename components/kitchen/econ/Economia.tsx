'use client'
import { useMemo, useRef, useState } from 'react'
import { BarChart3, CalendarCheck, CalendarPlus, Copy, FileUp, Landmark, Loader2, Percent, ReceiptText, RefreshCw, ShoppingCart, Sparkles, Trash, Wallet, Warehouse, TrendingDown, TrendingUp } from 'lucide-react'
import { Drawer, Stepper } from '../hub/ui'
import { priceFor, round, toBase, type Piatto } from '../hub/model'
import { AskDrawer, Launcher, LauncherButton, MC, QuickBar, mc, type QAction } from '../quick/Quick'
import { stockValue } from './Panoramica'
import { abc, acquisti, costi, costiMese, eur0, eur2, inP, monthKey, pct, ricavi, servizioAperto, vendite } from './model'
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

const TABS: { key: ETab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'panoramica', label: 'Panoramica', icon: <BarChart3 />, color: MC.ardesia },
  { key: 'acquisti', label: 'Fatture e acquisti', icon: <ShoppingCart />, color: MC.arancio },
  { key: 'vendite', label: 'Vendite', icon: <ReceiptText />, color: MC.blu },
  { key: 'foodcost', label: 'Food cost piatti', icon: <Percent />, color: MC.verde },
  { key: 'magazzino', label: 'Magazzino', icon: <Warehouse />, color: MC.oro },
  { key: 'conto', label: 'Conto economico', icon: <Landmark />, color: MC.viola },
]
const PERIODS = [['mese', 'Questo mese'], ['30', '30 giorni'], ['90', '90 giorni'], ['anno', 'Anno']] as const

function read() { try { return new URL(location.href).searchParams.get('e') as ETab | null } catch { return null } }
function write(v: string | null) { try { const u = new URL(location.href); if (v) u.searchParams.set('e', v); else u.searchParams.delete('e'); history.replaceState(history.state, '', u) } catch {} }

export default function Economia() { return <EconProvider><Shell /></EconProvider> }

function Shell() {
  const { status, error, reload, recs } = useEcon()
  const { k, stock, ctx, canEdit } = useHub()
  const [tab, setTab] = useState<ETab>(() => read() || 'panoramica')
  const [pk, setPk] = useState<string>('mese')
  const [intent, setIntent] = useState<string | null>(null)
  const [files, setFiles] = useState<File[] | null>(null)
  const [tools, setTools] = useState(false)
  const [ask, setAsk] = useState(false)
  const [waste, setWaste] = useState(false)
  const fileIn = useRef<HTMLInputElement>(null)
  const go = (t: ETab, i?: string) => { setTab(t); write(t === 'panoramica' ? null : t); if (i) setIntent(i); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const p = period(pk)
  const ready = status === 'ready'
  const today = new Date().toISOString().slice(0, 10)
  const unpaid = fatture(recs).filter((f) => !f.data.pagata && f.data.totale > 0 && f.data.scadenza && f.data.scadenza < today).length
  const piatti: Piatto[] = k.piatti || []
  const aperto = useMemo(() => servizioAperto(k, vendite(recs), piatti), [k, recs]) // eslint-disable-line react-hooks/exhaustive-deps
  const apertoTot = aperto.righe.reduce((s, r) => s + r.qta * r.prezzo, 0)
  const needsData = tab !== 'foodcost'

  // stato del mese per la pillola in alto
  const mese = period('mese')
  const mAcq = acquisti(fatture(recs).filter((r) => inP(r.at, mese)))
  const mRic = ricavi(vendite(recs).filter((r) => inP(r.at, mese)))
  const target: number = k.fcTarget ?? 30
  const fc = mRic.incasso ? (mAcq.food / mRic.incasso) * 100 : null

  const actions: QAction[] = [
    { key: 'q-fatt', label: 'Carica fattura', sub: 'XML, PDF o foto', icon: <FileUp />, color: MC.arancio, run: () => fileIn.current?.click() },
    { key: 'q-chiudi', label: 'Chiudi giornata', sub: aperto.righe.length ? `${eur0(apertoTot)} dal servizio` : 'incasso e coperti', icon: <CalendarCheck />, color: MC.blu, run: () => go('vendite', aperto.righe.length ? 'chiudi' : 'nuova'), hot: aperto.righe.length > 0 },
    { key: 'q-pagare', label: 'Da pagare', sub: unpaid ? `${unpaid} scadute` : 'scadenzario', icon: <Wallet />, color: MC.rosso, run: () => go('acquisti', 'dapagare'), hot: unpaid > 0 },
    { key: 'q-spreco', label: 'Spreco', sub: 'registra cosa butti', icon: <Trash />, color: MC.rosa, run: () => setWaste(true) },
    { key: 'q-costo', label: 'Costo fisso', sub: 'personale, affitto…', icon: <CalendarPlus />, color: MC.viola, run: () => go('conto', 'costo') },
    { key: 'q-fc', label: 'Food cost piatti', sub: 'margini e prezzi', icon: <Percent />, color: MC.verde, run: () => go('foodcost') },
  ]

  return (
    <EnavCtx.Provider value={{ go, intent, clearIntent: () => setIntent(null), files, clearFiles: () => setFiles(null) }}>
      <div className="hub hz ec">
        <div className="qk-head-row">
          {ready ? (
            <button className={`qk-status ${fc == null ? '' : fc <= target ? 'ok' : fc <= target + 5 ? 'warn' : 'danger'}`} onClick={() => go('panoramica')}>
              {fc != null && fc > target ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              <span><b>{fc == null ? `${mese.label}: ancora pochi dati` : `Food cost ${pct(fc)} · ${fc <= target ? 'in linea' : 'sopra'} l’obiettivo del ${target}%`}</b>
                <small>{`Ricavi del mese ${eur0(mRic.incasso)} · acquisti ${eur0(mAcq.tot)}`}</small></span>
            </button>
          ) : <span />}
          <div className="qk-head-btns">
            {ready && <button className="btn btn-sm qk-ask" onClick={() => setAsk(true)}><Sparkles /> Chiedi</button>}
            <LauncherButton onClick={() => setTools(true)} />
          </div>
        </div>
        {ready && canEdit && <QuickBar actions={actions} />}
        <input ref={fileIn} type="file" multiple hidden accept=".xml,.p7m,.pdf,image/*,application/xml,text/xml,application/pdf" onChange={(e) => { const f = e.target.files; if (f?.length) { setFiles(Array.from(f)); go('acquisti') } e.target.value = '' }} />

        <nav className="tabs-hub hz-tabs qk-tabs" aria-label="Gestione economica">
          {TABS.map((t) => <button key={t.key} className={tab === t.key ? 'on' : ''} style={mc(t.color)} onClick={() => go(t.key)}><span className="qk-tab-ic">{t.icon}</span> {t.label}{t.key === 'acquisti' && unpaid > 0 && <span className="badge">{unpaid}</span>}</button>)}
        </nav>
        {needsData && tab !== 'conto' && ready && (
          <div className="ec-period">
            <div className="seg">{PERIODS.map(([k2, l]) => <button key={k2} className={pk === k2 ? 'on' : ''} onClick={() => setPk(k2)}>{l}</button>)}</div>
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

        {tools && <Launcher title="Strumenti economici" onClose={() => setTools(false)} actions={[
          ...(ready && canEdit ? actions.map((a) => ({ ...a, group: 'Fai adesso' })) : []),
          ...TABS.map((t) => ({ key: 'tab-' + t.key, label: t.label, icon: t.icon, color: t.color, run: () => go(t.key), group: 'Sezioni' })),
        ]} />}
        {ask && <EconAsk p={p} onClose={() => setAsk(false)} go={go} />}
        {waste && <SprecoDrawer onClose={() => setWaste(false)} />}
      </div>
    </EnavCtx.Provider>
  )
}

function EconAsk({ p, onClose, go }: { p: ReturnType<typeof period>; onClose: () => void; go: (t: ETab) => void }) {
  const { recs } = useEcon()
  const { k, stock, ctx } = useHub()
  const ctxFn = () => {
    const fs = fatture(recs).filter((r) => inP(r.at, p)), vs = vendite(recs).filter((r) => inP(r.at, p))
    const a = acquisti(fs), r = ricavi(vs)
    const piatti = new Map<string, { venduti: number; ricavo: number; costoUnit: number | null }>()
    for (const v of vs) for (const x of v.data.righe || []) { const c = piatti.get(x.nome) || { venduti: 0, ricavo: 0, costoUnit: x.costo ?? null }; c.venduti += x.qta; c.ricavo += x.qta * x.prezzo; piatti.set(x.nome, c) }
    const sv = stockValue(stock, ctx)
    return {
      periodo: p.label, obiettivoFoodCost: k.fcTarget ?? 30,
      ricavi: Math.round(r.incasso), coperti: r.coperti, foodCostTeorico: r.fcTeorico, acquisti: { food: Math.round(a.food), beverage: Math.round(a.bev), nonFood: Math.round(a.nonfood) },
      foodCostReale: r.incasso ? (a.food / r.incasso) * 100 : null,
      abcAcquisti: abc(fs, 'tutto').list.slice(0, 15).map((x) => ({ prodotto: x.nome, spesa: Math.round(x.spesa), classe: x.classe })),
      piattiVenduti: [...piatti].map(([nome, x]) => ({ nome, ...x, prezzoMedio: x.venduti ? x.ricavo / x.venduti : null })),
      piattiInCarta: (k.piatti || []).filter((x: Piatto) => x.attivo).map((x: Piatto) => ({ nome: x.nome, prezzo: x.prezzo })),
      aumentiPrezzo: fs.flatMap((f) => f.data.righe.filter((x) => x.base && x.prezzoPrima && x.base.prezzo > x.prezzoPrima * 1.05).map((x) => ({ prodotto: x.nome, fornitore: f.data.fornitore, prima: x.prezzoPrima, ora: x.base!.prezzo }))),
      fattureDaPagare: fatture(recs).filter((f) => !f.data.pagata && f.data.totale > 0).map((f) => ({ fornitore: f.data.fornitore, totale: f.data.totale, scadenza: f.data.scadenza })),
      costiFissiMese: costiMese(costi(recs), monthKey()).map((c) => ({ voce: c.data.voce, categoria: c.data.categoria, importo: c.data.importo })),
      magazzino: { valore: Math.round(sv.tot), prodottiPiuCostosi: sv.items.slice(0, 8).map((i) => ({ nome: i.s.name, valore: Math.round(i.v) })) },
      sprechi: (k.wasteLog || []).filter((w: any) => inP(w.at, p)).map((w: any) => ({ prodotto: w.prodotto || w.nome, costo: w.costo, motivo: w.motivo })),
    }
  }
  return <AskDrawer title="Assistente food cost" onClose={onClose} context={ctxFn}
    intro="Sei un controller di gestione per ristoranti, esperto di food cost, menu engineering e acquisti."
    suggestions={['Perché il food cost è a questo livello e come lo abbasso?', 'Quali piatti dovrei togliere o riprezzare?', 'Dove sto spendendo di più e cosa posso trattare coi fornitori?', 'Quanto devo incassare al mese per stare in pari?']}
    tabs={TABS.map((t) => ({ key: t.key, label: t.label }))} onAction={(t) => go(t as ETab)} />
}

const MOTIVI = ['scaduto', 'rovinato', 'errore di preparazione', 'avanzo di servizio', 'caduto', 'altro']
function SprecoDrawer({ onClose }: { onClose: () => void }) {
  const { api, ctx, stock, toast } = useHub()
  const [nome, setNome] = useState('')
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('kg')
  const [motivo, setMotivo] = useState('scaduto')
  const pr = nome ? priceFor(nome, ctx) : null
  const b = toBase(qty, unit)
  const auto = pr && b && pr.dim === b.dim ? b.q * pr.perBase : null
  const names = [...new Set(stock.map((s) => s.name))]
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Registra uno spreco</span>}
      foot={<button className="btn btn-gold btn-lg" disabled={!nome.trim()} onClick={() => { api.logWaste({ prodotto: nome.trim(), qty, unit, motivo, costo: auto != null ? round(auto, 2) : null }); toast(`Spreco registrato${auto != null ? `: ${eur2(auto)}` : ''}`, 'success'); onClose() }}>Registra{auto != null ? ` · ${eur2(auto)}` : ''}</button>}>
      <label className="field"><span className="label">Cosa hai buttato</span><input className="input" list="ec-waste" autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="es. Gamberi rossi" /><datalist id="ec-waste">{names.map((n) => <option key={n} value={n} />)}</datalist></label>
      <div className="row"><Stepper value={qty} step={unit === 'pz' ? 1 : 0.1} onChange={setQty} />
        <select className="select" style={{ width: 'auto' }} value={unit} onChange={(e) => setUnit(e.target.value)}>{['kg', 'g', 'l', 'pz'].map((u) => <option key={u}>{u}</option>)}</select>
        <span className="small muted">{auto != null ? `valore ${eur2(auto)} dal listino` : nome ? 'nessun prezzo in listino' : ''}</span></div>
      <div className="hz-chips">{MOTIVI.map((m) => <button key={m} type="button" className={`pill ${motivo === m ? 'on' : ''}`} onClick={() => setMotivo(m)}>{m}</button>)}</div>
    </Drawer>
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
