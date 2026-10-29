'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const KitchenPro = dynamic(() => import('./KitchenPro'), {
  ssr: false,
  loading: () => <p className="empty">Apertura della cucina…</p>,
})

export type KPRecipe = { id: string; name: string; section: string; ingredients: { name: string; quantity: number | null; unit: string }[] }
export type KPMember = { id: string; name: string; role: string }

type Props = {
  kitchen: { id: string; name: string; code: string }
  userId: string
  members: KPMember[]
  initialData: Record<string, unknown> | null
  initialVersion: number
  recipes: KPRecipe[]
  canManage: boolean
  section: string
}

type LegacyKitchen = { id: string; name: string; [k: string]: unknown }

/** Legge un export di Kitchen Pro: { storage: { "kitchen-pro-v4": "...", "fc-r-<id>": "...", ... } } */
function parseExport(text: string): { kitchens: LegacyKitchen[]; storage: Record<string, string> } {
  const j = JSON.parse(text)
  const storage: Record<string, string> = j.storage ?? (j.kitchens ? { 'kitchen-pro-v4': JSON.stringify(j) } : j)
  const main = JSON.parse(storage['kitchen-pro-v4'] ?? '{}')
  return { kitchens: Array.isArray(main.kitchens) ? main.kitchens : [], storage }
}

export default function KitchenApp(p: Props) {
  const sb = useMemo(() => createClient(), [])
  const [data, setData] = useState(p.initialData)
  const [version, setVersion] = useState(p.initialVersion)
  const [legacy, setLegacy] = useState<{ kitchens: LegacyKitchen[]; storage: Record<string, string> } | null>(null)
  // dati della vecchia Kitchen Pro sullo stesso dispositivo/dominio (letti solo nel browser)
  useEffect(() => {
    if (p.initialVersion > 0) return
    try {
      if (!localStorage.getItem('kitchen-pro-v4')) return
      const st: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i)!; st[k] = localStorage.getItem(k)! }
      const parsed = parseExport(JSON.stringify({ storage: st }))
      if (parsed.kitchens.length) setLegacy(parsed)
    } catch {}
  }, [p.initialVersion])
  const [started, setStarted] = useState(p.initialVersion > 0)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const bridge = useMemo(() => ({
    kitchenId: p.kitchen.id,
    kitchenName: p.kitchen.name,
    code: p.kitchen.code,
    userId: p.userId,
    members: p.members,
    initialData: data,
    initialVersion: version,
    recipes: p.recipes,
    section: p.section,
    // la sezione aperta dentro Kitchen Pro si riflette nell'indirizzo (e nella barra laterale dell'app)
    onSection: (sec: string) => {
      const u = new URL(window.location.href)
      if (u.searchParams.get('s') !== sec) { u.searchParams.set('s', sec); window.history.replaceState(window.history.state, '', u) }
    },
    urls: {
      home: '/cucine',
      settings: `/cucine/${p.kitchen.id}`,
      recipes: '/ricette',
      recipe: (id: string) => `/ricette/${id}`,
    },
    sync: {
      async save(newData: unknown, expected: number) {
        const { data: res, error } = await sb.rpc('save_kitchen_state', { kid: p.kitchen.id, new_data: newData, expected_version: expected })
        if (error) throw error
        return res as { ok: boolean; version: number; data?: unknown }
      },
      async version() {
        const { data: r, error } = await sb.from('kitchen_state').select('version').eq('kitchen_id', p.kitchen.id).single()
        if (error) throw error
        return Number(r.version)
      },
      async load() {
        const { data: r, error } = await sb.from('kitchen_state').select('data, version').eq('kitchen_id', p.kitchen.id).single()
        if (error) throw error
        return { data: r.data, version: Number(r.version) }
      },
      subscribe(cb: () => void) {
        const ch = sb.channel('kitchen-' + p.kitchen.id)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kitchen_state', filter: `kitchen_id=eq.${p.kitchen.id}` }, () => cb())
          .subscribe()
        return () => { sb.removeChannel(ch) }
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [started])

  async function importKitchen(src: LegacyKitchen, storage: Record<string, string>) {
    setBusy(true); setErr('')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: oldId, members, code, ...rest } = src
    const { data: res, error } = await sb.rpc('save_kitchen_state', { kid: p.kitchen.id, new_data: rest, expected_version: version })
    if (error || !res?.ok) { setBusy(false); setErr(error?.message ?? 'Qualcuno ha già iniziato a usare questa cucina: ricarica la pagina.'); return }
    // i moduli ancora locali (HACCP, food cost, semilavorati, storico fatture…) vengono copiati su questo dispositivo
    for (const [k, v] of Object.entries(storage)) {
      if (k.includes(String(oldId))) { try { localStorage.setItem(k.split(String(oldId)).join(p.kitchen.id), v) } catch {} }
      else if (['fatture-storico'].includes(k)) { try { localStorage.setItem(k, v) } catch {} }
    }
    setData(rest); setVersion(res.version); setStarted(true); setBusy(false)
  }

  async function onFile(f: File) {
    try { const parsed = parseExport(await f.text()); if (!parsed.kitchens.length) throw new Error(); setLegacy(parsed) }
    catch { setErr('File non riconosciuto: usa l’export creato con esporta-dati.html') }
  }

  if (!started) {
    return (
      <main className="narrow page" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Link href={`/cucine/${p.kitchen.id}`} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}>‹ {p.kitchen.name}</Link>
        <h1 className="h1">Primo avvio della cucina</h1>
        <p className="muted" style={{ fontSize: '.88rem' }}>Questa cucina è vuota. Puoi partire da zero o portare qui i dati della vecchia app Kitchen Pro.</p>

        {legacy && (
          <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label">Dati Kitchen Pro trovati</span>
            {legacy.kitchens.map((k) => (
              <button key={k.id} className="opt" disabled={busy || !p.canManage} onClick={() => importKitchen(k, legacy.storage)} style={{ textAlign: 'left' }}>
                <span><b>{k.name}</b><small>
                  {['freezer', 'fridge', 'dry', 'counter'].reduce((n, x) => n + ((k[x] as unknown[])?.length ?? 0), 0)} giacenze ·{' '}
                  {(k.preparazioni as unknown[])?.length ?? 0} preparazioni · {(k.piatti as unknown[])?.length ?? 0} piatti — tocca per importare
                </small></span>
              </button>
            ))}
          </section>
        )}

        {p.canManage && (
          <section className="panel panel-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label">Importa da file</span>
            <p className="muted" style={{ fontSize: '.78rem' }}>Apri <code>esporta-dati.html</code> sul sito della vecchia app dallo stesso telefono: scarica un file che puoi caricare qui.</p>
            <input type="file" accept="application/json,.json" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </section>
        )}
        {err && <p className="err">{err}</p>}
        <button className="btn btn-gold" disabled={busy} onClick={() => setStarted(true)}>Parti da zero</button>
      </main>
    )
  }

  return <KitchenHost bridge={bridge} section={p.section} />
}

function KitchenHost({ bridge, section }: { bridge: unknown; section: string }) {
  // un clic sulla barra laterale dell'app cambia sezione senza ricaricare la cucina
  useEffect(() => { window.dispatchEvent(new CustomEvent('kp-nav', { detail: section })) }, [section])
  return <div className="kp-host"><KitchenPro bridge={bridge} /></div>
}
