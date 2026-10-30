'use client'
/* Lotti dalle fatture (Food cost e conti), dai DDT (HACCP › Merci) e dal magazzino:
   si scelgono quando si carica merce o si fa una preparazione, per la tracciabilità. */
import { useEffect, useMemo, useState } from 'react'
import { FileText, Package, Search, Truck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Drawer, useHub } from './ui'
import { nameScore, norm, type Prep, type StockItem } from './model'

export type Lotto = { key: string; nome: string; lotto: string; fornitore?: string; doc?: string; data?: string; scadenza?: string; fonte: 'fattura' | 'ddt' | 'magazzino' }
export type TraceRow = { ingrediente: string; lotto: string; fornitore?: string; doc?: string; data?: string; scadenza?: string; fonte: string }

const cache = new Map<string, { at: number; list: Lotto[] }>()

/** carica i lotti dei documenti degli ultimi 6 mesi (le tabelle mancanti o non visibili si saltano) */
export function useLotti() {
  const { bridge, k, stock } = useHub()
  const kid: string = bridge?.kitchenId || k.id || ''
  const [docs, setDocs] = useState<Lotto[]>(() => cache.get(kid)?.list || [])
  const [loading, setLoading] = useState(!cache.has(kid))
  useEffect(() => {
    if (!kid) return
    const c = cache.get(kid)
    if (c && Date.now() - c.at < 60_000) { setDocs(c.list); setLoading(false); return }
    let dead = false
    const sb = createClient()
    const since = new Date(Date.now() - 180 * 864e5).toISOString()
    Promise.all([
      sb.from('econ_records').select('id, at, data').eq('kitchen_id', kid).eq('kind', 'fattura').gte('at', since).order('at', { ascending: false }).limit(500),
      sb.from('haccp_records').select('id, at, data').eq('kitchen_id', kid).eq('kind', 'ricevimento').gte('at', since).order('at', { ascending: false }).limit(500),
    ]).then(([f, r]) => {
      if (dead) return
      const out: Lotto[] = []
      for (const x of (f.data || []) as any[]) for (const [i, riga] of (x.data?.righe || []).entries()) {
        if (!riga?.nome) continue
        out.push({ key: `f-${x.id}-${i}`, nome: riga.nome, lotto: riga.lotto || '', fornitore: x.data.fornitore, doc: `Fattura ${x.data.numero || ''}`.trim(), data: x.data.data || x.at.slice(0, 10), fonte: 'fattura' })
      }
      for (const x of (r.data || []) as any[]) for (const [i, p] of (x.data?.prodotti || []).entries()) {
        if (!p?.nome) continue
        out.push({ key: `d-${x.id}-${i}`, nome: p.nome, lotto: p.lotto || '', fornitore: x.data.fornitore, doc: `DDT ${x.data.ddt || ''}`.trim(), data: x.data.data || x.at.slice(0, 10), scadenza: p.scadenza || undefined, fonte: 'ddt' })
      }
      cache.set(kid, { at: Date.now(), list: out }); setDocs(out); setLoading(false)
    }).catch(() => { if (!dead) setLoading(false) })
    return () => { dead = true }
  }, [kid])
  const fromStock: Lotto[] = useMemo(() => (stock as (StockItem & { lot?: string; notes?: string })[]).filter((s) => s.lot).map((s) => ({
    key: `s-${s.id}`, nome: s.name, lotto: s.lot!, doc: s.notes, scadenza: s.expiresAt?.slice(0, 10), fonte: 'magazzino' as const,
  })), [stock])
  return { list: [...fromStock, ...docs], loading }
}

/** i lotti più adatti per un ingrediente: prima quelli con il nome simile, poi i più recenti */
export function rankFor(list: Lotto[], nome: string, q = '') {
  const nq = norm(q)
  return list
    .filter((l) => !nq || norm(`${l.nome} ${l.lotto} ${l.fornitore || ''} ${l.doc || ''}`).includes(nq))
    .map((l) => ({ l, s: nome ? nameScore(nome, l.nome) + (l.lotto ? 0.15 : 0) + (l.fonte === 'magazzino' ? 0.1 : 0) : 0 }))
    .sort((a, b) => b.s - a.s || (b.l.data || '').localeCompare(a.l.data || ''))
    .map((x) => x.l)
}
const ICON = { fattura: <FileText size={14} />, ddt: <Truck size={14} />, magazzino: <Package size={14} /> }
const FONTE = { fattura: 'Fattura', ddt: 'DDT', magazzino: 'In magazzino' }

