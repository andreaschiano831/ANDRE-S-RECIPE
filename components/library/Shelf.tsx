'use client'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, BookUp, Search, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { LibBook, LibProgress } from '@/lib/library'
import { useToast } from '../useToast'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const mb = (n: number | null) => (n ? `${(n / 1048576).toFixed(n > 10485760 ? 0 : 1).replace('.', ',')} MB` : '')
const titleFromFile = (name: string) => name.replace(/\.(epub|pdf)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()

/** titolo, autore, pagine e copertina letti dal file, nel browser */
async function readMeta(file: File): Promise<{ kind: 'epub' | 'pdf'; title: string; author: string | null; pages: number | null; cover: Blob | null }> {
  const kind = /\.pdf$/i.test(file.name) || file.type === 'application/pdf' ? 'pdf' : 'epub'
  const buf = await file.arrayBuffer()
  if (kind === 'pdf') {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
    const meta: any = await doc.getMetadata().catch(() => null)
    const page = await doc.getPage(1)
    const vp0 = page.getViewport({ scale: 1 })
    const vp = page.getViewport({ scale: 480 / vp0.width })
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height
    await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise
    const cover = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.82))
    const t = String(meta?.info?.Title || '').trim()
    const pages = doc.numPages
    await doc.destroy()
    return { kind, title: t && t.length > 2 && !/untitled|microsoft word|\.(docx?|indd)$/i.test(t) ? t : titleFromFile(file.name), author: String(meta?.info?.Author || '').trim() || null, pages, cover }
  }
  const ePub = (await import('epubjs')).default as any
  const book = ePub(buf)
  const md = await book.loaded.metadata.catch(() => ({}))
  let cover: Blob | null = null
  try {
    const url = await book.coverUrl()
    if (url) cover = await (await fetch(url)).blob()
  } catch {}
  book.destroy()
  return { kind, title: md?.title || titleFromFile(file.name), author: md?.creator || null, pages: null, cover }
}

