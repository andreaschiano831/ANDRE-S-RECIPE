'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { fmtDose, scaleQty, type Recipe } from '@/lib/recipes'

function Timer({ minutes }: { minutes: number }) {
  const [left, setLeft] = useState(minutes * 60)
  const [run, setRun] = useState(false)
  useEffect(() => { setLeft(minutes * 60); setRun(false) }, [minutes])
  useEffect(() => {
    if (!run) return
    const t = window.setInterval(() => setLeft((s) => {
      if (s <= 1) {
        setRun(false)
        try { navigator.vibrate?.([400, 200, 400]) } catch {}
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          ;[0, 0.35, 0.7].forEach((t) => {
            const o = ctx.createOscillator(); const g = ctx.createGain()
            o.frequency.value = 880; o.connect(g); g.connect(ctx.destination)
            g.gain.setValueAtTime(0.25, ctx.currentTime + t)
            o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.2)
          })
        } catch {}
        return 0
      }
      return s - 1
    }), 1000)
    return () => window.clearInterval(t)
  }, [run])
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
      <span className="timer" style={{ color: left === 0 ? 'var(--danger)' : undefined }}>{mm}:{ss}</span>
      <button className="btn btn-sm" onClick={() => setRun(!run)}>{run ? 'Pausa' : left === 0 ? 'Fine' : 'Avvia'}</button>
      <button className="btn btn-sm btn-ghost" onClick={() => { setRun(false); setLeft(minutes * 60) }}>Reset</button>
    </div>
  )
}

export default function CookMode({ recipe, initialDose }: { recipe: Recipe; initialDose: number }) {
  const [dose, setDose] = useState(initialDose)
  const [done, setDone] = useState<Set<number>>(new Set())
  const [step, setStep] = useState(0)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  useEffect(() => {
    const req = async () => {
      try { lock.current = await (navigator as any).wakeLock?.request('screen') } catch {}
    }
    req()
    const onVis = () => { if (document.visibilityState === 'visible') req() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); lock.current?.release().catch(() => {}) }
  }, [])

  const steps = recipe.recipe_steps
  const cur = steps[step]
  const toggle = (i: number) => setDone((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })

  return (
    <div className="cook">
      <header className="hd">
        <div className="narrow hd-in">
          <Link href={`/ricette/${recipe.id}`} className="btn btn-ghost btn-sm">‹ Esci</Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="serif" style={{ fontStyle: 'italic', fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{recipe.name}</p>
          </div>
          <div className="dose">
            <button onClick={() => setDose((d) => Math.max(0.25, d - (d <= 1 ? 0.25 : 0.5)))}>−</button>
            <input readOnly value={'×' + fmtDose(dose)} />
            <button onClick={() => setDose((d) => d + (d < 1 ? 0.25 : 0.5))}>+</button>
          </div>
        </div>
      </header>

      <main className="narrow page">
        <section className="panel" style={{ overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--rim)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="label">Pesata · {done.size}/{recipe.recipe_ingredients.length}</span>
            {done.size > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setDone(new Set())}>Azzera</button>}
          </div>
          {recipe.recipe_ingredients.map((i, k) => (
            <div key={k} className={`cook-ing ${done.has(k) ? 'done' : ''}`} onClick={() => toggle(k)}>
              <span className="box">{done.has(k) ? '✓' : ''}</span>
              <span className="nm">{i.name}</span>
              <span className="q">{i.quantity == null ? 'q.b.' : `${scaleQty(i.quantity, dose)} ${i.unit}`}</span>
            </div>
          ))}
        </section>

        {steps.length > 0 && (
          <section className="panel panel-pad">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span className="label">Passaggio {step + 1} di {steps.length}</span>
              {cur.temperature && <span className="chip">🌡 {cur.temperature}</span>}
            </div>
            <p className="cook-step">{cur.body}</p>
            {cur.duration_min ? <Timer minutes={cur.duration_min} /> : null}
            <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
              <button className="btn" style={{ flex: 1 }} disabled={step === 0} onClick={() => setStep(step - 1)}>‹ Indietro</button>
              <button className="btn btn-gold" style={{ flex: 1 }} disabled={step === steps.length - 1} onClick={() => setStep(step + 1)}>Avanti ›</button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
