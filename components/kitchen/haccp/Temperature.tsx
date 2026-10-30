'use client'
import { useMemo, useState } from 'react'
import { History, Pencil, Plus, Printer, QrCode, Thermometer, Trash2, Upload } from 'lucide-react'
import { Drawer, useHub } from '../hub/ui'
import { useHaccp } from './store'
import { useNav } from './nav'
import { F, Qr, Spark, esc, printHtml, qrSvg } from './bits'
import { UNIT_TIPI, fmtDateLong, fmtTime, fmtWhen, num, parseNum, tipoLabel, uid, unitState, type NcData, type Rec, type TempData, type Unit } from './model'

export const tempUrl = (kitchenId: string, unitId: string) => `${typeof location !== 'undefined' ? location.origin : ''}/cucine/${kitchenId}/app?s=haccp&t=${encodeURIComponent(unitId)}`

/** registra una lettura; se è fuori dai limiti propone la non conformità */
export function useLogTemp() {
  const { add } = useHaccp()
  const { toast } = useHub()
  const nav = useNav()
  return async (u: Unit, v: number, nota = '') => {
    const ok = v >= u.min && v <= u.max
    const r = await add<TempData>('temp', { unitId: u.id, unit: u.nome, valore: v, min: u.min, max: u.max, ok, nota: nota || undefined })
    if (!r) return null
    if (ok) toast(`${u.nome}: ${num(v)} °C registrata`, 'success')
    else {
      toast(`${u.nome}: ${num(v)} °C fuori dai limiti`, 'error')
      nav.openNc({ origine: 'processo', tipo: 'Temperatura', descrizione: `${u.nome} a ${num(v)} °C (limiti ${num(u.min)} ÷ ${num(u.max)} °C)`, azione: 'Ripristino della temperatura' } as Partial<NcData>)
    }
    return r
  }
}

