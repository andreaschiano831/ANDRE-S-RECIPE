'use client'
import { useMemo, useRef, useState } from 'react'
import { Camera, Check, Loader2, PackagePlus, Plus, Trash2, X } from 'lucide-react'
import { Drawer, askAI, shrinkImage, useHub } from '../hub/ui'
import { useHaccp } from './store'
import { useNav } from './nav'
import { F, Seg } from './bits'
import { RIC_CATEGORIE, catLabel, catLocation, catMax, dayKey, fmtDate, num, parseNum, type NcData, type Prodotto, type Rec, type RicData } from './model'

const empty = (): RicData => ({ ddt: '', data: dayKey(), fornitore: '', categoria: 'refrigerati', temperatura: null, imballo: true, etichetta: true, esito: 'conforme', prodotti: [], nota: '' })

export default function Ricevimento() {
  const { recs } = useHaccp()
  const { canEdit } = useHub()
  const [open, setOpen] = useState<Rec<RicData> | 'new' | null>(null)
  const list = recs.filter((r) => r.kind === 'ricevimento') as Rec<RicData>[]
  const month = list.filter((r) => Date.now() - new Date(r.at).getTime() < 30 * 864e5)
  const nc = month.filter((r) => r.data.esito === 'non_conforme').length

  return (
    <div className="hz-mod">
      <div className="hub-stats">
        <div className="stat"><b>{month.length}</b><span>consegne negli ultimi 30 giorni</span></div>
        <div className="stat ok"><b>{month.length - nc}</b><span>conformi</span></div>
        <div className={`stat ${nc ? 'danger' : ''}`}><b>{nc}</b><span>non conformi</span></div>
      </div>
      <div className="hz-merci">
      {canEdit && <RicForm onDone={() => {}} />}
      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head"><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Ultime consegne</h3></div>
        {!list.length && <p className="trow small muted">Le consegne registrate compaiono qui, con DDT, temperatura ed esito del controllo.</p>}
        {list.slice(0, 40).map((r) => (
          <button key={r.id} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(r)}>
            <span className={`hz-dot ${r.data.esito === 'conforme' ? 'ok' : 'danger'}`} />
            <span className="nm"><b>{r.data.fornitore || 'Fornitore non indicato'}</b><small>DDT {r.data.ddt || '—'} · {fmtDate(r.data.data || r.at)} · {catLabel(r.data.categoria)}{r.data.temperatura != null ? ` · ${num(r.data.temperatura)} °C` : ''}{r.data.prodotti?.length ? ` · ${r.data.prodotti.length} prodotti` : ''}</small></span>
            <span className={`chip ${r.data.esito === 'conforme' ? 'chip-ok' : 'chip-danger'}`}>{r.data.esito === 'conforme' ? 'Conforme' : 'Non conforme'}</span>
          </button>
        ))}
      </section>
      </div>
      {open && open !== 'new' && <RicDetail r={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function RicForm({ onDone, initial, recId }: { onDone: () => void; initial?: RicData; recId?: string }) {
  const { add, update, recs } = useHaccp()
  const { api, toast, listino } = useHub()
  const nav = useNav()
  const [d, setD] = useState<RicData>(initial || empty())
  const [tempTxt, setTempTxt] = useState(initial?.temperatura != null ? String(initial.temperatura) : '')
  const [load, setLoad] = useState(!initial)
  const [busy, setBusy] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const fornitori = useMemo(() => [...new Set([...recs.filter((r) => r.kind === 'ricevimento').map((r) => r.data.fornitore), ...listino.map((l) => l.fornitore || '')].filter(Boolean))].sort(), [recs, listino])
  const max = catMax(d.categoria)
  const t = parseNum(tempTxt)
  const tempBad = max != null && t != null && t > max
  const set = (p: Partial<RicData>) => setD((x) => ({ ...x, ...p }))
  // esito suggerito dai controlli; resta modificabile
  const suggested: RicData['esito'] = tempBad || !d.imballo || !d.etichetta ? 'non_conforme' : 'conforme'

  async function fromPhoto(f: File) {
    setBusy('Leggo il documento…')
    try {
      const img = await shrinkImage(f, 1800)
      const j = await askAI(
        'Leggi un documento di trasporto (DDT) o una fattura di un fornitore alimentare italiano. Rispondi SOLO in JSON: {"ddt":string,"data":"YYYY-MM-DD","fornitore":string,"categoria":"refrigerati|surgelati|carni|pesce|latticini|ortofrutta|secchi|altro","prodotti":[{"nome":string,"qta":number|null,"unita":"kg|g|l|pz|cf","lotto":string,"scadenza":"YYYY-MM-DD o vuoto"}]}. Usa stringa vuota se un dato non c’è.',
        'Estrai i dati di questo DDT.', [img], 2500)
      set({
        ddt: j.ddt || d.ddt, data: /^\d{4}-\d{2}-\d{2}$/.test(j.data || '') ? j.data : d.data, fornitore: j.fornitore || d.fornitore,
        categoria: RIC_CATEGORIE.some((c) => c.key === j.categoria) ? j.categoria : d.categoria,
        prodotti: [...d.prodotti, ...((j.prodotti || []) as Prodotto[]).filter((p) => p?.nome).map((p) => ({ nome: String(p.nome), qta: p.qta ?? null, unita: p.unita || 'kg', lotto: p.lotto || '', scadenza: p.scadenza || '' }))],
      })
      toast('Dati letti dal documento: controllali', 'success')
    } catch (e: any) { toast(e.message || 'Non riesco a leggere la foto', 'error') }
    setBusy('')
  }

  async function save() {
    const data: RicData = { ...d, temperatura: t, fornitore: d.fornitore.trim(), ddt: d.ddt.trim(), prodotti: d.prodotti.filter((p) => p.nome.trim()), caricato: d.caricato || (load && d.esito === 'conforme') }
    const r = recId ? ((await update<RicData>(recId, data)) ? { id: recId } : null) : await add<RicData>('ricevimento', data, new Date(`${data.data}T${new Date().toTimeString().slice(0, 8)}`).toISOString())
    if (!r) return
    if (!recId && load && data.esito === 'conforme') {
      for (const p of data.prodotti) if (p.qta && p.qta > 0) api.stockAdd({ name: p.nome, quantity: p.qta, unit: p.unita || 'kg', location: catLocation(data.categoria), lot: p.lotto || undefined, expiresAt: p.scadenza ? new Date(p.scadenza + 'T12:00').toISOString() : undefined, notes: `DDT ${data.ddt} · ${data.fornitore}` })
    }
    toast(recId ? 'Consegna aggiornata' : `Consegna registrata${load && data.esito === 'conforme' && data.prodotti.some((p) => p.qta) ? ' e caricata in giacenza' : ''}`, 'success')
    if (!recId && data.esito === 'non_conforme') {
      nav.openNc({ origine: 'ricevuta', fornitore: data.fornitore, ddt: data.ddt, ricevimentoId: r.id, tipo: tempBad ? 'Temperatura' : !data.imballo ? 'Imballaggio danneggiato' : !data.etichetta ? 'Etichettatura assente o errata' : 'Altro', descrizione: tempBad ? `Merce consegnata a ${num(t)} °C (massimo ${max} °C)` : '', azione: 'Restituzione al fornitore' } as Partial<NcData>)
    }
    if (!recId) { setD(empty()); setTempTxt('') }
    onDone()
  }

  const prod = (i: number, p: Partial<Prodotto>) => set({ prodotti: d.prodotti.map((x, j) => (j === i ? { ...x, ...p } : x)) })
  return (
    <section className="panel hz-form">
      <div className="panel-head"><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>{recId ? 'Modifica consegna' : 'Nuova consegna'}</h3></div>
      <div className="hz-form-body">
        {!recId && (
          <button type="button" className="hz-drop" onClick={() => file.current?.click()} disabled={!!busy}>
            {busy ? <Loader2 className="hz-spin" /> : <Camera />}
            <b>{busy || 'Fotografa o carica il DDT'}</b>
            <small>Numero, data, fornitore, prodotti, lotti e scadenze vengono compilati da soli</small>
          </button>
        )}
        <input ref={file} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) fromPhoto(f); e.target.value = '' }} />
        <div className="hz-grid2">
          <F label="N° DDT"><input className="input" value={d.ddt} placeholder="es. 2026/A-12" onChange={(e) => set({ ddt: e.target.value })} /></F>
          <F label="Data di ricevimento"><input className="input" type="date" value={d.data} onChange={(e) => set({ data: e.target.value })} /></F>
          <F label="Fornitore" wide>
            <input className="input" list="hz-forn" value={d.fornitore} placeholder="Cerca o scrivi il fornitore" onChange={(e) => set({ fornitore: e.target.value })} />
            <datalist id="hz-forn">{fornitori.map((f) => <option key={f} value={f} />)}</datalist>
          </F>
          <F label="Categoria" wide>
            <div className="hz-chips">{RIC_CATEGORIE.map((c) => <button key={c.key} type="button" className={`pill ${d.categoria === c.key ? 'on' : ''}`} onClick={() => set({ categoria: c.key })}>{c.label}</button>)}</div>
          </F>
          <F label="Temperatura all’arrivo (°C)" hint={max != null ? `Massimo ammesso ${max} °C` : 'Facoltativa per questa categoria'}>
            <input className={`input ${tempBad ? 'bad' : ''}`} inputMode="decimal" value={tempTxt} placeholder="°C" onChange={(e) => setTempTxt(e.target.value)} />
          </F>
          <F label="Controlli visivi">
            <div className="hz-chips">
              <button type="button" className={`pill ${d.imballo ? 'on' : ''}`} onClick={() => set({ imballo: !d.imballo })}>{d.imballo ? <Check size={13} /> : <X size={13} />} Imballi integri</button>
              <button type="button" className={`pill ${d.etichetta ? 'on' : ''}`} onClick={() => set({ etichetta: !d.etichetta })}>{d.etichetta ? <Check size={13} /> : <X size={13} />} Etichette e scadenze</button>
            </div>
          </F>
        </div>

        <F label="Prodotti consegnati">
          <div className="hz-prods">
            {d.prodotti.map((p, i) => (
              <div key={i} className="hz-prod">
                <input className="input" placeholder="Prodotto" value={p.nome} onChange={(e) => prod(i, { nome: e.target.value })} />
                <input className="input" inputMode="decimal" placeholder="Q.tà" value={p.qta ?? ''} onChange={(e) => prod(i, { qta: parseNum(e.target.value) })} />
                <select className="select" value={p.unita || 'kg'} onChange={(e) => prod(i, { unita: e.target.value })}>{['kg', 'g', 'l', 'pz', 'cf'].map((u) => <option key={u}>{u}</option>)}</select>
                <input className="input" placeholder="Lotto" value={p.lotto || ''} onChange={(e) => prod(i, { lotto: e.target.value })} />
                <input className="input" type="date" aria-label="Scadenza" value={p.scadenza || ''} onChange={(e) => prod(i, { scadenza: e.target.value })} />
                <button type="button" className="icon-btn" aria-label="Togli prodotto" onClick={() => set({ prodotti: d.prodotti.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => set({ prodotti: [...d.prodotti, { nome: '', qta: null, unita: 'kg', lotto: '', scadenza: '' }] })}><Plus /> Aggiungi prodotto</button>
          </div>
        </F>

        <F label="Esito del controllo" hint={suggested !== d.esito ? `I controlli indicano «${suggested === 'conforme' ? 'conforme' : 'non conforme'}»` : undefined}>
          <Seg value={d.esito} onChange={(v) => set({ esito: v })} options={[{ key: 'conforme', label: 'Conforme' }, { key: 'non_conforme', label: 'Non conforme' }]} />
        </F>
        <F label="Note"><input className="input" value={d.nota || ''} onChange={(e) => set({ nota: e.target.value })} placeholder="es. consegna in ritardo, autista…" /></F>
        {!recId && d.esito === 'conforme' && d.prodotti.some((p) => p.qta) && (
          <label className="hz-check"><input type="checkbox" checked={load} onChange={(e) => setLoad(e.target.checked)} /><PackagePlus size={16} /> Carica i prodotti in giacenza ({d.categoria === 'surgelati' ? 'congelatore' : d.categoria === 'secchi' ? 'dispensa' : 'frigo'}) con lotto e scadenza</label>
        )}
      </div>
      <div className="hz-form-foot">
        {d.esito === 'non_conforme' && !recId && <span className="small muted" style={{ flex: 1 }}>Dopo il salvataggio si apre la non conformità.</span>}
        <button className="btn btn-gold" disabled={!d.fornitore.trim() && !d.ddt.trim()} onClick={save}>{recId ? 'Salva modifiche' : 'Registra consegna'}</button>
      </div>
    </section>
  )
}

function RicDetail({ r, onClose }: { r: Rec<RicData>; onClose: () => void }) {
  const { remove, me } = useHaccp()
  const { canEdit } = useHub()
  const nav = useNav()
  const [edit, setEdit] = useState(false)
  const d = r.data
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{d.fornitore || 'Consegna'} · DDT {d.ddt || '—'}</span>}
      foot={canEdit && !edit && <div className="row">
        {(r.by_user === me.id || !r.by_user) && <button className="btn btn-danger btn-sm" onClick={async () => { if (await remove(r.id)) onClose() }}><Trash2 /> Elimina</button>}
        <span style={{ flex: 1 }} />
        {d.esito === 'non_conforme' && <button className="btn btn-sm" onClick={() => { nav.openNc({ origine: 'ricevuta', fornitore: d.fornitore, ddt: d.ddt, ricevimentoId: r.id }); onClose() }}>Apri non conformità</button>}
        <button className="btn btn-gold btn-sm" onClick={() => setEdit(true)}>Modifica</button></div>}>
      {edit ? <RicForm initial={d} recId={r.id} onDone={onClose} /> : <>
        <div className="hz-kv">
          <span>Data</span><b>{fmtDate(d.data || r.at)}</b>
          <span>Categoria</span><b>{catLabel(d.categoria)}</b>
          <span>Temperatura</span><b>{d.temperatura != null ? `${num(d.temperatura)} °C` : '—'}</b>
          <span>Imballi</span><b>{d.imballo ? 'integri' : 'danneggiati'}</b>
          <span>Etichette</span><b>{d.etichetta ? 'regolari' : 'non regolari'}</b>
          <span>Esito</span><b className={d.esito === 'conforme' ? 'fc-ok' : 'fc-danger'}>{d.esito === 'conforme' ? 'Conforme' : 'Non conforme'}</b>
          <span>Registrata da</span><b>{r.by_name || '—'}</b>
          {d.nota && <><span>Note</span><b>{d.nota}</b></>}
        </div>
        {d.prodotti?.length > 0 && (
          <section className="panel" style={{ overflow: 'hidden' }}>
            {d.prodotti.map((p, i) => (
              <div key={i} className="trow"><span className="nm"><b>{p.nome}</b><small>{p.qta != null ? `${num(p.qta, 3)} ${p.unita || ''}` : ''}{p.lotto ? ` · lotto ${p.lotto}` : ''}{p.scadenza ? ` · scade ${fmtDate(p.scadenza)}` : ''}</small></span></div>
            ))}
          </section>
        )}
      </>}
    </Drawer>
  )
}