export default function LibraryShelf({ books: initial, progress, covers, canEdit, setupNeeded }: {
  books: LibBook[]; progress: LibProgress[]; covers: Record<string, string>; canEdit: boolean; setupNeeded: boolean
}) {
  const router = useRouter()
  const { show, node } = useToast()
  const [books, setBooks] = useState(initial)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState('')
  const [over, setOver] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const prog = useMemo(() => new Map(progress.map((p) => [p.book_id, p])), [progress])
  const last = [...progress].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).map((p) => books.find((b) => b.id === p.book_id)).find((b) => b && (prog.get(b.id)?.percent ?? 0) < 0.995)
  const shown = books.filter((b) => !q || norm(`${b.title} ${b.author ?? ''}`).includes(norm(q)))

  async function upload(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => /\.(epub|pdf)$/i.test(f.name))
    if (!files.length) { show('Carica file .epub o .pdf', 'err'); return }
    const sb = createClient()
    let ok = 0
    for (const [i, f] of files.entries()) {
      if (f.size > 50 * 1048576) { show(`${f.name}: oltre 50 MB, troppo grande per l’archivio gratuito`, 'err'); continue }
      try {
        setBusy(`Leggo ${f.name}${files.length > 1 ? ` (${i + 1} di ${files.length})` : ''}…`)
        const m = await readMeta(f)
        const id = crypto.randomUUID()
        setBusy(`Carico ${m.title}…`)
        const path = `books/${id}.${m.kind}`
        const up = await sb.storage.from('library').upload(path, f, { contentType: m.kind === 'pdf' ? 'application/pdf' : 'application/epub+zip', upsert: false })
        if (up.error) throw new Error(up.error.message)
        let cover_path: string | null = null
        if (m.cover) {
          const cp = `covers/${id}.jpg`
          const c = await sb.storage.from('library').upload(cp, m.cover, { contentType: m.cover.type || 'image/jpeg' })
          if (!c.error) cover_path = cp
        }
        const { data, error } = await sb.from('library_books').insert({ id, title: m.title.slice(0, 200), author: m.author?.slice(0, 200) ?? null, kind: m.kind, file_path: path, cover_path, size_bytes: f.size, pages: m.pages }).select().single()
        if (error) throw new Error(error.message)
        setBooks((x) => [data as LibBook, ...x]); ok++
      } catch (e: any) {
        show(`${f.name}: ${/bucket|not found/i.test(e.message) ? 'manca l’archivio «library» su Supabase (vedi le istruzioni)' : e.message}`, 'err')
      }
    }
    setBusy('')
    if (ok) { show(`${ok} ${ok === 1 ? 'libro aggiunto' : 'libri aggiunti'}`, 'ok'); router.refresh() }
  }

  async function remove(b: LibBook) {
    if (!confirm(`Togliere «${b.title}» dalla biblioteca? Si perdono anche segnalibri e note.`)) return
    const sb = createClient()
    await sb.storage.from('library').remove([b.file_path, ...(b.cover_path ? [b.cover_path] : [])])
    const { error } = await sb.from('library_books').delete().eq('id', b.id)
    if (error) { show(error.message, 'err'); return }
    setBooks((x) => x.filter((y) => y.id !== b.id)); show('Libro tolto', 'ok')
  }

  if (setupNeeded) return (
    <main className="narrow page">
      <div className="panel panel-pad stack">
        <h1 className="h2">La biblioteca va attivata su Supabase</h1>
        <p>Apri Supabase → SQL Editor → New query, incolla il contenuto del file <code>supabase/biblioteca.sql</code> del progetto e premi Run. Poi ricarica questa pagina.</p>
      </div>
    </main>
  )

  const Cover = ({ b, big }: { b: LibBook; big?: boolean }) => {
    const url = b.cover_path ? covers[b.cover_path] : null
    return url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={url} alt="" className="lib-cover-img" loading="lazy" />
      : <span className={`lib-cover-ph ${big ? 'big' : ''}`}><b>{b.title}</b>{b.author && <small>{b.author}</small>}</span>
  }

  return (
    <div className="wrap page"
      onDragOver={(e) => { if (canEdit) { e.preventDefault(); setOver(true) } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { if (!canEdit) return; e.preventDefault(); setOver(false); upload(e.dataTransfer.files) }}>
      <header className="ph">
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="h1">Biblioteca</h1>
          <p>I tuoi ricettari in EPUB e PDF, da sfogliare con segnalibri, evidenziazioni e note. Riprendi dove eri arrivato, anche da un altro dispositivo.</p>
        </div>
        {canEdit && <button className="btn btn-gold" disabled={!!busy} onClick={() => file.current?.click()}>{busy ? <><span className="spin" /> {busy}</> : <><BookUp size={16} /> Carica ebook</>}</button>}
        <input ref={file} type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" multiple hidden onChange={(e) => { if (e.target.files) upload(e.target.files); e.target.value = '' }} />
      </header>

      {over && <div className="lib-drop">Rilascia qui i file EPUB o PDF</div>}

      {last && (
        <Link href={`/biblioteca/${last.id}`} className="lib-continue">
          <span className="lib-cover"><Cover b={last} big /></span>
          <span className="lib-continue-txt">
            <span className="small muted">Continua a leggere</span>
            <b className="dish">{last.title}</b>
            {last.author && <span className="small">{last.author}</span>}
            <span className="lib-bar"><i style={{ width: `${Math.round((prog.get(last.id)?.percent ?? 0) * 100)}%` }} /></span>
            <span className="small muted">{Math.round((prog.get(last.id)?.percent ?? 0) * 100)}% letto</span>
          </span>
          <span className="btn btn-gold" style={{ alignSelf: 'center' }}><BookOpen size={16} /> Riprendi</span>
        </Link>
      )}

      {books.length > 4 && (
        <div className="hub-search" style={{ margin: '0 0 18px' }}><Search /><input className="input" placeholder="Cerca per titolo o autore" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      )}

      {!books.length ? (
        <div className="panel empty">
          <BookOpen size={32} strokeWidth={1.3} />
          <span className="dish">La biblioteca è vuota</span>
          <p style={{ maxWidth: '46ch' }}>Carica i ricettari che hai in EPUB o PDF (fino a 50 MB l’uno). Restano nel tuo archivio privato e li apri da qualsiasi dispositivo.</p>
          {canEdit && <button className="btn btn-gold" onClick={() => file.current?.click()}><BookUp size={16} /> Carica il primo ebook</button>}
        </div>
      ) : (
        <div className="lib-grid">
          {shown.map((b) => {
            const p = prog.get(b.id)?.percent ?? 0
            return (
              <div key={b.id} className="lib-item">
                <Link href={`/biblioteca/${b.id}`} className="lib-cover"><Cover b={b} /><span className="lib-kind">{b.kind.toUpperCase()}</span></Link>
                {p > 0 && <span className="lib-bar"><i style={{ width: `${Math.round(p * 100)}%` }} /></span>}
                <Link href={`/biblioteca/${b.id}`} className="lib-title">{b.title}</Link>
                <span className="small muted">{[b.author, b.pages ? `${b.pages} pagine` : null, p >= 0.995 ? 'finito' : p > 0 ? `${Math.round(p * 100)}%` : 'da iniziare'].filter(Boolean).join(' · ')}</span>
                {canEdit && <button className="lib-del" onClick={() => remove(b)} aria-label={`Togli ${b.title}`} title={`Togli · ${mb(b.size_bytes)}`}><Trash2 size={14} /></button>}
              </div>
            )
          })}
        </div>
      )}
      {node}
    </div>
  )
}
