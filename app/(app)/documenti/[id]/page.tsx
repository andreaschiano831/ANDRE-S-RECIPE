import { notFound } from 'next/navigation'
import DocumentEditor from '@/components/DocumentEditor'
import { getAppSettings, getSession } from '@/lib/supabase/server'
import { loadCatalog } from '@/lib/catalog'
import { RECIPE_SELECT, sortParts, type Recipe } from '@/lib/recipes'

export const dynamic = 'force-dynamic'

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = (await getSession())!
  const { data: doc } = await s.supabase.from('print_documents')
    .select(`id, name, one_per_page, print_document_items(id, position, dose, recipes(${RECIPE_SELECT}))`)
    .eq('id', id).maybeSingle()
  if (!doc) notFound()
  const [app, { sections }] = await Promise.all([getAppSettings(), loadCatalog(s.supabase)])
  const sectionNames = Object.fromEntries(sections.map((x) => [x.id, x.name]))
  const items = ((doc as any).print_document_items ?? [])
    .filter((i: any) => i.recipes)
    .sort((a: any, b: any) => a.position - b.position)
    .map((i: any) => ({ id: i.id as string, dose: Number(i.dose), recipe: sortParts(i.recipes as Recipe) }))
  return (
    <>
      <main className="narrow page">
        <DocumentEditor doc={{ id: doc.id, name: doc.name, one_per_page: doc.one_per_page }} initialItems={items} appName={app?.name ?? 'Ricettario'} sectionNames={sectionNames} />
      </main>
    </>
  )
}