export default function Temperature() {
  const { cfg, recs, cfgUpsert, cfgRemove, addMany, kitchenId } = useHaccp()
  const { canEdit, toast, k } = useHub()
  const log = useLogTemp()
  const temps = recs.filter((r) => r.kind === 'temp') as Rec<TempData>[]
  const [vals, setVals] = useState<Record<string, string>>({})
  const [edit, setEdit] = useState<Unit | null>(null)
  const [hist, setHist] = useState<Unit | null>(null)
  const [qr, setQr] = useState<Unit | null>(null)
  const states = cfg.units.map((u) => ({ u, ...unitState(u, temps) }))
  const alarms = states.filter((s) => s.status === 'alarm')

  // rilevazioni della vecchia sezione, rimaste solo su questo dispositivo
  const legacy = useMemo(() => { try { return JSON.parse(localStorage.getItem(`hlog-${k.id}`) || '[]') as any[] } catch { return [] } }, [k.id])
  const [imported, setImported] = useState(() => { try { return !!localStorage.getItem(`hlog-imported-${k.id}`) } catch { return false } })
  async function importLegacy() {
    const rows = legacy.filter((l) => l.at && isFinite(Number(l.temp))).map((l) => {
      const u = cfg.units.find((x) => x.id === `u-${l.zona}`) || cfg.units.find((x) => x.nome.toLowerCase() === String(l.zona).toLowerCase())
      const v = Number(l.temp)
      return { kind: 'temp' as const, at: l.at, by_name: l.op || undefined, data: { unitId: u?.id || `u-${l.zona}`, unit: u?.nome || l.zona, valore: v, min: u?.min ?? 0, max: u?.max ?? 4, ok: !!l.ok, nota: l.note || undefined } }
    })
    const n = await addMany(rows)
    if (n) { try { localStorage.setItem(`hlog-imported-${k.id}`, '1') } catch {}; setImported(true); toast(`${n} rilevazioni portate nel registro condiviso`, 'success') }
  }

  async function save(u: Unit) {
    const v = parseNum(vals[u.id] || '')
    if (v == null) { toast('Scrivi la temperatura letta', 'error'); return }
    if (await log(u, v)) setVals((x) => ({ ...x, [u.id]: '' }))
  }

  async function printAll() {
    const items = await Promise.all(cfg.units.map(async (u) => sticker(u, await qrSvg(tempUrl(kitchenId, u.id)))))
    printHtml(items.join(''), STICKER_CSS, 'Adesivi QR temperature')
  }

  return (
    <div className="hz-mod">
      {alarms.length > 0 && (
        <div className="hz-banner danger">
          <b>{alarms.length === 1 ? '1 allarme' : `${alarms.length} allarmi`}: {alarms.map((a) => `${a.u.nome} ${num(a.last!.data.valore)} °C`).join(', ')}</b>
          <span>Controlla subito chiusura, guarnizioni e carico; poi registra una nuova lettura.</span>
        </div>
      )}
      {!imported && legacy.length > 0 && canEdit && (
        <div className="hz-banner">
          <b>{legacy.length} rilevazioni salvate solo su questo dispositivo</b>
          <span>Portale nel registro condiviso, così le vede tutta la brigata e finiscono nelle stampe.</span>
          <button className="btn btn-sm" onClick={importLegacy}><Upload /> Porta nel registro</button>
        </div>
      )}

      <div className="hub-bar">
        <p className="small muted grow">Registra la temperatura due volte al giorno. Ogni frigo ha il suo QR: incollalo sullo sportello e la brigata registra dal telefono.</p>
        <button className="btn btn-sm" onClick={printAll}><Printer /> Stampa tutti i QR</button>
      </div>

      <div className="hz-units">
        {states.map(({ u, last, today, mine, status }) => (
          <section key={u.id} className={`hz-unit ${status}`}>
            <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{u.nome}</h3>
                <span className="small muted">{tipoLabel(u.tipo)} · limiti {num(u.min)} ÷ {num(u.max)} °C</span>
              </div>
              <span className={`chip ${status === 'alarm' ? 'chip-danger' : status === 'ok' ? 'chip-ok' : 'chip-warn'}`}>{status === 'alarm' ? 'Allarme' : status === 'ok' ? `OK · ${today.length} oggi` : 'Da rilevare'}</span>
            </div>
            <div className="hz-reading">
              <b className={last && !last.data.ok ? 'fc-danger' : ''}>{last ? `${num(last.data.valore)} °C` : '—'}</b>
              <small>{last ? `${fmtWhen(last.at)}${last.by_name ? ` · ${last.by_name}` : ''}` : 'nessuna lettura'}</small>
            </div>
            <Spark values={mine.slice(0, 14).reverse().map((r) => r.data.valore)} min={u.min} max={u.max} />
            {canEdit && (
              <form className="hz-entry" onSubmit={(e) => { e.preventDefault(); save(u) }}>
                <input className="input" inputMode="decimal" placeholder="°C letti" aria-label={`Temperatura ${u.nome}`} value={vals[u.id] || ''} onChange={(e) => setVals((x) => ({ ...x, [u.id]: e.target.value }))} />
                <button className="btn btn-gold">Registra</button>
              </form>
            )}
            <div className="hz-unit-foot">
              <button className="btn btn-ghost btn-sm" onClick={() => setHist(u)}><History /> Storico</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setQr(u)}><QrCode /> QR</button>
              {canEdit && <button className="btn btn-ghost btn-sm" onClick={() => setEdit(u)}><Pencil /> Modifica</button>}
            </div>
          </section>
        ))}
        {canEdit && (
          <button className="hz-unit add" onClick={() => setEdit({ id: '', nome: '', tipo: 'frigo', min: 0, max: 4 })}>
            <Plus size={22} /><span>Aggiungi frigo, cella o banco</span>
          </button>
        )}
      </div>

      {edit && <UnitEditor u={edit} onClose={() => setEdit(null)} onSave={(u) => { cfgUpsert('units', u); setEdit(null); toast(`${u.nome} salvato`, 'success') }}
        onDelete={edit.id ? () => { cfgRemove('units', edit.id); setEdit(null); toast(`${edit.nome} tolto (le letture restano nel registro)`, 'success') } : undefined} />}
      {hist && <TempHistory u={hist} onClose={() => setHist(null)} />}
      {qr && <QrDrawer u={qr} onClose={() => setQr(null)} />}
    </div>
  )
}

