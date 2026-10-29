'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ChefHat, CornerDownLeft, PenLine, Search, Sparkles, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { KITCHEN_SECTIONS } from '@/lib/nav'
import { APP_ICON, SECTION_ICON } from './icons'

type Item = { id: string; label: string; hint?: string; group: string; icon: React.ComponentType<{ size?: number }>; run: () => void; keywords?: string }
type R = { id: string; name: string; category: string; dish_group: string | null }

let recipeCache: R[] | null = null
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const THEMES = ['crema', 'carta', 'avorio', 'ebano', 'bordeaux', 'ottanio']

export default function CommandPalette({ onClose, user, kitchens }: {
  onClose: () => void; user: { canEdit: boolean; isAdmin: boolean }; kitchens: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [recipes, setRecipes] = useState<R[]>(recipeCache ?? [])
  const [sel, setSel] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (recipeCache) return
    createClient().from('recipes').select('id, name, category, dish_group').order('name').limit(3000)
      .then(({ data }) => { recipeCache = (data ?? []) as R[]; setRecipes(recipeCache) })
  }, [])

  const go = (href: string) => () => { onClose(); router.push(href) }
  const kitchenId = useMemo(() => {
    try { const k = localStorage.getItem('rc_kitchen'); if (kitchens.some((x) => x.id === k)) return k } catch {}
    return kitchens[0]?.id ?? null
  }, [kitchens])

  const items = useMemo(() => {
    const base: Item[] = []
    if (user.canEdit) {
      base.push({ id: 'new', label: 'Nuova ricetta', group: 'Azioni', icon: PenLine, run: go('/ricette/nuova'), keywords: 'aggiungi scrivi crea' })
      base.push({ id: 'imp-link', label: 'Importa un ricettario da link', group: 'Azioni', icon: Sparkles, run: go('/importa?tab=link'), keywords: 'url sito blog pdf web' })
      base.push({ id: 'imp', label: 'Importa da screenshot o testo', group: 'Azioni', icon: Sparkles, run: go('/importa'), keywords: 'foto ai groq file docx' })
    }
    base.push({ id: 'theme', label: 'Cambia tema', group: 'Azioni', icon: Palette, keywords: 'colori scuro chiaro', run: () => {
      const cur = document.documentElement.dataset.theme || 'crema'
      const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]
      document.documentElement.dataset.theme = next
      try { localStorage.setItem('rc_theme', next) } catch {}
      window.dispatchEvent(new Event('rc-theme'))
    } })
    base.push(
      { id: 'n-home', label: 'Home', group: 'Vai a', icon: APP_ICON.home, run: go('/') },
      { id: 'n-ric', label: 'Ricette', group: 'Vai a', icon: APP_ICON.ricette, run: go('/ricette') },
      { id: 'n-doc', label: 'Stampa e documenti', group: 'Vai a', icon: APP_ICON.documenti, run: go('/documenti') },
      { id: 'n-set', label: 'Impostazioni', group: 'Vai a', icon: APP_ICON.impostazioni, run: go('/impostazioni') },
      { id: 'n-cuc', label: 'Cucine', group: 'Vai a', icon: ChefHat, run: go('/cucine') },
    )
    if (user.canEdit) base.push({ id: 'n-tools', label: 'Strumenti: backup, doppioni, gruppi', group: 'Vai a', icon: APP_ICON.strumenti, run: go('/strumenti'), keywords: 'json esporta importa duplicati' })
    if (user.isAdmin) base.push({ id: 'n-lib', label: 'Ricettari e sezioni', group: 'Vai a', icon: APP_ICON.ricettari, run: go('/ricettari') })
    if (kitchenId) for (const s of KITCHEN_SECTIONS) {
      base.push({ id: 'k-' + s.id, label: s.label, hint: s.hint, group: 'Cucina', icon: SECTION_ICON[s.id], run: go(`/cucine/${kitchenId}/app?s=${s.id}`) })
    }
    return base
  }, [user, kitchenId]) // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean)
    const match = (text: string) => words.every((w) => text.includes(w))
    const fixed = words.length ? items.filter((i) => match(norm(`${i.label} ${i.hint ?? ''} ${i.keywords ?? ''} ${i.group}`))) : items.filter((i) => i.group !== 'Cucina')
    const recs: Item[] = words.length
      ? recipes.filter((r) => match(norm(`${r.name} ${r.category} ${r.dish_group ?? ''}`))).slice(0, 8)
        .map((r) => ({ id: 'r-' + r.id, label: r.name, hint: r.dish_group ? `${r.category}, ${r.dish_group}` : r.category, group: 'Ricette', icon: BookOpen, run: go(`/ricette/${r.id}`) }))
      : []
    const all = [...recs, ...fixed]
    if (words.length) all.push({ id: 'all', label: `Cerca «${q.trim()}» in tutte le ricette`, group: 'Ricette', icon: Search, run: go(`/ricette?q=${encodeURIComponent(q.trim())}`) })
    return all
  }, [q, items, recipes]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setSel(0) }, [q])
  useEffect(() => { listRef.current?.querySelector('.cmd-item.on')?.scrollIntoView({ block: 'nearest' }) }, [sel])

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); results[sel]?.run() }
  }

  let lastGroup = ''
  return (
    <div className="cmd-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cmd" role="dialog" aria-label="Cerca">
        <div className="cmd-in">
          <Search size={18} color="var(--muted)" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Cerca una ricetta, una sezione o un’azione" aria-label="Cerca" />
          <span className="kbd">esc</span>
        </div>
        <div className="cmd-list" ref={listRef}>
          {results.length === 0 && <p className="empty small">Nessun risultato per «{q}»</p>}
          {results.map((it, i) => {
            const head = it.group !== lastGroup ? <p className="cmd-sec">{it.group}</p> : null
            lastGroup = it.group
            const Icon = it.icon
            return (
              <div key={it.id}>
                {head}
                <button className={`cmd-item ${i === sel ? 'on' : ''}`} onMouseMove={() => setSel(i)} onClick={() => it.run()}>
                  <Icon size={18} />
                  <span className={it.group === 'Ricette' && it.id !== 'all' ? 'dish' : ''} style={it.group === 'Ricette' && it.id !== 'all' ? { fontSize: '1.08rem' } : undefined}>{it.label}</span>
                  {it.hint && <small>{it.hint}</small>}
                </button>
              </div>
            )
          })}
        </div>
        <div className="cmd-foot"><span>↑↓ per muoverti</span><span><CornerDownLeft size={11} /> per aprire</span><span>⌘K o / per aprire la ricerca</span></div>
      </div>
    </div>
  )
}
