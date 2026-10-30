export type LibBook = {
  id: string; title: string; author: string | null; kind: 'epub' | 'pdf'; file_path: string; cover_path: string | null
  size_bytes: number | null; pages: number | null; created_at: string
}
export type LibProgress = { book_id: string; location: string | null; percent: number; settings: ReaderSettings; updated_at: string }
export type LibMark = {
  id: string; book_id: string; kind: 'bookmark' | 'highlight'; location: string; label: string | null
  text: string | null; note: string | null; color: string | null; created_at: string
}
export type ReaderSettings = { size?: number; font?: 'serif' | 'sans' | 'orig'; theme?: 'carta' | 'seppia' | 'notte'; spacing?: number; fit?: 'width' | 'page' }
export const HL_COLORS: Record<string, string> = { yellow: '#F5D76E', green: '#9FD49B', blue: '#9CC7F0', pink: '#F2A9C4' }
