'use client'
import { useMemo, useState } from 'react'
import { ArrowRightLeft, Check, ChevronDown, ChevronUp, ExternalLink, Play, Plus, Trash2, Wand2 } from 'lucide-react'
import { ItemCombo, recipeUrl, Stepper, useHub, type Pick } from './ui'
import Smista from './Smista'
import { fabbisogno, fmtQty, fromBase, lineaFor, lineaItems, PARTITE, partitaLabel, recipeWeight, round, toBase, type Need, type Piatto, type Prep } from './model'

const CAT_TO_PARTITA: Record<string, string> = { antipasto: 'antipasti', primo: 'primi', secondo: 'secondi', dessert: 'pasticceria', buffet: 'buffet', speciale: 'antipasti' }
const today = () => new Date().toISOString().slice(0, 10)

export default function PreparazioniHub({ legacy }: { legacy?: React.ReactNode }) {
  const [tab, setTab] = useState<'piano' | 'classico'>('piano')
  return (
    <div className="hub">
      <div className="tabs-hub">
        <button className={tab === 'piano' ? 'on' : ''} onClick={() => setTab('piano')}>Preparazioni</button>
        <button className={tab === 'classico' ? 'on' : ''} onClick={() => setTab('classico')}>MEP per partita e banco</button>
      </div>
      {tab === 'piano' ? <Piano /> : legacy}
    </div>
  )
}

