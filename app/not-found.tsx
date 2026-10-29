import Link from 'next/link'
export default function NotFound() {
  return (
    <main style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <p className="h1">Ricetta non trovata</p>
      <Link href="/ricette" className="btn">Torna al ricettario</Link>
    </main>
  )
}
