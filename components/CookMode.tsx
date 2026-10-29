'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Thermometer, X } from 'lucide-react'
import { fmtDose, scaleQty, type Recipe } from '@/lib/recipes'

function beep() {
  try { navigator.vibrate?.([400, 200, 400]) } catch {}
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;[0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0.25, ctx.currentTime + t); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2)
    })
  } catch {}
}

function Timer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60)
  const [run, setRun] = useState(false)
  useEffect(() => { setLeft(minutes * 60); setRun(false) }, [minutes])
  useEffect(() => {
    if (!run) return
    const t = window.setInterval(() => setLeft((s) => { if (s <= 1) { setRun(false); beep(); return 0 } return s - 1 }), 1000)
    return () => window.clearInterval(t)
  }, [run])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div className="row" style={{ marginTop: 20, gap: 12 }}>
      <span className="timer" style={{ color: left === 0 ? 'var(--danger)' : undefined }}>{mm}:{ss}</span>
      <button className="btn" onClick={() => setRun(!run)}>{run ? 'Pausa' : left === 0 ? 'Finito' : 'Avvia timer'}</button>
      <button className="btn btn-ghost" onClick={() => { setRun(false); setLeft(minutes * 60) }}>Azzera</button>
    </div>
  )
}

export default function CookMode({ recipe, initialDose }: { recipe: Recipe; initialDose: number }) {
  const [dose, setDose] = useState(initialDose)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [step, setStep] = useState(0)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)
  const touchX = useRef<number | null>(null)
  const steps = recipe.recipe_steps
  const cur = steps[step]

  useEffect(() => {
    const req = async () => { try { lock.current = await (navigator as any).wakeLock?.request('screen') } catch {} }
    req()
    const onVis = () => { if (document.visibilityState === 'visible') req() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); lock.current?.release().catch(() => {}) }
  }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep((s) => Math.min(steps.length - 1, s + 1))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1))
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [steps.length])

  const toggle = (i: number) => setDone((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })

  return (
    <div className="cook" style={{ position: 'fixed', inset: 0, zIndex: 100, overflowY: 'auto' }}>
      <header className="cook-top">
        <Link href={`/ricette/${recipe.id}`} className="icon-btn" aria-label="Esci dalla modalità cucina"><X size={18} /></Link>
        <p className="dish" style={{ flex: 1, minWidth: 0, fontSize: '1.3rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recipe.name}</p>
        <div className="dose">
          <button onClick={() => setDose((d) => Math.max(0.25, d - (d <= 1 ? 0.25 : 0.5)))} aria-label="Meno">−</button>
          <input readOnly value={'×' + fmtDose(dose)} aria-label="Dose" />
          <button onClick={() => setDose((d) => d + (d < 1 ? 0.25 : 0.5))} aria-label="Più">+</button>
        </div>
      </header>

      <main className="narrow page">
        <section className="panel" style={{ overflow: 'hidden', marginBottom: 20 }}>
          <div className="row" style={{ padding: '14px 18px' }}>
            <h2 className="h2" style={{ flex: 1 }}>Pesata</h2>
            <span className="muted small">{done.size} di {recipe.recipe_ingredients.length}</span>
            {done.size > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setDone(new Set())}>Azzera</button>}
          </div>
          {recipe.recipe_ingredients.map((i, k) => (
            <div key={k} className={`cook-ing ${done.has(k) ? 'done' : ''}`} onClick={() => toggle(k)} role="checkbox" aria-checked={done.has(k)}>
              <span className="box">{done.has(k) ? '✓' : ''}</span>
              <span className="nm">{i.name}</span>
              <span className="q num">{i.quantity == null ? 'q.b.' : `${scaleQty(i.quantity, dose)} ${i.unit}`}</span>
            </div>
          ))}
        </section>

        {steps.length > 0 && (
          <section className="panel panel-pad"
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              if (touchX.current == null) return
              const dx = e.changedTouches[0].clientX - touchX.current
              if (dx < -50) setStep((s) => Math.min(steps.length - 1, s + 1))
              if (dx > 50) setStep((s) => Math.max(0, s - 1))
              touchX.current = null
            }}>
            <div className="row" style={{ marginBottom: 14 }}>
              <span className="label" style={{ flex: 1 }}>Passaggio {step + 1} di {steps.length}</span>
              {cur.temperature && <span className="chip chip-accent"><Thermometer size={13} /> {cur.temperature}</span>}
            </div>
            <div className="progress" style={{ marginBottom: 18 }}><span style={{ width: `${((step + 1) / steps.length) * 100}%`, background: 'var(--accent)' }} /></div>
            <p className="cook-step">{cur.body}</p>
            {cur.duration_min ? <Timer minutes={cur.duration_min} /> : null}
            <div className="row" style={{ marginTop: 24 }}>
              <button className="btn btn-lg" style={{ flex: 1 }} disabled={step === 0} onClick={() => setStep(step - 1)}><ChevronLeft size={18} /> Indietro</button>
              <button className="btn btn-gold btn-lg" style={{ flex: 1 }} disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Avanti <ChevronRight size={18} /></button>
            </div>
            <p className="muted small" style={{ textAlign: 'center', marginTop: 12 }}>Scorri col dito o usa le frecce della tastiera</p>
          </section>
        )}
      </main>
    </div>
  )
}