function Piano() {
  const { api, k, recipes, toast, canEdit } = useHub()
  const piatti: Piatto[] = (k.piatti || []).filter((p: Piatto) => p.attivo)
  const piano = k.servizioPiano || { coperti: 40, perPiatto: {} }
  const coperti: number = piano.coperti ?? 40
  const porz = (p: Piatto) => (piano.perPiatto?.[p.id] ?? coperti)
  const needs = useMemo(() => fabbisogno(piatti, porz, k, recipes), [piatti, k, recipes, coperti, piano.perPiatto])
  const missing = needs.filter((n) => n.missing > 0)
  const [showPer, setShowPer] = useState(false)
  const [done, setDone] = useState<Prep | null>(null)
  const preps: Prep[] = k.preparazioni || []
  const cols = [
    { key: 'da_fare', label: 'Da fare', items: preps.filter((p) => p.status === 'da_fare') },
    { key: 'in_corso', label: 'In corso', items: preps.filter((p) => p.status === 'in_corso') },
    { key: 'fatte', label: 'Fatte oggi', items: preps.filter((p) => (p.status === 'svolta' || p.status === 'smistata') && (p.svoltaIl || p.createdAt || '').startsWith(today())) },
  ]

  const setPiano = (patch: any) => api.kitchenPatch({ servizioPiano: { ...piano, ...patch } })
  function partitaFor(n: Need) {
    const p = piatti.find((x) => n.piatti.includes(x.nome))
    return CAT_TO_PARTITA[p?.categoria || ''] || 'antipasti'
  }
  function create(n: Need, silent = false) {
    const q = fromBase(n.missing, n.dim)
    api.prepAddFull({ nome: n.nome, quantita: q.qty, unitaMisura: q.unit, recipeId: n.recipeId, partita: partitaFor(n), note: `Per ${n.piatti.join(', ')}` })
    if (!silent) toast(`${n.nome}: ${q.qty} ${q.unit} da preparare`, 'success')
  }
  function createAll() { missing.forEach((n) => create(n, true)); toast(`${missing.length} preparazioni create`, 'success') }
  function addManual(p: Pick) {
    const r = p.kind === 'ricetta' ? p.recipe : null
    const w = r ? recipeWeight(r) : 0
    const q = w ? fromBase(w, 'm') : { qty: 1, unit: 'pz' }
    api.prepAddFull({ nome: r ? r.name : (p as any).nome, quantita: q.qty, unitaMisura: q.unit, recipeId: r?.id ?? null, partita: 'antipasti' })
    toast('Preparazione aggiunta: regola quantità e partita', 'success')
  }

  return (
    <>
      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head" style={{ flexWrap: 'wrap' }}>
          <h3 className="h2" style={{ fontSize: '1.25rem', flex: 1 }}>Per il prossimo servizio</h3>
          <span className="small muted">Coperti</span>
          {canEdit ? <Stepper value={coperti} step={5} min={0} onChange={(v) => setPiano({ coperti: Math.round(v) })} /> : <b>{coperti}</b>}
        </div>
        {!piatti.length ? (
          <p className="trow muted small">Metti in carta dei piatti con le loro preparazioni (sezione Piatti): qui vedrai quanto preparare, tolto quello che è già in linea.</p>
        ) : !needs.length ? (
          <p className="trow muted small">I piatti in carta non hanno preparazioni del ricettario con i grammi per porzione. Completali nella sezione Piatti.</p>
        ) : (
          <>
            {needs.map((n) => {
              const tot = Math.max(n.need, 1)
              const r = n.recipeId ? recipes.find((x) => x.id === n.recipeId) : null
              return (
                <div key={n.key} className="need">
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontWeight: 500 }}>{n.nome}</b>{r && <a href={recipeUrl(r.id)} target="_blank" rel="noreferrer" style={{ marginLeft: 6, color: 'var(--muted)' }} aria-label="Apri ricetta"><ExternalLink size={13} /></a>}
                    <div className="small muted">
                      Servono {fmtQty(n.need, n.dim)} · in linea {fmtQty(n.linea, n.dim)}{n.inPrep ? ` · in preparazione ${fmtQty(n.inPrep, n.dim)}` : ''}{n.magazzino ? ` · in frigo/freezer ${fmtQty(n.magazzino, n.dim)}` : ''}
                    </div>
                    <div className="meter" title="verde in linea, oro in preparazione, rosso mancante">
                      <i style={{ width: `${Math.min(100, (n.linea / tot) * 100)}%`, background: 'var(--ok)' }} />
                      <i style={{ width: `${Math.min(100, (n.inPrep / tot) * 100)}%`, background: 'var(--accent)' }} />
                      <i style={{ width: `${Math.min(100, (n.missing / tot) * 100)}%`, background: 'var(--danger)' }} />
                    </div>
                  </div>
                  <span className={`tnum ${n.missing ? 'fc-danger' : 'fc-ok'}`} style={{ fontWeight: 600 }}>{n.missing ? `mancano ${fmtQty(n.missing, n.dim)}` : n.linea >= n.need ? 'coperto' : 'in preparazione'}</span>
                  {canEdit && n.missing > 0 ? <button className="btn btn-sm" onClick={() => create(n)}><Plus /> Prepara</button> : <span />}
                </div>
              )
            })}
            <div className="trow" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPer((v) => !v)}>{showPer ? <ChevronUp /> : <ChevronDown />} Porzioni per piatto</button>
              {canEdit && missing.length > 1 && <button className="btn btn-gold btn-sm" style={{ marginLeft: 'auto' }} onClick={createAll}><Wand2 /> Crea tutte le {missing.length} preparazioni mancanti</button>}
            </div>
            {showPer && piatti.map((p) => (
              <div key={p.id} className="trow">
                <span className="nm"><b>{p.nome}</b></span>
                {canEdit ? <Stepper value={porz(p)} step={1} min={0} unit="porz." onChange={(v) => setPiano({ perPiatto: { ...(piano.perPiatto || {}), [p.id]: Math.round(v) } })} /> : <span className="tnum">{porz(p)}</span>}
              </div>
            ))}
          </>
        )}
      </section>

      {canEdit && <ItemCombo placeholder="Aggiungi una preparazione: cerca nel ricettario" onPick={addManual} />}

      <div className="kanban">
        {cols.map((c) => (
          <div key={c.key} className="kcol">
            <h3>{c.label}<span>{c.items.length}</span></h3>
            {c.items.map((p) => <PrepCard key={p.id} p={p} onDone={() => setDone(p)} />)}
            {!c.items.length && <p className="small muted" style={{ padding: '6px 8px' }}>{c.key === 'fatte' ? 'Le preparazioni finite oggi compaiono qui.' : 'Niente qui.'}</p>}
          </div>
        ))}
      </div>

      {done && <Smista p={done} onClose={() => setDone(null)} />}
    </>
  )
}