/** elenco da cui scegliere un lotto (dentro un cassetto o in linea) */
export function LottoList({ nome, onPick, max = 30 }: { nome: string; onPick: (l: Lotto) => void; max?: number }) {
  const { list, loading } = useLotti()
  const [q, setQ] = useState('')
  const rows = rankFor(list, nome, q).slice(0, max)
  return (
    <div className="lt-list">
      <div className="hub-search"><Search /><input className="input" placeholder="Cerca lotto, prodotto, fornitore, documento" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      {loading && <p className="small muted">Carico fatture e DDT…</p>}
      {!loading && !rows.length && <p className="small muted">Nessun documento trovato. Carica le fatture in Food cost e conti o le consegne in HACCP › Merci.</p>}
      {rows.map((l) => {
        const match = nome && nameScore(nome, l.nome) >= 0.6
        return (
          <button key={l.key} type="button" className={`lt-row ${match ? 'match' : ''}`} onClick={() => onPick(l)}>
            <span className={`lt-ic ${l.fonte}`}>{ICON[l.fonte]}</span>
            <span className="lt-tx"><b>{l.nome}</b><small>{[FONTE[l.fonte] === 'In magazzino' ? 'in magazzino' : l.doc, l.fornitore, l.data && new Date(l.data + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}</small></span>
            <span className={`lt-lot ${l.lotto ? '' : 'none'}`}>{l.lotto || 'senza lotto'}</span>
          </button>
        )
      })}
    </div>
  )
}

/** cassetto per scegliere un lotto, usato da Magazzino */
export function LottoPicker({ nome, onPick, onClose }: { nome: string; onPick: (l: Lotto) => void; onClose: () => void }) {
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Lotto per {nome || 'il prodotto'}</span>}>
      <p className="small muted">Dalle fatture caricate, dai DDT registrati in HACCP e da quello che è già in magazzino. I più simili al prodotto sono in cima.</p>
      <LottoList nome={nome} onPick={(l) => { onPick(l); onClose() }} />
    </Drawer>
  )
}

