export const KITCHEN_SECTIONS = [
  { id: 'dashboard', label: 'Panoramica', hint: 'Servizio, scadenze, strumenti AI' },
  { id: 'piatti', label: 'Piatti', hint: 'Carta, food cost, copertura' },
  { id: 'linea', label: 'Linea', hint: 'Giacenze di linea, anche da foto' },
  { id: 'preparazioni', label: 'Preparazioni', hint: 'Cosa preparare per il servizio' },
  { id: 'giacenze', label: 'Magazzino', hint: 'Frigo, freezer, dispensa, lotti' },
  { id: 'foodcost', label: 'Food cost', hint: 'Piatti, ricette, listino, sprechi' },
  { id: 'servizio', label: 'Servizio', hint: 'Live e calendario' },
  { id: 'spesa', label: 'Spesa', hint: 'Lista, fornitori, fatture' },
  { id: 'economato', label: 'Economato', hint: 'Ordini e ricevimento merce' },
  { id: 'haccp', label: 'HACCP', hint: 'Temperature, checklist, lotti' },
  { id: 'spttp', label: 'Fine turno', hint: 'Chiusura e consegne' },
  { id: 'brigata', label: 'Brigata', hint: 'Persone e ruoli' },
  { id: 'settings', label: 'Impostazioni cucina', hint: 'Livelli PAR, AI' },
] as const

export type KitchenSectionId = (typeof KITCHEN_SECTIONS)[number]['id']