function PrepCard({ p, onDone }: { p: Prep; onDone: () => void }) {
  const { api, k, recipes, canEdit } = useHub()
  const [open, setOpen] = useState(false)
  const r = p.recipeId ? recipes.find((x) => x.id === p.recipeId) : null
  const w = r ? recipeWeight(r) : 0
  const b = toBase(p.quantita, p.unitaMisura)
  const dose = r && w && b?.dim === 'm' ? b.q / w : null
  const part = p.partita || p.reparto || p.categoriaKey
  const inLinea = lineaFor({ recipeId: p.recipeId, nome: p.nome }, lineaItems(k))
  const step = p.unitaMisura === 'kg' || p.unitaMisura === 'l' ? 0.5 : p.unitaMisura === 'g' || p.unitaMisura === 'ml' ? 100 : 1
  return (
    <div className="pcard">
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className="nm" style={{ flex: 1 }}>{p.nome}</span>
        {r && <a className="icon-btn" style={{ width: 30, height: 30 }} href={dose ? `${recipeUrl(r.id)}?dose=${round(dose, 2)}` : recipeUrl(r.id)} target="_blank" rel="noreferrer" aria-label="Apri ricetta alla dose giusta"><ExternalLink size={14} /></a>}
      </div>
      <div className="meta">
        {canEdit && p.status !== 'svolta' && p.status !== 'smistata'
          ? <Stepper value={p.quantita} step={step} unit={p.unitaMisura} onChange={(v) => api.prepUpdate(p.id, { quantita: v })} />
          : <b className="tnum" style={{ color: 'var(--ink)' }}>{p.quantita} {p.unitaMisura}</b>}
        {dose && <span className="chip chip-accent">dose ×{round(dose, 2).toString().replace('.', ',')}</span>}
      </div>
      <div className="meta">
        {canEdit && p.status !== 'svolta' && p.status !== 'smistata' ? (
          <select className="select" style={{ width: 'auto', padding: '4px 26px 4px 8px', fontSize: '.8rem' }} value={part} onChange={(e) => api.prepUpdate(p.id, { partita: e.target.value, reparto: e.target.value, categoriaKey: e.target.value })}>
            {PARTITE.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        ) : <span className="chip">{partitaLabel(part)}</span>}
        {p.destinazione && <span className="chip chip-ok">in {p.destinazione}</span>}
        {inLinea.items.length > 0 && <span className="chip">in linea {fmtQty(inLinea.q, inLinea.dim || 'm')}</span>}
        {p.note && <span>{p.note}</span>}
      </div>
      {r && dose && (
        <>
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setOpen((v) => !v)}>{open ? <ChevronUp /> : <ChevronDown />} Ingredienti</button>
          {open && (
            <ul>
              {r.ingredients.map((i, n) => (
                <li key={n}><span>{i.name}</span><span className="tnum">{i.quantity == null ? 'q.b.' : `${round(i.quantity * dose, i.quantity * dose < 10 ? 1 : 0).toString().replace('.', ',')} ${i.unit}`}</span></li>
              ))}
            </ul>
          )}
        </>
      )}
      {canEdit && (
        <div className="acts">
          {p.status === 'da_fare' && <button className="btn btn-sm" onClick={() => api.prepStatus(p.id, 'in_corso')}><Play /> Inizia</button>}
          {(p.status === 'da_fare' || p.status === 'in_corso') && <button className="btn btn-gold btn-sm" onClick={onDone}><Check /> Fatta</button>}
          {p.status === 'svolta' && <button className="btn btn-gold btn-sm" onClick={onDone}><ArrowRightLeft /> Smista</button>}
          <button className="icon-btn" style={{ marginLeft: 'auto', width: 30, height: 30 }} onClick={() => confirm(`Eliminare «${p.nome}»?`) && api.prepRemove(p.id)} aria-label="Elimina"><Trash2 size={14} /></button>
        </div>
      )}
    </div>
  )
}
