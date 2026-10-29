import {
  BookOpen, ClipboardList, Euro, Flame, Home, LayoutDashboard, Library, Moon, Package, Printer,
  Settings, Settings2, Wrench, ShieldCheck, ShoppingCart, Sparkles, Store, Users,
} from 'lucide-react'

export const SECTION_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  dashboard: LayoutDashboard, giacenze: Package, preparazioni: ClipboardList, servizio: Flame, spesa: ShoppingCart,
  economato: Store, haccp: ShieldCheck, spttp: Moon, foodcost: Euro, brigata: Users, settings: Settings2,
}
export const APP_ICON = { home: Home, ricette: BookOpen, importa: Sparkles, ricettari: Library, documenti: Printer, impostazioni: Settings, strumenti: Wrench }
