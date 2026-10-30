'use client'
import { useMemo, useRef, useState } from 'react'
import { Camera, Check, ClipboardList, ExternalLink, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { askAI, Drawer, ItemCombo, recipeUrl, shrinkImage, Stepper, useHub, type Pick } from './ui'
import { bestMatch, componentiOf, fabbisogno, fmtQty, fromBase, lineaItems, nameScore, PARTITE, partitaLabel, recipeWeight, round, toBase, type KRecipe, type Need, type Piatto, type Prep, type StockItem } from './model'

const LINEA_SYSTEM = `Sei l'assistente di una brigata di cucina professionale.
Ricevi la foto della LINEA di una partita (bacinelle gastronorm, vaschette, contenitori, squeeze, teglie) oppure la foto di un foglio con l'elenco della mise en place.
Elenca ogni preparazione o ingrediente che riconosci, uno per contenitore.
Se ricevi una LISTA DI PREPARAZIONI NOTE, usa esattamente quei nomi quando corrispondono (campo "nome_lista"), altrimenti null.
Stima la quantità presente:
- da un foglio: usa i numeri scritti;
- da una foto: stima dal tipo di contenitore e dal livello. Riferimenti pieni: GN 1/9 ≈ 0,5 kg, GN 1/6 ≈ 0,9 kg, GN 1/4 ≈ 1,5 kg, GN 1/3 ≈ 2 kg, GN 1/2 ≈ 3,5 kg, vaschetta piccola ≈ 0,25 kg, squeeze ≈ 0,3 kg. Scala in base al livello (pieno, metà, poco).
- pezzi contabili (porzioni già fatte, cialde, filetti): usa "pz".
Rispondi SOLO con JSON:
{"articoli":[{"nome":"...","nome_lista":null,"quantita":0.5,"unita":"kg","contenitore":"GN 1/6","livello":"metà","confidenza":0.7}]}`

type Row = { key: string; on: boolean; nome: string; recipeId: string | null; qty: number; unit: string; info: string; partita: string; existing?: StockItem | null }
const CAT_TO_PARTITA: Record<string, string> = { antipasto: 'antipasti', primo: 'primi', secondo: 'secondi', dessert: 'pasticceria', buffet: 'buffet', speciale: 'antipasti' }

export default function LineaView() {
  const { api, k, recipes, toast, canEdit } = useHub()
  const linea = lineaItems(k)
  const piatti: Piatto[] = (k.piatti || []).filter((p: Piatto) => p.attivo)
  const [partita, setPartita] = useState<string>(() => { try { return localStorage.getItem('kp-linea-partita') || 'tutte' } catch { return 'tutte' } })
  const [scan, setScan] = useState(false)
  const pick = (p: string) => { setPartita(p); try { localStorage.setItem('kp-linea-partita', p) } catch {} }

  // preparazioni aperte e mancanze del servizio, per partita: la linea si riempie da qui
  const preps: Prep[] = (k.preparazioni || []).filter((p: Prep) => p.status === 'da_fare' || p.status === 'in_corso')
  const prepPart = (p: Prep) => p.partita || p.reparto || p.categoriaKey || ''
  const coperti: number = k.servizioPiano?.coperti ?? 40
  const needs: (Need & { partita: string })[] = useMemo(() => {
    const ns = fabbisogno(piatti, (p) => k.servizioPiano?.perPiatto?.[p.id] ?? coperti, k, recipes)
    return ns.filter((n) => n.missing > 0).map((n) => {
      const p = piatti.find((x) => n.piatti.includes(x.nome))
      const inLinea = linea.find((s) => (n.recipeId && s.recipeId === n.recipeId) || nameScore(s.name, n.nome) >= 0.85)
      return { ...n, partita: inLinea?.partita || CAT_TO_PARTITA[p?.categoria || ''] || 'antipasti' }
    })
  }, [piatti, k, recipes, coperti, linea])
  const groups = useMemo(() => {
    const keys = partita === 'tutte' ? [...PARTITE.map((p) => p.key), ''] : [partita]
    return keys.map((key) => ({
      key, items: linea.filter((s) => (s.partita || '') === key),
      preps: preps.filter((p) => prepPart(p) === key), needs: needs.filter((n) => n.partita === key),
    })).filter((g) => g.items.length || g.preps.length || g.needs.length || g.key === partita)
  }, [linea, partita, preps, needs])

  function prepFor(nome: string, recipeId: string | null | undefined, part: string, base?: { q: number; dim: 'm' | 'pz' }) {
    const r = recipeId ? recipes.find((x) => x.id === recipeId) : null
    const w = r ? recipeWeight(r) : 0
    const q = base ? fromBase(base.q, base.dim) : w ? fromBase(w, 'm') : { qty: 1, unit: 'pz' }
    api.prepAddFull({ nome, quantita: q.qty, unitaMisura: q.unit, recipeId: recipeId ?? null, partita: part || 'antipasti', note: 'Per la linea' })
    toast(`${nome}: ${q.qty} ${q.unit} da preparare`, 'success')
  }
  /** preparazione finita: va direttamente in linea (si somma a quello che c'è già) */
  function doneToLinea(p: Prep) {
    const part = prepPart(p) || 'antipasti'
    const same = linea.find((s) => s.partita === part && s.unit === p.unitaMisura && ((p.recipeId && s.recipeId === p.recipeId) || s.name === p.nome))
    if (same) api.itemUpdate(same.id, { quantity: round(same.quantity + p.quantita, 3), expiresAt: new Date(Date.now() + 2 * 864e5).toISOString() })
    else api.stockAdd({ name: p.nome, quantity: p.quantita, unit: p.unitaMisura, location: 'counter', partita: part, recipeId: p.recipeId, expiresAt: new Date(Date.now() + 2 * 864e5).toISOString(), notes: 'Da preparazione' })
    api.prepStatus(p.id, 'svolta'); api.prepUpdate(p.id, { destinazione: 'linea' })
    toast(`${p.nome} in linea ${partitaLabel(part)}`, 'success')
  }

  // in quali piatti si usa una preparazione e per quante porzioni basta
  function uses(s: StockItem) {
    const out: { piatto: string; porz: number | null }[] = []
    const b = toBase(s.quantity, s.unit)
    for (const p of piatti) for (const c of componentiOf(p)) {
      if (!((s.recipeId && c.recipeId === s.recipeId) || nameScore(c.nome, s.name) >= 0.85)) continue
      const cb = toBase(c.qty, c.unit)
      if (b && cb && cb.q > 0) out.push({ piatto: p.nome, porz: cb.dim === b.dim ? Math.floor(b.q / cb.q) : null })
    }
    return out
  }
  const hoursLeft = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / 36e5 : null)

  function addManual(p: Pick) {
    const r = p.kind === 'ricetta' ? p.recipe : null
    api.stockAdd({
      name: r ? r.name : (p as any).nome, quantity: 1, unit: r ? 'kg' : 'pz', location: 'counter',
      partita: partita === 'tutte' ? 'antipasti' : partita, recipeId: r?.id, expiresAt: new Date(Date.now() + 2 * 864e5).toISOString(),
    })
    toast('Aggiunto in linea: regola la quantità', 'success')
  }

  return (
    <div className="hub">
      <div className="hub-bar">
        <div className="pills grow">
          <button className={`pill ${partita === 'tutte' ? 'on' : ''}`} onClick={() => pick('tutte')}>Tutte<small>{linea.length}</small></button>
          {PARTITE.map((p) => {
            const n = linea.filter((s) => s.partita === p.key).length
            return <button key={p.key} className={`pill ${partita === p.key ? 'on' : ''}`} onClick={() => pick(p.key)}>{p.label}{n ? <small>{n}</small> : null}</button>
          })}
        </div>
        {canEdit && <button className="btn btn-gold" onClick={() => setScan(true)}><Camera /> Imposta da foto</button>}
      </div>

      {canEdit && (
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <ItemCombo placeholder={`Aggiungi in linea${partita !== 'tutte' ? ` · ${partitaLabel(partita)}` : ''}: cerca una preparazione`} onPick={addManual} />
        </div>
      )}

      {!linea.length && !preps.length && !needs.length ? (
        <div className="panel empty">
          <Camera size={30} strokeWidth={1.3} />
          <span className="dish">La linea è vuota</span>
          <p style={{ maxWidth: '50ch' }}>Fotografa la linea della partita (o il foglio della mise en place): l’app riconosce le preparazioni, stima le quantità e le collega alle ricette. Poi vedi quante porzioni copri per ogni piatto.</p>
          {canEdit && <button className="btn btn-gold" onClick={() => setScan(true)}><Camera /> Imposta da foto</button>}
        </div>
      ) : groups.map((g) => (
        <section key={g.key || 'none'} className="panel linea-part">
          <div className="panel-head">
            <span className="dot" style={{ background: PARTITE.find((p) => p.key === g.key)?.color ?? 'var(--faint)' }} />
            <h3 className="h2" style={{ fontSize: '1.2rem', flex: 1 }}>{g.key ? partitaLabel(g.key) : 'Senza partita'}</h3>
            <span className="small muted">{g.items.length} in linea{g.preps.length ? ` · ${g.preps.length} in preparazione` : ''}</span>
          </div>
          {(g.needs.length > 0 || g.preps.length > 0) && (
            <div style={{ background: 'var(--sunk)', borderBottom: '1px solid var(--line)' }}>
              <p className="label row" style={{ padding: '10px 16px 4px', gap: 6 }}><ClipboardList size={14} /> Da preparare per la linea</p>
              {g.needs.filter((n) => !g.preps.some((p) => (n.recipeId && p.recipeId === n.recipeId) || nameScore(p.nome, n.nome) >= 0.9)).map((n) => (
                <div key={n.key} className="trow" style={{ borderTop: 'none' }}>
                  <span className="nm"><b>{n.nome}</b><small>mancano {fmtQty(n.missing, n.dim)} per {coperti} coperti · {n.piatti.join(', ')}</small></span>
                  {canEdit && <button className="btn btn-sm" onClick={() => prepFor(n.nome, n.recipeId, g.key, { q: n.missing, dim: n.dim })}><Plus /> Prepara</button>}
                </div>
              ))}
              {g.preps.map((p) => (
                <div key={p.id} className="trow" style={{ borderTop: 'none' }}>
                  <span className="nm"><b>{p.nome}</b><small>{p.quantita} {p.unitaMisura} · {p.status === 'in_corso' ? 'in corso' : 'da fare'}</small></span>
                  {canEdit && p.status === 'da_fare' && <button className="btn btn-sm" onClick={() => api.prepStatus(p.id, 'in_corso')}><Play /> Inizia</button>}
                  {canEdit && <button className="btn btn-gold btn-sm" onClick={() => doneToLinea(p)}><Check /> Fatta, in linea</button>}
                </div>
              ))}
            </div>
          )}
          {!g.items.length && <p className="trow muted small">Niente in linea per questa partita.</p>}
          {g.items.map((s) => {
            const u = uses(s)
            const h = hoursLeft(s.expiresAt)
            const r = s.recipeId ? recipes.find((x) => x.id === s.recipeId) : null
            const step = s.unit === 'kg' || s.unit === 'l' ? 0.1 : s.unit === 'g' || s.unit === 'ml' ? 50 : 1
            return (
              <div key={s.id} className="trow" style={{ flexWrap: 'wrap' }}>
                <div className="nm" style={{ minWidth: 180 }}>
                  <b>{s.name}{r && <a href={recipeUrl(r.id)} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: 'var(--muted)' }} aria-label="Apri ricetta"><ExternalLink size={13} /></a>}</b>
                  <small>
                    {u.length ? u.map((x) => (x.porz == null ? `${x.piatto}: unità diversa dal piatto` : `${x.piatto}: ${x.porz} porz.`)).join(' · ') : r ? 'non usata nei piatti in carta' : 'non collegata a una ricetta'}
                  </small>
                </div>
                {h != null && <span className={`chip ${h < 0 ? 'chip-danger' : h < 24 ? 'chip-warn' : ''}`}>{h < 0 ? 'scaduta' : h < 24 ? `scade tra ${Math.max(1, Math.round(h))} h` : `${Math.round(h / 24)} gg`}</span>}
                {canEdit ? <Stepper value={s.quantity} step={step} unit={s.unit} onChange={(v) => (v <= 0 ? api.removeItem(s.id) : api.itemUpdate(s.id, { quantity: v }))} /> : <span className="tnum">{s.quantity} {s.unit}</span>}
                {canEdit && <button className="icon-btn" title="Prepara ancora" onClick={() => prepFor(s.name, s.recipeId, s.partita || g.key)} aria-label={`Prepara ancora ${s.name}`}><ClipboardList size={15} /></button>}
                {canEdit && <button className="icon-btn" onClick={() => api.removeItem(s.id)} aria-label={`Togli ${s.name}`}><Trash2 size={15} /></button>}
              </div>
            )
          })}
        </section>
      ))}

      {scan && <ScanLinea partitaInit={partita === 'tutte' ? 'auto' : partita} onClose={() => setScan(false)} />}
    </div>
  )
}

