'use client'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download, Plus, Trash2 } from 'lucide-react'
import { ItemCombo, recipeUrl, Stepper, useHub } from './ui'
import { PiattoEditorLazy } from './Piatti'
import {
  componentiOf, eur, fcTone, nameScore, norm, piattoCost, priceFor, recipeCost, round, toBase,
  type ListinoItem, type Piatto, type RecipeCost,
} from './model'

type Tab = 'piatti' | 'ricette' | 'listino' | 'sprechi'
const pct = (n: number | null) => (n == null ? '—' : `${round(n, 1).toString().replace('.', ',')}%`)

export default function FoodCostView() {
  const { api, k, ctx, recipes, stock, canEdit } = useHub()
  const [tab, setTab] = useState<Tab>('piatti')
  const target: number = k.fcTarget ?? 30
  const piatti: Piatto[] = k.piatti || []
  const cache = useMemo(() => new Map<string, RecipeCost>(), [ctx])
  const rows = useMemo(() => piatti.map((p) => ({ p, c: piattoCost(p, ctx, cache) })), [piatti, ctx, cache])
  const inCarta = rows.filter((r) => r.p.attivo && r.c.fc != null && r.c.complete)
  const avg = inCarta.length ? inCarta.reduce((s, r) => s + r.c.fc!, 0) / inCarta.length : null
  const over = inCarta.filter((r) => r.c.fc! > target)

  // ingredienti senza prezzo: prima quelli dei piatti in carta
  const usedIds = new Set(piatti.filter((p) => p.attivo).flatMap((p) => componentiOf(p).map((c) => c.recipeId).filter(Boolean)) as string[])
  const missing = useMemo(() => {
    const m = new Map<string, { nome: string; used: boolean; in: Set<string> }>()
    const addMiss = (n: string, used: boolean, where: string) => {
      if (recipes.some((r) => nameScore(r.name, n) >= 0.9)) return // è una sotto-ricetta: contano i suoi ingredienti
      const key = norm(n); const cur = m.get(key) || { nome: n, used: false, in: new Set<string>() }
      cur.used ||= used; cur.in.add(where); m.set(key, cur)
    }
    for (const r of recipes) for (const n of recipeCost(r, ctx, new Set(), cache).missing) addMiss(n, usedIds.has(r.id), r.name)
    for (const { p, c } of rows) for (const l of c.lines) if (l.c.tipo === 'ingrediente' && l.reason === 'prezzo mancante') addMiss(l.c.nome, !!p.attivo, p.nome)
    return [...m.values()].sort((a, b) => Number(b.used) - Number(a.used) || a.nome.localeCompare(b.nome, 'it'))
  }, [recipes, rows, ctx, cache])

  const stockValue = useMemo(() => stock.reduce((s, x) => {
    const b = toBase(x.quantity, x.unit); const pr = priceFor(x.name, ctx, new Set(), cache)
    return b && pr && pr.dim === b.dim ? s + b.q * pr.perBase : s
  }, 0), [stock, ctx, cache])
  const waste30 = (k.wasteLog || []).filter((w: any) => Date.now() - new Date(w.at).getTime() < 30 * 864e5).reduce((s: number, w: any) => s + (Number(w.costo) || 0), 0)

  return (
    <div className="hub">
      <Migrate />
      <div className="hub-stats">
        <div className={`stat ${fcTone(avg, target)}`}><b>{pct(avg)}</b><span>food cost medio dei piatti in carta</span></div>
        <button className={`stat ${over.length ? 'danger' : 'ok'}`} onClick={() => setTab('piatti')}><b>{over.length}</b><span>piatti sopra l’obiettivo del {target}%</span></button>
        <button className={`stat ${missing.length ? 'warn' : 'ok'}`} onClick={() => setTab('listino')}><b>{missing.length}</b><span>ingredienti senza prezzo</span></button>
        <div className="stat"><b>{eur(stockValue, 0)}</b><span>valore delle giacenze con prezzo</span></div>
        <button className={`stat ${waste30 ? 'danger' : ''}`} onClick={() => setTab('sprechi')}><b>{eur(waste30, 0)}</b><span>sprechi negli ultimi 30 giorni</span></button>
      </div>

      <div className="hub-bar">
        <div className="tabs-hub grow">
          {([['piatti', 'Piatti', piatti.length], ['ricette', 'Ricette', recipes.length], ['listino', 'Listino prezzi', (k.listino || []).length], ['sprechi', 'Sprechi', (k.wasteLog || []).length]] as const).map(([key, l, n]) => (
            <button key={key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{l}<small>{n}</small></button>
          ))}
        </div>
        {canEdit && (
          <label className="row small muted" style={{ gap: 8 }}>Obiettivo
            <Stepper value={target} step={1} min={5} unit="%" onChange={(v) => api.kitchenPatch({ fcTarget: Math.round(v) })} />
          </label>
        )}
      </div>

      {tab === 'piatti' && <PiattiFC rows={rows} target={target} />}
      {tab === 'ricette' && <RicetteFC cache={cache} usedIds={usedIds} />}
      {tab === 'listino' && <Listino missing={missing} />}
      {tab === 'sprechi' && <Sprechi />}
    </div>
  )
}

function PiattiFC({ rows, target }: { rows: { p: Piatto; c: ReturnType<typeof piattoCost> }[]; target: number }) {
  const [edit, setEdit] = useState<Piatto | null>(null)
  const sorted = [...rows].sort((a, b) => Number(b.p.attivo) - Number(a.p.attivo) || (b.c.fc ?? -1) - (a.c.fc ?? -1))
  if (!rows.length) return <div className="panel empty"><span className="dish">Nessun piatto</span><p>Crea i piatti nella sezione Piatti: qui trovi food cost e margini.</p></div>
  return (
    <section className="panel" style={{ overflow: 'hidden' }}>
      {sorted.map(({ p, c }) => {
        const tone = fcTone(c.fc, target)
        return (
          <button key={p.id} className="trow" style={{ width: '100%', textAlign: 'left', opacity: p.attivo ? 1 : 0.55 }} onClick={() => setEdit(p)}>
            <span className="nm"><b className="dish" style={{ fontSize: '1.08rem' }}>{p.nome}</b>
              <small>{c.complete ? `${componentiOf(p).length} componenti` : c.lines.filter((l) => l.reason).map((l) => `${l.c.nome}: ${l.reason}`).slice(0, 2).join(' · ')}{p.attivo ? '' : ' · fuori carta'}</small></span>
            <span className="tnum small" style={{ width: 90 }}>costo<br /><b>{eur(c.cost)}</b></span>
            <span className="tnum small" style={{ width: 80 }}>prezzo<br /><b>{p.prezzo ? eur(Number(p.prezzo), 0) : '—'}</b></span>
            <span className="tnum small" style={{ width: 80 }}>margine<br /><b>{c.margin == null ? '—' : eur(c.margin, 0)}</b></span>
            <span className={`tnum fc-${c.complete ? tone || 'none' : 'none'}`} style={{ width: 70, fontFamily: 'var(--f-display)', fontSize: '1.45rem' }} title={c.complete ? 'food cost' : 'parziale: mancano dei costi'}>{c.fc == null || (!c.complete && c.cost === 0) ? '—' : `${c.complete ? '' : '≥'}${Math.round(c.fc)}%`}</span>
          </button>
        )
      })}
      {edit && <PiattoEditorLazy piatto={edit} onClose={() => setEdit(null)} />}
    </section>
  )
}

function RicetteFC({ cache, usedIds }: { cache: Map<string, RecipeCost>; usedIds: Set<string> }) {
  const { recipes, ctx } = useHub()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const list = recipes
    .filter((r) => !q || norm(r.name).includes(norm(q)))
    .map((r) => ({ r, rc: recipeCost(r, ctx, new Set(), cache) }))
    .sort((a, b) => Number(usedIds.has(b.r.id)) - Number(usedIds.has(a.r.id)) || a.r.name.localeCompare(b.r.name, 'it'))
    .slice(0, 150)
  if (!recipes.length) return <div className="panel empty"><span className="dish">Nessuna ricetta collegata</span><p>Collega i ricettari alla cucina dalle impostazioni della cucina.</p></div>
  return (
    <>
      <input className="input" placeholder="Cerca una ricetta" value={q} onChange={(e) => setQ(e.target.value)} />
      <section className="panel" style={{ overflow: 'hidden' }}>
        {list.map(({ r, rc }) => (
          <div key={r.id}>
            <button className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className="nm"><b>{r.name}</b><small>{r.section}{usedIds.has(r.id) ? ' · usata in carta' : ''}{rc.missing.length ? ` · ${rc.missing.length} prezzi mancanti` : ''}</small></span>
              <span className="tnum small" style={{ width: 96 }}>al kg<br /><b className={rc.missing.length ? 'fc-warn' : ''}>{rc.perG == null ? '—' : eur(rc.perG * 1000)}</b></span>
              <span className="tnum small" style={{ width: 96 }}>dose intera<br /><b>{eur(rc.cost)}</b></span>
              {open === r.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {open === r.id && (
              <div style={{ padding: '0 16px 12px', background: 'var(--sunk)' }}>
                {rc.lines.map((l, i) => (
                  <div key={i} className="row small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
                    <span style={{ flex: 1 }}>{l.name}</span>
                    <span className="tnum muted">{l.quantity == null ? 'q.b.' : `${l.quantity} ${l.unit}`}</span>
                    <span className="tnum" style={{ width: 120 }}>{l.price ? <span className="muted">{l.price.source === 'ricetta' ? `da «${l.price.label}»` : l.price.source}</span> : <span className="fc-warn">{l.reason}</span>}</span>
                    <span className="tnum" style={{ width: 70 }}>{l.cost == null ? '—' : eur(l.cost)}</span>
                  </div>
                ))}
                <a className="btn btn-sm" style={{ marginTop: 10 }} href={recipeUrl(r.id)} target="_blank" rel="noreferrer">Apri la ricetta</a>
              </div>
            )}
          </div>
        ))}
      </section>
    </>
  )
}

function Listino({ missing }: { missing: { nome: string; used: boolean; in: Set<string> }[] }) {
  const { api, k, stock, toast, canEdit } = useHub()
  const listino: ListinoItem[] = k.listino || []
  const [vals, setVals] = useState<Record<string, { p: string; u: 'kg' | 'l' | 'pz' }>>({})
  const [q, setQ] = useState('')
  const fromStock = stock.filter((s) => s.prezzoUnitario && s.prezzoUnitario > 0 && !listino.some((l) => nameScore(l.nome, s.name) >= 0.9))
  function save(nome: string) {
    const v = vals[nome]; const p = parseFloat((v?.p || '').replace(',', '.'))
    if (!(p > 0)) { toast('Scrivi un prezzo', 'error'); return }
    api.listinoUpsert({ nome, prezzo: p, unita: v?.u || 'kg' })
    setVals((x) => ({ ...x, [nome]: { p: '', u: 'kg' } }))
  }
  function importStock() {
    for (const s of fromStock) {
      const b = toBase(1, s.unit)
      const unita: 'kg' | 'l' | 'pz' = b?.dim === 'pz' ? 'pz' : ['ml', 'l', 'cl', 'dl'].includes(s.unit) ? 'l' : 'kg'
      const prezzo = b?.dim === 'pz' ? s.prezzoUnitario! : (s.prezzoUnitario! / b!.q) * 1000
      api.listinoUpsert({ nome: s.name, prezzo: round(prezzo, 2), unita, fornitore: null })
    }
    toast(`${fromStock.length} prezzi presi dalle giacenze`, 'success')
  }
  const shown = listino.filter((l) => !q || norm(l.nome).includes(norm(q))).sort((a, b) => a.nome.localeCompare(b.nome, 'it'))
  const PriceInput = ({ nome }: { nome: string }) => (
    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <input className="input" inputMode="decimal" placeholder="€" style={{ width: 84, padding: '6px 8px' }} value={vals[nome]?.p ?? ''}
        onChange={(e) => setVals((x) => ({ ...x, [nome]: { u: x[nome]?.u || 'kg', p: e.target.value } }))} onKeyDown={(e) => e.key === 'Enter' && save(nome)} />
      <select className="select" style={{ width: 74, padding: '6px 22px 6px 8px' }} value={vals[nome]?.u ?? 'kg'}
        onChange={(e) => setVals((x) => ({ ...x, [nome]: { p: x[nome]?.p || '', u: e.target.value as any } }))}>
        <option value="kg">/kg</option><option value="l">/l</option><option value="pz">/pz</option>
      </select>
      <button className="btn btn-sm" onClick={() => save(nome)}>Salva</button>
    </span>
  )
  return (
    <>
      {canEdit && missing.length > 0 && (
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Prezzi mancanti</h3><span className="chip chip-warn">{missing.length}</span></div>
          {missing.slice(0, 40).map((m) => (
            <div key={m.nome} className="trow" style={{ flexWrap: 'wrap' }}>
              <span className="nm" style={{ minWidth: 160 }}><b>{m.nome}</b><small>{m.used ? 'in carta · ' : ''}{[...m.in].slice(0, 3).join(', ')}</small></span>
              <PriceInput nome={m.nome} />
            </div>
          ))}
          {missing.length > 40 && <p className="trow small muted">E altri {missing.length - 40}: completa prima questi.</p>}
        </section>
      )}
      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head" style={{ flexWrap: 'wrap' }}>
          <h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Listino</h3>
          {canEdit && fromStock.length > 0 && <button className="btn btn-sm" onClick={importStock}><Download /> Prendi {fromStock.length} prezzi da giacenze ed economato</button>}
        </div>
        <div style={{ padding: '10px 16px' }}><input className="input" placeholder="Cerca nel listino" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {shown.map((l) => (
          <div key={l.id} className="trow">
            <span className="nm"><b>{l.nome}</b><small>{l.fornitore ? `${l.fornitore} · ` : ''}{l.aggiornatoIl ? `aggiornato ${new Date(l.aggiornatoIl).toLocaleDateString('it-IT')}` : ''}</small></span>
            {canEdit ? (
              <input className="input tnum" inputMode="decimal" defaultValue={String(l.prezzo).replace('.', ',')} style={{ width: 90, padding: '6px 8px' }}
                onBlur={(e) => { const v = parseFloat(e.target.value.replace(',', '.')); if (v > 0 && v !== l.prezzo) api.listinoUpsert({ ...l, prezzo: v }) }} />
            ) : <span className="tnum">{eur(l.prezzo)}</span>}
            <span className="small muted" style={{ width: 28 }}>/{l.unita}</span>
            {canEdit && <button className="icon-btn" onClick={() => api.listinoRemove(l.id)} aria-label={`Togli ${l.nome}`}><Trash2 size={14} /></button>}
          </div>
        ))}
        {!listino.length && <p className="trow small muted">Il listino è vuoto: inserisci i prezzi mancanti qui sopra o prendili dalle giacenze.</p>}
        {canEdit && <NewPrice />}
      </section>
    </>
  )
}

function NewPrice() {
  const { api, toast } = useHub()
  const [nome, setNome] = useState('')
  const [p, setP] = useState('')
  const [u, setU] = useState<'kg' | 'l' | 'pz'>('kg')
  const [f, setF] = useState('')
  function add() {
    const v = parseFloat(p.replace(',', '.'))
    if (!nome.trim() || !(v > 0)) { toast('Scrivi ingrediente e prezzo', 'error'); return }
    api.listinoUpsert({ nome: nome.trim(), prezzo: v, unita: u, fornitore: f.trim() || null })
    setNome(''); setP(''); setF('')
  }
  return (
    <div className="trow" style={{ flexWrap: 'wrap', background: 'var(--sunk)' }}>
      <input className="input" placeholder="Ingrediente" value={nome} onChange={(e) => setNome(e.target.value)} style={{ flex: 2, minWidth: 140 }} />
      <input className="input" placeholder="Fornitore" value={f} onChange={(e) => setF(e.target.value)} style={{ flex: 1, minWidth: 110 }} />
      <input className="input" inputMode="decimal" placeholder="€" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} style={{ width: 84 }} />
      <select className="select" style={{ width: 74 }} value={u} onChange={(e) => setU(e.target.value as any)}><option value="kg">/kg</option><option value="l">/l</option><option value="pz">/pz</option></select>
      <button className="btn btn-gold btn-sm" onClick={add}><Plus /> Aggiungi</button>
    </div>
  )
}

function Sprechi() {
  const { api, k, ctx, toast, canEdit } = useHub()
  const log: any[] = k.wasteLog || []
  const [nome, setNome] = useState('')
  const [qty, setQty] = useState(1)
  const [unit, setUnit] = useState('kg')
  const [motivo, setMotivo] = useState('scaduto')
  const pr = nome ? priceFor(nome, ctx) : null
  const b = toBase(qty, unit)
  const auto = pr && b && pr.dim === b.dim ? b.q * pr.perBase : null
  function add() {
    if (!nome.trim()) { toast('Scegli cosa è stato buttato', 'error'); return }
    api.logWaste({ prodotto: nome.trim(), qty, unit, motivo, costo: auto != null ? round(auto, 2) : null })
    toast('Spreco registrato', 'success'); setNome('')
  }
  return (
    <>
      {canEdit && (
        <section className="panel panel-pad stack" style={{ gap: 12 }}>
          <b>Registra uno spreco</b>
          {nome ? <div className="row"><span className="chip chip-accent">{nome}</span><button className="btn btn-ghost btn-sm" onClick={() => setNome('')}>Cambia</button></div>
            : <ItemCombo placeholder="Cosa hai buttato? Cerca preparazione o ingrediente" onPick={(p) => setNome(p.kind === 'ricetta' ? p.recipe.name : p.nome)} />}
          <div className="row">
            <Stepper value={qty} step={unit === 'pz' ? 1 : 0.1} onChange={setQty} />
            <select className="select" style={{ width: 'auto' }} value={unit} onChange={(e) => setUnit(e.target.value)}>{['kg', 'g', 'l', 'ml', 'pz'].map((u) => <option key={u}>{u}</option>)}</select>
            <select className="select" style={{ width: 'auto' }} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
              {['scaduto', 'danneggiato', 'errore', 'sovrapproduzione', 'altro'].map((m) => <option key={m}>{m}</option>)}
            </select>
            <span className="small muted">{auto != null ? `valore ${eur(auto)}` : nome ? 'senza prezzo nel listino' : ''}</span>
            <button className="btn btn-gold" style={{ marginLeft: 'auto' }} onClick={add}><Plus /> Registra</button>
          </div>
        </section>
      )}
      <section className="panel" style={{ overflow: 'hidden' }}>
        {!log.length && <p className="trow small muted">Nessuno spreco registrato.</p>}
        {log.slice(0, 100).map((w) => (
          <div key={w.id} className="trow">
            <span className="nm"><b>{w.prodotto || w.nome}</b><small>{w.qty} {w.unit} · {w.motivo} · {new Date(w.at).toLocaleDateString('it-IT')}</small></span>
            <span className="tnum fc-danger">{w.costo ? `−${eur(Number(w.costo))}` : ''}</span>
            {canEdit && <button className="icon-btn" onClick={() => api.wasteRemove(w.id)} aria-label="Elimina"><Trash2 size={14} /></button>}
          </div>
        ))}
      </section>
    </>
  )
}

/** importa i calcoli food cost della vecchia versione, che stavano solo su questo dispositivo */
function Migrate() {
  const { api, k, toast } = useHub()
  const [found, setFound] = useState<{ r: any[]; w: any[] } | null>(null)
  useEffect(() => {
    try {
      if (localStorage.getItem(`fc-migrated-${k.id}`)) return
      const r = JSON.parse(localStorage.getItem(`fc-r-${k.id}`) || '[]'); const w = JSON.parse(localStorage.getItem(`fc-w-${k.id}`) || '[]')
      if ((Array.isArray(r) && r.length) || (Array.isArray(w) && w.length)) setFound({ r: Array.isArray(r) ? r : [], w: Array.isArray(w) ? w : [] })
    } catch {}
  }, [k.id])
  if (!found) return null
  function run() {
    for (const r of found!.r) {
      const comps = (r.ing || []).filter((i: any) => i.nome).map((i: any) => ({ id: Math.random().toString(36).slice(2, 9), tipo: 'ingrediente', nome: i.nome, qty: parseFloat(i.qty) || null, unit: i.unit === 'kg' ? 'g' : i.unit === 'l' ? 'ml' : i.unit }))
      // le quantità erano in kg/l: le porto in g/ml
      comps.forEach((c: any, n: number) => { const src = r.ing.filter((i: any) => i.nome)[n]; if (src && (src.unit === 'kg' || src.unit === 'l') && c.qty != null) c.qty = round(c.qty * 1000, 1) })
      api.piattoAdd({ nome: r.nome, categoria: 'speciale', prezzo: parseFloat(r.prezzo) || null, componenti: comps, storico: [] })
      for (const i of r.ing || []) {
        const c = parseFloat(i.costo); if (!(c > 0) || !i.nome) continue
        const unita = i.unit === 'pz' ? 'pz' : i.unit === 'l' || i.unit === 'ml' ? 'l' : 'kg'
        const prezzo = i.unit === 'g' || i.unit === 'ml' ? c * 1000 : c
        api.listinoUpsert({ nome: i.nome, prezzo: round(prezzo, 2), unita })
      }
    }
    for (const w of found!.w) api.logWaste({ prodotto: w.prodotto, qty: parseFloat(w.qty) || 0, unit: w.unit, motivo: w.motivo, costo: parseFloat(w.costo) || null })
    try { localStorage.setItem(`fc-migrated-${k.id}`, '1') } catch {}
    toast('Dati del vecchio food cost importati', 'success'); setFound(null)
  }
  return (
    <div className="miss-box" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ flex: 1, minWidth: 220 }}>Su questo dispositivo ci sono {found.r.length} calcoli e {found.w.length} sprechi della versione precedente del food cost, non condivisi con la brigata.</span>
      <button className="btn btn-sm" onClick={() => { try { localStorage.setItem(`fc-migrated-${k.id}`, '1') } catch {}; setFound(null) }}>Ignora</button>
      <button className="btn btn-gold btn-sm" onClick={run}>Importali</button>
    </div>
  )
}
