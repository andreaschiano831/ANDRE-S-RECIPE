'use client'
import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRightLeft, Boxes, CalendarPlus, ClipboardCheck, FileUp, LayoutList, LayoutGrid, MoreHorizontal,
  Package, Pencil, Plus, Refrigerator, ScanBarcode, Search, ShoppingCart, Snowflake, Trash, Trash2, Utensils, Warehouse, X,
} from 'lucide-react'
import { Drawer, Stepper, go, useHub } from './ui'
import { PRODUCT_CATALOG } from '../KitchenPro'
import { PARTITE, norm, partitaLabel, priceFor, round, toBase, type StockItem } from './model'
import { stockValue } from '../econ/Panoramica'
import { MC, QuickBar, mc, type QAction } from '../quick/Quick'
import { LottoPicker, type Lotto } from './lotti'

type Item = StockItem & { lot?: string; notes?: string; macro?: string }
const LOCS = [
  { key: 'fridge', label: 'Frigo', sub: '0 / +4 °C', icon: <Refrigerator />, color: MC.blu },
  { key: 'freezer', label: 'Congelatore', sub: '−18 °C', icon: <Snowflake />, color: MC.teal },
  { key: 'dry', label: 'Dispensa', sub: 'ambiente', icon: <Warehouse />, color: MC.oro },
  { key: 'counter', label: 'Linea', sub: 'servizio', icon: <Utensils />, color: MC.arancio },
] as const
const locLabel = (k: string) => LOCS.find((l) => l.key === k)?.label || k
const UNITS = ['kg', 'g', 'l', 'ml', 'pz', 'cf', 'box', 'bott', 'porz']
const CATS: Record<string, string> = {
  proteine: 'Carne', pesce: 'Pesce', dairy: 'Latticini e uova', verdure: 'Frutta e verdura', erbe: 'Erbe', cereali: 'Farine, pasta, riso', grassi: 'Oli e grassi',
  spezie: 'Spezie', acidi: 'Aceti e acidi', fondi: 'Fondi e basi', beverage: 'Bevande', prep: 'Preparazioni', custom: 'Altro',
  pulizia: 'Pulizia', packaging: 'Packaging', carta: 'Carta', attrezzatura: 'Attrezzatura', divise: 'Divise', ufficio: 'Ufficio',
}
const ECONOMATO = new Set(['pulizia', 'packaging', 'carta', 'attrezzatura', 'divise', 'ufficio'])
const catLabel = (c?: string) => (c && CATS[c]) || (c ? c[0].toUpperCase() + c.slice(1) : 'Altro')
const stepFor = (u: string) => (u === 'kg' || u === 'l' ? 0.1 : u === 'g' || u === 'ml' ? 50 : 1)
export const fmtQ = (q: number) => String(round(q, 3)).replace('.', ',')
const hoursTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / 36e5 : null)
const dayIso = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '')
function expiry(iso?: string | null) {
  const h = hoursTo(iso)
  if (h == null) return { tone: '', text: 'senza scadenza' }
  if (h < 0) return { tone: 'danger', text: 'scaduto' }
  if (h < 24) return { tone: 'danger', text: 'scade oggi' }
  if (h < 72) return { tone: 'warn', text: `${Math.ceil(h / 24)} gg` }
  return { tone: '', text: new Date(iso!).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) }
}
type Status = 'tutti' | 'scadenza' | 'scaduti' | 'sotto' | 'senzaprezzo'
type Sort = 'categoria' | 'scadenza' | 'nome' | 'quantita' | 'valore'

export default function MagazzinoHub({ legacy }: { legacy?: React.ReactNode }) {
  const [classic, setClassic] = useState(false)
  if (classic && legacy) return <div className="hub"><button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setClassic(false)}>‹ Torna al nuovo magazzino</button>{legacy}</div>
  return <Magazzino onClassic={legacy ? () => setClassic(true) : undefined} />
}

