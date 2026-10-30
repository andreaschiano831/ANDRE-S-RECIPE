'use client'
import { useEffect, useMemo, useState } from 'react'
import { useEnav } from './nav'
import { CalendarCheck, Plus, Trash2 } from 'lucide-react'
import { Drawer, Stepper, useHub } from '../hub/ui'
import { piattoCost, type Piatto, type RecipeCost } from '../hub/model'
import { useEcon } from './store'
import { Bars, Kpi } from './charts'
import { atOf, buckets, dayKey, eur0, eur2, fmtDay, inP, num, pct, r2, ricavi, servizioAperto, sumIn, vendite, type ERec, type Period, type Vendita, type VRiga } from './model'

const ME = {
  stella: { l: 'Stella', s: 'piace e rende: tienilo in evidenza' },
  cavallo: { l: 'Cavallo da tiro', s: 'vende tanto ma rende poco: rivedi porzione o prezzo' },
  enigma: { l: 'Enigma', s: 'rende ma vende poco: posizione in carta, descrizione, proposta in sala' },
  cane: { l: 'Da ripensare', s: 'vende poco e rende poco: sostituiscilo' },
} as const

export default function Vendite({ p }: { p: Period }) {
  const { recs } = useEcon()
  const { k, ctx, canEdit } = useHub()
  const piatti: Piatto[] = k.piatti || []
  const all = vendite(recs)
  const vs = all.filter((r) => inP(r.at, p))
  const ric = ricavi(vs)
  const aperto = servizioAperto(k, all, piatti)
  const [close, setClose] = useState<Vendita | null>(null)
  const [open, setOpen] = useState<ERec<Vendita> | null>(null)
  const cache = useMemo(() => new Map<string, RecipeCost>(), [ctx])
  const costOf = (id?: string | null) => { const pt = piatti.find((x) => x.id === id); if (!pt) return null; const c = piattoCost(pt, ctx, cache); return c.complete ? r2(c.cost) : null }
  const bs = buckets(p)
  const nav = useEnav()
  useEffect(() => {
    if (nav.intent === 'chiudi' && aperto.righe.length) setClose(newDay(aperto.righe, 'servizio'))
    else if (nav.intent === 'chiudi' || nav.intent === 'nuova') setClose(newDay([], 'manuale'))
    if (nav.intent) nav.clearIntent?.()
  }, [nav.intent]) // eslint-disable-line react-hooks/exhaustive-deps

  const me = useMemo(() => {
    const m = new Map<string, { nome: string; qta: number; ricavo: number; costo: number; conCosto: boolean }>()
    for (const v of vs) for (const r of v.data.righe || []) {
      const c = m.get(r.nome) || { nome: r.nome, qta: 0, ricavo: 0, costo: 0, conCosto: true }
      c.qta += r.qta; c.ricavo += r.qta * r.prezzo; c.costo += r.qta * (r.costo || 0); c.conCosto &&= r.costo != null; m.set(r.nome, c)
    }
    const rows = [...m.values()].map((x) => ({ ...x, mu: x.qta ? (x.ricavo - x.costo) / x.qta : 0 }))
    const totQ = rows.reduce((s, x) => s + x.qta, 0)
    const avgM = totQ ? rows.reduce((s, x) => s + x.mu * x.qta, 0) / totQ : 0
    const popMin = rows.length ? (1 / rows.length) * 0.7 * totQ : 0
    return rows.map((x) => ({ ...x, cls: (x.qta >= popMin ? (x.mu >= avgM ? 'stella' : 'cavallo') : x.mu >= avgM ? 'enigma' : 'cane') as keyof typeof ME })).sort((a, b) => b.qta - a.qta)
  }, [vs])

  const newDay = (righe: VRiga[], fonte: Vendita['fonte']): Vendita => ({ data: dayKey(), coperti: null, incasso: r2(righe.reduce((s, r) => s + r.qta * r.prezzo, 0)), righe: righe.map((r) => ({ ...r, costo: costOf(r.piattoId) })), fonte, logFino: fonte === 'servizio' ? aperto.ultimo : null })

  return (
    <div className="ec-mod">
      {aperto.righe.length > 0 && (
        <section className="panel ec-open">
          <div className="panel-head"><CalendarCheck size={17} color="var(--accent)" /><h3 className="h2 ec-h" style={{ flex: 1 }}>Dal servizio, da chiudere</h3><span className="small muted">{aperto.giorni.map(fmtDay).join(', ')}</span></div>
          {aperto.righe.map((r) => <div key={r.piattoId} className="trow"><span className="nm"><b>{r.qta} × {r.nome}</b><small>{r.prezzo ? `${eur2(r.prezzo)} l’uno` : 'prezzo non impostato nel piatto'}</small></span><b className="tnum">{eur2(r.qta * r.prezzo)}</b></div>)}
          <div className="hz-form-foot"><span className="small muted" style={{ flex: 1 }}>Aggiungi coperti e incasso di cassa: diventano le vendite della giornata.</span>
            {canEdit && <button className="btn btn-gold" onClick={() => setClose(newDay(aperto.righe, 'servizio'))}>Chiudi la giornata</button>}</div>
        </section>
      )}

      <div className="ec-kpis">
        <Kpi label="Incasso" value={eur0(ric.incasso)} sub={`${vs.length} giornate · ${p.label.toLowerCase()}`} />
        <Kpi label="Coperti" value={String(ric.coperti || '—')} sub={ric.coperti ? `${String(Math.round(ric.coperti / Math.max(1, vs.length))).replace('.', ',')} al giorno` : 'aggiungili alla chiusura'} />
        <Kpi label="Scontrino medio" value={ric.coperti ? eur2(ric.incasso / ric.coperti) : '—'} sub="incasso per coperto" />
        <Kpi label="Food cost teorico" value={pct(ric.fcTeorico)} sub="dai costi ricetta dei piatti venduti" tone={ric.fcTeorico == null ? '' : ric.fcTeorico <= (k.fcTarget ?? 30) ? 'ok' : 'warn'} />
      </div>

      <section className="panel ec-panel">
        <div className="panel-head"><h3 className="h2 ec-h" style={{ flex: 1 }}>Incasso</h3>{canEdit && <button className="btn btn-sm" onClick={() => setClose(newDay([], 'manuale'))}><Plus /> Registra una giornata</button>}</div>
        <div className="ec-pad"><Bars labels={bs.map((b) => b.label)} series={[{ name: 'Incasso', color: 'var(--ink-2)', values: bs.map((b) => sumIn(vs, b, (r) => r.data.incasso || 0)) }]} /></div>
      </section>

      {me.length > 0 && (
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><h3 className="h2 ec-h" style={{ flex: 1 }}>Menu engineering</h3><span className="small muted">popolarità × margine</span></div>
          <div className="hz-table" style={{ paddingTop: 8 }}>
            <table>
              <thead><tr><th>Piatto</th><th>Venduti</th><th>Ricavo</th><th>Margine unit.</th><th>Margine tot.</th><th>Classe</th></tr></thead>
              <tbody>{me.map((x) => (
                <tr key={x.nome}><td><b style={{ fontWeight: 500 }}>{x.nome}</b></td><td>{x.qta}</td><td>{eur0(x.ricavo)}</td><td>{x.conCosto ? eur2(x.mu) : '—'}</td><td>{x.conCosto ? eur0(x.ricavo - x.costo) : '—'}</td>
                  <td title={ME[x.cls].s}><span className={`chip ec-me ${x.cls}`}>{ME[x.cls].l}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
          <p className="small muted" style={{ padding: '0 18px 14px' }}>{Object.values(ME).map((m) => `${m.l}: ${m.s}`).join(' · ')}.</p>
        </section>
      )}

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head"><h3 className="h2 ec-h">Giornate</h3></div>
        {!vs.length && <p className="trow small muted">Nessuna giornata nel periodo. Le uscite del Servizio si chiudono qui; per i giorni passati usa «Registra una giornata».</p>}
        {vs.map((v) => (
          <button key={v.id} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(v)}>
            <span className="nm"><b>{new Date(v.data.data + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
              <small>{v.data.coperti ? `${v.data.coperti} coperti · ` : ''}{v.data.righe.reduce((s, r) => s + r.qta, 0)} piatti · {v.data.fonte === 'servizio' ? 'dal servizio' : 'a mano'}{v.by_name ? ` · ${v.by_name}` : ''}</small></span>
            <b className="tnum">{eur2(v.data.incasso)}</b>
          </button>
        ))}
      </section>

      {close && <DayEditor v={close} onClose={() => setClose(null)} costOf={costOf} />}
      {open && <DayEditor v={open.data} rec={open} onClose={() => setOpen(null)} costOf={costOf} />}
    </div>
  )
}

function DayEditor({ v: init, rec, onClose, costOf }: { v: Vendita; rec?: ERec<Vendita>; onClose: () => void; costOf: (id?: string | null) => number | null }) {
  const { add, update, remove } = useEcon()
  const { k, canEdit, toast } = useHub()
  const piatti: Piatto[] = (k.piatti || []).filter((p: Piatto) => p.attivo || init.righe.some((r) => r.piattoId === p.id))
  const [v, setV] = useState<Vendita>(init)
  const [incTxt, setIncTxt] = useState(init.incasso ? String(init.incasso).replace('.', ',') : '')
  const teorico = r2(v.righe.reduce((s, r) => s + r.qta * r.prezzo, 0))
  const setQ = (p: Piatto, qta: number) => setV((x) => {
    const has = x.righe.find((r) => r.piattoId === p.id)
    const righe = has ? x.righe.map((r) => (r.piattoId === p.id ? { ...r, qta } : r)) : [...x.righe, { piattoId: p.id, nome: p.nome, qta, prezzo: Number(p.prezzo) || 0, costo: costOf(p.id) }]
    return { ...x, righe: righe.filter((r) => r.qta > 0) }
  })
  async function save() {
    const data: Vendita = { ...v, incasso: incTxt.trim() ? num(incTxt) : teorico }
    const ok = rec ? await update<Vendita>(rec.id, data, atOf(data.data)) : !!(await add<Vendita>('vendita', data, atOf(data.data)))
    if (ok) { toast(`Giornata del ${fmtDay(data.data)} registrata: ${eur2(data.incasso)}`, 'success'); onClose() }
  }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{rec ? 'Giornata' : v.fonte === 'servizio' ? 'Chiudi la giornata' : 'Registra una giornata'}</span>}
      foot={canEdit && <div className="row">
        {rec && <button className="btn btn-danger btn-sm" onClick={async () => { if (await remove(rec.id)) onClose() }}><Trash2 /> Elimina</button>}
        <span style={{ flex: 1 }} /><button className="btn btn-gold" disabled={!teorico && !incTxt.trim()} onClick={save}>Salva {eur2(incTxt.trim() ? num(incTxt) : teorico)}</button></div>}>
      <div className="hz-grid2">
        <label className="field"><span className="label">Data</span><input className="input" type="date" value={v.data} onChange={(e) => setV({ ...v, data: e.target.value })} /></label>
        <label className="field"><span className="label">Coperti</span><input className="input" inputMode="numeric" value={v.coperti ?? ''} onChange={(e) => setV({ ...v, coperti: e.target.value ? Math.round(num(e.target.value)) : null })} /></label>
        <label className="field" style={{ gridColumn: '1/-1' }}><span className="label">Incasso di cassa € (IVA esclusa)</span><input className="input" inputMode="decimal" value={incTxt} placeholder={teorico ? `${String(teorico).replace('.', ',')} dai piatti` : 'es. 2450'} onChange={(e) => setIncTxt(e.target.value)} />
          <span className="small muted">Se lo lasci vuoto uso il totale dei piatti ({eur2(teorico)}). Mettilo se in cassa entrano anche bevande, coperto, extra.</span></label>
      </div>
      <span className="label">Piatti venduti</span>
      <section className="panel" style={{ overflow: 'hidden' }}>
        {!piatti.length && <p className="trow small muted">Nessun piatto in carta: registra solo l’incasso.</p>}
        {piatti.map((p) => { const r = v.righe.find((x) => x.piattoId === p.id); return (
          <div key={p.id} className="trow"><span className="nm"><b>{p.nome}</b><small>{p.prezzo ? eur2(Number(p.prezzo)) : 'senza prezzo'}</small></span><Stepper value={r?.qta || 0} onChange={(q) => setQ(p, Math.round(q))} /></div>
        ) })}
      </section>
      <label className="field"><span className="label">Nota</span><input className="input" value={v.nota || ''} onChange={(e) => setV({ ...v, nota: e.target.value })} placeholder="es. evento privato, pioggia" /></label>
    </Drawer>
  )
}
