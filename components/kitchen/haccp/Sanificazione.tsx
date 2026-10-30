'use client'
import { useState } from 'react'
import { Check, Clock, FileText, Plus, Search, Settings2, Trash2, Undo2 } from 'lucide-react'
import { Drawer, useHub } from '../hub/ui'
import { useHaccp } from './store'
import { F, Ring, Seg } from './bits'
import { ISTRUZIONI_BASE, SANIF_CATALOGO, fmtWhen, sanifDue, uid, type Equip, type Freq, type Rec, type SanifData } from './model'

const FREQ: { key: Freq; label: string }[] = [{ key: 'giornaliera', label: 'Ogni giorno' }, { key: 'settimanale', label: 'Ogni settimana' }, { key: 'mensile', label: 'Ogni mese' }]
const freqLabel = (f: Freq) => FREQ.find((x) => x.key === f)?.label || f

export default function Sanificazione() {
  const { cfg, recs, add, remove, cfgUpsert, cfgRemove, me } = useHaccp()
  const { canEdit, toast } = useHub()
  const [filter, setFilter] = useState<'todo' | 'done' | 'later' | 'all'>('todo')
  const [q, setQ] = useState('')
  const [info, setInfo] = useState<Equip | null>(null)
  const [manage, setManage] = useState(false)
  const sr = recs.filter((r) => r.kind === 'sanif') as Rec<SanifData>[]
  const rows = cfg.equipment.map((e) => ({ e, ...sanifDue(e, sr) }))
  const done = rows.filter((r) => r.done).length
  const pct = rows.length ? (done / rows.length) * 100 : 0
  const shown = rows.filter((r) => (filter === 'all' || (filter === 'done' ? r.done : filter === 'later' ? r.posticipato : !r.done && !r.posticipato)) && (!q || r.e.nome.toLowerCase().includes(q.toLowerCase())))

  const mark = (e: Equip, stato: SanifData['stato']) => add<SanifData>('sanif', { equipId: e.id, nome: e.nome, stato }).then((r) => r && toast(stato === 'fatto' ? `${e.nome}: fatto` : `${e.nome}: rimandato a dopo`, 'success'))
  async function allDone() {
    const todo = rows.filter((r) => !r.done)
    for (const r of todo) await add<SanifData>('sanif', { equipId: r.e.id, nome: r.e.nome, stato: 'fatto' })
    toast(`${todo.length} attività segnate come fatte`, 'success')
  }

  return (
    <div className="hz-mod">
      <section className={`hz-hero ${done === rows.length && rows.length ? 'ok' : ''}`}>
        <div style={{ flex: 1 }}>
          <span className="label">Piano di sanificazione · {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h2 className="dish">{done === rows.length && rows.length ? 'Tutto pulito e registrato' : `Fatte ${done} attività su ${rows.length}`}</h2>
          <p className="small muted">{done === rows.length ? 'Il piano di oggi è completo.' : `Ne mancano ${rows.length - done}: le giornaliere ripartono ogni mattina, le settimanali dopo 7 giorni, le mensili a inizio mese.`}</p>
        </div>
        <Ring pct={pct} size={72} />
      </section>

      <div className="hub-bar">
        <div className="hub-search"><Search /><input className="input" placeholder="Cerca attrezzatura…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Seg value={filter} onChange={setFilter} options={[{ key: 'todo', label: 'Da fare' }, { key: 'done', label: 'Fatte' }, { key: 'later', label: 'Dopo' }, { key: 'all', label: 'Tutte' }]} />
        {canEdit && <button className="btn btn-sm" onClick={() => setManage(true)}><Settings2 /> Attrezzature</button>}
        {canEdit && done < rows.length && <button className="btn btn-gold btn-sm" onClick={allDone}><Check /> Segna tutte fatte</button>}
      </div>

      <section className="panel" style={{ overflow: 'hidden' }}>
        {!shown.length && <p className="trow small muted">{filter === 'todo' ? 'Niente da fare: ottimo lavoro.' : 'Nessuna attività qui.'}</p>}
        {shown.map(({ e, done, posticipato, last }) => (
          <div key={e.id} className={`trow hz-san ${done ? 'done' : ''}`}>
            <span className={`hz-dot ${done ? 'ok' : posticipato ? 'warn' : ''}`} />
            <span className="nm"><b>{e.nome}</b><small>{freqLabel(e.freq)} · {last ? `${last.data.stato === 'fatto' ? 'fatto' : 'rimandato'} ${fmtWhen(last.at)}${last.by_name ? ` da ${last.by_name}` : ''}` : 'mai registrato'}</small></span>
            <button className="btn btn-ghost btn-sm" onClick={() => setInfo(e)}><FileText /> <span className="hide-sm">Istruzioni</span></button>
            {canEdit && (done || posticipato) && last && (last.by_user === me.id || !last.by_user) && <button className="btn btn-ghost btn-sm" onClick={() => remove(last.id)}><Undo2 /> <span className="hide-sm">Annulla</span></button>}
            {canEdit && !done && !posticipato && <button className="btn btn-ghost btn-sm" onClick={() => mark(e, 'posticipato')}><Clock /> <span className="hide-sm">Dopo</span></button>}
            {canEdit && !done && <button className="btn btn-sm hz-ok" onClick={() => mark(e, 'fatto')}><Check /> Fatto</button>}
          </div>
        ))}
      </section>

      {info && <IstruzioniDrawer e={info} onClose={() => setInfo(null)} onSave={canEdit ? (x) => { cfgUpsert('equipment', x); setInfo(null); toast('Istruzioni salvate', 'success') } : undefined} />}
      {manage && <EquipManager onClose={() => setManage(false)} list={cfg.equipment} onAdd={(x) => cfgUpsert('equipment', x)} onRemove={(id) => cfgRemove('equipment', id)} onChange={(x) => cfgUpsert('equipment', x)} />}
    </div>
  )
}

function IstruzioniDrawer({ e, onClose, onSave }: { e: Equip; onClose: () => void; onSave?: (e: Equip) => void }) {
  const [txt, setTxt] = useState(e.istruzioni || ISTRUZIONI_BASE)
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{e.nome}: come si pulisce</span>}
      foot={onSave && <div className="row"><span className="small muted" style={{ flex: 1 }}>Indica prodotti e diluizioni che usate davvero.</span><button className="btn btn-gold" onClick={() => onSave({ ...e, istruzioni: txt })}>Salva istruzioni</button></div>}>
      {onSave ? <textarea className="textarea" rows={12} value={txt} onChange={(ev) => setTxt(ev.target.value)} />
        : <ol className="hz-steps">{txt.split('\n').filter(Boolean).map((l, i) => <li key={i}>{l}</li>)}</ol>}
    </Drawer>
  )
}

