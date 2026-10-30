'use client'
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Droplets, PackageCheck, ShieldAlert, Snowflake, SprayCan, Tag, Thermometer, CalendarClock } from 'lucide-react'
import { useHub } from '../hub/ui'
import { useHaccp } from './store'
import { useNav, type Tab } from './nav'
import { MC, mc } from '../quick/Quick'
import { useCompleteTask, dueLabel, dueTone } from './Scadenze'
import { abbState, daysTo, fmtTime, isToday, num, sanifDue, unitState, type AbbData, type EtiData, type NcData, type OlioData, type Rec, type RicData, type SanifData, type TempData } from './model'

export function useOverview() {
  const { cfg, recs } = useHaccp()
  const temps = recs.filter((r) => r.kind === 'temp') as Rec<TempData>[]
  const units = cfg.units.map((u) => ({ u, ...unitState(u, temps) }))
  const sanif = cfg.equipment.map((e) => ({ e, ...sanifDue(e, recs.filter((r) => r.kind === 'sanif') as Rec<SanifData>[]) }))
  const nc = (recs.filter((r) => r.kind === 'nc') as Rec<NcData>[]).filter((r) => !r.data.chiusa)
  const abb = (recs.filter((r) => r.kind === 'abbattimento') as Rec<AbbData>[])
  const abbLive = abb.filter((r) => !r.data.fine)
  const olio = recs.filter((r) => r.kind === 'olio') as Rec<OlioData>[]
  const fryers = cfg.fryers.map((f) => ({ f, today: olio.find((r) => r.data.fryerId === f.id && isToday(r.at)) }))
  const ric = (recs.filter((r) => r.kind === 'ricevimento') as Rec<RicData>[]).filter((r) => Date.now() - new Date(r.at).getTime() < 30 * 864e5)
  const eti = (recs.filter((r) => r.kind === 'etichetta') as Rec<EtiData>[]).filter((r) => isToday(r.at))
  const tasks = cfg.tasks.map((t) => ({ t, d: daysTo(t.prossima) })).sort((a, b) => a.d - b.d)
  const alarms: { tab: Tab; text: string; unitId?: string }[] = [
    ...units.filter((x) => x.status === 'alarm').map((x) => ({ tab: 'temp' as Tab, text: `${x.u.nome} a ${num(x.last!.data.valore)} °C (limiti ${num(x.u.min)} ÷ ${num(x.u.max)})`, unitId: x.u.id })),
    ...abbLive.filter((r) => abbState(r.data).over).map((r) => ({ tab: 'abb' as Tab, text: `Abbattimento di ${r.data.prodotto} oltre il tempo massimo` })),
    ...fryers.filter((x) => x.today?.data.caso === 3 && !x.today.data.cambio).map((x) => ({ tab: 'olio' as Tab, text: `${x.f.nome}: olio non conforme da cambiare` })),
    ...nc.map((r) => ({ tab: 'nc' as Tab, text: `Non conformità aperta: ${r.data.tipo.toLowerCase()}${r.data.fornitore ? ` · ${r.data.fornitore}` : ''}` })),
    ...tasks.filter((x) => x.d < 0).map((x) => ({ tab: 'scad' as Tab, text: `${x.t.nome}: ${dueLabel(x.d)}` })),
  ]
  return { units, sanif, nc, abb, abbLive, fryers, ric, eti, tasks, alarms }
}

