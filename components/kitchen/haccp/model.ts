/* Modello dei registri HACCP: tipi, impostazioni predefinite e calcolo degli stati */

export type Kind = 'temp' | 'sanif' | 'ricevimento' | 'nc' | 'abbattimento' | 'etichetta' | 'olio' | 'task'
export type Rec<T = any> = { id: string; kitchen_id: string; kind: Kind; at: string; data: T; by_user?: string | null; by_name?: string | null; updated_at?: string }

export type UnitTipo = 'frigo' | 'freezer' | 'banco' | 'cella' | 'abbattitore' | 'altro'
export type Unit = { id: string; nome: string; tipo: UnitTipo; min: number; max: number }
export type Freq = 'giornaliera' | 'settimanale' | 'mensile'
export type Equip = { id: string; nome: string; freq: Freq; istruzioni?: string }
export type Fryer = { id: string; nome: string }
export type Task = { id: string; nome: string; ogniGiorni: number; prossima: string; nota?: string }
export type Cfg = { units: Unit[]; equipment: Equip[]; fryers: Fryer[]; tasks: Task[] }
export type CfgKey = keyof Cfg

export type TempData = { unitId: string; unit: string; valore: number; min: number; max: number; ok: boolean; nota?: string }
export type SanifData = { equipId: string; nome: string; stato: 'fatto' | 'posticipato'; nota?: string }
export type Prodotto = { nome: string; qta?: number | null; unita?: string; lotto?: string; scadenza?: string }
export type RicData = {
  ddt: string; data: string; fornitore: string; categoria: string; temperatura?: number | null
  imballo: boolean; etichetta: boolean; esito: 'conforme' | 'non_conforme'; prodotti: Prodotto[]; nota?: string; caricato?: boolean
}
export type NcData = {
  origine: 'ricevuta' | 'presente' | 'processo'; fornitore?: string; ddt?: string; ricevimentoId?: string | null
  tipo: string; descrizione: string; azione: string; verifica?: string; chiusa: boolean; chiusaIl?: string | null
}
export type AbbData = {
  modo: 'refrigerare' | 'congelare'; prodotto: string; prepId?: string | null; recipeId?: string | null; quantita?: string
  lotto: string; ddt?: string[]; abbattitore?: string; inizio: string; tempInizio: number | null
  fine?: string | null; tempFine?: number | null; ok?: boolean | null; nota?: string
}
export type EtiData = {
  prodotto: string; prepId?: string | null; recipeId?: string | null; prodottoIl: string; scadenza: string
  conservazione: string; lotto: string; note?: string; ddt?: { id: string; ddt: string; fornitore: string }[]; copie: number; operatore?: string
}
export type OlioData = { fryerId: string; nome: string; caso: 1 | 2 | 3; cambio: boolean; polari?: number | null; nota?: string }
export type TaskData = { taskId: string; nome: string; nota?: string }

export const UNIT_TIPI: { key: UnitTipo; label: string; min: number; max: number }[] = [
  { key: 'frigo', label: 'Frigo', min: 0, max: 4 },
  { key: 'freezer', label: 'Congelatore', min: -25, max: -18 },
  { key: 'banco', label: 'Banco frigo', min: 0, max: 4 },
  { key: 'cella', label: 'Cella', min: 0, max: 4 },
  { key: 'abbattitore', label: 'Abbattitore', min: -40, max: 3 },
  { key: 'altro', label: 'Altro', min: 0, max: 8 },
]
export const tipoLabel = (t: UnitTipo) => UNIT_TIPI.find((x) => x.key === t)?.label || 'Altro'