function EquipManager({ list, onClose, onAdd, onRemove, onChange }: { list: Equip[]; onClose: () => void; onAdd: (e: Equip) => void; onRemove: (id: string) => void; onChange: (e: Equip) => void }) {
  const [nome, setNome] = useState('')
  const [freq, setFreq] = useState<Freq>('giornaliera')
  const has = (n: string) => list.some((e) => e.nome.toLowerCase() === n.toLowerCase())
  const sugg = SANIF_CATALOGO.filter((s) => !has(s.nome))
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Attrezzature da sanificare</span>}>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (!nome.trim() || has(nome)) return; onAdd({ id: `e-${uid()}`, nome: nome.trim(), freq }); setNome('') }}>
        <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Nuova attrezzatura o zona" value={nome} onChange={(e) => setNome(e.target.value)} />
        <select className="select" style={{ width: 'auto' }} value={freq} onChange={(e) => setFreq(e.target.value as Freq)}>{FREQ.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
        <button className="btn btn-gold" disabled={!nome.trim()}><Plus /> Aggiungi</button>
      </form>
      {sugg.length > 0 && (
        <F label="Aggiungi con un tocco">
          <div className="hz-chips">{sugg.map((s) => <button key={s.nome} type="button" className="pill" onClick={() => onAdd({ id: `e-${uid()}`, nome: s.nome, freq: s.freq })}><Plus size={12} /> {s.nome}</button>)}</div>
        </F>
      )}
      <section className="panel" style={{ overflow: 'hidden' }}>
        {list.map((e) => (
          <div key={e.id} className="trow">
            <span className="nm"><b>{e.nome}</b></span>
            <select className="select" style={{ width: 'auto', padding: '6px 10px' }} value={e.freq} onChange={(ev) => onChange({ ...e, freq: ev.target.value as Freq })}>{FREQ.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
            <button className="icon-btn" aria-label={`Togli ${e.nome}`} onClick={() => onRemove(e.id)}><Trash2 size={15} /></button>
          </div>
        ))}
      </section>
    </Drawer>
  )
}
