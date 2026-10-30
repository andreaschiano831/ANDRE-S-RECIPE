'use client'
import { useMemo, useState } from 'react'
import { ArrowUpRight, Boxes, Coins, FileUp, PiggyBank, ReceiptText, ShoppingCart, Store, Target, UtensilsCrossed, Wallet } from 'lucide-react'
import { MC } from '../quick/Quick'
import { useHub } from '../hub/ui'
import { priceFor, toBase, type RecipeCost, type StockItem, type Ctx } from '../hub/model'
import { useEcon } from './store'
import { useEnav } from './nav'
import { Bars, HBars, Kpi } from './charts'
import { CAT_LABEL, abc, acquisti, buckets, eur0, eur2, fatture, fmtDay, inP, pct, ricavi, sumIn, vendite, type Cat, type Period } from './model'

export function stockValue(stock: StockItem[], ctx: Ctx, cache = new Map<string, RecipeCost>()) {
  let tot = 0; const by: Record<string, number> = {}; const items: { s: StockItem; v: number }[] = []
  for (const x of stock) {
    const b = toBase(x.quantity, x.unit); const pr = priceFor(x.name, ctx, new Set(), cache)
    const v = b && pr && pr.dim === b.dim ? b.q * pr.perBase : 0
    tot += v; by[x.location] = (by[x.location] || 0) + v; items.push({ s: x, v })
  }
  return { tot, by, items: items.sort((a, b) => b.v - a.v), senzaPrezzo: items.filter((i) => !i.v).length }
}

