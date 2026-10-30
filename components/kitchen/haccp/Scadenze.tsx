'use client'
import { useState } from 'react'
import { Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { Drawer, useHub } from '../hub/ui'
import { useHaccp } from './store'
import { F } from './bits'
import { TASK_BASE, addDays, dayKey, daysTo, fmtDate, fmtWhen, uid, type Rec, type Task, type TaskData } from './model'

export const dueLabel = (d: number) => (d < 0 ? `scaduta da ${-d} ${d === -1 ? 'giorno' : 'giorni'}` : d === 0 ? 'oggi' : d === 1 ? 'domani' : `tra ${d} giorni`)
export const dueTone = (d: number) => (d < 0 ? 'chip-danger' : d <= 7 ? 'chip-warn' : '')

export default function Scadenze() {
  const { cfg, recs } = useHaccp()
  const { canEdit } = useHub()
  const [edit, setEdit] = useState<Task | null>(null)
  const done = useCompleteTask()
  const tasks = [...cfg.tasks].sort((a, b) => a.prossima.localeCompare(b.prossima))
  const log = recs.filter((r) => r.kind === 'task') as Rec<TaskData>[]
  return (
    <div className="hz-mod">
      <div className="hub-bar">
        <p className="small muted grow">Controlli periodici: tamponi, disinfestazione, taratura, formazione. Quando ne completi uno, la prossima data si calcola da sola.</p>
        {canEdit && <button className="btn btn-gold btn-sm" onClick={() => setEdit({ id: '', nome: '', ogniGiorni: 90, prossima: dayKey(addDays(new Date(), 30)) })}><Plus /> Nuova scadenza</button>}
      </div>
      <section className="panel" style={{ overflow: 'hidden' }}>
        {!tasks.length && <p className="trow small muted">Nessuna scadenza impostata.</p>}
        {tasks.map((t) => {
          const d = daysTo(t.prossima)
          const last = log.find((r) => r.data.taskId === t.id)
          return (
            <div key={t.id} className="trow">
              <span className="nm"><b>{t.nome}</b><small>ogni {t.ogniGiorni} giorni · prossima {fmtDate(t.prossima)}{last ? ` · ultima ${fmtWhen(last.at)}${last.by_name ? ` (${last.by_name})` : ''}` : ''}{t.nota ? ` · ${t.nota}` : ''}</small></span>
              <span className={`chip ${dueTone(d)}`}>{dueLabel(d)}</span>
              {canEdit && <button className="icon-btn" aria-label={`Modifica ${t.nome}`} onClick={() => setEdit(t)}><Pencil size={15} /></button>}
              {canEdit && <button className="btn btn-sm hz-ok" onClick={() => done(t)}><Check /> Completa</button>}
            </div>
          )
        })}
      </section>
      {log.length > 0 && (
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Completate</h3></div>
          {log.slice(0, 20).map((r) => <div key={r.id} className="trow"><span className="nm"><b>{r.data.nome}</b><small>{fmtWhen(r.at)}{r.by_name ? ` · ${r.by_name}` : ''}{r.data.nota ? ` · ${r.data.nota}` : ''}</small></span></div>)}
        </section>
      )}
      {edit && <TaskEditor t={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

export function useCompleteTask() {
  const { add, cfgUpsert } = useHaccp()
  const { toast } = useHub()
  return async (t: Task, nota = '') => {
    if (!(await add<TaskData>('task', { taskId: t.id, nome: t.nome, nota: nota || undefined }))) return
    const next = dayKey(addDays(new Date(), t.ogniGiorni))
    cfgUpsert('tasks', { ...t, prossima: next })
    toast(`${t.nome}: completata, prossima il ${fmtDate(next)}`, 'success')
  }
}

function TaskEditor({ t, onClose }: { t: Task; onClose: () => void }) {
  const { cfgUpsert, cfgRemove, cfg } = useHaccp()
  const [x, setX] = useState(t)
  const sugg = TASK_BASE.filter((b) => !cfg.tasks.some((c) => c.nome === b.nome))
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{t.id ? t.nome : 'Nuova scadenza'}</span>}
      foot={<div className="row">{t.id && <button className="btn btn-danger btn-sm" onClick={() => { cfgRemove('tasks', t.id); onClose() }}><Trash2 /> Togli</button>}<span style={{ flex: 1 }} />
        <button className="btn btn-gold" disabled={!x.nome.trim() || x.ogniGiorni < 1} onClick={() => { cfgUpsert('tasks', { ...x, id: x.id || `t-${uid()}`, nome: x.nome.trim() }); onClose() }}>Salva</button></div>}>
      {!t.id && sugg.length > 0 && <F label="Suggerite"><div className="hz-chips">{sugg.map((s) => <button key={s.nome} type="button" className={`pill ${x.nome === s.nome ? 'on' : ''}`} onClick={() => setX({ ...x, nome: s.nome, ogniGiorni: s.ogniGiorni })}>{s.nome}</button>)}</div></F>}
      <F label="Attività"><input className="input" value={x.nome} onChange={(e) => setX({ ...x, nome: e.target.value })} /></F>
      <div className="hz-grid2">
        <F label="Si ripete ogni (giorni)"><input className="input" type="number" min={1} value={x.ogniGiorni} onChange={(e) => setX({ ...x, ogniGiorni: Math.max(1, Number(e.target.value) || 1) })} /></F>
        <F label="Prossima scadenza"><input className="input" type="date" value={x.prossima} onChange={(e) => setX({ ...x, prossima: e.target.value })} /></F>
      </div>
      <F label="Nota" hint="es. ditta incaricata, telefono"><input className="input" value={x.nota || ''} onChange={(e) => setX({ ...x, nota: e.target.value })} /></F>
    </Drawer>
  )
}