function UnitEditor({ u, onClose, onSave, onDelete }: { u: Unit; onClose: () => void; onSave: (u: Unit) => void; onDelete?: () => void }) {
  const [x, setX] = useState(u)
  const [mn, setMn] = useState(String(u.min)); const [mx, setMx] = useState(String(u.max))
  const ok = x.nome.trim() && parseNum(mn) != null && parseNum(mx) != null && parseNum(mn)! < parseNum(mx)!
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{u.id ? `Modifica ${u.nome}` : 'Nuovo frigo'}</span>}
      foot={<div className="row">{onDelete && <button className="btn btn-danger btn-sm" onClick={onDelete}><Trash2 /> Togli</button>}<span style={{ flex: 1 }} />
        <button className="btn btn-gold" disabled={!ok} onClick={() => onSave({ ...x, id: x.id || `u-${uid()}`, nome: x.nome.trim(), min: parseNum(mn)!, max: parseNum(mx)! })}>Salva</button></div>}>
      <F label="Nome"><input className="input" autoFocus value={x.nome} placeholder="es. Frigo pasticceria" onChange={(e) => setX({ ...x, nome: e.target.value })} /></F>
      <F label="Tipo" hint="Scegliendo il tipo si impostano i limiti consigliati; puoi cambiarli.">
        <div className="hz-chips">
          {UNIT_TIPI.map((t) => <button key={t.key} type="button" className={`pill ${x.tipo === t.key ? 'on' : ''}`} onClick={() => { setX({ ...x, tipo: t.key }); setMn(String(t.min)); setMx(String(t.max)) }}>{t.label}</button>)}
        </div>
      </F>
      <div className="hz-grid2">
        <F label="Minimo (°C)"><input className="input" inputMode="decimal" value={mn} onChange={(e) => setMn(e.target.value)} /></F>
        <F label="Massimo (°C)"><input className="input" inputMode="decimal" value={mx} onChange={(e) => setMx(e.target.value)} /></F>
      </div>
    </Drawer>
  )
}

function TempHistory({ u, onClose }: { u: Unit; onClose: () => void }) {
  const { recs, remove, me } = useHaccp()
  const { canEdit } = useHub()
  const mine = (recs.filter((r) => r.kind === 'temp' && r.data.unitId === u.id) as Rec<TempData>[])
  const days = new Map<string, Rec<TempData>[]>()
  for (const r of mine) { const d = fmtDateLong(r.at); days.set(d, [...(days.get(d) || []), r]) }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{u.nome}: storico</span>}>
      <Spark values={mine.slice(0, 40).reverse().map((r) => r.data.valore)} min={u.min} max={u.max} h={80} />
      {!mine.length && <p className="muted small">Ancora nessuna lettura.</p>}
      {[...days].map(([d, rs]) => (
        <section key={d} className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><b style={{ flex: 1, fontWeight: 500 }}>{d}</b><span className="small muted">{rs.length} letture</span></div>
          {rs.map((r) => (
            <div key={r.id} className="trow">
              <span className="nm"><b className={r.data.ok ? '' : 'fc-danger'}>{num(r.data.valore)} °C</b><small>{fmtTime(r.at)}{r.by_name ? ` · ${r.by_name}` : ''}{r.data.nota ? ` · ${r.data.nota}` : ''}</small></span>
              <span className={`chip ${r.data.ok ? 'chip-ok' : 'chip-danger'}`}>{r.data.ok ? 'OK' : 'fuori limite'}</span>
              {canEdit && (r.by_user === me.id || !r.by_user) && <button className="icon-btn" aria-label="Elimina lettura" onClick={() => remove(r.id)}><Trash2 size={15} /></button>}
            </div>
          ))}
        </section>
      ))}
    </Drawer>
  )
}

