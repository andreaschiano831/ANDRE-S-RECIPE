'use client'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Drawer, useHub } from '../hub/ui'
import { useHaccp } from './store'
import { F } from './bits'
import { OLIO_CASI, fmtDate, fmtTime, fmtWhen, isToday, num, parseNum, uid, type Fryer, type OlioData, type Rec } from './model'

export default function Olio() {
  const { cfg, recs, cfgUpsert, cfgRemove } = useHaccp()
  const { canEdit } = useHub()
  const [ask, setAsk] = useState<{ f: Fryer; caso: 1 | 2 | 3 } | null>(null)
  const [nome, setNome] = useState('')
  const all = recs.filter((r) => r.kind === 'olio') as Rec<OlioData>[]
  return (
    <div className="hz-mod">
      <p className="small muted">Ogni giorno, per ogni friggitrice, scegli il caso. Con il caso 2 o 3 ti chiedo se hai cambiato l’olio. Il limite di legge dei composti polari è 25%.</p>
      {cfg.fryers.map((f) => {
        const mine = all.filter((r) => r.data.fryerId === f.id)
        const today = mine.find((r) => isToday(r.at))
        const lastChange = mine.find((r) => r.data.cambio)
        return (
          <section key={f.id} className="panel hz-fryer">
            <div className="panel-head">
              <h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>{f.nome}</h3>
              <span className="small muted">{lastChange ? `olio cambiato ${fmtWhen(lastChange.at)}` : 'nessun cambio registrato'}</span>
              {canEdit && <button className="icon-btn" aria-label={`Togli ${f.nome}`} onClick={() => confirm(`Togliere ${f.nome}? Il registro resta.`) && cfgRemove('fryers', f.id)}><Trash2 size={15} /></button>}
            </div>
            <div className="hz-casi">
              {([1, 2, 3] as const).map((c) => (
                <button key={c} disabled={!canEdit} className={`hz-caso ${OLIO_CASI[c].tone} ${today?.data.caso === c ? 'on' : ''}`} onClick={() => setAsk({ f, caso: c })}>
                  <small>Caso {c}</small><b>{OLIO_CASI[c].label}</b><span>{OLIO_CASI[c].sub}</span>
                </button>
              ))}
            </div>
            {today && <p className="small" style={{ padding: '0 18px' }}>Oggi: <b>caso {today.data.caso}</b> alle {fmtTime(today.at)}{today.by_name ? ` (${today.by_name})` : ''}{today.data.cambio ? ' · olio cambiato' : ''}</p>}
            <div className="hz-table">
              <table>
                <thead><tr><th>Data</th><th>Ora</th><th>Caso</th><th>Polari</th><th>Cambio</th><th>Operatore</th></tr></thead>
                <tbody>
                  {mine.slice(0, 7).map((r) => (
                    <tr key={r.id}><td>{fmtDate(r.at)}</td><td>{fmtTime(r.at)}</td><td><span className={`hz-dot ${OLIO_CASI[r.data.caso].tone}`} /> {OLIO_CASI[r.data.caso].label}</td><td>{r.data.polari != null ? `${num(r.data.polari)}%` : '—'}</td><td>{r.data.cambio ? 'Sì' : 'No'}</td><td>{r.by_name || '—'}</td></tr>
                  ))}
                  {!mine.length && <tr><td colSpan={6} className="muted">Ancora nessuna registrazione.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
      {canEdit && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (nome.trim()) { cfgUpsert('fryers', { id: `f-${uid()}`, nome: nome.trim() }); setNome('') } }}>
          <input className="input" style={{ flex: 1, maxWidth: 320 }} placeholder="Nome nuova friggitrice" value={nome} onChange={(e) => setNome(e.target.value)} />
          <button className="btn" disabled={!nome.trim()}><Plus /> Aggiungi friggitrice</button>
        </form>
      )}
      {ask && <OlioDrawer {...ask} onClose={() => setAsk(null)} />}
    </div>
  )
}

function OlioDrawer({ f, caso, onClose }: { f: Fryer; caso: 1 | 2 | 3; onClose: () => void }) {
  const { add } = useHaccp()
  const { toast } = useHub()
  const [pol, setPol] = useState('')
  const [nota, setNota] = useState('')
  const p = parseNum(pol)
  const save = async (cambio: boolean) => {
    if (await add<OlioData>('olio', { fryerId: f.id, nome: f.nome, caso, cambio, polari: p, nota: nota || undefined })) {
      toast(`${f.nome}: caso ${caso}${cambio ? ', olio cambiato' : ''}`, caso === 1 ? 'success' : caso === 3 && !cambio ? 'error' : 'success'); onClose()
    }
  }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{f.nome}: caso {caso}</span>}
      foot={caso === 1 ? <button className="btn btn-gold btn-lg" onClick={() => save(false)}>Registra olio conforme</button>
        : <div className="row"><button className="btn" style={{ flex: 1 }} onClick={() => save(false)}>{caso === 3 ? 'Non ancora cambiato' : 'Lo tengo, controllo domani'}</button><button className="btn btn-gold" style={{ flex: 1 }} onClick={() => save(true)}>Ho cambiato l’olio</button></div>}>
      <div className={`hz-banner ${OLIO_CASI[caso].tone === 'ok' ? 'ok' : OLIO_CASI[caso].tone === 'warn' ? '' : 'danger'}`}><b>{OLIO_CASI[caso].label}</b><span>{caso === 1 ? 'Nessuna azione.' : caso === 2 ? 'Filtra l’olio, rabbocca e ricontrolla domani; se peggiora va cambiato.' : 'L’olio va sostituito prima del prossimo servizio.'}</span></div>
      <F label="Composti polari % (facoltativo, se hai il tester)"><input className={`input ${p != null && p >= 25 ? 'bad' : ''}`} inputMode="decimal" value={pol} onChange={(e) => setPol(e.target.value)} placeholder="es. 18" /></F>
      {p != null && p >= 25 && <p className="small fc-danger">Oltre il 25%: l’olio non è più utilizzabile.</p>}
      <F label="Nota"><input className="input" value={nota} onChange={(e) => setNota(e.target.value)} /></F>
    </Drawer>
  )
}
