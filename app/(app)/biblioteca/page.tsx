import LibraryShelf from '@/components/library/Shelf'
import { getSession } from '@/lib/supabase/server'
import type { LibBook, LibProgress } from '@/lib/library'

export const dynamic = 'force-dynamic'

export default async function BibliotecaPage() {
  const s = (await getSession())!
  const [{ data: books, error }, { data: prog }] = await Promise.all([
    s.supabase.from('library_books').select('*').order('created_at', { ascending: false }),
    s.supabase.from('library_progress').select('book_id, location, percent, settings, updated_at').eq('user_id', s.user.id),
  ])
  // copertine: link temporanei all'archivio privato
  const paths = (books ?? []).map((b: any) => b.cover_path).filter(Boolean) as string[]
  const { data: signed } = paths.length ? await s.supabase.storage.from('library').createSignedUrls(paths, 3600) : { data: [] as any[] }
  const covers: Record<string, string> = {}
  for (const x of signed ?? []) if (x.path && x.signedUrl) covers[x.path] = x.signedUrl
  return (
    <LibraryShelf books={(books ?? []) as LibBook[]} progress={(prog ?? []) as LibProgress[]} covers={covers}
      canEdit={s.canEdit} setupNeeded={!!error && /library_books|relation|schema cache/i.test(error.message)} />
  )
}
