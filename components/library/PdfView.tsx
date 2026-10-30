'use client'
import { useEffect, useRef, useState } from 'react'
import { HL_COLORS, type LibMark } from '@/lib/library'
import type { Toc, ViewApi, ViewProps } from './Reader'

const nrm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()

export default function PdfView({ url, initial, settings, onReady, onLocation, onSelect, onTap, onError }: ViewProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const pageEl = useRef<HTMLDivElement>(null)
  const st = useRef<{ pdf: any; lib: any; n: number; total: number; marks: LibMark[]; texts: Map<number, string>; task: any; found: string }>({ pdf: null, lib: null, n: 1, total: 0, marks: [], texts: new Map(), task: null, found: '' })
  const [page, setPage] = useState(0)
  const cfg = useRef(settings)
  cfg.current = settings
  const cb = useRef({ onLocation, onSelect, onTap })
  cb.current = { onLocation, onSelect, onTap }

  async function render(n: number) {
    const s = st.current
    if (!s.pdf || !pageEl.current || !scroller.current) return
    n = Math.min(Math.max(1, n), s.total)
    s.n = n
    const p = await s.pdf.getPage(n)
    const base = p.getViewport({ scale: 1 })
    const box = scroller.current
    const availW = box.clientWidth - 24, availH = box.clientHeight - 140
    const scale = cfg.current.fit === 'page' ? Math.min(availW / base.width, availH / base.height) : Math.min(availW / base.width, 2.2)
    const vp = p.getViewport({ scale })
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr)
    canvas.style.width = `${vp.width}px`; canvas.style.height = `${vp.height}px`
    s.task?.cancel?.()
    const task = p.render({ canvasContext: canvas.getContext('2d')!, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined })
    s.task = task
    try { await task.promise } catch { return }
    if (s.n !== n) return
    const holder = pageEl.current
    holder.innerHTML = ''
    holder.style.width = `${vp.width}px`; holder.style.height = `${vp.height}px`
    holder.style.setProperty('--scale-factor', String(scale))
    holder.appendChild(canvas)
    const tl = document.createElement('div'); tl.className = 'textLayer'; holder.appendChild(tl)
    const tc = await p.getTextContent()
    await new s.lib.TextLayer({ textContentSource: tc, container: tl, viewport: vp }).render()
    paintMarks(); paintFound()
    box.scrollTop = 0
    setPage(n)
    cb.current.onLocation({ location: `p:${n}`, percent: s.total > 1 ? (n - 1) / (s.total - 1) : 1, label: `Pagina ${n} di ${s.total}` })
  }

  function paintMarks() {
    const s = st.current, tl = pageEl.current?.querySelector('.textLayer')
    if (!tl) return
    tl.querySelectorAll('span.hl').forEach((x) => { x.classList.remove('hl'); (x as HTMLElement).style.background = '' })
    for (const m of s.marks.filter((m) => m.kind === 'highlight' && m.location === `p:${s.n}`)) {
      const t = nrm(m.text || '')
      tl.querySelectorAll('span').forEach((sp) => {
        const x = nrm(sp.textContent || '')
        if (x.length > 1 && t.includes(x)) { sp.classList.add('hl'); (sp as HTMLElement).style.background = HL_COLORS[m.color || 'yellow'] + 'aa' }
      })
    }
  }
  function paintFound() {
    const q = st.current.found, tl = pageEl.current?.querySelector('.textLayer')
    if (!tl) return
    tl.querySelectorAll('span.found').forEach((x) => x.classList.remove('found'))
    if (q) tl.querySelectorAll('span').forEach((sp) => { if (nrm(sp.textContent || '').includes(q)) sp.classList.add('found') })
  }

  useEffect(() => {
    let dead = false
    ;(async () => {
      try {
        const lib = await import('pdfjs-dist')
        lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const pdf = await lib.getDocument({ url, disableAutoFetch: false }).promise
        if (dead) { pdf.destroy(); return }
        st.current.pdf = pdf; st.current.lib = lib; st.current.total = pdf.numPages
        const start = initial?.startsWith('p:') ? parseInt(initial.slice(2)) || 1 : 1
        await render(start)
        const textOf = async (n: number) => {
          if (!st.current.texts.has(n)) { const tc = await (await pdf.getPage(n)).getTextContent(); st.current.texts.set(n, tc.items.map((i: any) => i.str + (i.hasEOL ? '\n' : ' ')).join('')) }
          return st.current.texts.get(n)!
        }
        const api: ViewApi = {
          next: () => { if (st.current.n < st.current.total) render(st.current.n + 1) },
          prev: () => { if (st.current.n > 1) render(st.current.n - 1) },
          goTo: (l) => { const m = l.match(/^p:(\d+)/); if (m) { st.current.found = ''; render(+m[1]) } else if (l.startsWith('q:')) { const [, n, q] = l.match(/^q:(\d+):(.*)$/) || []; st.current.found = nrm(q || ''); render(+n) } },
          goPercent: (p) => render(Math.round(p * (st.current.total - 1)) + 1),
          toc: async () => {
            const out: Toc[] = []
            const walk = async (items: any[], level: number) => {
              for (const it of items || []) {
                let n = 0
                try {
                  const dest = typeof it.dest === 'string' ? await pdf.getDestination(it.dest) : it.dest
                  if (dest?.[0]) n = (await pdf.getPageIndex(dest[0])) + 1
                } catch {}
                if (n) out.push({ label: it.title, location: `p:${n}`, level })
                if (it.items?.length) await walk(it.items, level + 1)
              }
            }
            await walk((await pdf.getOutline()) || [], 0)
            return out
          },
          search: async (q, onHit, stop) => {
            const qq = nrm(q)
            for (let n = 1; n <= pdf.numPages; n++) {
              if (stop.v) return
              const t = await textOf(n)
              const low = t.toLowerCase().replace(/\s+/g, ' ')
              let i = low.indexOf(qq), c = 0
              while (i >= 0 && c < 8) {
                onHit({ location: `q:${n}:${qq}`, excerpt: '…' + t.replace(/\s+/g, ' ').slice(Math.max(0, i - 50), i + qq.length + 70) + '…', label: `Pagina ${n}` })
                i = low.indexOf(qq, i + qq.length); c++
              }
            }
          },
          setMarks: (marks) => { st.current.marks = marks; paintMarks() },
          clearSelection: () => window.getSelection()?.removeAllRanges(),
        }
        onReady(api, { pages: pdf.numPages })
      } catch (e: any) {
        onError(`Non riesco ad aprire questo PDF: ${e?.message || e}`)
      }
    })()
    return () => { dead = true; try { st.current.pdf?.destroy() } catch {} }
  }, [url]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (st.current.pdf) render(st.current.n) }, [settings.fit]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const h = () => { if (st.current.pdf) render(st.current.n) }
    let t: ReturnType<typeof setTimeout>
    const deb = () => { clearTimeout(t); t = setTimeout(h, 250) }
    window.addEventListener('resize', deb); return () => window.removeEventListener('resize', deb)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // selezione di testo → menu evidenzia / nota / ricetta
  useEffect(() => {
    const h = () => {
      const sel = window.getSelection()
      const text = sel?.toString().trim()
      if (!sel || !text || !pageEl.current?.contains(sel.anchorNode)) return
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      cb.current.onSelect({ location: `p:${st.current.n}`, text, x: rect.left + rect.width / 2, y: rect.top })
    }
    document.addEventListener('mouseup', h); document.addEventListener('touchend', h)
    return () => { document.removeEventListener('mouseup', h); document.removeEventListener('touchend', h) }
  }, [])

  // tocchi e scorrimento laterale
  const touch = useRef({ x: 0, y: 0, t: 0 })
  return (
    <div ref={scroller} className={`rd-pdf ${settings.fit === 'page' ? 'fit-page' : ''}`}
      onClick={(e) => {
        if (window.getSelection()?.toString()) return
        const w = scroller.current!.clientWidth, x = e.clientX - scroller.current!.getBoundingClientRect().left
        cb.current.onSelect(null)
        cb.current.onTap(x < w * 0.25 ? 'left' : x > w * 0.75 ? 'right' : 'center')
      }}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() } }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - touch.current.t < 600 && !window.getSelection()?.toString()) {
          e.preventDefault(); if (dx < 0) st.current.n < st.current.total && render(st.current.n + 1); else st.current.n > 1 && render(st.current.n - 1)
        }
      }}>
      <div ref={pageEl} className="rd-page" />
      {page > 0 && <span className="rd-pagenum">{page} / {st.current.total}</span>}
    </div>
  )
}
