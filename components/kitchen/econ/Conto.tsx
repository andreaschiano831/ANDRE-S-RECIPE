'use client'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Drawer, useHub } from '../hub/ui'
import { useEcon } from './store'
import { Bars, Kpi } from './charts'
import { COSTO_LABEL, MESI, acquisti, costi, costiMese, eur0, eur2, fatture, monthKey, monthLabel, num, pct, ricavi, vendite, type Costo, type CostoCat, type ERec } from './model'

export default function Conto() {
  const { recs } = useEcon()
  const { canEdit } = useHub()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [edit, setEdit] = useState<{ c: Costo; rec?: ERec<Costo> } | null>(null)
  const cs = costi(recs)
  const months = MESI.map((_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
  const curM = monthKey()
  const rows = months.map((m) => {
    const inM = (at: string) => monthKey(at) === m
    const a = acquisti(fatture(recs).filter((r) => inM(r.data.data + 'T12:00')))
    const r = ricavi(vendite(recs).filter((v) => inM(v.data.data + 'T12:00')))
    const fissi = costiMese(cs, m)
    const pers = fissi.filter((c) => c.data.categoria === 'personale').reduce((s, c) => s + c.data.importo, 0)
    const altri = fissi.filter((c) => c.data.categoria !== 'personale').reduce((s, c) => s + c.data.importo, 0)
    const costiTot = a.tot + pers + altri
    return { m, ricavi: r.incasso, food: a.food, bev: a.bev, nonfood: a.nonfood, pers, altri, costiTot, margine: r.incasso - costiTot, future: m > curM, has: r.incasso > 0 || a.tot > 0 }
  })
  const past = rows.filter((r) => !r.future)
  const T = (f: (r: (typeof rows)[number]) => number) => past.reduce((s, r) => s + f(r), 0)
  const ric = T((r) => r.ricavi), costiTot = T((r) => r.costiTot), food = T((r) => r.food), pers = T((r) => r.pers)
  const conDati = past.filter((r) => r.ricavi > 0 && r.m < curM)
  const fissiMese = costiMese(cs, curM).reduce((s, c) => s + c.data.importo, 0)
  const varPct = ric ? T((r) => r.food + r.bev + r.nonfood) / ric : null
  const breakEven = varPct != null && varPct < 1 ? fissiMese / (1 - varPct) : null
  const avg = conDati.length ? conDati.reduce((s, r) => s + r.ricavi, 0) / conDati.length : null
  const left = year === now.getFullYear() ? 12 - now.getMonth() - 1 : 0
  const proj = avg != null && year === now.getFullYear() ? ric + avg * left : null

  return (
    <div className="ec-mod">
      <div className="hub-bar">
        <div className="seg">{[now.getFullYear() - 1, now.getFullYear()].map((y) => <button key={y} className={year === y ? 'on' : ''} onClick={() => setYear(y)}>{y}</button>)}</div>
        <span className="grow" />
        {canEdit && <button className="btn btn-gold btn-sm" onClick={() => setEdit({ c: { mese: curM, voce: '', categoria: 'personale', importo: 0, ricorrente: true } })}><Plus /> Costo fisso</button>}
      </div>
      <div className="ec-kpis">
        <Kpi label={`Ricavi ${year}`} value={eur0(ric)} sub={`${past.filter((r) => r.ricavi).length} mesi con vendite`} />
        <Kpi label="Costi" value={eur0(costiTot)} sub={`materie ${eur0(T((r) => r.food + r.bev + r.nonfood))} · fissi ${eur0(T((r) => r.pers + r.altri))}`} />
        <Kpi label="Risultato operativo" value={eur0(ric - costiTot)} tone={ric ? (ric - costiTot >= 0 ? 'ok' : 'danger') : ''} sub={ric ? `${pct(((ric - costiTot) / ric) * 100)} dei ricavi` : 'prima di tasse e ammortamenti'} />
        <Kpi label="Punto di pareggio" value={breakEven ? `${eur0(breakEven)}/mese` : '—'} sub={breakEven ? `ricavi minimi con ${eur0(fissiMese)} di costi fissi al mese` : 'servono vendite, acquisti e costi fissi'} />
        <Kpi label="Costo personale" value={ric ? pct((pers / ric) * 100) : '—'} sub={`${eur0(pers)} · food cost ${ric ? pct((food / ric) * 100) : '—'}`} />
        {proj != null && <Kpi label="Proiezione fine anno" value={eur0(proj)} sub={`stima: ${eur0(proj - avg! * left * 0.1)} – ${eur0(proj + avg! * left * 0.1)} con ±10% sui mesi restanti`} />}
      </div>

      <section className="panel ec-panel">
        <div className="panel-head"><h3 className="h2 ec-h">Ricavi e costi per mese</h3></div>
        <div className="ec-pad"><Bars labels={MESI} series={[{ name: 'Ricavi', color: 'var(--ink-2)', values: rows.map((r) => r.ricavi) }, { name: 'Costi', color: 'var(--accent)', values: rows.map((r) => (r.future ? 0 : r.costiTot)) }]} /></div>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head"><h3 className="h2 ec-h">Conto economico {year}</h3></div>
        <div className="hz-table ec-pl" style={{ paddingTop: 8 }}>
          <table>
            <thead><tr><th>Mese</th><th>Ricavi</th><th>Food</th><th>Beverage</th><th>Non food</th><th>Personale</th><th>Altri costi</th><th>Risultato</th><th>Food cost</th></tr></thead>
            <tbody>
              {rows.filter((r) => r.has || r.m === curM).map((r) => (
                <tr key={r.m} className={r.m === curM ? 'cur' : ''}><td>{monthLabel(r.m)}</td><td>{eur0(r.ricavi)}</td><td>{eur0(r.food)}</td><td>{eur0(r.bev)}</td><td>{eur0(r.nonfood)}</td><td>{eur0(r.pers)}</td><td>{eur0(r.altri)}</td>
                  <td className={r.margine < 0 ? 'fc-danger' : r.ricavi ? 'fc-ok' : ''}>{eur0(r.margine)}</td><td>{r.ricavi ? pct((r.food / r.ricavi) * 100) : '—'}</td></tr>
              ))}
              <tr className="tot"><td>Totale</td><td>{eur0(ric)}</td><td>{eur0(food)}</td><td>{eur0(T((r) => r.bev))}</td><td>{eur0(T((r) => r.nonfood))}</td><td>{eur0(pers)}</td><td>{eur0(T((r) => r.altri))}</td><td>{eur0(ric - costiTot)}</td><td>{ric ? pct((food / ric) * 100) : '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head"><h3 className="h2 ec-h">Costi fissi</h3></div>
        {!cs.length && <p className="trow small muted">Aggiungi stipendi, affitto, utenze: ricorrenti valgono ogni mese finché non li chiudi.</p>}
        {cs.map((c) => (
          <button key={c.id} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => setEdit({ c: c.data, rec: c })}>
            <span className="nm"><b>{c.data.voce || COSTO_LABEL[c.data.categoria]}</b><small>{COSTO_LABEL[c.data.categoria]} · {c.data.ricorrente ? `ogni mese da ${monthLabel(c.data.mese)}${c.data.fino ? ` a ${monthLabel(c.data.fino)}` : ''}` : monthLabel(c.data.mese)}</small></span>
            <b className="tnum">{eur2(c.data.importo)}</b>
          </button>
        ))}
      </section>
      {edit && <CostoEditor {...edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function CostoEditor({ c: init, rec, onClose }: { c: Costo; rec?: ERec<Costo>; onClose: () => void }) {
  const { add, update, remove } = useEcon()
  const { toast } = useHub()
  const [c, setC] = useState(init)
  const [imp, setImp] = useState(init.importo ? String(init.importo).replace('.', ',') : '')
  async function save() {
    const data = { ...c, importo: num(imp), voce: c.voce.trim() }
    const at = new Date(`${data.mese}-01T12:00`).toISOString()
    const ok = rec ? await update<Costo>(rec.id, data, at) : !!(await add<Costo>('costo', data, at))
    if (ok) { toast('Costo salvato', 'success'); onClose() }
  }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{rec ? 'Costo fisso' : 'Nuovo costo fisso'}</span>}
      foot={<div className="row">{rec && <button className="btn btn-danger btn-sm" onClick={async () => { if (await remove(rec.id)) onClose() }}><Trash2 /> Elimina</button>}<span style={{ flex: 1 }} /><button className="btn btn-gold" disabled={!num(imp)} onClick={save}>Salva</button></div>}>
      <div className="hz-chips">{(Object.keys(COSTO_LABEL) as CostoCat[]).map((k) => <button key={k} type="button" className={`pill ${c.categoria === k ? 'on' : ''}`} onClick={() => setC({ ...c, categoria: k })}>{COSTO_LABEL[k]}</button>)}</div>
      <div className="hz-grid2">
        <label className="field"><span className="label">Voce</span><input className="input" value={c.voce} placeholder={c.categoria === 'personale' ? 'es. stipendi cucina' : 'es. affitto'} onChange={(e) => setC({ ...c, voce: e.target.value })} /></label>
        <label className="field"><span className="label">Importo € al mese</span><input className="input" inputMode="decimal" value={imp} onChange={(e) => setImp(e.target.value)} /></label>
        <label className="field"><span className="label">{c.ricorrente ? 'Dal mese' : 'Mese'}</span><input className="input" type="month" value={c.mese} onChange={(e) => setC({ ...c, mese: e.target.value })} /></label>
        {c.ricorrente && <label className="field"><span className="label">Fino al mese (facoltativo)</span><input className="input" type="month" value={c.fino || ''} onChange={(e) => setC({ ...c, fino: e.target.value || null })} /></label>}
      </div>
      <label className="hz-check"><input type="checkbox" checked={c.ricorrente} onChange={(e) => setC({ ...c, ricorrente: e.target.checked })} /> Si ripete ogni mese</label>
      <label className="field"><span className="label">Reparto (facoltativo)</span><input className="input" value={c.reparto || ''} placeholder="Cucina, Sala, Bar…" onChange={(e) => setC({ ...c, reparto: e.target.value })} /></label>
    </Drawer>
  )
}
