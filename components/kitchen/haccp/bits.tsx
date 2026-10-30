'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg hz-seg">
      {options.map((o) => <button key={o.key} type="button" className={o.key === value ? 'on' : ''} onClick={() => onChange(o.key)}>{o.label}</button>)}
    </div>
  )
}

export function Ring({ pct, size = 64, tone = 'ok' }: { pct: number; size?: number; tone?: 'ok' | 'warn' | 'danger' | 'accent' }) {
  const r = 15.9
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} className="hz-ring" aria-label={`${Math.round(pct)}%`}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--line)" strokeWidth="3" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={`var(--${tone})`} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${Math.max(0, Math.min(100, pct))} 100`} transform="rotate(-90 18 18)" style={{ transition: 'stroke-dasharray .4s' }} />
      <text x="18" y="21" textAnchor="middle" fontSize="9" fill="var(--ink)" fontFamily="var(--f-ui)">{Math.round(pct)}%</text>
    </svg>
  )
}

/** andamento delle ultime letture con la fascia dei limiti */
export function Spark({ values, min, max, h = 46 }: { values: number[]; min: number; max: number; h?: number }) {
  if (values.length < 2) return <div className="hz-spark hz-spark-empty" style={{ height: h }}>andamento dopo due letture</div>
  const lo = Math.min(min, ...values) - 1, hi = Math.max(max, ...values) + 1
  const W = 200, y = (v: number) => h - ((v - lo) / (hi - lo)) * h, x = (i: number) => (i / (values.length - 1)) * W
  return (
    <svg className="hz-spark" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ height: h }} aria-hidden>
      <rect x="0" y={y(max)} width={W} height={Math.max(1, y(min) - y(max))} fill="var(--ok-soft)" />
      <polyline fill="none" stroke="var(--ink-2)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {values.map((v, i) => (v < min || v > max) && <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill="var(--danger)" />)}
    </svg>
  )
}

export function Qr({ text, size = 168 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState('')
  useEffect(() => { QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then(setSvg).catch(() => setSvg('')) }, [text])
  return <div className="hz-qr" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />
}
export const qrSvg = (text: string) => QRCode.toString(text, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })

/** stampa un documento HTML in un iframe nascosto (senza aprire finestre) */
export function printHtml(body: string, css: string, title = 'Stampa') {
  const f = document.createElement('iframe')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(f)
  const d = f.contentDocument!
  d.open()
  d.write(`<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${title}</title><style>${css}</style></head><body>${body}</body></html>`)
  d.close()
  const go = () => { f.contentWindow!.focus(); f.contentWindow!.print(); setTimeout(() => f.remove(), 1500) }
  if (d.readyState === 'complete') setTimeout(go, 150); else f.onload = go
}
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export function F({ label, children, hint, wide }: { label: string; children: React.ReactNode; hint?: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`field hz-f${wide ? ' wide' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="small muted">{hint}</span>}
    </label>
  )
}
