'use client'
import { useEffect, useRef, useState } from 'react'
import { eur0 } from './model'

export type Series = { name: string; color: string; values: number[] }

/** barre affiancate (max 2-3 serie), con tooltip al passaggio e legenda */
export function Bars({ labels, series, h = 190, fmt = eur0 }: { labels: string[]; series: Series[]; h?: number; fmt?: (n: number) => string }) {
  const [hi, setHi] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(640)
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width)))); ro.observe(el); return () => ro.disconnect() }, [])
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const nice = niceMax(max)
  const n = labels.length, pad = { l: 46, r: 6, t: 8, b: 22 }
  const iw = W - pad.l - pad.r, ih = h - pad.t - pad.b, gw = iw / Math.max(1, n)
  const bw = Math.max(2, Math.min(18, (gw - 4) / series.length - 2))
  const y = (v: number) => pad.t + ih - (v / nice) * ih
  const every = Math.ceil(n / Math.max(4, Math.floor(W / 52)))
  return (
    <div className="ec-chart">
      <div className="ec-legend">{series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div>
      <div style={{ position: 'relative' }} ref={box}>
        <svg viewBox={`0 0 ${W} ${h}`} width="100%" role="img" aria-label={series.map((s) => s.name).join(' e ')} onMouseLeave={() => setHi(null)}>
          {[0, 0.5, 1].map((f) => <g key={f}><line x1={pad.l} x2={W - pad.r} y1={y(nice * f)} y2={y(nice * f)} stroke="var(--line)" strokeWidth="1" /><text x={pad.l - 6} y={y(nice * f) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{short(nice * f)}</text></g>)}
          {labels.map((l, i) => {
            const gx = pad.l + i * gw, total = series.length * (bw + 2) - 2, x0 = gx + (gw - total) / 2
            return (
              <g key={i} onMouseEnter={() => setHi(i)}>
                <rect x={gx} y={pad.t} width={gw} height={ih} fill={hi === i ? 'var(--sunk)' : 'transparent'} />
                {series.map((s, j) => { const v = s.values[i] || 0, top = y(v); return v > 0 && <path key={j} d={barPath(x0 + j * (bw + 2), top, bw, pad.t + ih - top)} fill={s.color} /> })}
                {i % every === 0 && <text x={gx + gw / 2} y={h - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">{l}</text>}
              </g>
            )
          })}
        </svg>
        {hi != null && (
          <div className="ec-tip" style={{ left: `${((pad.l + (hi + 0.5) * gw) / W) * 100}%` }}>
            <b>{labels[hi]}</b>
            {series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name} <b>{fmt(s.values[hi] || 0)}</b></span>)}
          </div>
        )}
      </div>
    </div>
  )
}
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}
function niceMax(v: number) { const p = 10 ** Math.floor(Math.log10(v)); return Math.ceil(v / p / (v / p > 5 ? 2 : 1)) * p * (v / p > 5 ? 2 : 1) }
const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k`.replace('.', ',') : String(Math.round(n)))

/** barre orizzontali con etichetta e valore (classifiche, ABC) */
export function HBars({ rows, fmt = eur0, max }: { rows: { label: string; value: number; sub?: string; tag?: string }[]; fmt?: (n: number) => string; max?: number }) {
  const m = max || Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="ec-hbars">
      {rows.map((r, i) => (
        <div key={i} className="ec-hbar" title={`${r.label}: ${fmt(r.value)}`}>
          <span className="ec-hbar-l">{r.tag && <em className={`ec-tag ${r.tag}`}>{r.tag}</em>}{r.label}{r.sub && <small>{r.sub}</small>}</span>
          <span className="ec-hbar-t"><i style={{ width: `${Math.max(1.5, (r.value / m) * 100)}%` }} /></span>
          <b>{fmt(r.value)}</b>
        </div>
      ))}
    </div>
  )
}

export function Kpi({ label, value, sub, tone, onClick, icon, color }: { label: string; value: string; sub?: React.ReactNode; tone?: 'ok' | 'warn' | 'danger' | ''; onClick?: () => void; icon?: React.ReactNode; color?: string }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C className={`ec-kpi ${tone || ''} ${color ? 'tinted' : ''}`} style={color ? ({ ['--c' as any]: color } as React.CSSProperties) : undefined} onClick={onClick}>
      <span className="ec-kpi-l">{label}{icon && <i className="ec-kpi-ic">{icon}</i>}</span><b>{value}</b>{sub && <small>{sub}</small>}
    </C>
  )
}
