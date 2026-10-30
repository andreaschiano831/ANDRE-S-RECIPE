'use client'
import { useRef, useState } from 'react'
import { FileUp, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import { Drawer, askAI, shrinkImage, useHub } from '../hub/ui'
import { norm, type ListinoItem } from '../hub/model'
import { useEcon } from './store'
import { CAT_LABEL, acquisti, atOf, dayKey, eur0, eur2, fatture, fmtDay, makeRiga, num, parseFatturaPA, pct, r2, xmlFromFile, type Cat, type ERec, type Fattura, type Period, type Riga } from './model'

const AI_FATTURA = 'Leggi una fattura o un DDT di un fornitore di un ristorante italiano. Rispondi SOLO in JSON: {"numero":string,"data":"YYYY-MM-DD","fornitore":string,"piva":string,"scadenza":"YYYY-MM-DD o vuoto","imponibile":number,"iva":number,"totale":number,"righe":[{"descrizione":string,"quantita":number,"um":"kg|g|l|ml|pz|ct|cf","prezzo_unitario":number,"totale":number,"iva":number}]}. Prezzi IVA esclusa. Usa 0 o stringa vuota se un dato manca.'

async function pdfText(file: File) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  let out = ''
  for (let i = 1; i <= Math.min(doc.numPages, 6); i++) { const c = await (await doc.getPage(i)).getTextContent(); out += c.items.map((x: any) => x.str + (x.hasEOL ? '\n' : ' ')).join('') + '\n' }
  return out
}
function fromAI(j: any, listino: ListinoItem[], fonte: Fattura['fonte']): Fattura {
  const righe = ((j.righe || []) as any[]).filter((r) => r?.descrizione).map((r) => makeRiga(String(r.descrizione), num(r.quantita) || 1, r.um || 'pz', num(r.prezzo_unitario) || (num(r.totale) / (num(r.quantita) || 1)), num(r.totale) || null, num(r.iva) || null, listino))
  const imponibile = num(j.imponibile) || r2(righe.reduce((s, r) => s + r.totale, 0))
  return { numero: String(j.numero || ''), data: /^\d{4}-\d{2}-\d{2}$/.test(j.data || '') ? j.data : dayKey(), fornitore: String(j.fornitore || ''), piva: j.piva || '', righe, imponibile, iva: num(j.iva), totale: num(j.totale) || imponibile, scadenza: /^\d{4}-\d{2}-\d{2}$/.test(j.scadenza || '') ? j.scadenza : null, pagata: false, fonte }
}