function sticker(u: Unit, svg: string) {
  return `<section class="st"><div class="q">${svg}</div><div class="t"><h1>${esc(u.nome)}</h1><p class="sub">Registro temperature · limiti ${esc(num(u.min))} ÷ ${esc(num(u.max))} °C</p>
  <ol><li>Inquadra il QR con il telefono</li><li>Scrivi la temperatura letta sul display</li><li>Premi «Registra»</li></ol><p class="f">Controllo due volte al giorno · ogni lettura è firmata e datata</p></div></section>`
}
const STICKER_CSS = `@page{size:A6 landscape;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:Helvetica,Arial,sans-serif;color:#111}
.st{display:flex;gap:6mm;align-items:center;height:calc(105mm - 16mm);page-break-after:always;break-after:page}
.q{width:52mm;height:52mm;flex-shrink:0}.q svg{width:100%;height:100%}
h1{font-size:20pt;margin:0 0 1mm}.sub{margin:0 0 3mm;font-size:9pt;color:#444}ol{margin:0;padding-left:5mm;font-size:10pt;line-height:1.5}.f{font-size:8pt;color:#666;margin-top:3mm}`

function QrDrawer({ u, onClose }: { u: Unit; onClose: () => void }) {
  const { kitchenId } = useHaccp()
  const url = tempUrl(kitchenId, u.id)
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{u.nome}: QR</span>}
      foot={<div className="row"><span className="small muted" style={{ flex: 1 }}>Formato A6, da plastificare e attaccare sullo sportello.</span>
        <button className="btn btn-gold" onClick={async () => printHtml(sticker(u, await qrSvg(url)), STICKER_CSS, `QR ${u.nome}`)}><Printer /> Stampa adesivo</button></div>}>
      <div className="hz-qrcard">
        <Qr text={url} size={176} />
        <div>
          <b style={{ fontWeight: 600 }}>Come si usa</b>
          <ol className="small" style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Inquadra il QR con la fotocamera</li><li>Scrivi la temperatura letta</li><li>Premi «Registra»</li>
          </ol>
          <p className="small muted" style={{ marginTop: 8 }}>Data, ora e nome di chi registra si salvano da soli. Serve essere nella brigata della cucina.</p>
        </div>
      </div>
      <p className="small muted" style={{ wordBreak: 'break-all' }}>{url}</p>
    </Drawer>
  )
}

/** inserimento rapido aperto dal QR o dalla lista di oggi */
export function TempEntry({ unitId, onClose }: { unitId: string; onClose: () => void }) {
  const { cfg, recs } = useHaccp()
  const log = useLogTemp()
  const u = cfg.units.find((x) => x.id === unitId)
  const [v, setV] = useState('')
  const [nota, setNota] = useState('')
  if (!u) return <Drawer onClose={onClose} title="Frigo non trovato"><p className="muted">Questo QR non corrisponde più a un frigo della cucina: stampane uno nuovo da HACCP › Temperature.</p></Drawer>
  const st = unitState(u, recs as Rec<TempData>[])
  const n = parseNum(v)
  const out = n != null && (n < u.min || n > u.max)
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}><Thermometer size={18} style={{ verticalAlign: '-3px' }} /> {u.nome}</span>}
      foot={<button className="btn btn-gold btn-lg" disabled={n == null} onClick={async () => { if (await log(u, n!, nota)) onClose() }}>Registra {n != null ? `${num(n)} °C` : ''}</button>}>
      <p className="small muted">Limiti {num(u.min)} ÷ {num(u.max)} °C{st.last ? ` · ultima ${num(st.last.data.valore)} °C ${fmtWhen(st.last.at)}` : ''}</p>
      <input className={`input hz-big ${out ? 'bad' : n != null ? 'good' : ''}`} autoFocus inputMode="decimal" placeholder="°C" value={v} onChange={(e) => setV(e.target.value)} aria-label="Temperatura letta" />
      <div className="hz-chips">{['-', '0', '1', '2', '3', '4', '5'].map((d) => <button key={d} type="button" className="pill" onClick={() => setV((x) => (d === '-' ? (x.startsWith('-') ? x.slice(1) : '-' + x) : x + d))}>{d === '-' ? '±' : d}</button>)}<button type="button" className="pill" onClick={() => setV((x) => x + ',')}>,</button><button type="button" className="pill" onClick={() => setV('')}>Cancella</button></div>
      {out && <p className="hz-banner danger"><b>Fuori dai limiti</b><span>Dopo la registrazione si apre la non conformità da compilare.</span></p>}
      <F label="Nota (facoltativa)"><input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="es. sportello lasciato aperto" /></F>
    </Drawer>
  )
}
