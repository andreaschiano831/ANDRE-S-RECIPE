export const KITCHEN_SECTIONS = [
  { id: 'dashboard', label: 'Panoramica', hint: 'Scadenze, sotto scorta, briefing' },
  { id: 'giacenze', label: 'Giacenze', hint: 'Frigo, freezer, dispensa, lotti' },
  { id: 'preparazioni', label: 'Preparazioni e MEP', hint: 'Per partita e turno' },
  { id: 'servizio', label: 'Servizio', hint: 'Live, piatti, calendario' },
  { id: 'spesa', label: 'Spesa', hint: 'Lista, fornitori, fatture' },
  { id: 'economato', label: 'Economato', hint: 'Ordini e ricevimento merce' },
  { id: 'haccp', label: 'HACCP', hint: 'Temperature, checklist, lotti' },
  { id: 'spttp', label: 'Fine turno', hint: 'Chiusura e consegne' },
  { id: 'foodcost', label: 'Food cost', hint: 'Costi ricette e sprechi' },
  { id: 'brigata', label: 'Brigata', hint: 'Persone e ruoli' },
  { id: 'settings', label: 'Impostazioni cucina', hint: 'Livelli PAR, AI' },
] as const

export type KitchenSectionId = (typeof KITCHEN_SECTIONS)[number]['id']