export const SANIF_CATALOGO: { nome: string; freq: Freq }[] = [
  { nome: 'Piani di lavoro', freq: 'giornaliera' }, { nome: 'Taglieri e coltelli', freq: 'giornaliera' }, { nome: 'Affettatrice', freq: 'giornaliera' },
  { nome: 'Bilance', freq: 'giornaliera' }, { nome: 'Lavelli', freq: 'giornaliera' }, { nome: 'Pavimenti', freq: 'giornaliera' },
  { nome: 'Piano cottura e piastre', freq: 'giornaliera' }, { nome: 'Contenitori e bacinelle GN', freq: 'giornaliera' }, { nome: 'Maniglie e interruttori', freq: 'giornaliera' },
  { nome: 'Bidoni dei rifiuti', freq: 'giornaliera' }, { nome: 'Frigoriferi (interno)', freq: 'settimanale' }, { nome: 'Forni', freq: 'settimanale' },
  { nome: 'Brasiere', freq: 'settimanale' }, { nome: 'Abbattitore', freq: 'settimanale' }, { nome: 'Lavastoviglie', freq: 'settimanale' },
  { nome: 'Cappe e filtri', freq: 'settimanale' }, { nome: 'Pareti piastrellate', freq: 'mensile' }, { nome: 'Celle frigorifere', freq: 'mensile' },
  { nome: 'Scaffalature dispensa', freq: 'mensile' },
]
export const ISTRUZIONI_BASE = [
  'Togli i residui grossolani a secco.',
  'Lava con acqua calda e detergente, strofinando con panno o spazzola dedicati.',
  'Risciacqua con acqua pulita.',
  'Applica il sanificante alla diluizione indicata in etichetta e lascia agire per il tempo previsto.',
  'Risciacqua se richiesto dal prodotto e lascia asciugare all’aria o con carta monouso.',
].join('\n')

export const RIC_CATEGORIE = [
  { key: 'refrigerati', label: 'Refrigerati', max: 4 }, { key: 'surgelati', label: 'Surgelati', max: -18 },
  { key: 'carni', label: 'Carni fresche', max: 4 }, { key: 'pesce', label: 'Prodotti ittici', max: 2 },
  { key: 'latticini', label: 'Latticini', max: 4 }, { key: 'ortofrutta', label: 'Ortofrutta', max: null },
  { key: 'secchi', label: 'Secchi e dispensa', max: null }, { key: 'altro', label: 'Altro', max: null },
] as const
export const catLabel = (k: string) => RIC_CATEGORIE.find((c) => c.key === k)?.label || k
export const catMax = (k: string) => RIC_CATEGORIE.find((c) => c.key === k)?.max ?? null
export const catLocation = (k: string) => (k === 'surgelati' ? 'freezer' : k === 'secchi' ? 'dry' : 'fridge')

export const NC_TIPI = ['Temperatura', 'Imballaggio danneggiato', 'Scadenza superata', 'Etichettatura assente o errata', 'Aspetto, odore o qualità', 'Infestanti', 'Igiene', 'Altro']
export const NC_AZIONI = ['Restituzione al fornitore', 'Confinamento della merce', 'Distruzione', 'Uso immediato dopo verifica', 'Ripristino della temperatura', 'Sanificazione straordinaria', 'Intervento di manutenzione', 'Altro']

export const ABB = {
  refrigerare: { label: 'Refrigerare', sub: 'al cuore +3 °C entro 90 minuti', target: 3, minuti: 90 },
  congelare: { label: 'Congelare', sub: 'al cuore −18 °C entro 240 minuti', target: -18, minuti: 240 },
} as const

export const CONSERVAZIONI = ['0 / +4 °C', '−18 °C', 'Temperatura ambiente', '+60 °C (mantenimento caldo)']

export const OLIO_CASI = {
  1: { label: 'Olio conforme', sub: 'colore e odore normali', tone: 'ok' },
  2: { label: 'Tendenza al degrado', sub: 'scurito, fumo o schiuma', tone: 'warn' },
  3: { label: 'Non conforme', sub: 'da cambiare subito', tone: 'danger' },
} as const

export const TASK_BASE: Omit<Task, 'id' | 'prossima'>[] = [
  { nome: 'Tamponi sulle superfici', ogniGiorni: 90 },
  { nome: 'Disinfestazione e controllo infestanti', ogniGiorni: 30 },
  { nome: 'Taratura dei termometri', ogniGiorni: 180 },
  { nome: 'Manutenzione frighi e celle', ogniGiorni: 180 },
  { nome: 'Analisi dell’acqua', ogniGiorni: 365 },
  { nome: 'Revisione del manuale HACCP', ogniGiorni: 365 },
  { nome: 'Aggiornamento formazione del personale', ogniGiorni: 730 },
]

