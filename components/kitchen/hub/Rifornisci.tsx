'use client'
import { useMemo, useState } from 'react'
import { ArrowRightLeft, ClipboardList, PackageOpen } from 'lucide-react'
import { Drawer, Stepper, useHub } from './ui'
import { available, describe, refillOps, sourcesFor, LOC_LABEL } from './ops'
import { fromBase, partitaLabel, round, toBase, type StockItem } from './model'

const stepFor = (u: string) => (u === 'kg' || u === 'l' ? 0.1 : u === 'g' || u === 'ml' ? 50 : 1)

/** voci di linea al minimo: chiede quanto portare dal magazzino (o cosa preparare) */
export default function Rifornisci({ items, onClose, reason }: { items: StockItem[]; onClose: () => void; reason?: string }) {
  const { api, k, toast } = useHub()
  const rows = useMemo(() => items.map((it) => {
    const live = (k.counter || []).find((s: StockItem) => s.id === it.id) || it
    const src = sourcesFor(live, k)
    const avail = available(src, live.unit)
    const min = live.parLevel || 0
    const want = Math.max(0, min * 2 - live.quantity) || min || stepFor(live.unit) * 10
    return { it: live, src, avail, want: round(Math.min(want, avail || want), 3) }
  }), [items, k])
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(rows.map((r) => [r.it.id, r.want])))
  const [done, setDone] = useState<Record<string, string>>({})

  function move(r: (typeof rows)[number]) {
    const q = Math.min(qty[r.it.id] || 0, r.avail)
    const { ops, moved } = refillOps(r.it, q, r.src)
    if (!ops.length) { toast('Niente da spostare', 'error'); return }
    api.stockOps(ops)
    setDone((d) => ({ ...d, [r.it.id]: `+${describe(moved, r.it.unit)} in linea` }))
    toast(`${r.it.name}: ${describe(moved, r.it.unit)} dal magazzino alla linea`, 'success')
  }
  function prep(r: (typeof rows)[number]) {
    const b = toBase(qty[r.it.id] || r.want, r.it.unit)
    const q = b ? fromBase(b.q, b.dim, r.it.unit) : { qty: 1, unit: r.it.unit }
    api.prepAddFull({ nome: r.it.name, quantita: q.qty, unitaMisura: q.unit, recipeId: r.it.recipeId ?? null, partita: r.it.partita || 'antipasti', note: 'Per rifornire la linea' })
    setDone((d) => ({ ...d, [r.it.id]: 'in preparazione' }))
    toast(`${r.it.name}: preparazione aggiunta`, 'success')
  }

  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Rifornisci la linea</span>}
      foot={<div className="row"><span className="small muted" style={{ flex: 1 }}>Puoi chiudere e farlo dopo: le voci restano in «Da rimpiazzare».</span><button className="btn btn-gold" onClick={onClose}>Fatto</button></div>}>
      {reason && <p className="small" style={{ background: 'var(--warn-soft)', padding: '10px 12px', borderRadius: 12 }}>{reason}</p>}
      {rows.map((r) => {
        const min = r.it.parLevel || 0
        return (
          <section key={r.it.id} className="panel" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="row" style={{ alignItems: 'baseline' }}>
              <b style={{ flex: 1, fontWeight: 600 }}>{r.it.name}</b>
              <span className="small muted">{partitaLabel(r.it.partita)}</span>
            </div>
            <div className="row small" style={{ gap: 14 }}>
              <span>In linea <b className={r.it.quantity < min ? 'fc-danger' : ''}>{describe(r.it.quantity, r.it.unit)}</b></span>
              {min > 0 && <span className="muted">minimo {describe(min, r.it.unit)}</span>}
              <span className="muted"><PackageOpen size={13} style={{ verticalAlign: '-2px' }} /> in magazzino {r.avail > 0 ? describe(r.avail, r.it.unit) : 'niente'}
                {r.src.length > 0 && ` (${[...new Set(r.src.map((s) => LOC_LABEL[s.location]))].join(', ')})`}</span>
            </div>
            {done[r.it.id] ? <span className="chip chip-ok" style={{ alignSelf: 'flex-start' }}>{done[r.it.id]}</span> : (
              <div className="row">
                <span className="small muted">Quanto?</span>
                <Stepper value={qty[r.it.id] ?? r.want} step={stepFor(r.it.unit)} unit={r.it.unit} onChange={(v) => setQty((x) => ({ ...x, [r.it.id]: v }))} />
                {r.avail > 0 && <button className="btn btn-gold btn-sm" onClick={() => move(r)}><ArrowRightLeft /> Porta in linea</button>}
                <button className="btn btn-sm" onClick={() => prep(r)}><ClipboardList /> Prepara</button>
              </div>
            )}
          </section>
        )
      })}
    </Drawer>
  )
}