export default function Panoramica({ p }: { p: Period }) {
  const { recs, update } = useEcon()
  const { k, stock, ctx, canEdit, toast } = useHub()
  const nav = useEnav()
  const [cat, setCat] = useState<Cat | 'tutto'>('tutto')
  const target: number = k.fcTarget ?? 30
  const fs = fatture(recs).filter((r) => inP(r.at, p))
  const vs = vendite(recs).filter((r) => inP(r.at, p))
  const acq = acquisti(fs)
  const ric = ricavi(vs)
  const fcReale = ric.incasso ? (acq.food / ric.incasso) * 100 : null
  const bevPct = ric.incasso ? (acq.bev / ric.incasso) * 100 : null
  const sv = useMemo(() => stockValue(stock, ctx), [stock, ctx])
  const sprechi = (k.wasteLog || []).filter((w: any) => inP(w.at, p)).reduce((s: number, w: any) => s + (Number(w.costo) || 0), 0)
  const acqSel = cat === 'tutto' ? acq.tot : acq[cat]

  const bs = buckets(p)
  const lineCat = (r: any) => (cat === 'tutto' ? r.data.imponibile : (r.data.righe || []).filter((x: any) => x.cat === cat).reduce((s: number, x: any) => s + x.totale, 0))
  const a = abc(fs, cat === 'tutto' ? 'tutto' : cat)
  const top = useMemo(() => {
    const m = new Map<string, { nome: string; qta: number; ricavo: number }>()
    for (const v of vs) for (const r of v.data.righe || []) { const c = m.get(r.nome) || { nome: r.nome, qta: 0, ricavo: 0 }; c.qta += r.qta; c.ricavo += r.qta * r.prezzo; m.set(r.nome, c) }
    return [...m.values()].sort((x, y) => y.qta - x.qta).slice(0, 8)
  }, [vs])
  const daPagare = fatture(recs).filter((f) => !f.data.pagata && f.data.totale > 0).sort((x, y) => (x.data.scadenza || x.data.data).localeCompare(y.data.scadenza || y.data.data))
  const aumenti = fatture(recs).slice(0, 30).flatMap((f) => (f.data.righe || []).filter((r) => r.base && r.prezzoPrima && r.base.prezzo > r.prezzoPrima * 1.05).map((r) => ({ f, r, d: ((r.base!.prezzo - r.prezzoPrima!) / r.prezzoPrima!) * 100 }))).slice(0, 6)
  const empty = !fatture(recs).length && !vendite(recs).length

  return (
    <div className="ec-mod">
      {empty && (
        <section className="panel ec-start">
          <h2 className="dish">Da dove partire</h2>
          <div className="ec-steps">
            <button onClick={() => nav.go('acquisti')}><FileUp /><b>Carica le fatture</b><span>File XML della fattura elettronica, PDF o foto: prezzi, listino e magazzino si aggiornano da soli.</span></button>
            <button onClick={() => nav.go('vendite')}><ReceiptText /><b>Chiudi le giornate</b><span>Le uscite del Servizio diventano vendite: aggiungi coperti e incasso di cassa.</span></button>
            <button onClick={() => nav.go('conto')}><Wallet /><b>Aggiungi i costi fissi</b><span>Personale, affitto, utenze: servono per margine e punto di pareggio.</span></button>
          </div>
        </section>
      )}

      <div className="hub-bar">
        <span className="small muted grow">{p.label} · {fmtDay(p.from.toISOString())} – {fmtDay(p.to.toISOString())}</span>
        <div className="seg">{(['tutto', 'food', 'bev', 'nonfood'] as const).map((c) => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c === 'tutto' ? 'Tutto' : CAT_LABEL[c]}</button>)}</div>
      </div>

      <div className="ec-kpis">
        <Kpi icon={<Coins />} color={MC.blu} label="Ricavi" value={eur0(ric.incasso)} sub={ric.coperti ? `${ric.coperti} coperti · scontrino medio ${eur2(ric.incasso / ric.coperti)}` : `${vs.length} giornate registrate`} onClick={() => nav.go('vendite')} />
        <Kpi icon={<ShoppingCart />} color={MC.arancio} label={`Acquisti ${cat === 'tutto' ? '' : CAT_LABEL[cat].toLowerCase()}`} value={eur0(acqSel)} sub={`${fs.length} fatture · IVA esclusa`} onClick={() => nav.go('acquisti')} />
        <Kpi icon={<Target />} color={MC.verde} label="Food cost reale" value={pct(fcReale)} tone={fcReale == null ? '' : fcReale <= target ? 'ok' : fcReale <= target + 5 ? 'warn' : 'danger'} sub={`acquisti food su ricavi · obiettivo ${target}%`} />
        <Kpi icon={<UtensilsCrossed />} color={MC.viola} label="Food cost teorico" value={pct(ric.fcTeorico)} sub={ric.fcTeorico != null && fcReale != null ? `scarto ${pct(fcReale - ric.fcTeorico)}: sprechi, porzioni, scorte` : 'dalle ricette dei piatti venduti'} onClick={() => nav.go('foodcost')} />
        <Kpi icon={<PiggyBank />} color={MC.teal} label="Margine sulle materie" value={eur0(ric.incasso - acq.tot)} tone={ric.incasso ? (ric.incasso - acq.tot >= 0 ? 'ok' : 'danger') : ''} sub={bevPct != null ? `beverage cost ${pct(bevPct)}` : 'ricavi meno acquisti'} />
        <Kpi icon={<Boxes />} color={MC.oro} label="Valore magazzino" value={eur0(sv.tot)} sub={`oggi · sprechi nel periodo ${eur0(sprechi)}`} onClick={() => nav.go('magazzino')} />
      </div>

      <section className="panel ec-panel">
        <div className="panel-head"><h3 className="h2 ec-h">Ricavi e acquisti</h3><span className="small muted">{p.days <= 31 ? 'per giorno' : p.days <= 120 ? 'per settimana' : 'per mese'}</span></div>
        <div className="ec-pad">
          <Bars labels={bs.map((b) => b.label)} series={[
            { name: 'Ricavi', color: 'var(--ink-2)', values: bs.map((b) => sumIn(vs, b, (r) => r.data.incasso || 0)) },
            { name: cat === 'tutto' ? 'Acquisti' : `Acquisti ${CAT_LABEL[cat].toLowerCase()}`, color: 'var(--accent)', values: bs.map((b) => sumIn(fs, b, lineCat)) },
          ]} />
        </div>
      </section>

      <div className="ec-cols">
        <section className="panel ec-panel">
          <div className="panel-head"><h3 className="h2 ec-h">Analisi ABC degli acquisti</h3><span className="small muted">{eur0(a.tot)}</span></div>
          <div className="ec-pad">
            {a.list.length ? <HBars rows={a.list.slice(0, 10).map((x) => ({ label: x.nome, value: x.spesa, tag: x.classe, sub: pct(x.quota) }))} /> : <p className="small muted">Carica le fatture del periodo per vedere su quali prodotti si concentra la spesa.</p>}
            {a.list.length > 0 && <p className="small muted" style={{ marginTop: 10 }}>A = l’80% della spesa ({a.list.filter((x) => x.classe === 'A').length} prodotti): sono quelli da trattare sul prezzo e controllare negli sprechi.</p>}
          </div>
        </section>
        <section className="panel ec-panel">
          <div className="panel-head"><h3 className="h2 ec-h">Piatti più venduti</h3></div>
          <div className="ec-pad">
            {top.length ? <HBars rows={top.map((x) => ({ label: x.nome, value: x.qta, sub: eur0(x.ricavo) }))} fmt={(n) => `${n} porz.`} /> : <p className="small muted">Le vendite arrivano dal Servizio quando chiudi la giornata.</p>}
          </div>
        </section>
      </div>

      <div className="ec-cols">
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><Wallet size={17} color="var(--accent)" /><h3 className="h2 ec-h" style={{ flex: 1 }}>Fatture da pagare</h3><span className="small muted">{eur0(daPagare.reduce((s, f) => s + f.data.totale, 0))}</span></div>
          {!daPagare.length && <p className="trow small muted">Nessuna fattura in sospeso.</p>}
          {daPagare.slice(0, 6).map((f) => {
            const d = f.data.scadenza ? Math.round((new Date(f.data.scadenza + 'T12:00').getTime() - Date.now()) / 864e5) : null
            return (
              <div key={f.id} className="trow">
                <span className="nm"><b>{f.data.fornitore}</b><small>n. {f.data.numero} · {fmtDay(f.data.data)}</small></span>
                {d != null && <span className={`chip ${d < 0 ? 'chip-danger' : d <= 7 ? 'chip-warn' : ''}`}>{d < 0 ? `scaduta ${fmtDay(f.data.scadenza!)}` : `scade ${fmtDay(f.data.scadenza!)}`}</span>}
                <b className="tnum">{eur2(f.data.totale)}</b>
                {canEdit && <button className="btn btn-sm" onClick={async () => { if (await update(f.id, { pagata: true, pagataIl: new Date().toISOString() })) toast(`Pagata: ${f.data.fornitore} ${eur2(f.data.totale)}`, 'success') }}>Pagata</button>}
              </div>
            )
          })}
        </section>
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><ArrowUpRight size={17} color="var(--danger)" /><h3 className="h2 ec-h" style={{ flex: 1 }}>Prezzi aumentati</h3><span className="small muted">oltre il 5%</span></div>
          {!aumenti.length && <p className="trow small muted">Nessun aumento nelle ultime fatture.</p>}
          {aumenti.map(({ f, r, d }, i) => (
            <div key={i} className="trow">
              <span className="nm"><b>{r.nome}</b><small>{f.data.fornitore} · {fmtDay(f.data.data)}</small></span>
              <span className="small muted tnum">{eur2(r.prezzoPrima!)} → {eur2(r.base!.prezzo)}/{r.base!.unita}</span>
              <span className="chip chip-danger">+{pct(d, 0)}</span>
            </div>
          ))}
        </section>
      </div>
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => nav.go('magazzino')}><Store /> Valore del magazzino per posizione</button>
    </div>
  )
}
