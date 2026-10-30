'use client'
import { useMemo, useState } from 'react'
import { BookOpen, Check, ExternalLink, Plus, Search, Trash2, UtensilsCrossed } from 'lucide-react'
import { Drawer, ItemCombo, recipeUrl, Stepper, useHub, type Pick } from './ui'
import { fireOps, uid } from './ops'
import {
  componentiOf, copertura, eur, fcTone, lineaFor, lineaItems, norm, PIATTO_CATEGORIE, nameScore, piattoCost, recipeCost, recipeWeight, round, toBase,
  type Componente, type Piatto, type RecipeCost,
} from './model'

const newId = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
const fcClass = (t: string) => (t ? `fc-${t}` : 'fc-none')

export default function PiattiView() {
  const { api, k, ctx, canEdit } = useHub()
  const piatti: Piatto[] = k.piatti || []
  const target: number = k.fcTarget ?? 30
  const coperti: number = k.servizioPiano?.coperti ?? 40
  const linea = lineaItems(k)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('tutti')
  const [edit, setEdit] = useState<Piatto | 'new' | null>(null)

  const cache = useMemo(() => new Map<string, RecipeCost>(), [ctx])
  const rows = useMemo(() => piatti.map((p) => ({ p, c: piattoCost(p, ctx, cache), cov: copertura(p, linea) })), [piatti, ctx, cache, linea])
  const shown = rows
    .filter(({ p }) => (cat === 'tutti' || p.categoria === cat) && (!q || norm(p.nome).includes(norm(q))))
    .sort((a, b) => Number(b.p.attivo) - Number(a.p.attivo) || a.p.nome.localeCompare(b.p.nome, 'it'))
  const active = rows.filter((r) => r.p.attivo)
  const withFc = active.filter((r) => r.c.fc != null && r.c.complete)
  const avgFc = withFc.length ? withFc.reduce((s, r) => s + r.c.fc!, 0) / withFc.length : null
  const short = active.filter((r) => r.cov.porzioni != null && r.cov.porzioni < coperti)
  const incomplete = active.filter((r) => !r.c.complete)

  return (
    <div className="hub">
      <div className="hub-stats">
        <div className="stat"><b>{active.length}</b><span>piatti in carta, su {piatti.length}</span></div>
        <div className={`stat ${fcTone(avgFc, target)}`}><b>{avgFc == null ? '—' : `${round(avgFc, 1).toString().replace('.', ',')}%`}</b><span>food cost medio (obiettivo {target}%)</span></div>
        <button className={`stat ${short.length ? 'warn' : 'ok'}`} onClick={() => window.dispatchEvent(new CustomEvent('kp-nav', { detail: 'linea' }))}>
          <b>{short.length}</b><span>piatti che la linea non copre per {coperti} coperti</span>
        </button>
        <div className={`stat ${incomplete.length ? 'warn' : ''}`}><b>{incomplete.length}</b><span>con costi da completare</span></div>
      </div>

      <div className="hub-bar">
        <div className="hub-search"><Search /><input className="input" placeholder="Cerca un piatto" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {canEdit && <button className="btn btn-gold" onClick={() => setEdit('new')}><Plus /> Nuovo piatto</button>}
      </div>
      <div className="pills">
        {[{ key: 'tutti', label: 'Tutti' }, ...PIATTO_CATEGORIE].map((c) => {
          const n = c.key === 'tutti' ? piatti.length : piatti.filter((p) => p.categoria === c.key).length
          if (c.key !== 'tutti' && !n) return null
          return <button key={c.key} className={`pill ${cat === c.key ? 'on' : ''}`} onClick={() => setCat(c.key)}>{c.label}<small>{n}</small></button>
        })}
      </div>

      {!piatti.length ? (
        <div className="panel empty">
          <UtensilsCrossed size={30} strokeWidth={1.3} />
          <span className="dish">Nessun piatto in carta</span>
          <p style={{ maxWidth: '46ch' }}>Un piatto è fatto di preparazioni del ricettario, con i grammi per porzione. Da lì l’app calcola food cost, quanto copre la linea e cosa preparare.</p>
          {canEdit && <button className="btn btn-gold" onClick={() => setEdit('new')}><Plus /> Crea il primo piatto</button>}
        </div>
      ) : (
        <div className="dish-grid">
          {shown.map(({ p, c, cov }) => {
            const tone = fcTone(c.fc, target)
            const pct = cov.porzioni == null ? null : Math.min(100, (cov.porzioni / Math.max(1, coperti)) * 100)
            return (
              <button key={p.id} className={`dish-card ${p.attivo ? '' : 'off'}`} onClick={() => setEdit(p)}>
                <div className="top">
                  <span className="chip">{PIATTO_CATEGORIE.find((x) => x.key === p.categoria)?.label ?? p.categoria}</span>
                  {!p.attivo && <span>fuori carta</span>}
                  <span style={{ marginLeft: 'auto' }}>{componentiOf(p).length} {componentiOf(p).length === 1 ? 'componente' : 'componenti'}</span>
                </div>
                <h3>{p.nome}</h3>
                <div className="nums">
                  <div className={`fc ${c.complete ? fcClass(tone) : 'fc-none'}`}>
                    {c.fc == null || !componentiOf(p).length || (!c.complete && c.cost === 0) ? '—' : `${c.complete ? '' : '≥'}${Math.round(c.fc)}%`}
                    <small>{!componentiOf(p).length ? 'senza componenti' : !p.prezzo ? 'manca il prezzo' : c.complete ? 'food cost' : c.cost > 0 ? 'food cost parziale' : 'costi da completare'}</small>
                  </div>
                  <div className="money">
                    Costo {eur(c.cost)}<br />
                    Prezzo {p.prezzo ? eur(Number(p.prezzo), 0) : '—'}
                  </div>
                </div>
                <div className={`cover ${cov.porzioni == null ? '' : cov.porzioni === 0 ? 'none' : cov.porzioni < coperti ? 'low' : ''}`}>
                  {cov.porzioni == null ? <span className="muted">Linea non impostata</span> : (
                    <>
                      <span style={{ whiteSpace: 'nowrap' }}>Linea <b>{cov.porzioni}</b>/{coperti}</span>
                      {cov.porzioni >= coperti
                        ? <span className="bar"><i style={{ width: `${pct}%` }} /></span>
                        : (() => { const lim = [...cov.per].sort((a, b) => a.porzioni - b.porzioni)[0]; return <span className={cov.porzioni ? 'fc-warn' : 'fc-danger'} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lim ? `${lim.porzioni === 0 ? 'manca' : 'poca'} ${lim.c.nome.toLowerCase()}` : ''}</span> })()}
                    </>
                  )}
                </div>
              </button>
            )
          })}
          {canEdit && <button className="dish-card dish-add" onClick={() => setEdit('new')}><Plus /> Nuovo piatto</button>}
        </div>
      )}

      {edit && <PiattoEditor piatto={edit === 'new' ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function PiattoEditor({ piatto, onClose }: { piatto: Piatto | null; onClose: () => void }) {
  const { api, k, ctx, recipes, toast, canEdit } = useHub()
  const target: number = k.fcTarget ?? 30
  const linea = lineaItems(k)
  const [nome, setNome] = useState(piatto?.nome ?? '')
  const [categoria, setCategoria] = useState(piatto?.categoria ?? 'antipasto')
  const [prezzo, setPrezzo] = useState(piatto?.prezzo != null ? String(piatto.prezzo) : '')
  const [attivo, setAttivo] = useState(piatto?.attivo ?? true)
  const [comps, setComps] = useState<Componente[]>(() => (piatto ? componentiOf(piatto).map((c) => ({ ...c })) : []))
  const [serve, setServe] = useState(10)
  const [prices, setPrices] = useState<Record<string, string>>({})

  const draft: Piatto = { id: piatto?.id ?? 'draft', nome, categoria, attivo, prezzo: parseFloat(prezzo.replace(',', '.')) || null, componenti: comps }
  const cost = piattoCost(draft, ctx)
  const tone = fcTone(cost.fc, target)

  // ingredienti senza prezzo (anche dentro le ricette usate)
  const missing = useMemo(() => {
    const s = new Set<string>()
    for (const l of cost.lines) {
      if (l.c.tipo === 'ingrediente' && l.reason === 'prezzo mancante') s.add(l.c.nome)
      if (l.c.tipo === 'ricetta') {
        const r = recipes.find((x) => x.id === l.c.recipeId)
        if (r) for (const n of recipeCost(r, ctx).missing) if (!recipes.some((x) => nameScore(x.name, n) >= 0.9)) s.add(n)
        for (const sub of recipes) if (r && r.ingredients.some((i) => nameScore(i.name, sub.name) >= 0.9)) for (const n of recipeCost(sub, ctx).missing) s.add(n)
      }
    }
    return [...s].slice(0, 12)
  }, [cost, recipes, ctx])

  function add(p: Pick) {
    if (p.kind === 'ricetta') {
      const w = recipeWeight(p.recipe)
      setComps((c) => [...c, { id: newId(), tipo: 'ricetta', recipeId: p.recipe.id, nome: p.recipe.name, qty: w ? 50 : 1, unit: w ? 'g' : 'pz' }])
    } else setComps((c) => [...c, { id: newId(), tipo: 'ingrediente', nome: p.nome, qty: 10, unit: 'g' }])
    if (!nome && p.kind === 'ricetta' && !comps.length) setNome(p.recipe.name)
  }
  const upd = (id: string, patch: Partial<Componente>) => setComps((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  function save() {
    if (!nome.trim()) { toast('Dai un nome al piatto', 'error'); return }
    const data = { nome: nome.trim(), categoria, prezzo: draft.prezzo, attivo, componenti: comps }
    if (piatto) api.piattoUpdate(piatto.id, data)
    else api.piattoAdd({ ...data, storico: [] })
    toast(piatto ? 'Piatto aggiornato' : 'Piatto aggiunto', 'success')
    onClose()
  }
  function remove() {
    if (!piatto || !confirm(`Eliminare «${piatto.nome}»?`)) return
    api.piattoRemove(piatto.id); toast('Piatto eliminato', 'success'); onClose()
  }
  function savePrice(n: string) {
    const v = parseFloat((prices[n] || '').replace(',', '.'))
    if (!(v > 0)) return
    api.listinoUpsert({ nome: n, prezzo: v, unita: 'kg' })
    setPrices((p) => ({ ...p, [n]: '' }))
    toast(`Prezzo di ${n} salvato nel listino`, 'success')
  }
  function served() {
    if (!piatto) return
    const { ops, short } = fireOps({ ...piatto, componenti: comps }, serve, linea)
    const entry = { id: uid(), at: new Date().toISOString(), piattoId: piatto.id, nome: piatto.nome, porzioni: serve, deltas: ops.filter((o: any) => 'id' in o).map((o: any) => ({ id: o.id, delta: o.delta })) }
    api.stockOps(ops, { log: entry })
    toast(short.length ? `Registrate ${serve} porzioni · mancano in linea: ${short.map((x) => x.nome).join(', ')}` : `Scaricate dalla linea ${serve} porzioni di ${piatto.nome}`, short.length ? 'error' : 'success')
  }


  return (
    <Drawer onClose={onClose}
      title={<span className="small muted">{piatto ? 'Piatto' : 'Nuovo piatto'}</span>}
      foot={<>
        <div className="sumrow">
          <div><b>{eur(cost.cost)}</b><span>costo porzione</span></div>
          <div><b className={fcClass(tone)}>{cost.fc == null ? '—' : `${round(cost.fc, 1).toString().replace('.', ',')}%`}</b><span>food cost{cost.complete ? '' : ' parziale'}</span></div>
          <div><b>{cost.margin == null ? '—' : eur(cost.margin)}</b><span>margine</span></div>
        </div>
        {canEdit && (
          <div className="row">
            {piatto && <button className="btn btn-danger" onClick={remove}><Trash2 /> Elimina</button>}
            <button className="btn" style={{ marginLeft: 'auto' }} onClick={onClose}>Annulla</button>
            <button className="btn btn-gold" onClick={save}><Check /> Salva piatto</button>
          </div>
        )}
      </>}>
      <input className="title-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome del piatto" autoFocus={!piatto} readOnly={!canEdit} />

      <div className="pills">
        {PIATTO_CATEGORIE.map((c) => <button key={c.key} className={`pill ${categoria === c.key ? 'on' : ''}`} onClick={() => setCategoria(c.key)}>{c.label}</button>)}
      </div>

      <div className="row" style={{ alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 160 }}>
          <span className="label">Prezzo in carta</span>
          <div className="q" style={{ position: 'relative' }}>
            <input className="input" inputMode="decimal" value={prezzo} onChange={(e) => setPrezzo(e.target.value)} placeholder="0,00" style={{ paddingRight: 30 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>€</span>
          </div>
        </label>
        <label className="row small" style={{ gap: 8, paddingBottom: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={attivo} onChange={(e) => setAttivo(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 18, height: 18 }} />
          In carta
        </label>
      </div>

      <section>
        <div className="row" style={{ marginBottom: 6 }}>
          <h3 className="h2" style={{ fontSize: '1.2rem', flex: 1 }}>Cosa c’è nel piatto</h3>
          <span className="small muted">per una porzione</span>
        </div>
        {comps.length === 0 && <p className="small muted" style={{ padding: '8px 0 12px' }}>Aggiungi le preparazioni del ricettario (crema, fondo, gel…) e indica quanti grammi vanno in un piatto.</p>}
        {comps.map((c) => {
          const line = cost.lines.find((l) => l.c.id === c.id)
          const inLinea = lineaFor(c, linea)
          const r = c.recipeId ? recipes.find((x) => x.id === c.recipeId) : null
          return (
            <div key={c.id} className="comp">
              <div className="nm">
                <b><span className={`kind ${c.tipo === 'ricetta' ? 'r' : 'i'}`}>{c.tipo === 'ricetta' ? 'R' : 'I'}</span>{c.nome}
                  {r && <a href={recipeUrl(r.id)} target="_blank" rel="noreferrer" aria-label="Apri ricetta" style={{ marginLeft: 6, color: 'var(--muted)' }}><ExternalLink size={13} /></a>}
                </b>
                {line?.reason ? <small className="miss">{line.reason}</small>
                  : <small>{inLinea.items.length ? `in linea ${round(inLinea.q / 1000, 2).toString().replace('.', ',')} kg` : c.tipo === 'ricetta' ? 'non in linea' : ' '}</small>}
              </div>
              <div className="q">
                <input inputMode="decimal" value={c.qty ?? ''} placeholder="—" readOnly={!canEdit}
                  onChange={(e) => upd(c.id, { qty: e.target.value === '' ? null : parseFloat(e.target.value.replace(',', '.')) || 0 })} />
                <select value={c.unit} onChange={(e) => upd(c.id, { unit: e.target.value })} disabled={!canEdit}>
                  {['g', 'ml', 'pz'].map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <span className="c">{line?.cost == null ? '—' : eur(line.cost)}</span>
              {canEdit ? <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setComps((x) => x.filter((y) => y.id !== c.id))} aria-label={`Togli ${c.nome}`}><Trash2 size={14} /></button> : <span />}
            </div>
          )
        })}
        {canEdit && <div style={{ marginTop: 12 }}><ItemCombo placeholder="Aggiungi una preparazione o un ingrediente" onPick={add} autoFocus={!!piatto && comps.length === 0} /></div>}
      </section>

      {missing.length > 0 && canEdit && (
        <div className="miss-box">
          <b>Prezzi mancanti per il food cost</b>
          {missing.map((n) => (
            <div key={n} className="miss-row">
              <span>{n}</span>
              <input className="input" inputMode="decimal" placeholder="€/kg" value={prices[n] ?? ''} onChange={(e) => setPrices((p) => ({ ...p, [n]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && savePrice(n)} />
              <button className="btn btn-sm" onClick={() => savePrice(n)}>Salva</button>
            </div>
          ))}
          <span className="small muted">Prezzo al kg (o al litro). Per i pezzi usa il listino nel Food cost.</span>
        </div>
      )}

      {piatto && canEdit && comps.length > 0 && (
        <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <b>Servito</b>
          <p className="small muted">Scarica dalla linea le preparazioni usate per le porzioni servite.</p>
          <div className="row">
            <Stepper value={serve} onChange={setServe} step={1} unit="porz." min={1} />
            <button className="btn" onClick={served}><BookOpen /> Scarica dalla linea</button>
          </div>
        </section>
      )}
    </Drawer>
  )
}
export { PiattoEditor as PiattoEditorLazy }
