'use client'
import { useEffect, useRef } from 'react'
import { HL_COLORS, type LibMark, type ReaderSettings } from '@/lib/library'
import type { Toc, ViewApi, ViewProps } from './Reader'

const THEME: Record<string, { bg: string; fg: string; link: string }> = {
  carta: { bg: '#FBF8F1', fg: '#1d1a16', link: '#8a6a24' },
  seppia: { bg: '#F4ECD8', fg: '#3b2f20', link: '#7a5418' },
  notte: { bg: '#121212', fg: '#d8d3c8', link: '#d2ac52' },
}

function styleFor(s: ReaderSettings) {
  const t = THEME[s.theme || 'carta']
  const font = s.font === 'serif' ? 'Georgia, "Iowan Old Style", "Palatino Linotype", serif' : s.font === 'sans' ? '"Schibsted Grotesk", system-ui, sans-serif' : ''
  return {
    'html, body': { background: `${t.bg} !important`, color: `${t.fg} !important` },
    body: { 'line-height': `${s.spacing || 1.5} !important`, ...(font ? { 'font-family': `${font} !important` } : {}), padding: '0 !important' },
    'p, li, td, span, div': { ...(font ? { 'font-family': `${font} !important` } : {}), color: 'inherit !important', 'line-height': 'inherit !important' },
    'h1, h2, h3, h4': { color: `${t.fg} !important` },
    a: { color: `${t.link} !important` },
    img: { 'max-width': '100% !important', height: 'auto !important' },
    '::selection': { background: 'rgba(164,122,44,.3)' },
  }
}

