'use client'
import { useState } from 'react'
import { Loader2, Printer } from 'lucide-react'
import { Drawer, useHub } from '../hub/ui'
import { useHaccp } from './store'
import { F, Seg, esc, printHtml } from './bits'
import { ABB, OLIO_CASI, abbState, catLabel, addDays, dayKey, fmtDateLong, fmtTime, num, type Kind, type Rec } from './model'

const REG: { kind: Kind; label: string }[] = [
  { kind: 'temp', label: 'Temperature' }, { kind: 'sanif', label: 'Sanificazione' }, { kind: 'ricevimento', label: 'Ricevimento merci' },
  { kind: 'nc', label: 'Non conformità' }, { kind: 'abbattimento', label: 'Abbattimenti' }, { kind: 'etichetta', label: 'Etichette e lotti' },
  { kind: 'olio', label: 'Olio frittura' }, { kind: 'task', label: 'Controlli periodici' },
]

type Col = [string, (r: Rec) => string]
const D = (r: Rec) => fmtDateLong(r.at), T = (r: Rec) => fmtTime(r.at), OP = (r: Rec) => r.by_name || ''
const COLS: Record<Kind, Col[]> = {
  temp: [['Data', D], ['Ora', T], ['Frigo', (r) => r.data.unit], ['°C', (r) => num(r.data.valore)], ['Limiti', (r) => `${num(r.data.min)} ÷ ${num(r.data.max)}`], ['Esito', (r) => (r.data.ok ? 'OK' : 'FUORI LIMITE')], ['Nota', (r) => r.data.nota || ''], ['Operatore', OP]],
  sanif: [['Data', D], ['Ora', T], ['Attrezzatura / zona', (r) => r.data.nome], ['Stato', (r) => (r.data.stato === 'fatto' ? 'Eseguita' : 'Rimandata')], ['Operatore', OP]],
  ricevimento: [['Data', (r) => fmtDateLong(r.data.data || r.at)], ['DDT', (r) => r.data.ddt], ['Fornitore', (r) => r.data.fornitore], ['Categoria', (r) => catLabel(r.data.categoria)], ['°C', (r) => (r.data.temperatura != null ? num(r.data.temperatura) : '')], ['Imballi', (r) => (r.data.imballo ? 'integri' : 'NO')], ['Etichette', (r) => (r.data.etichetta ? 'ok' : 'NO')], ['Prodotti e lotti', (r) => (r.data.prodotti || []).map((p: any) => `${p.nome}${p.lotto ? ` (${p.lotto})` : ''}`).join(', ')], ['Esito', (r) => (r.data.esito === 'conforme' ? 'Conforme' : 'NON CONFORME')], ['Operatore', OP]],
  nc: [['Data', D], ['Riguarda', (r) => ({ ricevuta: 'Merce ricevuta', presente: 'Merce presente', processo: 'Cucina' } as any)[r.data.origine] || ''], ['Fornitore / DDT', (r) => [r.data.fornitore, r.data.ddt].filter(Boolean).join(' · ')], ['Tipo', (r) => r.data.tipo], ['Descrizione', (r) => r.data.descrizione], ['Azione correttiva', (r) => r.data.azione], ['Verifica', (r) => r.data.verifica || ''], ['Stato', (r) => (r.data.chiusa ? `Chiusa ${r.data.chiusaIl ? fmtDateLong(r.data.chiusaIl) : ''}` : 'APERTA')], ['Operatore', OP]],
  abbattimento: [['Data', (r) => fmtDateLong(r.data.inizio)], ['Prodotto', (r) => r.data.prodotto], ['Lotto', (r) => r.data.lotto], ['Trattamento', (r) => ABB[r.data.modo as 'refrigerare'].label], ['Inizio', (r) => `${fmtTime(r.data.inizio)} · ${num(r.data.tempInizio)} °C`], ['Fine', (r) => (r.data.fine ? `${fmtTime(r.data.fine)} · ${num(r.data.tempFine)} °C` : 'in corso')], ['Minuti', (r) => String(abbState(r.data).min)], ['Esito', (r) => (r.data.ok == null ? '' : r.data.ok ? 'Conforme' : 'NON CONFORME')], ['Abbattitore', (r) => r.data.abbattitore || ''], ['Operatore', OP]],
  etichetta: [['Data', D], ['Prodotto', (r) => r.data.prodotto], ['Lotto', (r) => r.data.lotto], ['Scadenza', (r) => fmtDateLong(r.data.scadenza)], ['Conservazione', (r) => r.data.conservazione], ['Materie prime', (r) => (r.data.ddt || []).map((x: any) => `DDT ${x.ddt} ${x.fornitore}`).join(', ')], ['Copie', (r) => String(r.data.copie || 1)], ['Operatore', OP]],
  olio: [['Data', D], ['Ora', T], ['Friggitrice', (r) => r.data.nome], ['Caso', (r) => `${r.data.caso} · ${OLIO_CASI[r.data.caso as 1].label}`], ['Polari %', (r) => (r.data.polari != null ? num(r.data.polari) : '')], ['Cambio olio', (r) => (r.data.cambio ? 'Sì' : 'No')], ['Operatore', OP]],
  task: [['Data', D], ['Controllo', (r) => r.data.nome], ['Nota', (r) => r.data.nota || ''], ['Operatore', OP]],
}

