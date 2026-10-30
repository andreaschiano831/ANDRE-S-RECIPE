'use client'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRightLeft, Plus, Snowflake, Tag, ThermometerSnowflake, Trash2 } from 'lucide-react'
import { Drawer, useHub } from '../hub/ui'
import Smista from '../hub/Smista'
import { useHaccp } from './store'
import { useNav } from './nav'
import { F, Seg } from './bits'
import { ABB, addDays, dayKey, fmtDate, fmtTime, fmtWhen, abbState, iso, lotto, num, parseNum, type AbbData, type Rec, type RicData } from './model'
import type { Prep } from '../hub/model'

function useNow(ms = 15000) { const [n, setN] = useState(Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t) }, [ms]); return n }

export default function Abbattimenti() {
  const { recs } = useHaccp()
  const { canEdit } = useHub()
  const now = useNow()
  const [nuovo, setNuovo] = useState(false)
  const [fine, setFine] = useState<Rec<AbbData> | null>(null)
  const [after, setAfter] = useState<Rec<AbbData> | null>(null)
  const nav = useNav()
  useEffect(() => { if (nav.intent === 'abb-new') { setNuovo(true); nav.clearIntent?.() } }, [nav.intent]) // eslint-disable-line react-hooks/exhaustive-deps
  const all = recs.filter((r) => r.kind === 'abbattimento') as Rec<AbbData>[]
  const live = all.filter((r) => !r.data.fine)
  const done = all.filter((r) => r.data.fine)
  return (
    <div className="hz-mod">
      <div className="hub-bar">
        <p className="small muted grow">Da +70 °C a +3 °C entro 90 minuti per refrigerare, a −18 °C entro 240 minuti per congelare. Parti dalle preparazioni appena fatte.</p>
        {canEdit && <button className="btn btn-gold" onClick={() => setNuovo(true)}><Plus /> Avvia abbattimento</button>}
      </div>

      {live.length > 0 && (
        <div className="hz-live">
          {live.map((r) => {
            const s = abbState(r.data, now)
            const pct = Math.min(100, (s.min / s.cfg.minuti) * 100)
            return (
              <section key={r.id} className={`hz-abb ${s.over ? 'over' : ''}`}>
                <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  {r.data.modo === 'congelare' ? <Snowflake size={20} /> : <ThermometerSnowflake size={20} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{r.data.prodotto}</h3>
                    <span className="small muted">{ABB[r.data.modo].label} · lotto {r.data.lotto} · {r.data.abbattitore || 'abbattitore'}</span>
                  </div>
                </div>
                <div className="hz-timer"><b>{s.min}′</b><span>{s.over ? `oltre il limite di ${s.cfg.minuti}′` : `restano ${s.left}′ per arrivare a ${s.cfg.target} °C`}</span></div>
                <div className="hz-bar"><i style={{ width: `${pct}%` }} /></div>
                <span className="small muted">Inizio {fmtTime(r.data.inizio)} a {num(r.data.tempInizio)} °C</span>
                {canEdit && <button className="btn btn-gold" onClick={() => setFine(r)}>Concludi e misura</button>}
              </section>
            )
          })}
        </div>
      )}

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head"><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Registro abbattimenti</h3></div>
        {!done.length && <p className="trow small muted">Gli abbattimenti conclusi compaiono qui con tempi e temperature.</p>}
        {done.slice(0, 50).map((r) => {
          const s = abbState(r.data)
          return (
            <button key={r.id} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => setAfter(r)}>
              <span className={`hz-dot ${r.data.ok ? 'ok' : 'danger'}`} />
              <span className="nm"><b>{r.data.prodotto}</b><small>{fmtDate(r.data.inizio)} · {ABB[r.data.modo].label.toLowerCase()} · {num(r.data.tempInizio)} → {num(r.data.tempFine)} °C in {s.min}′ · lotto {r.data.lotto}</small></span>
              <span className={`chip ${r.data.ok ? 'chip-ok' : 'chip-danger'}`}>{r.data.ok ? 'Conforme' : 'Non conforme'}</span>
            </button>
          )
        })}
      </section>

      {nuovo && <NuovoAbb onClose={() => setNuovo(false)} />}
      {fine && <FineAbb r={fine} onClose={() => setFine(null)} onDone={(r) => { setFine(null); setAfter(r) }} />}
      {after && <DopoAbb r={(all.find((x) => x.id === after.id) as Rec<AbbData>) || after} onClose={() => setAfter(null)} />}
    </div>
  )
}

