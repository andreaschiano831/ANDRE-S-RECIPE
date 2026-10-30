'use client'
import { docCSS, docHTML, type PrintItem } from '@/lib/print-doc'

/** anteprima a schermo identica alla stampa (e il foglio stesso che va in stampa) */
export default function PrintSheet({ brand, title, items, onePerPage, noHeader }: { brand: string; title?: string; items: PrintItem[]; onePerPage?: boolean; noHeader?: boolean }) {
  return (
    <div className="pd-wrap">
      <style>{docCSS('.pd-sheet ')}</style>
      <div className="pd-sheet" dangerouslySetInnerHTML={{ __html: docHTML({ brand, title, items, onePerPage, noHeader }) }} />
    </div>
  )
}
