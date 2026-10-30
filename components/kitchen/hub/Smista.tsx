'use client'
import { useState } from 'react'
import { Check, Snowflake, Refrigerator, Rows3, Warehouse } from 'lucide-react'
import { Drawer, Stepper, useHub } from './ui'
import { describe, smistaOps, type Part } from './ops'
import { PARTITE, round, type Prep } from './model'

const DEST = [
  { location: 'counter' as const, label: 'Linea', icon: Rows3, days: 2 },
  { location: 'fridge' as const, label: 'Frigo', icon: Refrigerator, days: 3 },
  { location: 'freezer' as const, label: 'Freezer', icon: Snowflake, days: 30 },
  { location: 'dry' as const, label: 'Dispensa', icon: Warehouse, days: 15 },
]
const stepFor = (u: string) => (u === 'kg' || u === 'l' ? 0.1 : u === 'g' || u === 'ml' ? 100 : 1)

/** preparazione finita: quanta ne hai fatta e dove va (anche divisa tra linea e magazzino) */
export default function Smista({ p, onClose, defaultTo = 'counter' }: { p: Prep; onClose: () => void; defaultTo?: Part['location'] }) {
  const { api, k, toast } = useHub()
  const [made, setMade] = useState(p.quantita)
  const [parts, setParts] = useState<Part[]>(() => DEST.map((d) => ({ location: d.location, partita: p.partita || p.reparto || 'antipasti', qty: d.location === defaultTo ? p.quantita : 0, days: d.days })))
  const assigned = parts.reduce((t, x) => t + (x.qty || 0), 0)
  const left = round(made - assigned, 3)
  const upd = (loc: Part['location'], patch: Partial<Part>) => setParts((xs) => xs.map((x) => (x.location === loc ? { ...x, ...patch } : x)))
  const changeMade = (v: number) => {
    // la differenza va (o si toglie) dalla destinazione principale
    const diff = v - made
    setMade(v)
    setParts((xs) => { const main = [...xs].sort((a, b) => b.qty - a.qty)[0]; return xs.map((x) => (x === main ? { ...x, qty: Math.max(0, round(x.qty + diff, 3)) } : x)) })
  }

  /** tocco su una destinazione: prende il non assegnato, oppure metà della destinazione più piena */
  function toggle(loc: Part['location']) {
    const cur = parts.find((x) => x.location === loc)!
    if (cur.qty > 0) { upd(loc, { qty: 0 }); return }
    if (left > 0) { upd(loc, { qty: left }); return }
    const main = [...parts].sort((a, b) => b.qty - a.qty)[0]
    if (!main || main.qty <= 0) { upd(loc, { qty: made }); return }
    const half = round(main.qty / 2, 3)
    setParts((xs) => xs.map((x) => (x.location === main.location ? { ...x, qty: round(x.qty - half, 3) } : x.location === loc ? { ...x, qty: half } : x)))
  }

  function confirm() {
    const { ops, dest } = smistaOps({ ...p, quantita: made }, parts, k)
    const now = new Date().toISOString()
    api.stockOps(ops, { prep: { id: p.id, patch: { status: 'smistata', quantita: made, svoltaIl: p.svoltaIl || now, smistataIl: now, destinazione: dest || null } } })
    toast(dest ? `${p.nome}: ${dest}` : `${p.nome} fatta`, 'success')
    onClose()
  }

  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{p.nome}: smista</span>}
      foot={<>
        <div className="row small">
          <span style={{ flex: 1 }}>{left > 0 ? <span className="fc-warn">{describe(left, p.unitaMisura)} non assegnati: non verranno caricati</span> : left < 0 ? <span className="fc-danger">Hai assegnato {describe(-left, p.unitaMisura)} in più del fatto</span> : 'Tutto assegnato'}</span>
        </div>
        <div className="row"><button className="btn" style={{ marginLeft: 'auto' }} onClick={onClose}>Annulla</button><button className="btn btn-gold" disabled={left < 0} onClick={confirm}><Check /> Conferma</button></div>
      </>}>
      <div className="stack" style={{ gap: 8 }}>
        <span className="label">Quanta ne hai fatta</span>
        <Stepper value={made} step={stepFor(p.unitaMisura)} unit={p.unitaMisura} onChange={changeMade} />
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <span className="label">Dove va</span>
        {DEST.map((d) => {
          const part = parts.find((x) => x.location === d.location)!
          const Icon = d.icon
          return (
            <div key={d.location} className={`smista-row ${part.qty > 0 ? 'on' : ''}`}>
              <button type="button" className="smista-head" onClick={() => toggle(d.location)}>
                <Icon size={18} /> <b>{d.label}</b>
                <span className="small muted" style={{ marginLeft: 'auto' }}>{part.qty > 0 ? describe(part.qty, p.unitaMisura) : 'tocca per assegnare'}</span>
              </button>
              {part.qty > 0 && (
                <div className="smista-body">
                  <Stepper value={part.qty} step={stepFor(p.unitaMisura)} unit={p.unitaMisura} onChange={(v) => upd(d.location, { qty: v })} />
                  {d.location === 'counter' && (
                    <select className="select" style={{ width: 'auto' }} value={part.partita} onChange={(e) => upd(d.location, { partita: e.target.value })} aria-label="Partita">
                      {PARTITE.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                    </select>
                  )}
                  <span className="row small muted" style={{ gap: 6 }}>valida <Stepper value={part.days} step={1} min={1} unit="gg" onChange={(v) => upd(d.location, { days: Math.round(v) })} /></span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Drawer>
  )
}
