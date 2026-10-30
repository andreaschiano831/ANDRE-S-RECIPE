'use client'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Drawer, useHub } from '../hub/ui'
import { useHaccp } from './store'
import { useNav } from './nav'
import { F, Seg } from './bits'
import { NC_AZIONI, NC_TIPI, fmtDate, fmtWhen, iso, type NcData, type Rec } from './model'

export default function NonConformita() {
  const { recs } = useHaccp()
  const { canEdit } = useHub()
  const nav = useNav()
  const [f, setF] = useState<'aperte' | 'chiuse' | 'tutte'>('aperte')
  const all = recs.filter((r) => r.kind === 'nc') as Rec<NcData>[]
  const open = all.filter((r) => !r.data.chiusa)
  const shown = all.filter((r) => f === 'tutte' || (f === 'aperte' ? !r.data.chiusa : r.data.chiusa))
  return (
    <div className="hz-mod">
      <div className="hub-bar">
        <p className="small muted grow">Ogni problema va descritto con l’azione correttiva e chiuso quando hai verificato che è risolto.</p>
        <Seg value={f} onChange={setF} options={[{ key: 'aperte', label: `Aperte${open.length ? ` (${open.length})` : ''}` }, { key: 'chiuse', label: 'Chiuse' }, { key: 'tutte', label: 'Tutte' }]} />
        {canEdit && <button className="btn btn-gold btn-sm" onClick={() => nav.openNc({})}><Plus /> Nuova non conformità</button>}
      </div>
      <div className="hz-nclist">
        {!shown.length && <div className="panel empty"><span className="dish">{f === 'aperte' ? 'Nessuna non conformità aperta' : 'Registro vuoto'}</span><p className="small">Si aprono da sole quando una temperatura è fuori limite o una consegna non è conforme.</p></div>}
        {shown.map((r) => (
          <button key={r.id} className={`hz-nc ${r.data.chiusa ? 'closed' : ''}`} onClick={() => nav.openNc({ id: r.id })}>
            <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
              <b style={{ flex: 1, minWidth: 0 }}>{r.data.fornitore || (r.data.origine === 'processo' ? 'Cucina' : 'Merce')}</b>
              <small className="muted">{fmtDate(r.at)}</small>
            </div>
            <div className="hz-chips"><span className="chip chip-danger">{r.data.tipo}</span>{r.data.ddt && <span className="chip">DDT {r.data.ddt}</span>}<span className={`chip ${r.data.chiusa ? 'chip-ok' : 'chip-warn'}`}>{r.data.chiusa ? 'Chiusa' : 'Aperta'}</span></div>
            {r.data.descrizione && <p className="small">{r.data.descrizione}</p>}
            <small className="muted">Azione: {r.data.azione || '—'}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

const blank: NcData = { origine: 'presente', fornitore: '', ddt: '', ricevimentoId: null, tipo: 'Temperatura', descrizione: '', azione: NC_AZIONI[0], verifica: '', chiusa: false, chiusaIl: null }

export function NcEditor({ prefill, onClose }: { prefill: Partial<NcData> & { id?: string }; onClose: () => void }) {
  const { recs, add, update, remove, me } = useHaccp()
  const { canEdit, toast } = useHub()
  const existing = prefill.id ? (recs.find((r) => r.id === prefill.id) as Rec<NcData> | undefined) : undefined
  const [d, setD] = useState<NcData>({ ...blank, ...(existing?.data || {}), ...(existing ? {} : prefill) })
  const set = (p: Partial<NcData>) => setD((x) => ({ ...x, ...p }))
  async function save(close = false) {
    const data: NcData = { ...d, chiusa: close || d.chiusa, chiusaIl: close || d.chiusa ? d.chiusaIl || iso() : null }
    const ok = existing ? await update<NcData>(existing.id, data) : !!(await add<NcData>('nc', data))
    if (ok) { toast(close ? 'Non conformità chiusa' : 'Non conformità registrata', 'success'); onClose() }
  }
  const ro = !canEdit
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{existing ? 'Non conformità' : 'Nuova non conformità'}</span>}
      foot={!ro && <div className="row">
        {existing && (existing.by_user === me.id || !existing.by_user) && <button className="btn btn-danger btn-sm" onClick={async () => { if (await remove(existing.id)) onClose() }}><Trash2 /> Elimina</button>}
        <span style={{ flex: 1 }} />
        <button className="btn btn-sm" disabled={!d.descrizione.trim() && !d.tipo} onClick={() => save(false)}>{existing ? 'Salva' : 'Registra'}</button>
        {!d.chiusa && <button className="btn btn-gold btn-sm" disabled={!(d.verifica || '').trim()} title={!(d.verifica || '').trim() ? 'Scrivi la verifica per chiudere' : ''} onClick={() => save(true)}>Chiudi con verifica</button>}
      </div>}>
      {existing && <p className="small muted">Aperta {fmtWhen(existing.at)}{existing.by_name ? ` da ${existing.by_name}` : ''}{d.chiusa && d.chiusaIl ? ` · chiusa ${fmtWhen(d.chiusaIl)}` : ''}</p>}
      <F label="Riguarda">
        <Seg value={d.origine} onChange={(v) => set({ origine: v })} options={[{ key: 'ricevuta', label: 'Merce ricevuta' }, { key: 'presente', label: 'Merce già presente' }, { key: 'processo', label: 'Cucina e impianti' }]} />
      </F>
      {d.origine !== 'processo' && (
        <div className="hz-grid2">
          <F label="Fornitore"><input className="input" readOnly={ro} value={d.fornitore || ''} onChange={(e) => set({ fornitore: e.target.value })} /></F>
          <F label="DDT"><input className="input" readOnly={ro} value={d.ddt || ''} onChange={(e) => set({ ddt: e.target.value })} /></F>
        </div>
      )}
      <F label="Tipo di problema"><div className="hz-chips">{NC_TIPI.map((t) => <button key={t} type="button" disabled={ro} className={`pill ${d.tipo === t ? 'on' : ''}`} onClick={() => set({ tipo: t })}>{t}</button>)}</div></F>
      <F label="Descrizione"><textarea className="textarea" rows={3} readOnly={ro} value={d.descrizione} placeholder="Cosa hai trovato, quanta merce, dove" onChange={(e) => set({ descrizione: e.target.value })} /></F>
      <F label="Azione correttiva"><div className="hz-chips">{NC_AZIONI.map((t) => <button key={t} type="button" disabled={ro} className={`pill ${d.azione === t ? 'on' : ''}`} onClick={() => set({ azione: t })}>{t}</button>)}</div></F>
      <F label="Verifica dell’azione correttiva" hint="Serve per chiudere: es. «merce ritirata dal fornitore, nota di credito n. 45»">
        <textarea className="textarea" rows={2} readOnly={ro} value={d.verifica || ''} onChange={(e) => set({ verifica: e.target.value })} />
      </F>
    </Drawer>
  )
}