/** tracciabilità di una preparazione: per ogni ingrediente della ricetta, da quale lotto viene */
export function Tracciabilita({ p, onClose }: { p: Prep & { lotto?: string; tracciabilita?: TraceRow[] }; onClose: () => void }) {
  const { api, recipes, toast, canEdit } = useHub()
  const r = p.recipeId ? recipes.find((x) => x.id === p.recipeId) : null
  const [added, setAdded] = useState<string[]>([])
  const ingr = useMemo(() => {
    const names = r ? r.ingredients.map((i) => i.name).filter(Boolean) : []
    const extra = [...(p.tracciabilita || []).map((t) => t.ingrediente), ...added].filter((n) => !names.some((x) => norm(x) === norm(n)))
    return [...new Set([...names, ...extra])]
  }, [r, p.tracciabilita, added])
  const [rows, setRows] = useState<Record<string, TraceRow | null>>(() => Object.fromEntries((p.tracciabilita || []).map((t) => [norm(t.ingrediente), t])))
  const [open, setOpen] = useState<string | null>(() => (r?.ingredients[0]?.name) || null)
  const [lotto, setLotto] = useState(p.lotto || autoLot())
  const [nuovo, setNuovo] = useState('')
  const { list } = useLotti()
  const done = ingr.filter((n) => rows[norm(n)]).length
  function pick(n: string, l: Lotto | null, manual?: string) {
    setRows((x) => ({ ...x, [norm(n)]: l ? { ingrediente: n, lotto: l.lotto, fornitore: l.fornitore, doc: l.doc, data: l.data, scadenza: l.scadenza, fonte: l.fonte } : manual != null ? { ingrediente: n, lotto: manual, fonte: 'manuale' } : null }))
    const next = ingr.find((x) => x !== n && !rows[norm(x)])
    setOpen(next || null)
  }
  function auto() {
    // per ogni ingrediente senza lotto, il documento più simile e più recente con un lotto
    const nx = { ...rows }
    for (const n of ingr) {
      if (nx[norm(n)]) continue
      const best = rankFor(list.filter((l) => l.lotto), n)[0]
      if (best && nameScore(n, best.nome) >= 0.6) nx[norm(n)] = { ingrediente: n, lotto: best.lotto, fornitore: best.fornitore, doc: best.doc, data: best.data, scadenza: best.scadenza, fonte: best.fonte }
    }
    const n = Object.values(nx).filter(Boolean).length - done
    setRows(nx); toast(n ? `${n} lotti trovati: controllali` : 'Nessun lotto simile nei documenti', n ? 'success' : 'error')
  }
  function save() {
    const tr = ingr.map((n) => rows[norm(n)]).filter(Boolean) as TraceRow[]
    api.prepUpdate(p.id, { lotto: lotto.trim() || undefined, tracciabilita: tr })
    toast(`Tracciabilità di ${p.nome} salvata (${tr.length} ingredienti)`, 'success'); onClose()
  }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>{p.nome}: lotti e DDT</span>}
      foot={canEdit && <div className="row"><span className="small muted" style={{ flex: 1 }}>{done} di {ingr.length} ingredienti tracciati</span><button className="btn btn-gold" onClick={save}>Salva</button></div>}>
      <div className="lt-head">
        <div className="field"><span className="label">Lotto della preparazione</span><input className="input" value={lotto} onChange={(e) => setLotto(e.target.value)} /><span className="small muted">Passa al magazzino quando la smisti e finisce sull’etichetta.</span></div>
        {canEdit && ingr.length > 0 && <button className="btn btn-sm" onClick={auto}>Trova i lotti in automatico</button>}
      </div>
      <div className="lt-bar"><i style={{ width: `${ingr.length ? (done / ingr.length) * 100 : 0}%` }} /></div>
      {!ingr.length && <p className="small muted">Questa preparazione non è collegata a una ricetta: aggiungi gli ingredienti a mano.</p>}
      <div className="lt-ingr">
        {ingr.map((n) => {
          const t = rows[norm(n)]
          return (
            <section key={n} className={`lt-item ${t ? 'ok' : ''} ${open === n ? 'open' : ''}`}>
              <button type="button" className="lt-item-h" onClick={() => setOpen(open === n ? null : n)}>
                <span className="lt-check">{t ? '✓' : ''}</span>
                <span className="lt-tx"><b>{n}</b><small>{t ? [t.lotto ? `lotto ${t.lotto}` : 'senza lotto', t.doc, t.fornitore].filter(Boolean).join(' · ') : 'scegli il lotto'}</small></span>
                {t && canEdit && <span className="lt-x" role="button" onClick={(e) => { e.stopPropagation(); pick(n, null) }}>togli</span>}
              </button>
              {open === n && canEdit && (
                <div className="lt-item-b">
                  <LottoList nome={n} max={8} onPick={(l) => pick(n, l)} />
                  <form className="row" onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('m') as HTMLInputElement).value.trim(); if (v) pick(n, null, v) }}>
                    <input name="m" className="input" style={{ flex: 1 }} placeholder="oppure scrivi il lotto a mano" /><button className="btn btn-sm">Usa</button>
                  </form>
                </div>
              )}
            </section>
          )
        })}
      </div>
      {canEdit && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); if (nuovo.trim()) { const n = nuovo.trim(); setAdded((a) => [...a, n]); setOpen(n); setNuovo('') } }}>
          <input className="input" style={{ flex: 1 }} placeholder="Aggiungi un ingrediente" value={nuovo} onChange={(e) => setNuovo(e.target.value)} /><button className="btn btn-sm">Aggiungi</button>
        </form>
      )}
    </Drawer>
  )
}
export function autoLot() {
  const d = new Date()
  return `P${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
}
