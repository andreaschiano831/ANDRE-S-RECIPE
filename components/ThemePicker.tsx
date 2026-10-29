'use client'
import { useEffect, useState } from 'react'

const THEMES = [
  { id: 'crema', c: '#C4933A' }, { id: 'ebano', c: '#1A1810' }, { id: 'bordeaux', c: '#6B1428' },
  { id: 'ottanio', c: '#0D4050' }, { id: 'carta', c: '#C8A060' }, { id: 'avorio', c: '#C8BE8C' },
]

export default function ThemePicker() {
  const [cur, setCur] = useState('crema')
  useEffect(() => { setCur(document.documentElement.dataset.theme || 'crema') }, [])
  function pick(id: string) {
    document.documentElement.dataset.theme = id
    try { localStorage.setItem('rc_theme', id) } catch {}
    setCur(id)
  }
  return (
    <div className="theme-dots" aria-label="Tema">
      {THEMES.map((t) => (
        <button key={t.id} type="button" title={t.id} className={cur === t.id ? 'on' : ''}
          style={{ background: t.c, boxShadow: t.id === 'ebano' ? '0 0 0 1px rgba(255,255,255,.25)' : undefined }}
          onClick={() => pick(t.id)} />
      ))}
    </div>
  )
}
