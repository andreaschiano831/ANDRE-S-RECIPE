'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, LayoutGrid, Loader2, Search, Send, Sparkles, X } from 'lucide-react'
import { Drawer, askAI } from '../hub/ui'

/** colori dei moduli (come le aree di Norma / le app di FoodCost) */
export const MC = {
  blu: '#3B6EA8', verde: '#3F8A63', arancio: '#C46B2A', viola: '#7E5BB0', rosso: '#B23A48',
  ardesia: '#5B6474', oro: '#A47A2C', teal: '#2E8A8A', rosa: '#B0507A',
} as const
export const mc = (c: string) => ({ ['--c' as any]: c }) as React.CSSProperties

export type QAction = { key: string; label: string; sub?: string; icon: React.ReactNode; color: string; run: () => void; group?: string; hot?: boolean }

/** barra di azioni rapide, scorre in orizzontale su telefono */
export function QuickBar({ actions }: { actions: QAction[] }) {
  return (
    <div className="qk-bar" role="toolbar" aria-label="Azioni rapide">
      {actions.map((a) => (
        <button key={a.key} className={`qk-act ${a.hot ? 'hot' : ''}`} style={mc(a.color)} onClick={a.run}>
          <span className="qk-ic">{a.icon}</span>
          <span className="qk-tx"><b>{a.label}</b>{a.sub && <small>{a.sub}</small>}</span>
        </button>
      ))}
    </div>
  )
}

/** pannello "Strumenti": tutte le azioni e le sezioni in una griglia con ricerca */
export function Launcher({ title, actions, onClose }: { title: string; actions: QAction[]; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [onClose])
  const list = useMemo(() => actions.filter((a) => !q || `${a.label} ${a.sub || ''} ${a.group || ''}`.toLowerCase().includes(q.toLowerCase())), [actions, q])
  useEffect(() => setHi(0), [q])
  const groups = [...new Set(list.map((a) => a.group || 'Azioni'))]
  const run = (a: QAction) => { onClose(); a.run() }
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="qk-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qk-panel" role="dialog" aria-modal="true" aria-label={title}>
        <div className="qk-head">
          <Search size={18} />
          <input autoFocus placeholder="Cerca un’azione o una sezione…" value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setHi((h) => Math.min(list.length - 1, h + 1)) }
              if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)) }
              if (e.key === 'Enter' && list[hi]) run(list[hi])
            }} />
          <button className="icon-btn" onClick={onClose} aria-label="Chiudi"><X size={16} /></button>
        </div>
        <div className="qk-body">
          {groups.map((g) => (
            <section key={g}>
              <span className="label">{g}</span>
              <div className="qk-grid">
                {list.filter((a) => (a.group || 'Azioni') === g).map((a) => (
                  <button key={a.key} className={`qk-tile ${list[hi] === a ? 'hi' : ''}`} style={mc(a.color)} onClick={() => run(a)} onMouseEnter={() => setHi(list.indexOf(a))}>
                    <span className="qk-ic">{a.icon}</span><b>{a.label}</b>{a.sub && <small>{a.sub}</small>}
                  </button>
                ))}
              </div>
            </section>
          ))}
          {!list.length && <p className="small muted" style={{ padding: 20, textAlign: 'center' }}>Niente con «{q}».</p>}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function LauncherButton({ onClick }: { onClick: () => void }) {
  return <button className="btn btn-sm qk-tools" onClick={onClick}><LayoutGrid /> Strumenti</button>
}

type Msg = { role: 'user' | 'ai'; text: string; actions?: { label: string; tab: string }[] }

/** assistente: risponde sui dati della sezione e propone pulsanti per agire */
export function AskDrawer({ title, intro, context, suggestions, tabs, onAction, onClose }: {
  title: string; intro: string; context: () => unknown; suggestions: string[]
  tabs: { key: string; label: string }[]; onAction: (tab: string) => void; onClose: () => void
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])
  async function send(text: string) {
    if (!text.trim() || busy) return
    const hist = [...msgs, { role: 'user' as const, text }]
    setMsgs(hist); setQ(''); setBusy(true)
    try {
      const sys = `${intro} Rispondi in italiano, in modo pratico e breve (massimo 6 frasi o un elenco corto), usando SOLO i dati forniti; se un dato manca dillo. Rispondi SOLO in JSON: {"risposta": string, "azioni": [{"label": string, "tab": string}]}. "azioni" sono al massimo 3 pulsanti per andare alla sezione utile; "tab" deve essere uno di: ${tabs.map((t) => `${t.key} (${t.label})`).join(', ')}.`
      const j = await askAI(sys, `Dati attuali (JSON):\n${JSON.stringify(context()).slice(0, 14000)}\n\nConversazione:\n${hist.map((m) => `${m.role === 'user' ? 'Utente' : 'Assistente'}: ${m.text}`).join('\n')}`, [], 1200)
      setMsgs((m) => [...m, { role: 'ai', text: String(j.risposta || '…'), actions: (j.azioni || []).filter((a: any) => tabs.some((t) => t.key === a.tab)).slice(0, 3) }])
    } catch (e: any) { setMsgs((m) => [...m, { role: 'ai', text: e.message || 'Non riesco a rispondere ora.' }]) }
    setBusy(false)
  }
  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}><Sparkles size={17} style={{ verticalAlign: '-2px', color: 'var(--accent)' }} /> {title}</span>}
      foot={<form className="qk-ask-in" onSubmit={(e) => { e.preventDefault(); send(q) }}>
        <input className="input" placeholder="Fai una domanda…" value={q} onChange={(e) => setQ(e.target.value)} disabled={busy} />
        <button className="btn btn-gold" disabled={busy || !q.trim()} aria-label="Invia"><Send /></button>
      </form>}>
      {!msgs.length && (
        <div className="qk-sugg">
          <p className="small muted">Leggo i dati della cucina e ti rispondo. Prova con:</p>
          {suggestions.map((s) => <button key={s} className="qk-sug" onClick={() => send(s)}>{s}<ArrowRight size={14} /></button>)}
        </div>
      )}
      <div className="qk-chat">
        {msgs.map((m, i) => (
          <div key={i} className={`qk-msg ${m.role}`}>
            <p>{m.text}</p>
            {m.actions && m.actions.length > 0 && <div className="hz-chips">{m.actions.map((a) => <button key={a.tab + a.label} className="btn btn-sm" onClick={() => { onAction(a.tab); onClose() }}>{a.label} <ArrowRight size={13} /></button>)}</div>}
          </div>
        ))}
        {busy && <div className="qk-msg ai"><Loader2 className="hz-spin" size={16} /></div>}
        <div ref={end} />
      </div>
    </Drawer>
  )
}
