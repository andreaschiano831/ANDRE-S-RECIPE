'use client'
import { useMemo, useState } from 'react'
import { useHub, go } from '../hub/ui'
import { useEcon } from './store'
import { HBars, Kpi } from './charts'
import { stockValue } from './Panoramica'
import { acquisti, eur0, eur2, fatture, inP, type Period } from './model'

const LOC: Record<string, string> = { fridge: 'Frigo', freezer: 'Congelatore', dry: 'Dispensa', counter: 'Linea' }

export default function Magazzino({ p }: { p: Period }) {
  const { recs } = useEcon()
  const { stock, ctx, k } = useHub()
  const [loc, setLoc] = useState('tutto')
  const sv = useMemo(() => stockValue(stock, ctx), [stock, ctx])
  const acqFood = acquisti(fatture(recs).filter((r) => inP(r.at, p))).food
  // rotazione stimata: consumi (≈ acquisti food) annualizzati sul valore medio, qui il valore di oggi
  const rot = sv.tot ? (acqFood / sv.tot) * (365 / p.days) : null
  const copertura = acqFood ? sv.tot / (acqFood / p.days) : null
  const now = Date.now()
  const rischio = sv.items.filter((i) => i.s.expiresAt && new Date(i.s.expiresAt).getTime() - now < 72 * 36e5)
  const sprechi = (k.wasteLog || []).filter((w: any) => inP(w.at, p))
  const sprechiV = sprechi.reduce((s: number, w: any) => s + (Number(w.costo) || 0), 0)
  const items = sv.items.filter((i) => loc === 'tutto' || i.s.location === loc)
  return (
    <div className="ec-mod">
      <div className="ec-kpis">
        <Kpi label="Valore magazzino" value={eur0(sv.tot)} sub={sv.senzaPrezzo ? `${sv.senzaPrezzo} prodotti senza prezzo, esclusi` : 'tutte le giacenze hanno un prezzo'} tone={sv.senzaPrezzo ? 'warn' : ''} />
        <Kpi label="Rotazione stimata" value={rot == null ? '—' : `${Math.round(rot)} volte/anno`} sub="acquisti food del periodo sul valore di oggi" />
        <Kpi label="Giorni di scorta" value={copertura == null ? '—' : `${Math.round(copertura)} gg`} sub="quanto dura il magazzino al ritmo di acquisto" />
        <Kpi label="A rischio scadenza" value={eur0(rischio.reduce((s, i) => s + i.v, 0))} sub={`${rischio.length} prodotti entro 72 ore`} tone={rischio.length ? 'warn' : 'ok'} onClick={() => go('giacenze')} />
        <Kpi label="Sprechi nel periodo" value={eur0(sprechiV)} sub={sv.tot ? `${sprechi.length} registrazioni` : ''} tone={sprechiV ? 'danger' : ''} />
      </div>
      <div className="ec-cols">
        <section className="panel ec-panel">
          <div className="panel-head"><h3 className="h2 ec-h">Valore per posizione</h3></div>
          <div className="ec-pad"><HBars rows={Object.entries(LOC).map(([k2, l]) => ({ label: l, value: sv.by[k2] || 0 }))} /></div>
        </section>
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><h3 className="h2 ec-h" style={{ flex: 1 }}>Dove è fermo il denaro</h3>
            <select className="select" style={{ width: 'auto', padding: '5px 9px' }} value={loc} onChange={(e) => setLoc(e.target.value)}><option value="tutto">Tutto</option>{Object.entries(LOC).map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}</select></div>
          {items.slice(0, 14).map(({ s, v }) => (
            <div key={s.id} className="trow"><span className="nm"><b>{s.name}</b><small>{LOC[s.location] || s.location} · {s.quantity} {s.unit}</small></span><b className="tnum">{v ? eur2(v) : <span className="small muted">senza prezzo</span>}</b></div>
          ))}
          {!items.length && <p className="trow small muted">Nessuna giacenza.</p>}
        </section>
      </div>
      <p className="small muted">I prezzi vengono dal listino (aggiornato dalle fatture) o dal costo delle ricette per le preparazioni.</p>
    </div>
  )
}