export default function EpubView({ url, bookId, initial, settings, onReady, onLocation, onSelect, onTap, onError }: ViewProps) {
  const el = useRef<HTMLDivElement>(null)
  const r = useRef<{ book: any; rend: any; marks: LibMark[] }>({ book: null, rend: null, marks: [] })
  const cb = useRef({ onLocation, onSelect, onTap })
  cb.current = { onLocation, onSelect, onTap }

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const ePub = (await import('epubjs')).default as any
        const buf = await (await fetch(url)).arrayBuffer()
        if (dead) return
        const book = ePub(buf)
        const narrow = window.innerWidth < 900
        const rend = book.renderTo(el.current!, { width: '100%', height: '100%', flow: 'paginated', spread: narrow ? 'none' : 'auto', minSpreadWidth: 900, allowScriptedContent: false })
        r.current = { book, rend, marks: [] }
        rend.themes.default(styleFor(settings))
        rend.themes.fontSize(`${settings.size || 100}%`)
        await rend.display(initial || undefined)
        if (dead) return

        // posizioni per la percentuale: generate una volta e tenute sul dispositivo
        const key = `epub-loc-${bookId}`
        let saved: string | null = null
        try { saved = localStorage.getItem(key) } catch {}
        const afterLoc = () => { const cur = rend.currentLocation(); if (cur?.start) report(cur) }
        if (saved) { book.locations.load(saved); afterLoc() }
        else book.locations.generate(1200).then(() => { if (dead) return; try { localStorage.setItem(key, book.locations.save()) } catch {}; afterLoc() })

        function labelFor(href: string) {
          const toc = book.navigation?.toc || []
          let best = ''
          const walk = (items: any[]) => items.forEach((t) => { if (href && t.href && href.split('#')[0].endsWith(t.href.split('#')[0])) best = t.label.trim(); if (t.subitems) walk(t.subitems) })
          walk(toc)
          return best
        }
        function report(loc: any) {
          if (dead) return
          const cfi = loc.start.cfi
          const p = book.locations.length() ? book.locations.percentageFromCfi(cfi) : loc.start.percentage || 0
          const page = loc.start.displayed ? `pag. ${loc.start.displayed.page} di ${loc.start.displayed.total} del capitolo` : ''
          cb.current.onLocation({ location: cfi, percent: p || 0, label: labelFor(loc.start.href) || page })
        }
        rend.on('relocated', report)

        rend.on('selected', (cfiRange: string, contents: any) => {
          book.getRange(cfiRange).then((range: Range) => {
            const text = range?.toString().trim()
            if (!text) return
            const rect = range.getBoundingClientRect()
            const frame = (contents?.document?.defaultView?.frameElement as HTMLElement | null)?.getBoundingClientRect()
            cb.current.onSelect({ location: cfiRange, text, x: (frame?.left || 0) + rect.left + rect.width / 2, y: (frame?.top || 0) + rect.top })
          })
        })
        // tocco: sinistra/destra girano pagina, centro mostra le barre
        let sx = 0, sy = 0, st = 0
        rend.on('touchstart', (e: TouchEvent) => { sx = e.changedTouches[0].screenX; sy = e.changedTouches[0].screenY; st = Date.now() })
        rend.on('touchend', (e: TouchEvent) => {
          const dx = e.changedTouches[0].screenX - sx, dy = e.changedTouches[0].screenY - sy
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && Date.now() - st < 600) { if (dx < 0) rend.next(); else rend.prev() }
        })
        rend.on('click', (e: MouseEvent) => {
          const doc = (e.view as Window)?.document
          if (doc?.getSelection()?.toString()) return
          const frame = (e.view as any)?.frameElement?.getBoundingClientRect()
          const x = (frame?.left || 0) + e.clientX - (el.current!.getBoundingClientRect().left)
          const w = el.current!.clientWidth
          cb.current.onSelect(null)
          cb.current.onTap(x < w * 0.25 ? 'left' : x > w * 0.75 ? 'right' : 'center')
        })
        rend.on('keyup', (e: KeyboardEvent) => { if (e.key === 'ArrowRight') rend.next(); if (e.key === 'ArrowLeft') rend.prev() })

        const api: ViewApi = {
          next: () => rend.next(), prev: () => rend.prev(),
          goTo: (l) => { rend.display(l) },
          goPercent: (p) => { if (book.locations.length()) rend.display(book.locations.cfiFromPercentage(Math.min(0.999, Math.max(0, p)))) },
          toc: async () => {
            const out: Toc[] = []
            const walk = (items: any[], level: number) => items.forEach((t) => { out.push({ label: t.label.trim(), location: t.href, level }); if (t.subitems?.length) walk(t.subitems, level + 1) })
            walk((await book.loaded.navigation).toc || [], 0)
            return out
          },
          search: async (q, onHit, stop) => {
            for (const item of book.spine.spineItems) {
              if (stop.v) return
              await item.load(book.load.bind(book))
              const found = item.find(q) || []
              const label = (() => { const toc = book.navigation?.toc || []; let l = ''; toc.forEach((t: any) => { if (item.href && t.href?.split('#')[0] === item.href) l = t.label.trim() }); return l })()
              found.slice(0, 50).forEach((f: any) => onHit({ location: f.cfi, excerpt: f.excerpt.trim(), label: label || `sezione ${item.index + 1}` }))
              item.unload()
            }
          },
          setMarks: (marks) => {
            const prev = r.current.marks
            prev.filter((m) => m.kind === 'highlight').forEach((m) => { try { rend.annotations.remove(m.location, 'highlight') } catch {} })
            marks.filter((m) => m.kind === 'highlight').forEach((m) => {
              try { rend.annotations.highlight(m.location, { id: m.id }, () => {}, 'hl', { fill: HL_COLORS[m.color || 'yellow'], 'fill-opacity': '0.45', 'mix-blend-mode': 'multiply' }) } catch {}
            })
            r.current.marks = marks
          },
          clearSelection: () => { try { rend.getContents().forEach((c: any) => c.window.getSelection()?.removeAllRanges()) } catch {} },
        }
        onReady(api)
      } catch (e: any) {
        onError(`Non riesco ad aprire questo EPUB: ${e?.message || e}`)
      }
    })()
    return () => {
      dead = true
      const { book, rend } = r.current
      try { rend?.destroy() } catch {}
      // lascio finire i caricamenti in corso prima di chiudere il libro
      setTimeout(() => { try { book?.destroy() } catch {} }, 1500)
    }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  // impostazioni (tema, carattere, dimensione) applicate al volo
  useEffect(() => {
    const rend = r.current.rend
    if (!rend) return
    rend.themes.default(styleFor(settings))
    rend.themes.fontSize(`${settings.size || 100}%`)
    try { rend.getContents().forEach((c: any) => { c.addStylesheetRules(styleFor(settings)) }) } catch {}
  }, [settings])

  return <div ref={el} style={{ position: 'absolute', inset: 'calc(58px + env(safe-area-inset-top)) clamp(10px, 4vw, 48px) calc(84px + env(safe-area-inset-bottom))' }} />
}