function NuovoAbb({ onClose }: { onClose: () => void }) {
  const { add, recs, cfg } = useHaccp()
  const { k, recipes, toast } = useHub()
  const preps: Prep[] = (k.preparazioni || []).filter((p: Prep) => p.status !== 'smistata').slice(0, 30)
  const ddts = (recs.filter((r) => r.kind === 'ricevimento') as Rec<RicData>[]).slice(0, 20)
  const abbs = cfg.units.filter((u) => u.tipo === 'abbattitore')
  const [d, setD] = useState<AbbData>({ modo: 'refrigerare', prodotto: '', prepId: null, recipeId: null, quantita: '', lotto: lotto(), ddt: [], abbattitore: abbs[0]?.nome || '', inizio: iso(), tempInizio: null })
  const [t0, setT0] = useState('')
  const set = (p: Partial<AbbData>) => setD((x) => ({ ...x, ...p }))
  const t = parseNum(t0)
  async function start() {
    const r = await add<AbbData>('abbattimento', { ...d, prodotto: d.prodotto.trim(), tempInizio: t, inizio: iso() })
    if (r) { toast(`Abbattimento avviato: ${d.prodotto}`, 'success'); onClose() }
  }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Avvia abbattimento</span>}
      foot={<button className="btn btn-gold btn-lg" disabled={!d.prodotto.trim() || t == null} onClick={start}>Avvia ora · {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</button>}>
      <F label="Devi refrigerare o congelare?">
        <div className="hz-choice">
          {(['refrigerare', 'congelare'] as const).map((m) => (
            <button key={m} type="button" className={d.modo === m ? 'on' : ''} onClick={() => set({ modo: m })}>
              {m === 'congelare' ? <Snowflake size={18} /> : <ThermometerSnowflake size={18} />}<b>{ABB[m].label}</b><small>{ABB[m].sub}</small>
            </button>
          ))}
        </div>
      </F>
      <F label="Prodotto">
        {preps.length > 0 && <div className="hz-chips">{preps.map((p) => <button key={p.id} type="button" className={`pill ${d.prepId === p.id ? 'on' : ''}`} onClick={() => set({ prodotto: p.nome, prepId: p.id, recipeId: p.recipeId || null, quantita: `${p.quantita} ${p.unitaMisura}` })}>{p.nome}</button>)}</div>}
        <input className="input" list="hz-ric" value={d.prodotto} placeholder="Scegli una preparazione o scrivi il prodotto" onChange={(e) => set({ prodotto: e.target.value, prepId: null, recipeId: recipes.find((r) => r.name === e.target.value)?.id || null })} />
        <datalist id="hz-ric">{recipes.map((r) => <option key={r.id} value={r.name} />)}</datalist>
      </F>
      <div className="hz-grid2">
        <F label="Quantità"><input className="input" value={d.quantita || ''} placeholder="es. 3 kg" onChange={(e) => set({ quantita: e.target.value })} /></F>
        <F label="Lotto"><input className="input" value={d.lotto} onChange={(e) => set({ lotto: e.target.value })} /></F>
        <F label="Temperatura al cuore all’inizio (°C)"><input className="input" inputMode="decimal" autoFocus value={t0} placeholder="es. 72" onChange={(e) => setT0(e.target.value)} /></F>
        <F label="Abbattitore">
          <input className="input" list="hz-abbs" value={d.abbattitore || ''} onChange={(e) => set({ abbattitore: e.target.value })} />
          <datalist id="hz-abbs">{abbs.map((u) => <option key={u.id} value={u.nome} />)}</datalist>
        </F>
      </div>
      {ddts.length > 0 && (
        <F label="Materie prime (DDT di origine, facoltativo)">
          <div className="hz-chips">{ddts.map((r) => { const on = d.ddt?.includes(r.id); return <button key={r.id} type="button" className={`pill ${on ? 'on' : ''}`} onClick={() => set({ ddt: on ? d.ddt!.filter((x) => x !== r.id) : [...(d.ddt || []), r.id] })}>{r.data.ddt || '—'} · {r.data.fornitore}</button> })}</div>
        </F>
      )}
    </Drawer>
  )
}

