'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, FileDown, FilePlus2, Printer } from 'lucide-react'
import PrintSheet from './PrintSheet'
import AddToDocument from './AddToDocument'
import { wordFile, type PrintItem } from '@/lib/print-doc'

export default function QuickPrint({ brand, items, ids, dose, auto }: { brand: string; items: PrintItem[]; ids: string[]; dose: number; auto: boolean }) {
  const router = useRouter()
  const [doc, setDoc] = useState(false)
  const title = items.length === 1 ? items[0].name : `${items.length} ricette`
  useEffect(() => { if (auto && items.length) { const t = setTimeout(() => window.print(), 400); return () => clearTimeout(t) } }, [auto, items.length])
  if (!items.length) return <div className="panel empty"><span className="dish">Niente da stampare</span><button className="btn" onClick={() => router.back()}>Indietro</button></div>
  return (
    <>
      <div className="no-print row" style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}><ChevronLeft size={16} /> Indietro</button>
        <span style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => setDoc(true)}><FilePlus2 size={15} /> Salva in un documento</button>
        <button className="btn btn-sm" onClick={() => wordFile({ brand, title, items })}><FileDown size={15} /> Word</button>
        <button className="btn btn-gold" onClick={() => window.print()}><Printer size={16} /> Stampa o PDF</button>
      </div>
      <PrintSheet brand={brand} title={title} items={items} noHeader={items.length === 1} />
      {doc && <AddToDocument recipeIds={ids} dose={dose} onClose={() => setDoc(false)} />}
    </>
  )
}