export default function Oggi() {
  const o = useOverview()
  const nav = useNav()
  const { canEdit } = useHub()
  const complete = useCompleteTask()
  const tDone = o.units.filter((x) => x.status !== 'todo').length
  const sDone = o.sanif.filter((x) => x.done).length
  const fDone = o.fryers.filter((x) => x.today).length
  const sPct = o.sanif.length ? Math.round((sDone / o.sanif.length) * 100) : 100
  const ricNc = o.ric.filter((r) => r.data.esito === 'non_conforme').length
  const due = o.tasks.filter((x) => x.d <= 30)

  const areas: { tab: Tab; icon: React.ReactNode; value: string; sub: string; title: string; tone: 'ok' | 'warn' | 'danger' | ''; color?: string }[] = [
    { color: MC.blu, tab: 'temp', icon: <Thermometer />, value: `${tDone}/${o.units.length}`, sub: 'rilevate oggi', title: 'Temperature', tone: o.units.some((x) => x.status === 'alarm') ? 'danger' : tDone < o.units.length ? 'warn' : 'ok' },
    { color: MC.verde, tab: 'sanif', icon: <SprayCan />, value: `${sPct}%`, sub: `${sDone} su ${o.sanif.length} fatte`, title: 'Sanificazione', tone: sPct === 100 ? 'ok' : 'warn' },
    { color: MC.arancio, tab: 'merci', icon: <PackageCheck />, value: String(o.ric.length), sub: ricNc ? `${ricNc} non conformi` : 'consegne in 30 giorni', title: 'Ricevimento merci', tone: ricNc ? 'warn' : '' },
    { color: MC.viola, tab: 'abb', icon: <Snowflake />, value: String(o.abbLive.length), sub: o.abbLive.length ? 'in corso' : `${o.abb.filter((r) => isToday(r.at)).length} oggi`, title: 'Abbattimenti', tone: o.abbLive.some((r) => abbState(r.data).over) ? 'danger' : o.abbLive.length ? 'warn' : '' },
    { color: MC.rosso, tab: 'eti', icon: <Tag />, value: String(o.eti.length), sub: 'stampate oggi', title: 'Etichette', tone: '' },
    { color: MC.oro, tab: 'olio', icon: <Droplets />, value: `${fDone}/${o.fryers.length}`, sub: 'controllate oggi', title: 'Olio frittura', tone: o.fryers.some((x) => x.today?.data.caso === 3 && !x.today.data.cambio) ? 'danger' : fDone < o.fryers.length ? 'warn' : 'ok' },
    { color: MC.rosa, tab: 'nc', icon: <ShieldAlert />, value: String(o.nc.length), sub: 'aperte', title: 'Non conformità', tone: o.nc.length ? 'danger' : 'ok' },
    { color: MC.teal, tab: 'scad', icon: <CalendarClock />, value: String(due.length), sub: 'entro 30 giorni', title: 'Scadenze', tone: o.tasks.some((x) => x.d < 0) ? 'danger' : due.some((x) => x.d <= 7) ? 'warn' : '' },
  ]

  const todo: { key: string; text: string; sub: string; action: string; run: () => void }[] = [
    ...o.units.filter((x) => x.status === 'todo').map((x) => ({ key: 'u' + x.u.id, text: `Temperatura ${x.u.nome}`, sub: x.last ? `ultima ${num(x.last.data.valore)} °C` : 'mai rilevata', action: 'Registra', run: () => nav.openTemp(x.u.id) })),
    ...o.abbLive.map((r) => ({ key: 'a' + r.id, text: `Abbattimento ${r.data.prodotto}`, sub: `dalle ${fmtTime(r.data.inizio)} · ${abbState(r.data).min}′`, action: 'Apri', run: () => nav.go('abb') })),
    ...(sDone < o.sanif.length ? [{ key: 'san', text: 'Piano di sanificazione', sub: `${o.sanif.length - sDone} attività da fare`, action: 'Apri', run: () => nav.go('sanif') }] : []),
    ...o.fryers.filter((x) => !x.today).map((x) => ({ key: 'f' + x.f.id, text: `Olio ${x.f.nome}`, sub: 'controllo giornaliero', action: 'Controlla', run: () => nav.go('olio') })),
  ]
  const ok = !o.alarms.length

  return (
    <div className="hz-mod">
      <section className={`hz-status ${ok ? 'ok' : 'danger'}`}>
        <div className="hz-status-ic">{ok ? <CheckCircle2 size={28} /> : <AlertTriangle size={28} />}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="dish">{ok ? 'Tutto sotto controllo' : o.alarms.length === 1 ? 'Un punto da sistemare' : `${o.alarms.length} punti da sistemare`}</h2>
          {ok ? <p className="small">Temperature nei limiti, nessuna non conformità aperta. {todo.length ? `Restano ${todo.length} controlli di oggi.` : 'I controlli di oggi sono fatti.'}</p> : (
            <ul className="hz-alarms">{o.alarms.slice(0, 6).map((a, i) => <li key={i}><button onClick={() => (a.unitId ? nav.openTemp(a.unitId) : nav.go(a.tab))}>{a.text} <ArrowRight size={14} /></button></li>)}</ul>
          )}
        </div>
        <span className="small hz-status-t">aggiornato {fmtTime(new Date().toISOString())}</span>
      </section>

      <div className="hz-areas">
        {areas.map((a) => (
          <button key={a.tab} className={`hz-area ${a.tone}`} style={mc(a.color!)} onClick={() => nav.go(a.tab)}>
            <span className="hz-area-ic">{a.icon}</span>
            {a.tone && a.tone !== 'ok' && <span className={`hz-area-flag ${a.tone}`}>{a.tone === 'danger' ? 'Allarme' : 'Da fare'}</span>}
            {a.tone === 'ok' && <span className="hz-area-flag ok">OK</span>}
            <b>{a.value}</b><small>{a.sub}</small>
            <span className="hz-area-t">{a.title}</span>
          </button>
        ))}
      </div>

      <div className="hz-cols">
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><ClipboardCheck size={17} color="var(--accent)" /><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Da fare oggi</h3><span className="small muted">{todo.length}</span></div>
          {!todo.length && <p className="trow small muted">Controlli di oggi completati.</p>}
          {todo.map((t) => (
            <div key={t.key} className="trow">
              <span className="nm"><b>{t.text}</b><small>{t.sub}</small></span>
              {canEdit && <button className="btn btn-sm" onClick={t.run}>{t.action}</button>}
            </div>
          ))}
        </section>
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><CalendarClock size={17} color="var(--accent)" /><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Prossime scadenze</h3><button className="btn btn-ghost btn-sm" onClick={() => nav.go('scad')}>Tutte</button></div>
          {o.tasks.slice(0, 5).map(({ t, d }) => (
            <div key={t.id} className="trow">
              <span className="nm"><b>{t.nome}</b><small>ogni {t.ogniGiorni} giorni</small></span>
              <span className={`chip ${dueTone(d)}`}>{dueLabel(d)}</span>
              {canEdit && d <= 7 && <button className="btn btn-sm" onClick={() => complete(t)}>Completa</button>}
            </div>
          ))}
          {!o.tasks.length && <p className="trow small muted">Nessuna scadenza impostata.</p>}
        </section>
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><Thermometer size={17} color="var(--accent)" /><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Temperature ora</h3><button className="btn btn-ghost btn-sm" onClick={() => nav.go('temp')}>Apri</button></div>
          {o.units.map((x) => (
            <button key={x.u.id} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav.openTemp(x.u.id)}>
              <span className={`hz-dot ${x.status === 'alarm' ? 'danger' : x.status === 'ok' ? 'ok' : 'warn'}`} />
              <span className="nm"><b>{x.u.nome}</b><small>{x.last ? `${fmtTime(x.last.at)} · ${x.last.by_name || ''}` : 'da rilevare'}</small></span>
              <b className={`hz-temp ${x.status === 'alarm' ? 'fc-danger' : ''}`}>{x.last ? `${num(x.last.data.valore)} °C` : '—'}</b>
            </button>
          ))}
        </section>
      </div>
    </div>
  )
}
