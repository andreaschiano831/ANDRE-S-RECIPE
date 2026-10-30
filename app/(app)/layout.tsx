import { redirect } from 'next/navigation'
import Shell from '@/components/shell/Shell'
import { getAppSettings, getMyKitchens, getSession } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession()
  if (!s) redirect('/login')
  const [app, kitchens] = await Promise.all([getAppSettings(), getMyKitchens()])
  return (
    <Shell
      appName={app?.name ?? 'Ricettario'}
      tagline={app?.tagline ?? ''}
      user={{ name: s.name, role: s.role, canEdit: s.canEdit, isAdmin: s.isAdmin }}
      kitchens={kitchens}
    >
      {children}
    </Shell>
  )
}