function ScanLinea({ partitaInit, onClose }: { partitaInit: string; onClose: () => void }) {
  const { api, k, recipes, toast } = useHub()
  const [partita, setPartita] = useState(partitaInit)
  const [imgs, setImgs] = useState<string[]>([])
  const [busy, setBusy] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [replace, setReplace] = useState(true)
  const [days, setDays] = useState(2)
  const file = useRef<HTMLInputElement>(null)
  const allLinea = lineaItems(k)
  const linea = partita === 'auto' ? allLinea : allLinea.filter((s) => s.partita === partita)
  // partita di una preparazione: dove sta già in linea, o la categoria del piatto che la usa
  function inferPartita(recipeId: string | null, nome: string) {
    const ex = allLinea.find((s) => (recipeId && s.recipeId === recipeId) || nameScore(s.name, nome) >= 0.85)
    if (ex?.partita) return ex.partita
    for (const p of (k.piatti || []) as Piatto[]) if (componentiOf(p).some((c) => (recipeId && c.recipeId === recipeId) || nameScore(c.nome, nome) >= 0.85)) return CAT_TO_PARTITA[p.categoria] || 'antipasti'
    return 'antipasti'
  }
  // preparazioni candidate: prima quelle dei piatti in carta, poi tutto il ricettario
  const known = useMemo(() => {
    const ids = new Set<string>()
    for (const p of (k.piatti || []) as Piatto[]) if (p.attivo) for (const c of componentiOf(p)) if (c.recipeId) ids.add(c.recipeId)
    const first = recipes.filter((r) => ids.has(r.id)); const rest = recipes.filter((r) => !ids.has(r.id))
    return [...first, ...rest].slice(0, 120)
  }, [k.piatti, recipes])

  async function addFiles(list: FileList | null) {
    if (!list) return
    for (const f of Array.from(list).slice(0, 3)) {
      try { const b = await shrinkImage(f); setImgs((x) => [...x, b].slice(0, 3)) } catch (e: any) { toast(e.message, 'error') }
    }
  }
  async function analyse() {
    if (!imgs.length) { toast('Aggiungi almeno una foto', 'error'); return }
    setBusy('Riconosco le preparazioni…')
    try {
      const names = known.map((r) => r.name).join('; ')
      const out = await askAI(LINEA_SYSTEM, `Partita: ${partita === 'auto' ? 'non specificata' : partitaLabel(partita)}.\nLISTA DI PREPARAZIONI NOTE: ${names || '(nessuna)'}`, imgs, 3000)
      const arts: any[] = Array.isArray(out?.articoli) ? out.articoli : []
      if (!arts.length) { toast('Non ho riconosciuto nulla: prova una foto più vicina o più luminosa', 'error'); return }
      setRows(arts.map((a, i) => {
        const nm = String(a.nome_lista || a.nome || '').trim()
        const r: KRecipe | null = (a.nome_lista && recipes.find((x) => x.name.toLowerCase() === String(a.nome_lista).toLowerCase())) || bestMatch(nm, recipes, (x) => x.name, 0.7)
        const name = r?.name || nm
        const existing = linea.find((s) => (r && s.recipeId === r.id) || nameScore(s.name, name) >= 0.85) || null
        const part = partita === 'auto' ? (existing?.partita || inferPartita(r?.id ?? null, name)) : partita
        const unit = ['g', 'kg', 'ml', 'l', 'pz'].includes(a.unita) ? a.unita : 'kg'
        return {
          key: String(i), on: true, nome: name, recipeId: r?.id ?? null,
          qty: Math.max(0, Number(String(a.quantita).replace(',', '.')) || 0), unit,
          info: [a.contenitore, a.livello, a.confidenza != null && a.confidenza < 0.5 ? 'incerto' : ''].filter(Boolean).join(' · '),
          existing, partita: part,
        }
      }))
    } catch (e: any) { toast(e.message, 'error') }
    finally { setBusy('') }
  }
  const upd = (key: string, patch: Partial<Row>) => setRows((rs) => rs!.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  function apply() {
    if (!rows) return
    const chosen = rows.filter((r) => r.on && r.nome.trim() && r.qty > 0)
    const touched = new Set<string>()
    const exp = new Date(Date.now() + days * 864e5).toISOString()
    for (const r of chosen) {
      const ex = allLinea.find((s) => !touched.has(s.id) && s.partita === r.partita && ((r.recipeId && s.recipeId === r.recipeId) || nameScore(s.name, r.nome) >= 0.85))
      if (ex) { touched.add(ex.id); api.itemUpdate(ex.id, { quantity: r.qty, unit: r.unit, recipeId: r.recipeId || ex.recipeId, name: r.nome }) }
      else api.stockAdd({ name: r.nome, quantity: r.qty, unit: r.unit, location: 'counter', partita: r.partita, recipeId: r.recipeId, expiresAt: exp })
    }
    const parts = new Set(chosen.map((r) => r.partita))
    let removed = 0
    if (replace) for (const s of allLinea) if (parts.has(s.partita || '') && !touched.has(s.id)) { api.removeItem(s.id); removed++ }
    toast(`Linea impostata: ${chosen.length} preparazioni in ${[...parts].map(partitaLabel).join(', ')}${removed ? `, ${removed} tolte` : ''}`, 'success')
    onClose()
  }

  return (
    <Drawer onClose={onClose}
      title={<span className="dish" style={{ fontSize: '1.3rem' }}>Imposta la linea da foto</span>}
      foot={rows ? (
        <>
          <label className="row small" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} style={{ accentColor: 'var(--accent)', width: 17, height: 17 }} />
            Togli dalla linea{partita === 'auto' ? ' delle partite riconosciute' : ` ${partitaLabel(partita)}`} quello che non è nella foto
          </label>
          <div className="row">
            <span className="small muted">Nuove preparazioni valide</span>
            <select className="select" style={{ width: 'auto' }} value={days} onChange={(e) => setDays(+e.target.value)}>
              {[1, 2, 3, 5].map((d) => <option key={d} value={d}>{d} {d === 1 ? 'giorno' : 'giorni'}</option>)}
            </select>
            <button className="btn" style={{ marginLeft: 'auto' }} onClick={() => setRows(null)}><RefreshCw /> Rifai</button>
            <button className="btn btn-gold" onClick={apply}><Check /> Imposta linea</button>
          </div>
        </>
      ) : undefined}>
      {!rows && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="label">Di quale partita è la linea?</span>
          <div className="pills">
            <button className={`pill ${partita === 'auto' ? 'on' : ''}`} onClick={() => setPartita('auto')}>Riconosci da sola</button>
            {PARTITE.map((p) => <button key={p.key} className={`pill ${partita === p.key ? 'on' : ''}`} onClick={() => setPartita(p.key)}>{p.label}</button>)}
          </div>
        </div>
      )}

      {!rows ? (
        <>
          <label className="photo-drop">
            <Camera size={30} strokeWidth={1.4} color="var(--accent)" />
            <b>Fotografa la linea</b>
            <span className="small">Una o più foto dall’alto delle bacinelle, oppure il foglio della mise en place</span>
            <input ref={file} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          </label>
          {imgs.length > 0 && (
            <div className="thumbs">
              {imgs.map((b, i) => (
                <div key={i} className="thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/jpeg;base64,${b}`} alt={`Foto ${i + 1}`} />
                  <button onClick={() => setImgs((x) => x.filter((_, j) => j !== i))} aria-label="Togli foto"><X size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-gold btn-lg" disabled={!imgs.length || !!busy} onClick={analyse}>
            {busy ? <><span className="spin" /> {busy}</> : <><Camera /> Riconosci preparazioni</>}
          </button>
          <p className="small muted">Le quantità da foto sono stime: le controlli tu prima di salvarle. Le preparazioni vengono collegate alle ricette, così piatti e food cost si aggiornano.</p>
        </>
      ) : (
        <section>
          <p className="small muted" style={{ marginBottom: 8 }}>Controlla nomi, ricetta collegata e quantità. Togli la spunta a quello che non vuoi salvare.</p>
          {rows.map((r) => (
            <div key={r.key} className="review" style={{ opacity: r.on ? 1 : 0.45 }}>
              <input type="checkbox" checked={r.on} onChange={(e) => upd(r.key, { on: e.target.checked })} style={{ accentColor: 'var(--accent)', width: 18, height: 18 }} aria-label={`Includi ${r.nome}`} />
              <div style={{ minWidth: 0 }}>
                <input className="input" value={r.nome} onChange={(e) => upd(r.key, { nome: e.target.value })} style={{ padding: '7px 10px' }} />
                <small className="muted" style={{ fontSize: '.74rem', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={r.partita} onChange={(e) => upd(r.key, { partita: e.target.value })} style={{ border: 'none', background: 'var(--sunk)', borderRadius: 6, padding: '1px 4px', fontSize: '.74rem', color: 'var(--ink-2)' }} aria-label="Partita">
                    {PARTITE.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
                  </select>
                  {[r.info, r.existing ? `ora ${r.existing.quantity} ${r.existing.unit}` : 'nuova in linea'].filter(Boolean).join(' · ')}
                </small>
              </div>
              <select className="select match" value={r.recipeId ?? ''} onChange={(e) => {
                const rec = recipes.find((x) => x.id === e.target.value)
                upd(r.key, { recipeId: e.target.value || null, nome: rec ? rec.name : r.nome })
              }} style={{ padding: '7px 28px 7px 10px', fontSize: '.86rem' }}>
                <option value="">Nessuna ricetta</option>
                {r.recipeId && !known.some((x) => x.id === r.recipeId) && <option value={r.recipeId}>{recipes.find((x) => x.id === r.recipeId)?.name}</option>}
                {known.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
              <div className="comp" style={{ display: 'block', padding: 0, border: 'none' }}>
                <div className="q">
                  <input inputMode="decimal" value={String(r.qty).replace('.', ',')} onChange={(e) => upd(r.key, { qty: parseFloat(e.target.value.replace(',', '.')) || 0 })} />
                  <select value={r.unit} onChange={(e) => upd(r.key, { unit: e.target.value })}>{['g', 'kg', 'ml', 'l', 'pz'].map((u) => <option key={u}>{u}</option>)}</select>
                </div>
              </div>
            </div>
          ))}
          <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={() => setRows((rs) => [...rs!, { key: String(Date.now()), on: true, nome: '', recipeId: null, qty: 1, unit: 'kg', info: 'aggiunta a mano', partita: partita === 'auto' ? 'antipasti' : partita }])}>
            <Plus /> Aggiungi una riga
          </button>
          <p className="small muted" style={{ marginTop: 12 }}>Totale: {fmtQty(rows.filter((r) => r.on).reduce((s, r) => s + (toBase(r.qty, r.unit)?.dim === 'm' ? toBase(r.qty, r.unit)!.q : 0), 0), 'm')} in {rows.filter((r) => r.on).length} contenitori</p>
        </section>
      )}
    </Drawer>
  )
}
