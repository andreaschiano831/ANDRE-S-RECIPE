'use client'
import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, History, Minus, Plus, Undo2, UtensilsCrossed } from 'lucide-react'
import { useHub } from './ui'
import Rifornisci from './Rifornisci'
import { applyPreview, crossedMin, describe, fireOps, sameThing, uid, underMin, type LogEntry } from './ops'
import { componentiOf, copertura, lineaItems, PIATTO_CATEGORIE, toBase, type Piatto, type StockItem } from './model'

const today = () => new Date().toISOString().slice(0, 10)

/** servizio: ogni piatto uscito scala dalla linea le sue preparazioni */
export default function ServizioHub({ legacy }: { legacy?: React.ReactNode }) {
  const [tab, setTab] = useState<'pass' | 'live'>('pass')
  return (
    <div className="hub">
      <div className="tabs-hub">
        <button className={tab === 'pass' ? 'on' : ''} onClick={() => setTab('pass')}>Servizio</button>
        <button className={tab === 'live' ? 'on' : ''} onClick={() => setTab('live')}>Stazioni e calendario</button>
      </div>
      {tab === 'pass' ? <Pass /> : legacy}
    </div>
  )
}

function Pass() {
  const { api, k, toast, canEdit } = useHub()
  const linea = lineaItems(k)
  const piatti: Piatto[] = (k.piatti || []).filter((p: Piatto) => p.attivo)
  const log: LogEntry[] = (k.servizioLog || []).filter((l: LogEntry) => l.at.startsWith(today()))
  const live = log.filter((l) => !l.undone)
  const served = live.reduce((t, l) => t + l.porzioni, 0)
  const [cat, setCat] = useState('tutti')
  const [refill, setRefill] = useState<{ items: StockItem[]; reason?: string } | null>(null)
  const [multi, setMulti] = useState<Record<string, number>>({})
  const [showLog, setShowLog] = useState(false)
  const toFix = underMin(linea)
  const empty = linea.filter((s) => s.quantity <= 0 && !(s.parLevel || 0))
  const servedBy = useMemo(() => { const m = new Map<string, number>(); live.forEach((l) => m.set(l.piattoId, (m.get(l.piattoId) || 0) + l.porzioni)); return m }, [live])

  function fire(p: Piatto, n: number) {
    if (!canEdit || n <= 0) return
    const { ops, short, notInLinea } = fireOps(p, n, linea)
    const crossed = crossedMin(linea, ops)
    const entry: LogEntry = { id: uid(), at: new Date().toISOString(), piattoId: p.id, nome: p.nome, porzioni: n, deltas: ops.filter((o): o is { id: string; delta: number } => 'id' in o).map((o) => ({ id: o.id, delta: o.delta })) }
    api.stockOps(ops, { log: entry })
    setMulti((m) => ({ ...m, [p.id]: 1 }))
    const msg = [`${n} × ${p.nome}`]
    if (short.length) msg.push(`mancano in linea: ${short.map((s) => s.nome).join(', ')}`)
    else if (notInLinea.length && !ops.length) msg.push('nessuna preparazione in linea da scalare')
    toast(msg.join(' · '), short.length ? 'error' : 'success')
    // arrivati al minimo: chiede quanto portare dal magazzino
    if (crossed.length) {
      const after = applyPreview(linea, ops)
      setRefill({ items: crossed.map((s) => ({ ...s, quantity: after.get(s.id) ?? s.quantity })), reason: `${crossed.map((s) => s.name).join(', ')} ${crossed.length === 1 ? 'è arrivata' : 'sono arrivate'} al minimo in linea. Quanto vuoi portare dal magazzino?` })
    }
  }
  function undo(l: LogEntry) {
    api.stockOps(l.deltas.map((d) => ({ id: d.id, delta: -d.delta, keep: true })), { undoLogId: l.id })
    toast(`Annullato: ${l.porzioni} × ${l.nome}`, 'success')
  }

  const shown = piatti.filter((p) => cat === 'tutti' || p.categoria === cat)
  const cats = PIATTO_CATEGORIE.filter((c) => piatti.some((p) => p.categoria === c.key))

  return (
    <>
      <div className="hub-stats">
        <div className="stat"><b>{served}</b><span>porzioni uscite oggi</span></div>
        <button className={`stat ${toFix.length ? 'warn' : 'ok'}`} onClick={() => toFix.length && setRefill({ items: toFix })}><b>{toFix.length}</b><span>preparazioni al minimo in linea</span></button>
        <button className="stat" onClick={() => setShowLog((v) => !v)}><b>{live.length}</b><span>uscite registrate · {showLog ? 'nascondi' : 'vedi'} elenco</span></button>
      </div>

      {(toFix.length > 0 || empty.length > 0) && (
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head">
            <AlertTriangle size={17} color="var(--warn)" />
            <h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Da rimpiazzare</h3>
            {canEdit && toFix.length > 0 && <button className="btn btn-gold btn-sm" onClick={() => setRefill({ items: toFix })}><ArrowRightLeft /> Rifornisci</button>}
          </div>
          {[...toFix, ...empty].map((s) => (
            <div key={s.id} className="trow">
              <span className="nm"><b>{s.name}</b><small>in linea {describe(s.quantity, s.unit)}{s.parLevel ? ` · minimo ${describe(s.parLevel, s.unit)}` : ' · finita'}</small></span>
              {canEdit && <button className="btn btn-sm" onClick={() => setRefill({ items: [s] })}>Rifornisci</button>}
            </div>
          ))}
        </section>
      )}

      {showLog && (
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><History size={17} /><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Uscite di oggi</h3></div>
          {!log.length && <p className="trow small muted">Ancora nessuna uscita.</p>}
          {log.map((l) => (
            <div key={l.id} className="trow" style={{ opacity: l.undone ? 0.5 : 1 }}>
              <span className="nm"><b>{l.porzioni} × {l.nome}</b><small>{new Date(l.at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}{l.undone ? ' · annullata' : ''}</small></span>
              {canEdit && !l.undone && <button className="btn btn-sm" onClick={() => undo(l)}><Undo2 /> Annulla</button>}
            </div>
          ))}
        </section>
      )}

      {cats.length > 1 && (
        <div className="pills">
          <button className={`pill ${cat === 'tutti' ? 'on' : ''}`} onClick={() => setCat('tutti')}>Tutti</button>
          {cats.map((c) => <button key={c.key} className={`pill ${cat === c.key ? 'on' : ''}`} onClick={() => setCat(c.key)}>{c.label}</button>)}
        </div>
      )}

      {!piatti.length ? (
        <div className="panel empty">
          <UtensilsCrossed size={30} strokeWidth={1.3} />
          <span className="dish">Nessun piatto in carta</span>
          <p style={{ maxWidth: '46ch' }}>Componi i piatti con le preparazioni della linea (sezione Piatti): qui ogni uscita scalerà le quantità dalla linea.</p>
        </div>
      ) : (
        <div className="pass-grid">
          {shown.map((p) => {
            const cov = copertura(p, linea).porzioni
            const n = multi[p.id] || 1
            const comps = componentiOf(p).filter((c) => toBase(c.qty, c.unit))
            const last = live.find((l) => l.piattoId === p.id)
            return (
              <div key={p.id} className="pass-card">
                <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{p.nome}</h3>
                    <span className="small muted">{servedBy.get(p.id) ? `${servedBy.get(p.id)} uscite oggi` : 'nessuna uscita oggi'}</span>
                  </div>
                  <span className={`pass-cov ${cov == null ? '' : cov === 0 ? 'none' : cov < 10 ? 'low' : 'ok'}`} title="porzioni coperte dalla linea">{cov == null ? '—' : cov}</span>
                </div>
                <div className="pass-comps">
                  {comps.map((c) => {
                    const items = linea.filter((s) => sameThing(s, c.recipeId, c.nome))
                    const it = items[0]
                    const low = items.some((s) => (s.parLevel || 0) > 0 && s.quantity <= (s.parLevel || 0))
                    const out = items.length > 0 && items.every((s) => s.quantity <= 0)
                    return <span key={c.id} className={`pass-comp ${!items.length ? 'off' : out ? 'out' : low ? 'low' : ''}`} title={it ? `in linea ${describe(items.reduce((t, s) => t + s.quantity, 0), it.unit)}` : 'non in linea'}>{c.nome}</span>
                  })}
                </div>
                {canEdit && (
                  <div className="pass-actions">
                    <span className="stepper" style={{ height: 44 }}>
                      <button type="button" onClick={() => setMulti((m) => ({ ...m, [p.id]: Math.max(1, n - 1) }))} aria-label="Meno"><Minus size={15} /></button>
                      <input readOnly value={n} aria-label="Porzioni" style={{ width: 40 }} />
                      <button type="button" onClick={() => setMulti((m) => ({ ...m, [p.id]: n + 1 }))} aria-label="Più"><Plus size={15} /></button>
                    </span>
                    <button className="btn btn-gold pass-fire" onClick={() => fire(p, n)}>Esce{n > 1 ? ` × ${n}` : ''}</button>
                    {last && <button className="icon-btn" title={`Annulla ${last.porzioni} × ${p.nome}`} onClick={() => undo(last)} aria-label="Annulla l’ultima uscita"><Undo2 size={16} /></button>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {refill && <Rifornisci items={refill.items} reason={refill.reason} onClose={() => setRefill(null)} />}
    </>
  )
}
