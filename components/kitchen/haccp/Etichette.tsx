'use client'
import { useEffect, useMemo, useState } from 'react'
import { Printer, Search } from 'lucide-react'
import { useHub } from '../hub/ui'
import { useHaccp } from './store'
import { F, Qr, Seg, esc, printHtml, qrSvg } from './bits'
import { CONSERVAZIONI, addDays, dayKey, fmtDate, fmtDateLong, fmtWhen, lotto, type EtiData, type Rec, type RicData } from './model'
import type { Prep } from '../hub/model'

const nowLocal = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
const blank = (): EtiData => ({ prodotto: '', prepId: null, recipeId: null, prodottoIl: nowLocal(), scadenza: dayKey(addDays(new Date(), 3)), conservazione: '0 / +4 °C', lotto: lotto(), note: '', ddt: [], copie: 1 })
const fmtDT = (s: string) => { const d = new Date(s); return `${fmtDateLong(s)} ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}` }
const qrText = (d: EtiData) => `${d.prodotto}\nLotto ${d.lotto}\nProd. ${fmtDT(d.prodottoIl)}\nScad. ${fmtDateLong(d.scadenza)}\n${d.conservazione}`

export default function Etichette({ prefill, onUsed }: { prefill?: Partial<EtiData> | null; onUsed?: () => void }) {
  const { recs, add, me } = useHaccp()
  const { k, recipes, canEdit, toast } = useHub()
  const [tab, setTab] = useState<'nuova' | 'storico'>('nuova')
  const [d, setD] = useState<EtiData>(blank)
  const [q, setQ] = useState('')
  useEffect(() => { if (prefill) { setD({ ...blank(), ...prefill, prodottoIl: nowLocal() }); setTab('nuova'); onUsed?.() } }, [prefill]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<EtiData>) => setD((x) => ({ ...x, ...p }))
  const preps: Prep[] = (k.preparazioni || []).filter((p: Prep) => p.status !== 'da_fare').slice(0, 24)
  const ddts = useMemo(() => (recs.filter((r) => r.kind === 'ricevimento') as Rec<RicData>[]).filter((r) => !q || `${r.data.ddt} ${r.data.fornitore} ${r.data.prodotti?.map((p) => p.nome).join(' ')}`.toLowerCase().includes(q.toLowerCase())).slice(0, 12), [recs, q])
  const storico = recs.filter((r) => r.kind === 'etichetta') as Rec<EtiData>[]
  const op = d.operatore || me.name

  async function print(data: EtiData, save: boolean) {
    if (save && !(await add<EtiData>('etichetta', { ...data, operatore: op }))) return
    const svg = await qrSvg(qrText(data))
    printHtml(Array.from({ length: Math.max(1, data.copie) }, () => labelHtml({ ...data, operatore: data.operatore || op }, svg)).join(''), LABEL_CSS, `Etichetta ${data.prodotto}`)
    if (save) { toast(`Etichetta di ${data.prodotto} registrata`, 'success'); setD(blank()) }
  }

  return (
    <div className="hz-mod">
      <div className="hub-bar"><Seg value={tab} onChange={setTab} options={[{ key: 'nuova', label: 'Nuova etichetta' }, { key: 'storico', label: `Storico (${storico.length})` }]} /></div>
      {tab === 'nuova' ? (
        <div className="hz-eti">
          <section className="panel hz-form">
            <div className="hz-form-body">
              <F label="Prodotto o preparazione">
                {preps.length > 0 && <div className="hz-chips">{preps.map((p) => <button key={p.id} type="button" className={`pill ${d.prepId === p.id ? 'on' : ''}`} onClick={() => set({ prodotto: p.nome, prepId: p.id, recipeId: p.recipeId || null, ...(p.scadeIl ? { scadenza: dayKey(p.scadeIl) } : {}), ...(p.lotto ? { lotto: p.lotto } : {}), ...(p.tracciabilita?.length ? { ddt: p.tracciabilita.filter((t) => t.doc).map((t, i) => ({ id: `tr-${i}`, ddt: `${t.doc}${t.lotto ? ` (${t.ingrediente} L.${t.lotto})` : ''}`, fornitore: t.fornitore || '' })) } : {}) })}>{p.nome}</button>)}</div>}
                <input className="input" list="hz-eti-r" value={d.prodotto} placeholder="es. Lasagne al ragù" onChange={(e) => set({ prodotto: e.target.value, prepId: null, recipeId: recipes.find((r) => r.name === e.target.value)?.id || null })} />
                <datalist id="hz-eti-r">{recipes.map((r) => <option key={r.id} value={r.name} />)}</datalist>
              </F>
              <div className="hz-grid2">
                <F label="Prodotto il"><input className="input" type="datetime-local" value={d.prodottoIl} onChange={(e) => set({ prodottoIl: e.target.value })} /></F>
                <F label="Da consumare entro"><input className="input" type="date" value={d.scadenza} onChange={(e) => set({ scadenza: e.target.value })} /></F>
              </div>
              <div className="hz-chips">{[1, 2, 3, 5, 7, 30, 90].map((n) => <button key={n} type="button" className={`pill ${d.scadenza === dayKey(addDays(d.prodottoIl, n)) ? 'on' : ''}`} onClick={() => set({ scadenza: dayKey(addDays(d.prodottoIl, n)) })}>+{n} {n === 1 ? 'giorno' : 'giorni'}</button>)}</div>
              <F label="Conservazione"><div className="hz-chips">{CONSERVAZIONI.map((c) => <button key={c} type="button" className={`pill ${d.conservazione === c ? 'on' : ''}`} onClick={() => set({ conservazione: c })}>{c}</button>)}</div></F>
              <div className="hz-grid2">
                <F label="Lotto"><input className="input" value={d.lotto} onChange={(e) => set({ lotto: e.target.value })} /></F>
                <F label="Copie"><input className="input" type="number" min={1} max={50} value={d.copie} onChange={(e) => set({ copie: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })} /></F>
              </div>
              <F label="Ingredienti, allergeni, note"><textarea className="textarea" rows={2} value={d.note || ''} onChange={(e) => set({ note: e.target.value })} placeholder="es. contiene glutine, uova, latte" /></F>
              <F label="Tracciabilità materie prime" hint="Collega i DDT da cui vengono gli ingredienti.">
                <div className="hub-search"><Search /><input className="input" placeholder="Cerca DDT, fornitore o prodotto" value={q} onChange={(e) => setQ(e.target.value)} /></div>
                <div className="hz-ddts">
                  {ddts.map((r) => { const on = d.ddt?.some((x) => x.id === r.id); return (
                    <label key={r.id} className={`hz-ddt ${on ? 'on' : ''}`}>
                      <input type="checkbox" checked={!!on} onChange={() => set({ ddt: on ? d.ddt!.filter((x) => x.id !== r.id) : [...(d.ddt || []), { id: r.id, ddt: r.data.ddt, fornitore: r.data.fornitore }] })} />
                      <span><b>{r.data.ddt || 'senza numero'}</b> · {r.data.fornitore}<small>{fmtDate(r.data.data || r.at)}{r.data.prodotti?.length ? ` · ${r.data.prodotti.slice(0, 3).map((p) => p.nome).join(', ')}` : ''}</small></span>
                    </label>
                  ) })}
                  {!ddts.length && <span className="small muted">Nessuna consegna registrata.</span>}
                </div>
              </F>
            </div>
          </section>
          <aside className="hz-eti-side">
            <span className="label">Anteprima di stampa</span>
            <LabelPreview d={{ ...d, operatore: op }} />
            {canEdit && <button className="btn btn-gold btn-lg" disabled={!d.prodotto.trim()} onClick={() => print({ ...d, prodotto: d.prodotto.trim() }, true)}><Printer /> Registra e stampa{d.copie > 1 ? ` × ${d.copie}` : ''}</button>}
            <span className="small muted">Formato 100 × 70 mm: va bene per stampanti di etichette e su A4 tagliato.</span>
          </aside>
        </div>
      ) : (
        <section className="panel" style={{ overflow: 'hidden' }}>
          {!storico.length && <p className="trow small muted">Le etichette stampate restano qui: puoi ristamparle.</p>}
          {storico.slice(0, 80).map((r) => (
            <div key={r.id} className="trow">
              <span className="nm"><b>{r.data.prodotto}</b><small>lotto {r.data.lotto} · prodotto {fmtWhen(r.at)} · scade {fmtDate(r.data.scadenza)}{r.by_name ? ` · ${r.by_name}` : ''}</small></span>
              <span className={`chip ${new Date(r.data.scadenza + 'T23:59') < new Date() ? 'chip-danger' : 'chip-ok'}`}>{new Date(r.data.scadenza + 'T23:59') < new Date() ? 'scaduta' : 'valida'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => print({ ...r.data, copie: 1 }, false)}><Printer /> Ristampa</button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function LabelPreview({ d }: { d: EtiData }) {
  return (
    <div className="hz-label">
      <div className="hz-label-top"><span>{d.prepId || d.recipeId ? 'Preparazione interna' : 'Prodotto'}</span><span>{d.lotto}</span></div>
      <div className="hz-label-main">
        <h4>{d.prodotto || 'Nome del prodotto'}</h4>
        <Qr text={qrText(d)} size={56} />
      </div>
      <p className="hz-label-note">{d.note || 'Ingredienti e allergeni'}</p>
      <div className="hz-label-dates">
        <div><span>Prodotto il</span><b>{fmtDT(d.prodottoIl)}</b></div>
        <div><span>Consumare entro</span><b>{fmtDateLong(d.scadenza)}</b></div>
      </div>
      <div className="hz-label-foot"><span>{d.conservazione}</span><span>Op. {d.operatore}</span></div>
    </div>
  )
}

function labelHtml(d: EtiData, svg: string) {
  return `<section class="l"><div class="top"><span>${d.prepId || d.recipeId ? 'PREPARAZIONE INTERNA' : 'PRODOTTO'}</span><span>${esc(d.lotto)}</span></div>
  <div class="main"><h1>${esc(d.prodotto)}</h1><div class="q">${svg}</div></div>
  ${d.note ? `<p class="n">${esc(d.note)}</p>` : ''}
  <div class="dates"><div><span>Prodotto il</span><b>${esc(fmtDT(d.prodottoIl))}</b></div><div><span>Consumare entro</span><b>${esc(fmtDateLong(d.scadenza))}</b></div></div>
  <div class="foot"><span>Conservare ${esc(d.conservazione)}</span><span>Op. ${esc(d.operatore || '')}</span></div>
  ${d.ddt?.length ? `<p class="t">Materie prime: ${d.ddt.map((x) => `${/^(DDT|Fattura)/.test(x.ddt) ? '' : 'DDT '}${esc(x.ddt)} ${esc(x.fornitore)}`).join(' · ')}</p>` : ''}</section>`
}
const LABEL_CSS = `@page{size:100mm 70mm;margin:3mm}*{box-sizing:border-box}body{margin:0;font-family:Helvetica,Arial,sans-serif;color:#000}
.l{height:63.5mm;border:.4mm solid #000;padding:2.5mm 3mm;display:flex;flex-direction:column;gap:1.2mm;page-break-after:always;break-after:page;overflow:hidden}
.top{display:flex;justify-content:space-between;font-size:6.5pt;letter-spacing:.06em;border-bottom:.3mm solid #000;padding-bottom:1mm}
.main{display:flex;gap:2mm;align-items:flex-start}.main h1{flex:1;font-size:15pt;line-height:1.05;margin:0}.q{width:15mm;height:15mm;flex-shrink:0}.q svg{width:100%;height:100%}
.n{font-size:7pt;margin:0;line-height:1.25;max-height:9mm;overflow:hidden}.dates{display:flex;gap:3mm;border-top:.3mm solid #000;padding-top:1.2mm;margin-top:auto}
.dates div{flex:1;display:flex;flex-direction:column}.dates span{font-size:6pt;text-transform:uppercase;letter-spacing:.05em}.dates b{font-size:10.5pt}
.foot{display:flex;justify-content:space-between;font-size:7pt}.t{font-size:5.5pt;margin:0;color:#333}`
