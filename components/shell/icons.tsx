import {
  BookOpen, ClipboardList, Euro, Flame, Home, LayoutDashboard, Library, Moon, Package, Printer,
  Settings, Settings2, Wrench, LibraryBig, UtensilsCrossed, Rows3, ShieldCheck, ShoppingCart, Sparkles, Store, Users,
} from 'lucide-react'

export const SECTION_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  dashboard: LayoutDashboard, piatti: UtensilsCrossed, linea: Rows3, giacenze: Package, preparazioni: ClipboardList, servizio: Flame, spesa: ShoppingCart,
  economato: Store, haccp: ShieldCheck, spttp: Moon, foodcost: Euro, brigata: Users, settings: Settings2,
}
export const APP_ICON = { home: Home, ricette: BookOpen, importa: Sparkles, ricettari: Library, documenti: Printer, impostazioni: Settings, strumenti: Wrench, biblioteca: LibraryBig }

/** un colore per area, lo stesso usato dentro le sezioni */
export const SECTION_COLOR: Record<string, string> = {
  dashboard: '#5B6474', servizio: '#B23A48', linea: '#C46B2A', preparazioni: '#7E5BB0', piatti: '#B0507A',
  giacenze: '#3B6EA8', spesa: '#2E8A8A', economato: '#A47A2C', foodcost: '#3F8A63',
  haccp: '#2F7F6F', spttp: '#4A5A8C', brigata: '#9A5B3C', settings: '#5B6474',
}
export const APP_COLOR: Record<string, string> = {
  home: '#5B6474', ricette: '#9B2C3F', importa: '#7E5BB0', ricettari: '#A47A2C', biblioteca: '#2E8A8A', documenti: '#4A5A8C', strumenti: '#C46B2A', cucine: '#5B6474',
}
/** gruppi della cucina nella barra laterale */
export const KITCHEN_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Servizio', ids: ['dashboard', 'servizio', 'linea', 'preparazioni', 'piatti'] },
  { label: 'Merce e conti', ids: ['giacenze', 'spesa', 'economato', 'foodcost'] },
  { label: 'Qualità e brigata', ids: ['haccp', 'spttp', 'brigata', 'settings'] },
]