const CSS = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Helvetica,Arial,sans-serif;color:#111;font-size:8.5pt;margin:0}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1.5pt solid #111;padding-bottom:3mm;margin-bottom:4mm}
h1{font-size:16pt;margin:0}header p{margin:0;color:#444}h2{font-size:11.5pt;margin:6mm 0 2mm;break-after:avoid}
table{width:100%;border-collapse:collapse;margin-bottom:2mm}th,td{border:.5pt solid #999;padding:1.4mm 1.8mm;text-align:left;vertical-align:top}
th{background:#eee;font-weight:600;font-size:7.5pt}tr{break-inside:avoid}.bad{color:#a00;font-weight:600}.empty{color:#666;font-style:italic}
.sign{display:flex;gap:20mm;margin-top:10mm}.sign div{flex:1;border-top:.6pt solid #111;padding-top:1.5mm;color:#444}
section{break-inside:auto}section+section{break-before:page}`

export default function Registri({ onClose }: { onClose: () => void }) {
  const { range } = useHaccp()
  const { bridge, k, toast } = useHub()
  const [per, setPer] = useState<'7' | '30' | '90' | 'mese'>('30')
  const [mese, setMese] = useState(dayKey().slice(0, 7))
  const [sel, setSel] = useState<Kind[]>(REG.map((r) => r.kind))
  const [busy, setBusy] = useState(false)

  async function run() {
    const from = per === 'mese' ? new Date(`${mese}-01T00:00`) : addDays(new Date(new Date().setHours(0, 0, 0, 0)), -Number(per) + 1)
    const to = per === 'mese' ? new Date(new Date(from).setMonth(from.getMonth() + 1) - 1) : new Date()
    setBusy(true)
    try {
      const rs = await range(from.toISOString(), to.toISOString())
      const name = bridge?.kitchenName || k.name || 'Cucina'
      const head = `<header><div><h1>Registri HACCP · ${esc(name)}</h1><p>Periodo ${fmtDateLong(from.toISOString())} – ${fmtDateLong(to.toISOString())}</p></div><p>Stampato il ${fmtDateLong(new Date().toISOString())} alle ${fmtTime(new Date().toISOString())}</p></header>`
      const parts = REG.filter((r) => sel.includes(r.kind)).map((reg) => {
        const rows = rs.filter((r) => r.kind === reg.kind)
        const cols = COLS[reg.kind]
        const bad = (r: Rec) => (reg.kind === 'temp' && !r.data.ok) || (reg.kind === 'ricevimento' && r.data.esito !== 'conforme') || (reg.kind === 'abbattimento' && r.data.ok === false) || (reg.kind === 'nc' && !r.data.chiusa) || (reg.kind === 'olio' && r.data.caso === 3)
        const body = rows.length ? `<table><thead><tr>${cols.map(([h]) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr class="${bad(r) ? 'bad' : ''}">${cols.map(([, f]) => `<td>${esc(f(r))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="empty">Nessuna registrazione nel periodo.</p>'
        return `<section>${head}<h2>${reg.label} · ${rows.length} registrazioni</h2>${body}<div class="sign"><div>Firma del responsabile HACCP</div><div>Data e timbro</div></div></section>`
      })
      printHtml(parts.join(''), CSS, `Registri HACCP ${name}`)
    } catch (e: any) { toast(e.message || 'Stampa non riuscita', 'error') }
    setBusy(false)
  }

  return (
    <Drawer onClose={onClose} title={<span className="dish" style={{ fontSize: '1.3rem' }}>Stampa i registri</span>}
      foot={<div className="row"><span className="small muted" style={{ flex: 1 }}>Dalla finestra di stampa puoi salvare in PDF per l’ispettore o il consulente.</span>
        <button className="btn btn-gold" disabled={busy || !sel.length} onClick={run}>{busy ? <Loader2 className="hz-spin" /> : <Printer />} Stampa</button></div>}>
      <F label="Periodo">
        <Seg value={per} onChange={setPer} options={[{ key: '7', label: '7 giorni' }, { key: '30', label: '30 giorni' }, { key: '90', label: '90 giorni' }, { key: 'mese', label: 'Un mese' }]} />
      </F>
      {per === 'mese' && <F label="Mese"><input className="input" type="month" value={mese} onChange={(e) => setMese(e.target.value)} style={{ maxWidth: 220 }} /></F>}
      <F label="Registri">
        <div className="hz-chips">
          {REG.map((r) => { const on = sel.includes(r.kind); return <button key={r.kind} type="button" className={`pill ${on ? 'on' : ''}`} onClick={() => setSel(on ? sel.filter((x) => x !== r.kind) : [...sel, r.kind])}>{r.label}</button> })}
        </div>
      </F>
      <p className="small muted">Ogni registro esce su pagine separate, con le righe fuori norma in evidenza e lo spazio per la firma.</p>
    </Drawer>
  )
}