export default function Acquisti({ p }: { p: Period }) {
  const { recs, update } = useEcon()
  const { listino, canEdit, toast } = useHub()
  const [queue, setQueue] = useState<Fattura[]>([])
  const [open, setOpen] = useState<ERec<Fattura> | null>(null)
  const [busy, setBusy] = useState('')
  const [f, setF] = useState<'periodo' | 'dapagare' | 'tutte'>('periodo')
  const [q, setQ] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const all = fatture(recs)
  const inPeriod = all.filter((r) => new Date(r.at) >= p.from && new Date(r.at) <= p.to)
  const acq = acquisti(inPeriod)
  const list = (f === 'periodo' ? inPeriod : f === 'dapagare' ? all.filter((r) => !r.data.pagata && r.data.totale > 0) : all)
    .filter((r) => !q || norm(`${r.data.fornitore} ${r.data.numero} ${r.data.righe.map((x) => x.nome).join(' ')}`).includes(norm(q)))

  async function onFiles(files: FileList) {
    const out: Fattura[] = []
    for (const file of Array.from(files)) {
      setBusy(`Leggo ${file.name}…`)
      try {
        if (/\.(xml|p7m)$/i.test(file.name) || /xml/.test(file.type)) out.push(...parseFatturaPA(xmlFromFile(await file.arrayBuffer()), listino))
        else if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
          const txt = await pdfText(file)
          if (txt.trim().length < 80) throw new Error('PDF scansionato: caricalo come foto')
          out.push(fromAI(await askAI(AI_FATTURA, `Testo della fattura:\n${txt.slice(0, 14000)}`, [], 3500), listino, 'foto'))
        } else out.push(fromAI(await askAI(AI_FATTURA, 'Estrai i dati di questa fattura.', [await shrinkImage(file, 1900)], 3500), listino, 'foto'))
      } catch (e: any) { toast(`${file.name}: ${e.message || 'non leggibile'}`, 'error') }
    }
    setBusy('')
    if (out.length) setQueue((x) => [...x, ...out])
  }
  const empty: Fattura = { numero: '', data: dayKey(), fornitore: '', righe: [], imponibile: 0, iva: 0, totale: 0, scadenza: null, pagata: false, fonte: 'manuale' }

  return (
    <div className="ec-mod">
      <div className="ec-kpis">
        <div className="ec-kpi"><span>Acquisti nel periodo</span><b>{eur0(acq.tot)}</b><small>{inPeriod.length} documenti · IVA esclusa</small></div>
        {(['food', 'bev', 'nonfood'] as Cat[]).map((c) => <div key={c} className="ec-kpi"><span>{CAT_LABEL[c]}</span><b>{eur0(acq[c])}</b><small>{acq.tot ? pct((acq[c] / acq.tot) * 100, 0) : '—'} degli acquisti</small></div>)}
      </div>

      {canEdit && (
        <div className="ec-drop-row">
          <button className="ec-drop" disabled={!!busy} onClick={() => file.current?.click()}>
            {busy ? <Loader2 className="hz-spin" /> : <FileUp />}
            <b>{busy || 'Carica fatture'}</b>
            <small>XML della fattura elettronica (anche .p7m), PDF o foto. Puoi sceglierne tante insieme.</small>
          </button>
          <button className="btn" onClick={() => setQueue((x) => [...x, empty])}><Plus /> Inserisci a mano</button>
          <input ref={file} type="file" multiple hidden accept=".xml,.p7m,.pdf,image/*,application/xml,text/xml,application/pdf" onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = '' }} />
        </div>
      )}

      <div className="hub-bar">
        <div className="hub-search"><Search /><input className="input" placeholder="Fornitore, numero o prodotto" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">{([['periodo', p.label], ['dapagare', 'Da pagare'], ['tutte', 'Tutte']] as const).map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div>
      </div>

      <section className="panel" style={{ overflow: 'hidden' }}>
        {!list.length && <p className="trow small muted">{all.length ? 'Nessuna fattura con questi filtri.' : 'Ancora nessuna fattura: caricane una per aggiornare listino prezzi, food cost e magazzino.'}</p>}
        {list.slice(0, 120).map((r) => {
          const a = acquisti([r])
          const scad = r.data.scadenza && !r.data.pagata ? Math.round((new Date(r.data.scadenza + 'T12:00').getTime() - Date.now()) / 864e5) : null
          return (
            <div key={r.id} className="trow ec-frow">
              <button className="nm" style={{ textAlign: 'left' }} onClick={() => setOpen(r)}>
                <b>{r.data.fornitore || 'Fornitore'}{r.data.nota ? ` · ${r.data.nota}` : ''}</b>
                <small>n. {r.data.numero || '—'} · {fmtDay(r.data.data)} · {r.data.righe.length} righe{a.food ? ` · food ${eur0(a.food)}` : ''}{a.bev ? ` · bev ${eur0(a.bev)}` : ''}{a.nonfood ? ` · non food ${eur0(a.nonfood)}` : ''}</small>
              </button>
              {r.data.pagata ? <span className="chip chip-ok">Pagata</span> : scad != null ? <span className={`chip ${scad < 0 ? 'chip-danger' : scad <= 7 ? 'chip-warn' : ''}`}>{scad < 0 ? 'scaduta' : `scade ${fmtDay(r.data.scadenza!)}`}</span> : <span className="chip">da pagare</span>}
              <b className="tnum ec-amt">{eur2(r.data.totale)}</b>
              {canEdit && !r.data.pagata && r.data.totale > 0 && <button className="btn btn-sm" onClick={() => update(r.id, { pagata: true, pagataIl: new Date().toISOString() }).then((ok) => ok && toast('Segnata come pagata', 'success'))}>Paga</button>}
            </div>
          )
        })}
      </section>

      {queue.length > 0 && <FatturaEditor key={queue.length} f={queue[0]} left={queue.length - 1} onClose={() => setQueue((x) => x.slice(1))} />}
      {open && <FatturaEditor f={open.data} rec={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

const LOC = [{ k: 'fridge', l: 'Frigo' }, { k: 'dry', l: 'Dispensa' }, { k: 'freezer', l: 'Congelatore' }]

function FatturaEditor({ f: init, rec, left = 0, onClose }: { f: Fattura; rec?: ERec<Fattura>; left?: number; onClose: () => void }) {
  const { add, update, remove, recs } = useEcon()
  const { api, listino, canEdit, toast } = useHub()
  const [f, setF] = useState<Fattura>(init)
  const [loc, setLoc] = useState('fridge')
  const set = (x: Partial<Fattura>) => setF((v) => ({ ...v, ...x }))
  const row = (i: number, x: Partial<Riga>) => set({ righe: f.righe.map((r, j) => (j === i ? { ...r, ...x } : r)) })
  const dup = !rec && fatture(recs).find((r) => r.data.numero && r.data.numero === f.numero && norm(r.data.fornitore) === norm(f.fornitore))
  const sumRighe = r2(f.righe.reduce((s, r) => s + r.totale, 0))

  async function save() {
    const data: Fattura = { ...f, imponibile: f.imponibile || sumRighe, totale: f.totale || r2((f.imponibile || sumRighe) + f.iva), caricata: f.caricata || (!rec && f.righe.some((r) => r.carica)) }
    const ok = rec ? await update<Fattura>(rec.id, data, atOf(data.data)) : !!(await add<Fattura>('fattura', data, atOf(data.data)))
    if (!ok) return
    let nL = 0, nS = 0
    if (!rec) {
      for (const r of data.righe) {
        if (r.listino && r.base && r.base.prezzo > 0 && r.nome.trim()) {
          const ex = listino.find((l) => norm(l.nome) === norm(r.nome))
          api.listinoUpsert({ id: ex?.id, nome: r.nome.trim(), prezzo: r2(r.base.prezzo * 1000) / 1000, unita: r.base.unita, fornitore: data.fornitore || ex?.fornitore || null }); nL++
        }
        if (r.carica && r.qta > 0 && r.totale > 0) {
          // quantità in kg/l quando il prezzo è per confezione
          const q = r.base && r.base.unita !== 'pz' && r.base.prezzo ? r2((r.prezzo * r.qta) / r.base.prezzo) : r.qta
          api.stockAdd({ name: r.nome.trim(), quantity: q, unit: r.base?.unita || r.um, location: loc, lot: r.lotto || undefined, notes: `Fattura ${data.numero} · ${data.fornitore}`, prezzoUnitario: r.base?.prezzo }); nS++
        }
      }
    }
    toast(rec ? 'Fattura aggiornata' : `Fattura registrata${nL ? ` · ${nL} prezzi in listino` : ''}${nS ? ` · ${nS} prodotti in magazzino` : ''}`, 'success')
    onClose()
  }

  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{rec ? `${f.fornitore} n. ${f.numero}` : `Controlla la fattura${left ? ` (altre ${left})` : ''}`}</span>}
      foot={canEdit && <div className="row">
        {rec && <button className="btn btn-danger btn-sm" onClick={async () => { if (await remove(rec.id)) onClose() }}><Trash2 /> Elimina</button>}
        <span className="small muted" style={{ flex: 1 }}>{dup ? 'Attenzione: questa fattura è già registrata.' : rec ? '' : 'Al salvataggio aggiorno listino e magazzino per le righe spuntate.'}</span>
        {!rec && <button className="btn btn-sm" onClick={onClose}>Salta</button>}
        <button className="btn btn-gold" disabled={!f.fornitore.trim() && !f.numero.trim()} onClick={save}>{rec ? 'Salva' : 'Registra'}</button>
      </div>}>
      <div className="hz-grid2">
        <label className="field"><span className="label">Fornitore</span><input className="input" value={f.fornitore} onChange={(e) => set({ fornitore: e.target.value })} /></label>
        <label className="field"><span className="label">Numero</span><input className="input" value={f.numero} onChange={(e) => set({ numero: e.target.value })} /></label>
        <label className="field"><span className="label">Data</span><input className="input" type="date" value={f.data} onChange={(e) => set({ data: e.target.value })} /></label>
        <label className="field"><span className="label">Scadenza pagamento</span><input className="input" type="date" value={f.scadenza || ''} onChange={(e) => set({ scadenza: e.target.value || null })} /></label>
        <label className="field"><span className="label">Imponibile €</span><input className="input" inputMode="decimal" defaultValue={f.imponibile || ''} placeholder={String(sumRighe)} onBlur={(e) => set({ imponibile: num(e.target.value) })} /></label>
        <label className="field"><span className="label">IVA €</span><input className="input" inputMode="decimal" defaultValue={f.iva || ''} onBlur={(e) => set({ iva: num(e.target.value) })} /></label>
      </div>
      <div className="row"><label className="hz-check" style={{ flex: 1 }}><input type="checkbox" checked={f.pagata} onChange={(e) => set({ pagata: e.target.checked, pagataIl: e.target.checked ? new Date().toISOString() : null })} /> Già pagata</label>
        <b className="tnum">Totale {eur2(f.totale || (f.imponibile || sumRighe) + f.iva)}</b></div>

      <div className="ec-righe">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="label">Righe ({f.righe.length}) · somma {eur2(sumRighe)}</span>
          {!rec && f.righe.some((r) => r.carica) && <label className="small row" style={{ gap: 6 }}>Carica in <select className="select" style={{ width: 'auto', padding: '5px 8px' }} value={loc} onChange={(e) => setLoc(e.target.value)}>{LOC.map((l) => <option key={l.k} value={l.k}>{l.l}</option>)}</select></label>}
        </div>
        {f.righe.map((r, i) => {
          const d = r.base && r.prezzoPrima ? ((r.base.prezzo - r.prezzoPrima) / r.prezzoPrima) * 100 : null
          return (
            <div key={i} className="ec-riga">
              <div className="ec-riga-top">
                <input className="input" value={r.nome} aria-label="Nome nel listino" onChange={(e) => row(i, { nome: e.target.value })} />
                <select className="select" value={r.cat} onChange={(e) => row(i, { cat: e.target.value as Cat, listino: e.target.value !== 'nonfood' && r.listino, carica: e.target.value === 'food' && r.carica })}>{(['food', 'bev', 'nonfood'] as Cat[]).map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}</select>
                <button className="icon-btn" aria-label="Togli riga" onClick={() => set({ righe: f.righe.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
              </div>
              {r.descr && r.descr !== r.nome && <small className="muted">{r.descr}</small>}
              <div className="ec-riga-num">
                <label><span>Q.tà</span><input className="input" inputMode="decimal" defaultValue={r.qta} onBlur={(e) => { const qta = num(e.target.value); row(i, { qta, totale: r2(qta * r.prezzo) }) }} /></label>
                <label><span>UM</span><input className="input" value={r.um} onChange={(e) => row(i, { um: e.target.value })} /></label>
                <label><span>Prezzo</span><input className="input" inputMode="decimal" defaultValue={r.prezzo} onBlur={(e) => { const prezzo = num(e.target.value); row(i, { prezzo, totale: r2(prezzo * r.qta), base: r.base ? { ...r.base, prezzo: r.base.prezzo * (prezzo / (r.prezzo || prezzo)) } : r.base }) }} /></label>
                <span className="ec-riga-tot"><span>Totale</span><b>{eur2(r.totale)}</b></span>
              </div>
              <div className="row small" style={{ gap: 12 }}>
                {r.base && <span className="muted">{eur2(r.base.prezzo)}/{r.base.unita}</span>}
                {d != null && Math.abs(d) >= 1 && <span className={`chip ${d > 0 ? 'chip-danger' : 'chip-ok'}`}>{d > 0 ? '+' : ''}{pct(d, 0)} sul listino</span>}
                {r.lotto && <span className="muted">lotto {r.lotto}</span>}
                {!rec && r.cat !== 'nonfood' && <label className="row" style={{ gap: 5 }}><input type="checkbox" checked={r.listino} onChange={(e) => row(i, { listino: e.target.checked })} /> aggiorna listino</label>}
                {!rec && <label className="row" style={{ gap: 5 }}><input type="checkbox" checked={r.carica} onChange={(e) => row(i, { carica: e.target.checked })} /> carica in magazzino</label>}
              </div>
            </div>
          )
        })}
        {canEdit && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ righe: [...f.righe, makeRiga('', 1, 'kg', 0, 0, null, listino)] })}><Plus /> Aggiungi riga</button>}
      </div>
    </Drawer>
  )
}