function FineAbb({ r, onClose, onDone }: { r: Rec<AbbData>; onClose: () => void; onDone: (r: Rec<AbbData>) => void }) {
  const { update } = useHaccp()
  const { toast } = useHub()
  const [tf, setTf] = useState('')
  const [nota, setNota] = useState('')
  const now = useNow(5000)
  const s = abbState(r.data, now)
  const t = parseNum(tf)
  const ok = t != null && t <= s.cfg.target && !s.over
  async function save() {
    const data = { fine: iso(), tempFine: t, ok, nota: nota || undefined }
    if (await update<AbbData>(r.id, data)) { toast(ok ? `${r.data.prodotto}: abbattimento conforme` : `${r.data.prodotto}: abbattimento non conforme`, ok ? 'success' : 'error'); onDone({ ...r, data: { ...r.data, ...data } }) }
  }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{r.data.prodotto}: fine abbattimento</span>}
      foot={<button className="btn btn-gold btn-lg" disabled={t == null} onClick={save}>Registra fine</button>}>
      <p className="small muted">Iniziato {fmtWhen(r.data.inizio)} a {num(r.data.tempInizio)} °C · sono passati {s.min} minuti su {s.cfg.minuti}.</p>
      <F label="Temperatura al cuore adesso (°C)"><input className={`input hz-big ${t == null ? '' : ok ? 'good' : 'bad'}`} inputMode="decimal" autoFocus value={tf} onChange={(e) => setTf(e.target.value)} placeholder="°C" /></F>
      {t != null && !ok && <p className="hz-banner danger"><b>Non conforme</b><span>{s.over ? `Tempo oltre ${s.cfg.minuti} minuti.` : `Serve arrivare a ${s.cfg.target} °C.`} Valuta se consumare subito, rilavorare o eliminare il prodotto e annotalo.</span></p>}
      <F label="Nota"><input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder={ok ? 'facoltativa' : 'es. prodotto eliminato'} /></F>
    </Drawer>
  )
}

function DopoAbb({ r, onClose }: { r: Rec<AbbData>; onClose: () => void }) {
  const { remove, recs, me } = useHaccp()
  const { k, canEdit } = useHub()
  const nav = useNav()
  const [smista, setSmista] = useState(false)
  const prep: Prep | undefined = (k.preparazioni || []).find((p: Prep) => p.id === r.data.prepId)
  const s = abbState(r.data)
  const ddt = useMemo(() => (r.data.ddt || []).map((id) => recs.find((x) => x.id === id) as Rec<RicData> | undefined).filter(Boolean) as Rec<RicData>[], [r, recs])
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{r.data.prodotto}</span>}
      foot={canEdit && <div className="row">
        {(r.by_user === me.id || !r.by_user) && <button className="btn btn-danger btn-sm" onClick={async () => { if (await remove(r.id)) onClose() }}><Trash2 /> Elimina</button>}
        <span style={{ flex: 1 }} />
        {r.data.ok && <button className="btn btn-sm" onClick={() => { nav.openEtichetta({ prodotto: r.data.prodotto, prepId: r.data.prepId, recipeId: r.data.recipeId, lotto: r.data.lotto, conservazione: r.data.modo === 'congelare' ? '−18 °C' : '0 / +4 °C', scadenza: dayKey(addDays(new Date(), r.data.modo === 'congelare' ? 90 : 3)), ddt: ddt.map((x) => ({ id: x.id, ddt: x.data.ddt, fornitore: x.data.fornitore })) }); onClose() }}><Tag /> Etichetta</button>}
        {r.data.ok && prep && prep.status !== 'smistata' && <button className="btn btn-gold btn-sm" onClick={() => setSmista(true)}><ArrowRightLeft /> Smista</button>}
      </div>}>
      <div className="hz-kv">
        <span>Trattamento</span><b>{ABB[r.data.modo].label}</b>
        <span>Lotto</span><b>{r.data.lotto}</b>
        {r.data.quantita && <><span>Quantità</span><b>{r.data.quantita}</b></>}
        <span>Inizio</span><b>{fmtWhen(r.data.inizio)} · {num(r.data.tempInizio)} °C</b>
        <span>Fine</span><b>{r.data.fine ? `${fmtWhen(r.data.fine)} · ${num(r.data.tempFine)} °C` : 'in corso'}</b>
        <span>Durata</span><b>{s.min} minuti (limite {s.cfg.minuti})</b>
        <span>Esito</span><b className={r.data.ok ? 'fc-ok' : 'fc-danger'}>{r.data.ok == null ? '—' : r.data.ok ? 'Conforme' : 'Non conforme'}</b>
        <span>Abbattitore</span><b>{r.data.abbattitore || '—'}</b>
        <span>Operatore</span><b>{r.by_name || '—'}</b>
        {ddt.length > 0 && <><span>Materie prime</span><b>{ddt.map((x) => `DDT ${x.data.ddt} ${x.data.fornitore}`).join(', ')}</b></>}
        {r.data.nota && <><span>Nota</span><b>{r.data.nota}</b></>}
      </div>
      {r.data.ok && prep && prep.status !== 'smistata' && <p className="small muted">La preparazione «{prep.nome}» è pronta: smistala tra linea, frigo e congelatore.</p>}
      {smista && prep && <Smista p={prep} defaultTo={r.data.modo === 'congelare' ? 'freezer' : 'fridge'} onClose={() => { setSmista(false); onClose() }} />}
    </Drawer>
  )
}
