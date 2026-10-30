// mostrato subito mentre il server prepara la pagina
export default function Loading() {
  return (
    <div className="wrap page" aria-busy="true" aria-label="Caricamento">
      <div className="sk" style={{ width: '42%', height: 44, marginBottom: 14 }} />
      <div className="sk" style={{ width: '28%', height: 16, marginBottom: 28 }} />
      <div className="sk-grid">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="sk" style={{ height: 130 }} />)}
      </div>
    </div>
  )
}
