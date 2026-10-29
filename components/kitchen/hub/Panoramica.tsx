'use client'
import { useMemo } from 'react'
import { AlertTriangle, Camera, ClipboardList, FileUp, Megaphone, PackageMinus, Recycle, Sparkles, Timer, UtensilsCrossed } from 'lucide-react'
import { go, useHub } from './ui'
import { copertura, fabbisogno, fcTone, lineaItems, piattoCost, round, type Piatto, type Prep, type RecipeCost } from './model'

const ai = (panel: string) => window.dispatchEvent(new CustomEvent('kp-ai', { detail: { panel } }))

export default function Panoramica() {
  const { k, ctx, recipes, stock } = useHub()
  const piatti: Piatto[] = (k.piatti || []).filter((p: Piatto) => p.attivo)
  const coperti: number = k.servizioPiano?.coperti ?? 40
  const target: number = k.fcTarget ?? 30
  const linea = lineaItems(k)
  const cache = useMemo(() => new Map<string, RecipeCost>(), [ctx])
  const costs = piatti.map((p) => piattoCost(p, ctx, cache)).filter((c) => c.fc != null && c.complete)
  const avg = costs.length ? costs.reduce((s, c) => s + c.fc!, 0) / costs.length : null
  const covs = piatti.map((p) => ({ p, c: copertura(p, linea).porzioni }))
  const short = covs.filter((x) => x.c != null && x.c < coperti)
  const needs = fabbisogno(piatti, (p) => k.servizioPiano?.perPiatto?.[p.id] ?? coperti, k, recipes).filter((n) => n.missing > 0)
  const preps: Prep[] = (k.preparazioni || []).filter((p: Prep) => p.status === 'da_fare' || p.status === 'in_corso')
  const now = Date.now()
  const expiring = stock.filter((s) => s.expiresAt).map((s) => ({ s, h: (new Date(s.expiresAt!).getTime() - now) / 36e5 })).filter((x) => x.h <= 48).sort((a, b) => a.h - b.h)
  const under = stock.filter((s) => s.parLevel && s.quantity < s.parLevel)

  return (
    <div className="hub">
      <div className="flow">
        <button onClick={() => go('piatti')}><span>Piatti in carta</span><b>{piatti.length}</b><em>{coperti} coperti previsti</em></button>
        <button onClick={() => go('linea')}><span>Linea</span><b>{linea.length}</b><em className={short.length ? 'fc-warn' : 'fc-ok'}>{piatti.length ? (short.length ? `${short.length} piatti scoperti` : 'copre il servizio') : 'preparazioni in linea'}</em></button>
        <button onClick={() => go('preparazioni')}><span>Da preparare</span><b>{needs.length + preps.length}</b><em className={needs.length ? 'fc-danger' : ''}>{needs.length ? `${needs.length} mancano per il servizio` : `${preps.length} in lista`}</em></button>
        <button onClick={() => go('foodcost')}><span>Food cost medio</span><b className={`fc-${fcTone(avg, target) || 'none'}`}>{avg == null ? '—' : `${round(avg, 1).toString().replace('.', ',')}%`}</b><em>obiettivo {target}%</em></button>
      </div>

      <div className="grid2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><AlertTriangle size={17} color="var(--danger)" /><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>In scadenza</h3><span className="small muted">48 ore</span></div>
          {expiring.slice(0, 7).map(({ s, h }) => (
            <button key={s.id} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => go(s.location === 'counter' ? 'linea' : 'giacenze')}>
              <span className="nm"><b>{s.name}</b><small>{s.location === 'counter' ? 'linea' : s.location === 'fridge' ? 'frigo' : s.location === 'freezer' ? 'freezer' : 'dispensa'} · {s.quantity} {s.unit}</small></span>
              <span className={`chip ${h < 0 ? 'chip-danger' : 'chip-warn'}`}>{h < 0 ? 'scaduto' : `${Math.max(1, Math.round(h))} h`}</span>
            </button>
          ))}
          {!expiring.length && <p className="trow small muted">Niente in scadenza.</p>}
        </section>

        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><ClipboardList size={17} color="var(--accent)" /><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Per il servizio</h3><span className="small muted">{coperti} coperti</span></div>
          {short.slice(0, 4).map(({ p, c }) => (
            <button key={p.id} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('linea')}>
              <span className="nm"><b>{p.nome}</b><small>la linea basta per {c} porzioni</small></span><span className="chip chip-warn">{c}/{coperti}</span>
            </button>
          ))}
          {needs.slice(0, 4).map((n) => (
            <button key={n.key} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('preparazioni')}>
              <span className="nm"><b>{n.nome}</b><small>per {n.piatti.join(', ')}</small></span><span className="chip chip-danger">da fare</span>
            </button>
          ))}
          {!short.length && !needs.length && <p className="trow small muted">{piatti.length ? 'Linea e preparazioni coprono i piatti in carta.' : 'Aggiungi i piatti in carta per vedere cosa serve.'}</p>}
        </section>

        <section className="panel" style={{ overflow: 'hidden' }}>
          <div className="panel-head"><PackageMinus size={17} color="var(--warn)" /><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Sotto scorta</h3></div>
          {under.slice(0, 6).map((s) => (
            <button key={s.id} className="trow" style={{ width: '100%', textAlign: 'left' }} onClick={() => go('spesa')}>
              <span className="nm"><b>{s.name}</b></span><span className="tnum small muted">{s.quantity}/{s.parLevel} {s.unit}</span>
            </button>
          ))}
          {!under.length && <p className="trow small muted">Tutto sopra il livello minimo.</p>}
        </section>
      </div>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="panel-head"><Sparkles size={17} color="var(--accent)" /><h3 className="h2" style={{ fontSize: '1.15rem', flex: 1 }}>Strumenti AI</h3></div>
        <div className="flow" style={{ border: 'none', borderRadius: 0 }}>
          <button onClick={() => go('linea')}><Camera size={20} color="var(--accent)" /><em>Linea da foto</em><span>Riconosce le bacinelle e imposta le quantità</span></button>
          <button onClick={() => ai('import')}><FileUp size={20} color="var(--accent)" /><em>Importa documenti</em><span>Fatture, DDT, liste in giacenza</span></button>
          <button onClick={() => ai('briefing')}><Megaphone size={20} color="var(--accent)" /><em>Briefing</em><span>Il punto per la brigata</span></button>
          <button onClick={() => ai('mep')}><Timer size={20} color="var(--accent)" /><em>Piano MEP</em><span>Ordina il lavoro per partita</span></button>
          <button onClick={() => ai('menu')}><UtensilsCrossed size={20} color="var(--accent)" /><em>Menu dalle scadenze</em><span>Idee per usare ciò che scade</span></button>
          <button onClick={() => ai('waste')}><Recycle size={20} color="var(--accent)" /><em>Analisi sprechi</em><span>Dove si perde di più</span></button>
        </div>
      </section>
    </div>
  )
}