/* ── date ── */
export const iso = (d = new Date()) => d.toISOString()
export const dayKey = (d: string | Date = new Date()) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}` }
export const addDays = (d: string | Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
export const isToday = (d: string) => dayKey(d) === dayKey()
export const fmtTime = (d: string) => new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
export const fmtDate = (d: string) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: new Date(d).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
export const fmtDateLong = (d: string) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
export function fmtWhen(d: string) {
  const k = dayKey(d)
  if (k === dayKey()) return `oggi ${fmtTime(d)}`
  if (k === dayKey(addDays(new Date(), -1))) return `ieri ${fmtTime(d)}`
  return `${fmtDate(d)} ${fmtTime(d)}`
}
/** giorni da oggi (negativi = passato) */
export const daysTo = (d: string) => Math.round((new Date(dayKey(d)).getTime() - new Date(dayKey()).getTime()) / 864e5)
export const num = (v: number | null | undefined, dec = 1) => (v == null || !isFinite(v) ? '—' : (Math.round(v * 10 ** dec) / 10 ** dec).toString().replace('.', ','))
export const parseNum = (s: string) => { const n = parseFloat(String(s).replace(',', '.').replace('−', '-')); return isFinite(n) ? n : null }
export const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10))
export function lotto(prefix = 'L') {
  const d = new Date()
  return `${prefix}${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`
}

/* ── impostazioni con valori predefiniti ── */
export function defaults(legacyZones?: any[]): Cfg {
  const today = dayKey()
  const units: Unit[] = legacyZones?.length
    ? legacyZones.filter((z) => z.key !== 'cucina').map((z) => ({ id: `u-${z.key}`.slice(0, 40), nome: z.label, tipo: /congel|freez/i.test(z.label) ? 'freezer' : /abbatt/i.test(z.label) ? 'abbattitore' : /banco/i.test(z.label) ? 'banco' : 'frigo', min: Number(z.minT ?? z.min ?? 0), max: Number(z.maxT ?? z.max ?? 4) }))
    : [
      { id: 'u-frigo1', nome: 'Frigo 1', tipo: 'frigo', min: 0, max: 4 },
      { id: 'u-frigo2', nome: 'Frigo 2', tipo: 'frigo', min: 0, max: 4 },
      { id: 'u-freezer1', nome: 'Congelatore', tipo: 'freezer', min: -25, max: -18 },
      { id: 'u-abb', nome: 'Abbattitore', tipo: 'abbattitore', min: -40, max: 3 },
    ]
  return {
    units,
    equipment: SANIF_CATALOGO.slice(0, 8).map((e, i) => ({ id: `e-${i}`, nome: e.nome, freq: e.freq })),
    fryers: [{ id: 'f-1', nome: 'Friggitrice 1' }],
    tasks: TASK_BASE.slice(0, 5).map((t, i) => ({ ...t, id: `t-${i}`, prossima: dayKey(addDays(today, Math.min(t.ogniGiorni, 30))) })),
  }
}

/* ── stati ── */
export const latest = <T,>(recs: Rec<T>[], pred: (r: Rec<T>) => boolean) => recs.find(pred)

/** l'attività va fatta di nuovo? (giornaliera: oggi; settimanale: negli ultimi 7 giorni; mensile: nel mese) */
export function sanifDue(e: Equip, recs: Rec<SanifData>[]) {
  const last = recs.find((r) => r.kind === 'sanif' && r.data.equipId === e.id)
  if (!last) return { done: false, last: undefined as Rec<SanifData> | undefined, posticipato: false }
  const d = new Date(last.at)
  const now = new Date()
  const inPeriod = e.freq === 'giornaliera' ? isToday(last.at)
    : e.freq === 'settimanale' ? now.getTime() - d.getTime() < 7 * 864e5
      : d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  return { done: inPeriod && last.data.stato === 'fatto', posticipato: inPeriod && last.data.stato === 'posticipato', last }
}

export function unitState(u: Unit, recs: Rec<TempData>[]) {
  const mine = recs.filter((r) => r.kind === 'temp' && r.data.unitId === u.id)
  const last = mine[0]
  const today = mine.filter((r) => isToday(r.at))
  const status: 'ok' | 'alarm' | 'todo' = last && !last.data.ok ? 'alarm' : today.length ? 'ok' : 'todo'
  return { last, today, mine, status }
}

export function abbState(d: AbbData, now = Date.now()) {
  const cfg = ABB[d.modo]
  const start = new Date(d.inizio).getTime()
  const end = d.fine ? new Date(d.fine).getTime() : now
  const min = Math.max(0, Math.round((end - start) / 6e4))
  return { cfg, min, over: min > cfg.minuti, left: cfg.minuti - min }
}
