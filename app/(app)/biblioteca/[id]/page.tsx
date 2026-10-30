import { notFound } from 'next/navigation'
import Reader from '@/components/library/Reader'
import { getSession } from '@/lib/supabase/server'
import type { LibBook, LibMark, LibProgress } from '@/lib/library'

export const dynamic = 'force-dynamic'

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = (await getSession())!
  const [{ data: book }, { data: prog }, { data: marks }] = await Promise.all([
    s.supabase.from('library_books').select('*').eq('id', id).maybeSingle(),
    s.supabase.from('library_progress').select('book_id, location, percent, settings, updated_at').eq('book_id', id).eq('user_id', s.user.id).maybeSingle(),
    s.supabase.from('library_marks').select('*').eq('book_id', id).eq('user_id', s.user.id).order('created_at'),
  ])
  if (!book) notFound()
  const { data: signed } = await s.supabase.storage.from('library').createSignedUrl(book.file_path, 60 * 60 * 6)
  if (!signed?.signedUrl) notFound()
  return <Reader book={book as LibBook} url={signed.signedUrl} progress={(prog as LibProgress) ?? null} marks={(marks ?? []) as LibMark[]} canImport={s.canEdit} />
}
