'use client'
import { useEffect, useState } from 'react'

const THEMES = [
  { id: 'crema', label: 'Atelier', c: '#F7F2E8', d: '#1C2135' },
  { id: 'carta', label: 'Pergamena', c: '#EFE6D3', d: '#3A2A1C' },
  { id: 'avorio', label: 'Avorio', c: '#FFFFFF', d: '#8C7232' },
  { id: 'ebano', label: 'Ebano', c: '#13110E', d: '#D2AC52' },
  { id: 'bordeaux', label: 'Bordeaux', c: '#1A0D12', d: '#D9A574' },
  { id: 'ottanio', label: 'Ottanio', c: '#0B171B', d: '#8CCFC0' },
]

export default function ThemePicker() {
  const [cur, setCur] = useState('crema')
  useEffect(() => {
    const sync = () => setCur(document.documentElement.dataset.theme || 'crema')
    sync(); window.addEventListener('rc-theme', sync)
    return () => window.removeEventListener('rc-theme', sync)
  }, [])
  function pick(id: string) {
    document.documentElement.dataset.theme = id
    try { localStorage.setItem('rc_theme', id) } catch {}
    setCur(id)
    window.dispatchEvent(new Event('rc-theme'))
  }
  return (
    <div className="theme-dots" role="radiogroup" aria-label="Tema">
      {THEMES.map((t) => (
        <button key={t.id} type="button" title={t.label} aria-label={t.label} role="radio" aria-checked={cur === t.id} className={cur === t.id ? 'on' : ''}
          style={{ background: `linear-gradient(135deg, ${t.c} 50%, ${t.d} 50%)` }} onClick={() => pick(t.id)} />
      ))}
    </div>
  )
}
