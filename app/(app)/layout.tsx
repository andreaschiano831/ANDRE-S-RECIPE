import { redirect } from 'next/navigation'
import Shell from '@/components/shell/Shell'
import { getSession } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession()
  if (!s) redirect('/login')
  const [{ data: app }, { data: km }] = await Promise.all([
    s.supabase.from('app_settings').select('name, tagline').eq('id', 1).maybeSingle(),
    s.supabase.from('kitchen_members').select('kitchen_id').eq('user_id', s.user.id),
  ])
  const ids = (km ?? []).map((k) => k.kitchen_id)
  const { data: kitchens } = ids.length
    ? await s.supabase.from('kitchens').select('id, name').in('id', ids).order('created_at')
    : { data: [] as { id: string; name: string }[] }
  return (
    <Shell
      appName={app?.name ?? 'Ricettario'}
      tagline={app?.tagline ?? ''}
      user={{ name: s.name, role: s.role, canEdit: s.canEdit, isAdmin: s.isAdmin }}
      kitchens={kitchens ?? []}
    >
      {children}
    </Shell>
  )
}