function Magazzino({ onClassic }: { onClassic?: () => void }) {
  const { api, k, stock, ctx, canEdit, toast } = useHub()
  const [loc, setLoc] = useState<string>(() => { try { return localStorage.getItem('kp-mag-loc') || 'fridge' } catch { return 'fridge' } })
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<Status>('tutti')
  const [macro, setMacro] = useState<'tutti' | 'alimenti' | 'economato'>('tutti')
  const [partita, setPartita] = useState('tutte')
  const [sort, setSort] = useState<Sort>('categoria')
  const [view, setView] = useState<'lista' | 'griglia'>(() => { try { return (localStorage.getItem('kp-mag-view') as any) || 'lista' } catch { return 'lista' } })
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [edit, setEdit] = useState<Item | null>(null)
  const [adding, setAdding] = useState(false)
  const [move, setMove] = useState<Item[] | null>(null)
  const [waste, setWaste] = useState<Item | null>(null)
  const [count, setCount] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const pickLoc = (l: string) => { setLoc(l); setSel(new Set()); try { localStorage.setItem('kp-mag-loc', l) } catch {} }
  const pickView = (v: 'lista' | 'griglia') => { setView(v); try { localStorage.setItem('kp-mag-view', v) } catch {} }

  const all = stock as Item[]
  const sv = useMemo(() => stockValue(stock, ctx), [stock, ctx])
  const val = useMemo(() => new Map(sv.items.map((i) => [i.s.id, i.v])), [sv])
  const isEco = (x: Item) => x.macro === 'economato' || ECONOMATO.has(x.category || '')
  const under = (x: Item) => !!x.parLevel && x.quantity < x.parLevel
  const exp = (x: Item) => { const h = hoursTo(x.expiresAt); return h != null && h >= 0 && h < 72 }
  const dead = (x: Item) => { const h = hoursTo(x.expiresAt); return h != null && h < 0 }

  const inLoc = all.filter((x) => loc === 'tutto' || x.location === loc)
  const list = inLoc.filter((x) =>
    (!q || norm(`${x.name} ${x.lot || ''} ${x.category || ''} ${x.notes || ''}`).includes(norm(q))) &&
    (macro === 'tutti' || (macro === 'economato' ? isEco(x) : !isEco(x))) &&
    (partita === 'tutte' || (x.partita || '') === partita) &&
    (status === 'tutti' || (status === 'scadenza' ? exp(x) : status === 'scaduti' ? dead(x) : status === 'sotto' ? under(x) : !val.get(x.id))))
  const sorted = [...list].sort((a, b) =>
    sort === 'nome' ? a.name.localeCompare(b.name, 'it')
      : sort === 'scadenza' ? (a.expiresAt || '9').localeCompare(b.expiresAt || '9')
        : sort === 'quantita' ? a.quantity - b.quantity
          : sort === 'valore' ? (val.get(b.id) || 0) - (val.get(a.id) || 0)
            : catLabel(a.category).localeCompare(catLabel(b.category), 'it') || a.name.localeCompare(b.name, 'it'))
  const groups = sort === 'categoria' ? [...new Set(sorted.map((x) => catLabel(x.category)))].map((g) => ({ g, items: sorted.filter((x) => catLabel(x.category) === g) })) : [{ g: '', items: sorted }]
  const nScad = inLoc.filter(exp).length, nDead = inLoc.filter(dead).length, nUnder = inLoc.filter(under).length

  const setQty = (x: Item, v: number) => api.itemUpdate(x.id, { quantity: Math.max(0, round(v, 3)) })
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const selected = all.filter((x) => sel.has(x.id))
  function toShop(items: Item[]) {
    for (const x of items) api.shopAdd(x.name, Math.max(1, round((x.parLevel || x.quantity || 1) - (x.parLevel ? x.quantity : 0), 2)), x.unit, x.category || 'custom', `Dal magazzino (${locLabel(x.location)})`)
    toast(`${items.length} ${items.length === 1 ? 'prodotto aggiunto' : 'prodotti aggiunti'} alla spesa`, 'success')
  }
  function extend(items: Item[], days: number) { for (const x of items) api.extendExpiry(x.id, days); toast(`Scadenza +${days} giorni`, 'success') }
  function removeAll(items: Item[]) { for (const x of items) api.removeItem(x.id); setSel(new Set()); toast(`${items.length} tolti dal magazzino`, 'success') }

  const actions: QAction[] = [
    { key: 'add', label: 'Carica merce', sub: 'nuovo prodotto', icon: <Plus />, color: MC.verde, run: () => setAdding(true) },
    { key: 'fatt', label: 'Da fattura', sub: 'XML, PDF o foto', icon: <FileUp />, color: MC.arancio, run: () => { try { const u = new URL(location.href); u.searchParams.set('e', 'acquisti'); history.replaceState(history.state, '', u) } catch {}; go('foodcost') } },
    { key: 'inv', label: 'Inventario', sub: `conta ${loc === 'tutto' ? 'tutto' : locLabel(loc).toLowerCase()}`, icon: <ClipboardCheck />, color: MC.blu, run: () => setCount(true) },
    { key: 'scad', label: 'In scadenza', sub: nScad + nDead ? `${nScad + nDead} da usare` : 'niente', icon: <AlertTriangle />, color: MC.rosso, run: () => setStatus(nDead ? 'scaduti' : 'scadenza'), hot: nScad + nDead > 0 },
    { key: 'sotto', label: 'Sotto scorta', sub: nUnder ? `${nUnder} → spesa` : 'tutto sopra il minimo', icon: <ShoppingCart />, color: MC.viola, run: () => { if (nUnder) toShop(inLoc.filter(under)); else setStatus('sotto') }, hot: nUnder > 0 },
  ]

  return (
    <div className="hub hz mg">
      <div className="mg-locs">
        {[...LOCS, { key: 'tutto', label: 'Tutto', sub: 'ogni posizione', icon: <Boxes />, color: MC.ardesia }].map((l) => {
          const items = all.filter((x) => l.key === 'tutto' || x.location === l.key)
          const alarms = items.filter((x) => dead(x) || exp(x)).length
          const v = l.key === 'tutto' ? sv.tot : sv.by[l.key] || 0
          return (
            <button key={l.key} className={`mg-loc ${loc === l.key ? 'on' : ''}`} style={mc(l.color)} onClick={() => pickLoc(l.key)}>
              <span className="qk-ic">{l.icon}</span>
              <span className="mg-loc-t"><b>{l.label}</b><small>{l.sub}</small></span>
              <span className="mg-loc-n"><b>{items.length}</b><small>{v ? `${Math.round(v).toLocaleString('it-IT')} €` : 'prodotti'}</small></span>
              {alarms > 0 && <em className="mg-loc-a">{alarms}</em>}
            </button>
          )
        })}
      </div>

      {canEdit && <QuickBar actions={actions} />}

      <div className="mg-tools">
        <div className="hub-search"><Search /><input className="input" placeholder="Cerca per nome, lotto, categoria…" value={q} onChange={(e) => setQ(e.target.value)} />{q && <button className="mg-clear" onClick={() => setQ('')} aria-label="Cancella"><X size={14} /></button>}</div>
        <select className="select mg-sel" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordina">
          <option value="categoria">Per categoria</option><option value="scadenza">Per scadenza</option><option value="nome">A–Z</option><option value="quantita">Quantità</option><option value="valore">Valore</option>
        </select>
        <div className="seg"><button className={view === 'lista' ? 'on' : ''} onClick={() => pickView('lista')} aria-label="Lista"><LayoutList size={15} /></button><button className={view === 'griglia' ? 'on' : ''} onClick={() => pickView('griglia')} aria-label="Griglia"><LayoutGrid size={15} /></button></div>
      </div>
      <div className="pills mg-pills">
        {([['tutti', 'Tutti', inLoc.length], ['scadenza', 'In scadenza', nScad], ['scaduti', 'Scaduti', nDead], ['sotto', 'Sotto scorta', nUnder], ['senzaprezzo', 'Senza prezzo', inLoc.filter((x) => !val.get(x.id)).length]] as const).map(([k2, l, n]) => (
          <button key={k2} className={`pill ${status === k2 ? 'on' : ''} ${k2 === 'scaduti' && n ? 'mg-bad' : ''}`} onClick={() => setStatus(k2)}>{l}<span className="cnt">{n}</span></button>
        ))}
        <span className="mg-sep" />
        {(['tutti', 'alimenti', 'economato'] as const).map((m) => <button key={m} className={`pill ${macro === m ? 'on' : ''}`} onClick={() => setMacro(m)}>{m === 'tutti' ? 'Alimenti ed economato' : m === 'alimenti' ? 'Alimenti' : 'Economato'}</button>)}
        <select className="select mg-sel" value={partita} onChange={(e) => setPartita(e.target.value)} aria-label="Partita"><option value="tutte">Tutte le partite</option>{PARTITE.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select>
      </div>

      {!sorted.length && (
        <div className="panel empty">
          <Package size={30} strokeWidth={1.3} />
          <span className="dish">{inLoc.length ? 'Nessun prodotto con questi filtri' : `${locLabel(loc)} vuoto`}</span>
          {canEdit && !inLoc.length && <button className="btn btn-gold" onClick={() => setAdding(true)}><Plus /> Carica merce</button>}
        </div>
      )}

      {groups.map(({ g, items }) => (
        <section key={g || 'all'} className="mg-group">
          {g && <div className="mg-gh"><span>{g}</span><small>{items.length}</small>{canEdit && <button className="mg-gsel" onClick={() => setSel((s) => { const n = new Set(s); const allOn = items.every((x) => n.has(x.id)); items.forEach((x) => (allOn ? n.delete(x.id) : n.add(x.id))); return n })}>seleziona</button>}</div>}
          <div className={view === 'griglia' ? 'mg-grid' : 'panel mg-list'}>
            {items.map((x) => {
              const e = expiry(x.expiresAt)
              const v = val.get(x.id) || 0
              const pct = x.parLevel ? Math.min(100, (x.quantity / x.parLevel) * 100) : null
              return (
                <div key={x.id} className={`mg-item ${sel.has(x.id) ? 'sel' : ''} ${e.tone}`}>
                  {canEdit && <input type="checkbox" className="mg-chk" checked={sel.has(x.id)} onChange={() => toggle(x.id)} aria-label={`Seleziona ${x.name}`} />}
                  <button className="mg-name" onClick={() => setEdit(x)}>
                    <b>{x.name}</b>
                    <small>{[loc === 'tutto' ? locLabel(x.location) : '', x.partita ? partitaLabel(x.partita) : '', x.lot ? `lotto ${x.lot}` : '', v ? `${v.toFixed(2).replace('.', ',')} €` : ''].filter(Boolean).join(' · ') || catLabel(x.category)}</small>
                    {pct != null && <span className={`mg-par ${pct < 100 ? 'low' : ''}`}><i style={{ width: `${pct}%` }} /></span>}
                  </button>
                  <button className={`mg-exp ${e.tone}`} onClick={() => setEdit(x)} title="Scadenza">{e.text}</button>
                  <div className="mg-qty">
                    {canEdit ? <Stepper value={round(x.quantity, 3)} step={stepFor(x.unit)} unit={x.unit} onChange={(n) => setQty(x, n)} /> : <b>{fmtQ(x.quantity)} {x.unit}</b>}
                    {x.parLevel ? <small className={under(x) ? 'fc-warn' : 'muted'}>min {fmtQ(x.parLevel)}</small> : null}
                  </div>
                  {canEdit && (
                    <div className="mg-more">
                      <button className="icon-btn" aria-label="Altre azioni" onClick={() => setMenu(menu === x.id ? null : x.id)}><MoreHorizontal size={16} /></button>
                      {menu === x.id && (
                        <div className="mg-menu" onMouseLeave={() => setMenu(null)}>
                          <button onClick={() => { setEdit(x); setMenu(null) }}><Pencil size={14} /> Modifica tutto</button>
                          <button onClick={() => { setMove([x]); setMenu(null) }}><ArrowRightLeft size={14} /> Sposta</button>
                          <button onClick={() => { extend([x], 3); setMenu(null) }}><CalendarPlus size={14} /> Scadenza +3 giorni</button>
                          <button onClick={() => { toShop([x]); setMenu(null) }}><ShoppingCart size={14} /> Alla lista spesa</button>
                          <button onClick={() => { setWaste(x); setMenu(null) }}><Trash size={14} /> Registra spreco</button>
                          <button className="danger" onClick={() => { api.removeItem(x.id); setMenu(null); toast(`${x.name} tolto`, 'success') }}><Trash2 size={14} /> Elimina</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <div className="mg-foot small muted">
        {inLoc.length} prodotti · valore {Math.round(loc === 'tutto' ? sv.tot : sv.by[loc] || 0).toLocaleString('it-IT')} € {sv.senzaPrezzo ? `· ${sv.senzaPrezzo} senza prezzo in listino` : ''}
        {onClassic && <button className="btn btn-ghost btn-sm" onClick={onClassic}>Vista classica</button>}
      </div>

      {selected.length > 0 && (
        <div className="mg-bulk" role="toolbar">
          <b>{selected.length} selezionati</b>
          <button className="btn btn-sm" onClick={() => setMove(selected)}><ArrowRightLeft /> Sposta</button>
          <button className="btn btn-sm" onClick={() => extend(selected, 3)}><CalendarPlus /> +3 gg</button>
          <button className="btn btn-sm" onClick={() => toShop(selected)}><ShoppingCart /> Spesa</button>
          <button className="btn btn-sm btn-danger" onClick={() => removeAll(selected)}><Trash2 /> Elimina</button>
          <button className="icon-btn" aria-label="Annulla selezione" onClick={() => setSel(new Set())}><X size={16} /></button>
        </div>
      )}

      {edit && <EditDrawer x={(all.find((y) => y.id === edit.id) as Item) || edit} onClose={() => setEdit(null)} onWaste={() => { setWaste(edit); setEdit(null) }} />}
      {adding && <AddDrawer loc={loc === 'tutto' ? 'fridge' : loc} onClose={() => setAdding(false)} />}
      {move && <MoveDrawer items={move} onClose={() => { setMove(null); setSel(new Set()) }} />}
      {waste && <WasteDrawer x={waste} onClose={() => setWaste(null)} />}
      {count && <CountDrawer items={sorted.length ? sorted : inLoc} where={loc === 'tutto' ? 'tutto il magazzino' : locLabel(loc)} onClose={() => setCount(false)} />}
    </div>
  )
}

/* ── modifica completa: nome, quantità, unità, posizione, scadenza, lotto, minimo, prezzo… ── */
const CONV: Record<string, Record<string, number>> = { kg: { g: 1000 }, g: { kg: 0.001 }, l: { ml: 1000 }, ml: { l: 0.001 } }
function EditDrawer({ x, onClose, onWaste }: { x: Item; onClose: () => void; onWaste: () => void }) {
  const { api, listino, ctx, canEdit, toast } = useHub()
  const [f, setF] = useState({ name: x.name, quantity: round(x.quantity, 3), unit: x.unit, location: x.location, category: x.category || 'custom', partita: x.partita || '', lot: x.lot || '', expires: dayIso(x.expiresAt), par: x.parLevel || 0, notes: x.notes || '', prezzo: x.prezzoUnitario ?? null as number | null })
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }))
  const conv = CONV[x.unit]?.[f.unit]
  const [doConv, setDoConv] = useState(true)
  const pr = priceFor(f.name, ctx)
  const listPrice = listino.find((l) => norm(l.nome) === norm(f.name))
  function changeUnit(u: string) {
    const c = CONV[f.unit]?.[u]
    if (c && doConv) set({ unit: u, quantity: round(f.quantity * c, 3), par: f.par ? round(f.par * c, 3) : 0 })
    else set({ unit: u })
  }
  function save() {
    api.itemUpdate(x.id, {
      name: f.name.trim() || x.name, quantity: Math.max(0, f.quantity), unit: f.unit, category: f.category, macro: ECONOMATO.has(f.category) ? 'economato' : 'alimenti',
      partita: f.partita || undefined, lot: f.lot.trim() || undefined, expiresAt: f.expires ? new Date(f.expires + 'T23:00').toISOString() : null,
      parLevel: f.par || null, notes: f.notes.trim() || undefined, prezzoUnitario: f.prezzo ?? undefined,
    })
    if (f.location !== x.location) api.moveStock(x.id, Math.max(0, f.quantity), f.location)
    toast(`${f.name} aggiornato`, 'success'); onClose()
  }
  const quick = [1, 3, 7, 14, 30]
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{x.name}</span>}
      foot={canEdit && <div className="row">
        <button className="btn btn-danger btn-sm" onClick={() => { api.removeItem(x.id); toast(`${x.name} tolto`, 'success'); onClose() }}><Trash2 /> Elimina</button>
        <button className="btn btn-sm" onClick={onWaste}><Trash /> Spreco</button>
        <span style={{ flex: 1 }} /><button className="btn btn-gold" onClick={save}>Salva</button></div>}>
      <div className="field"><span className="label">Nome</span><input className="input" value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
      <div className="mg-qrow">
        <div className="field"><span className="label">Quantità</span><Stepper value={f.quantity} step={stepFor(f.unit)} onChange={(v) => set({ quantity: round(v, 3) })} /></div>
        <div className="field"><span className="label">Unità di misura</span>
          <div className="hz-chips">{UNITS.map((u) => <button key={u} type="button" className={`pill ${f.unit === u ? 'on' : ''}`} onClick={() => changeUnit(u)}>{u}</button>)}</div>
        </div>
      </div>
      {(CONV[f.unit] || conv) && <label className="hz-check"><input type="checkbox" checked={doConv} onChange={(e) => setDoConv(e.target.checked)} /> Cambiando kg↔g o l↔ml converti anche la quantità</label>}
      <div className="field"><span className="label">Posizione</span>
        <div className="mg-locpick">{LOCS.map((l) => <button key={l.key} type="button" className={f.location === l.key ? 'on' : ''} style={mc(l.color)} onClick={() => set({ location: l.key })}><span className="qk-ic">{l.icon}</span>{l.label}</button>)}</div>
      </div>
      <div className="hz-grid2">
        <div className="field"><span className="label">Scadenza</span><input className="input" type="date" value={f.expires} onChange={(e) => set({ expires: e.target.value })} />
          <div className="hz-chips">{quick.map((d) => <button key={d} type="button" className="pill" onClick={() => { const b = new Date(); b.setDate(b.getDate() + d); set({ expires: b.toISOString().slice(0, 10) }) }}>+{d} gg</button>)}{f.expires && <button type="button" className="pill" onClick={() => set({ expires: '' })}>nessuna</button>}</div></div>
        <LotField nome={f.name} value={f.lot} onChange={(lot) => set({ lot })} onPick={(l) => set({ lot: l.lotto, notes: [l.doc, l.fornitore].filter(Boolean).join(' · ') || f.notes, ...(l.scadenza && !f.expires ? { expires: l.scadenza } : {}) })} />
        <div className="field"><span className="label">Scorta minima ({f.unit})</span><Stepper value={f.par} step={stepFor(f.unit)} onChange={(v) => set({ par: round(v, 3) })} /><span className="small muted">Sotto il minimo finisce in «Sotto scorta» e nella spesa.</span></div>
        <div className="field"><span className="label">Prezzo € per {f.unit === 'g' ? 'kg' : f.unit === 'ml' ? 'l' : f.unit}</span>
          <input className="input" inputMode="decimal" defaultValue={f.prezzo ?? ''} placeholder={pr ? `${(pr.perBase * (pr.dim === 'm' ? 1000 : 1)).toFixed(2).replace('.', ',')} dal ${pr.source}` : 'dal listino'} onBlur={(e) => { const n = parseFloat(e.target.value.replace(',', '.')); set({ prezzo: isFinite(n) ? n : null }) }} />
          {listPrice && <span className="small muted">listino: {listPrice.prezzo.toFixed(2).replace('.', ',')} €/{listPrice.unita}{listPrice.fornitore ? ` · ${listPrice.fornitore}` : ''}</span>}</div>
        <div className="field"><span className="label">Categoria</span><select className="select" value={f.category} onChange={(e) => set({ category: e.target.value })}>{Object.entries(CATS).map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}</select></div>
        <div className="field"><span className="label">Partita</span><select className="select" value={f.partita} onChange={(e) => set({ partita: e.target.value })}><option value="">Nessuna</option>{PARTITE.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}</select></div>
      </div>
      <div className="field"><span className="label">Note</span><input className="input" value={f.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="es. fornitore, ripiano, aperto il…" /></div>
      {x.insertedAt && <p className="small muted">Caricato il {new Date(x.insertedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</p>}
    </Drawer>
  )
}

/* ── carico: catalogo con durata, oppure nome libero ── */
function AddDrawer({ loc, onClose }: { loc: string; onClose: () => void }) {
  const { api, toast, stock } = useHub()
  const blank = { name: '', quantity: 1, unit: 'kg', location: loc, category: 'custom', expires: '', lot: '', par: 0, partita: '', notes: '' }
  const [f, setF] = useState(blank)
  const [n, setN] = useState(0)
  const set = (p: Partial<typeof f>) => setF((v) => ({ ...v, ...p }))
  const names = useMemo(() => [...new Set([...(PRODUCT_CATALOG as any[]).map((p) => p.n), ...stock.map((s) => s.name)])], [stock])
  function onName(v: string) {
    const c = (PRODUCT_CATALOG as any[]).find((p) => norm(p.n) === norm(v))
    const s = stock.find((x) => norm(x.name) === norm(v)) as Item | undefined
    if (c) { const d = new Date(); d.setDate(d.getDate() + (c.shelf || 3)); set({ name: v, unit: c.u, category: c.c, expires: d.toISOString().slice(0, 10), location: f.location || (c.shelf > 60 ? 'dry' : 'fridge') }) }
    else if (s) set({ name: v, unit: s.unit, category: s.category || 'custom', par: s.parLevel || 0 })
    else set({ name: v })
  }
  function add(close: boolean) {
    if (!f.name.trim()) return
    api.stockAdd({ name: f.name.trim(), quantity: f.quantity, unit: f.unit, location: f.location, category: f.category, macro: ECONOMATO.has(f.category) ? 'economato' : 'alimenti', expiresAt: f.expires ? new Date(f.expires + 'T23:00').toISOString() : undefined, lot: f.lot || undefined, notes: f.notes || undefined, parLevel: f.par || undefined, partita: f.partita || undefined })
    toast(`${f.name}: ${fmtQ(f.quantity)} ${f.unit} in ${locLabel(f.location).toLowerCase()}`, 'success')
    setN((c) => c + 1)
    if (close) onClose(); else setF({ ...blank, location: f.location })
  }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Carica merce{n ? ` · ${n} caricati` : ''}</span>}
      foot={<div className="row"><button className="btn" style={{ flex: 1 }} disabled={!f.name.trim()} onClick={() => add(false)}>Carica e continua</button><button className="btn btn-gold" style={{ flex: 1 }} disabled={!f.name.trim()} onClick={() => add(true)}>Carica</button></div>}>
      <div className="field"><span className="label">Prodotto</span><input className="input" autoFocus list="mg-names" value={f.name} onChange={(e) => onName(e.target.value)} placeholder="es. Burrata, Farina 00, Pellicola…" /><datalist id="mg-names">{names.map((x) => <option key={x} value={x} />)}</datalist>
        <span className="small muted">Dal catalogo arrivano unità, categoria e scadenza consigliata.</span></div>
      <div className="mg-qrow">
        <div className="field"><span className="label">Quantità</span><Stepper value={f.quantity} step={stepFor(f.unit)} onChange={(v) => set({ quantity: round(v, 3) })} /></div>
        <div className="field"><span className="label">Unità</span><div className="hz-chips">{UNITS.map((u) => <button key={u} type="button" className={`pill ${f.unit === u ? 'on' : ''}`} onClick={() => set({ unit: u })}>{u}</button>)}</div></div>
      </div>
      <div className="field"><span className="label">Dove</span><div className="mg-locpick">{LOCS.map((l) => <button key={l.key} type="button" className={f.location === l.key ? 'on' : ''} style={mc(l.color)} onClick={() => set({ location: l.key })}><span className="qk-ic">{l.icon}</span>{l.label}</button>)}</div></div>
      <div className="hz-grid2">
        <div className="field"><span className="label">Scadenza</span><input className="input" type="date" value={f.expires} onChange={(e) => set({ expires: e.target.value })} /></div>
        <LotField nome={f.name} value={f.lot} onChange={(lot) => set({ lot })} onPick={(l) => set({ lot: l.lotto, notes: [l.doc, l.fornitore].filter(Boolean).join(' · '), ...(l.scadenza && !f.expires ? { expires: l.scadenza } : {}) })} />
        <div className="field"><span className="label">Categoria</span><select className="select" value={f.category} onChange={(e) => set({ category: e.target.value })}>{Object.entries(CATS).map(([k2, l]) => <option key={k2} value={k2}>{l}</option>)}</select></div>
        <div className="field"><span className="label">Scorta minima</span><Stepper value={f.par} step={stepFor(f.unit)} onChange={(v) => set({ par: round(v, 3) })} /></div>
      </div>
    </Drawer>
  )
}

function MoveDrawer({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const { api, toast } = useHub()
  const [to, setTo] = useState(items[0].location === 'fridge' ? 'counter' : 'fridge')
  const [qty, setQty] = useState(round(items[0].quantity, 3))
  const one = items.length === 1
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Sposta {one ? items[0].name : `${items.length} prodotti`}</span>}
      foot={<button className="btn btn-gold btn-lg" onClick={() => { for (const x of items) api.moveStock(x.id, one ? qty : x.quantity, to); toast(`Spostato in ${locLabel(to).toLowerCase()}`, 'success'); onClose() }}>Sposta in {locLabel(to).toLowerCase()}</button>}>
      <div className="mg-locpick">{LOCS.map((l) => <button key={l.key} type="button" disabled={one && l.key === items[0].location} className={to === l.key ? 'on' : ''} style={mc(l.color)} onClick={() => setTo(l.key)}><span className="qk-ic">{l.icon}</span>{l.label}</button>)}</div>
      {one ? (
        <div className="field"><span className="label">Quanto (su {fmtQ(items[0].quantity)} {items[0].unit})</span>
          <div className="row"><Stepper value={qty} step={stepFor(items[0].unit)} unit={items[0].unit} onChange={(v) => setQty(Math.min(items[0].quantity, round(v, 3)))} />
            {[0.25, 0.5, 1].map((p) => <button key={p} type="button" className="pill" onClick={() => setQty(round(items[0].quantity * p, 3))}>{p === 1 ? 'tutto' : p === 0.5 ? 'metà' : 'un quarto'}</button>)}</div></div>
      ) : <p className="small muted">{items.map((x) => `${x.name} (${fmtQ(x.quantity)} ${x.unit})`).join(', ')}: si spostano interi.</p>}
    </Drawer>
  )
}

const MOTIVI = ['scaduto', 'rovinato', 'errore di preparazione', 'avanzo di servizio', 'caduto', 'altro']
function WasteDrawer({ x, onClose }: { x: Item; onClose: () => void }) {
  const { api, ctx, toast } = useHub()
  const [qty, setQty] = useState(round(x.quantity, 3))
  const [motivo, setMotivo] = useState(hoursTo(x.expiresAt) != null && hoursTo(x.expiresAt)! < 0 ? 'scaduto' : 'rovinato')
  const pr = priceFor(x.name, ctx); const b = toBase(qty, x.unit)
  const costo = pr && b && pr.dim === b.dim ? b.q * pr.perBase : null
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Spreco: {x.name}</span>}
      foot={<button className="btn btn-gold btn-lg" disabled={qty <= 0} onClick={() => {
        api.logWaste({ prodotto: x.name, qty, unit: x.unit, motivo, costo: costo != null ? round(costo, 2) : null })
        if (qty >= x.quantity) api.removeItem(x.id); else api.itemUpdate(x.id, { quantity: round(x.quantity - qty, 3) })
        toast(`Spreco registrato${costo != null ? `: ${costo.toFixed(2).replace('.', ',')} €` : ''}`, 'success'); onClose()
      }}>Togli e registra{costo != null ? ` · ${costo.toFixed(2).replace('.', ',')} €` : ''}</button>}>
      <div className="field"><span className="label">Quanto butti (su {fmtQ(x.quantity)} {x.unit})</span><Stepper value={qty} step={stepFor(x.unit)} unit={x.unit} onChange={(v) => setQty(Math.min(x.quantity, round(v, 3)))} /></div>
      <div className="hz-chips">{MOTIVI.map((m) => <button key={m} type="button" className={`pill ${motivo === m ? 'on' : ''}`} onClick={() => setMotivo(m)}>{m}</button>)}</div>
      <p className="small muted">Finisce negli sprechi del food cost{costo == null ? ' (senza valore: manca il prezzo in listino)' : ''}.</p>
    </Drawer>
  )
}

/* ── inventario: scrivi quanto c'è davvero, salvo solo le differenze ── */
function CountDrawer({ items, where, onClose }: { items: Item[]; where: string; onClose: () => void }) {
  const { api, toast } = useHub()
  const [vals, setVals] = useState<Record<string, string>>({})
  const changed = items.filter((x) => vals[x.id] != null && vals[x.id] !== '' && Math.abs(parseFloat(vals[x.id].replace(',', '.')) - x.quantity) > 1e-9)
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Inventario · {where}</span>}
      foot={<div className="row"><span className="small muted" style={{ flex: 1 }}>{changed.length ? `${changed.length} quantità cambiate` : 'Scrivi solo dove la quantità è diversa'}</span>
        <button className="btn btn-gold" disabled={!changed.length} onClick={() => { for (const x of changed) { const n = parseFloat(vals[x.id].replace(',', '.')); if (isFinite(n)) { if (n <= 0) api.removeItem(x.id); else api.itemUpdate(x.id, { quantity: round(n, 3) }) } } toast(`Inventario salvato: ${changed.length} correzioni`, 'success'); onClose() }}>Salva inventario</button></div>}>
      <section className="panel" style={{ overflow: 'hidden' }}>
        {items.map((x) => {
          const v = vals[x.id]; const n = v ? parseFloat(v.replace(',', '.')) : null; const d = n != null && isFinite(n) ? n - x.quantity : null
          return (
            <div key={x.id} className="trow mg-count">
              <span className="nm"><b>{x.name}</b><small>{locLabel(x.location)} · nel sistema {fmtQ(x.quantity)} {x.unit}</small></span>
              {d != null && Math.abs(d) > 1e-9 && <span className={`chip ${d < 0 ? 'chip-danger' : 'chip-ok'}`}>{d > 0 ? '+' : ''}{fmtQ(d)}</span>}
              <input className="input" inputMode="decimal" placeholder={fmtQ(x.quantity)} value={v ?? ''} onChange={(e) => setVals((s) => ({ ...s, [x.id]: e.target.value }))} aria-label={`Quantità contata ${x.name}`} />
              <span className="small muted mg-u">{x.unit}</span>
            </div>
          )
        })}
      </section>
    </Drawer>
  )
}

/** lotto scritto a mano o scelto da fatture, DDT e magazzino */
function LotField({ nome, value, onChange, onPick }: { nome: string; value: string; onChange: (v: string) => void; onPick: (l: Lotto) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="field"><span className="label">Lotto</span>
      <div className="lt-field"><input className="input" value={value} placeholder="es. L2290" onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="btn btn-sm" onClick={() => setOpen(true)}><ScanBarcode /> Da fatture e DDT</button></div>
      {open && <LottoPicker nome={nome} onPick={onPick} onClose={() => setOpen(false)} />}
    </div>
  )
}
