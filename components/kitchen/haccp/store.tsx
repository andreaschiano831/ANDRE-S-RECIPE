'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useHub } from '../hub/ui'
import { defaults, iso, type Cfg, type CfgKey, type Kind, type Rec } from './model'

type Status = 'loading' | 'ready' | 'missing' | 'error'
type Store = {
  status: Status; error: string; recs: Rec[]; cfg: Cfg; me: { id: string; name: string }; kitchenId: string
  add: <T>(kind: Kind, data: T, at?: string) => Promise<Rec<T> | null>
  addMany: (rows: { kind: Kind; data: any; at: string; by_name?: string }[]) => Promise<number>
  update: <T>(id: string, data: Partial<T>) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  range: (from: string, to: string) => Promise<Rec[]>
  cfgUpsert: <K extends CfgKey>(key: K, item: Cfg[K][number]) => void
  cfgRemove: (key: CfgKey, id: string) => void
  reload: () => void
}
const Ctx = createContext<Store | null>(null)
export const useHaccp = () => useContext(Ctx)!

const DAYS = 120
const isMissing = (e: any) => e && (e.code === '42P01' || e.code === 'PGRST205' || /haccp_records/.test(e.message || '') && /not find|does not exist/i.test(e.message || ''))
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16)))
const byAt = (a: Rec, b: Rec) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)

export function HaccpProvider({ children }: { children: React.ReactNode }) {
  const { api, k, bridge, toast } = useHub()
  const sb = useMemo(() => createClient(), [])
  const kitchenId: string = bridge?.kitchenId || k.id || ''
  const me = useMemo(() => {
    const m = (bridge?.members || []).find((x: any) => x.id === bridge?.userId)
    return { id: bridge?.userId || '', name: m?.name || 'Io' }
  }, [bridge])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [recs, setRecs] = useState<Rec[]>([])
  const [tick, setTick] = useState(0)

  // impostazioni nello stato condiviso della cucina; finché non si cambiano valgono quelle predefinite
  const legacyZones = useMemo(() => { try { return JSON.parse(localStorage.getItem(`haccp-zones-${k.id}`) || 'null') } catch { return null } }, [k.id])
  const base = useMemo(() => defaults(legacyZones), [legacyZones])
  const cfg: Cfg = useMemo(() => ({
    units: k.haccp?.units ?? base.units, equipment: k.haccp?.equipment ?? base.equipment,
    fryers: k.haccp?.fryers ?? base.fryers, tasks: k.haccp?.tasks ?? base.tasks,
  }), [k.haccp, base])
  const cfgRef = useRef(cfg); cfgRef.current = cfg
  const cfgUpsert = useCallback((key: CfgKey, item: any) => {
    // la prima modifica salva anche i valori predefiniti, così non si perdono
    if (!k.haccp?.[key]) for (const x of cfgRef.current[key] as any[]) if (x.id !== item.id) api.haccpUpsert(key, x)
    api.haccpUpsert(key, item)
  }, [api, k.haccp])
  const cfgRemove = useCallback((key: CfgKey, id: string) => {
    if (!k.haccp?.[key]) for (const x of cfgRef.current[key] as any[]) if (x.id !== id) api.haccpUpsert(key, x)
    api.haccpRemove(key, id)
  }, [api, k.haccp])

  useEffect(() => {
    if (!kitchenId) return
    let dead = false
    const since = new Date(Date.now() - DAYS * 864e5).toISOString()
    ;(async () => {
      const { data, error } = await sb.from('haccp_records').select('*').eq('kitchen_id', kitchenId)
        .or(`at.gte.${since},kind.eq.nc,kind.eq.task`).order('at', { ascending: false }).limit(6000)
      if (dead) return
      if (error) { setStatus(isMissing(error) ? 'missing' : 'error'); setError(error.message); return }
      setRecs((data || []) as Rec[]); setStatus('ready'); setError('')
    })()
    const ch = sb.channel('haccp-' + kitchenId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'haccp_records', filter: `kitchen_id=eq.${kitchenId}` }, (p: any) => {
        if (p.eventType === 'DELETE') setRecs((xs) => xs.filter((x) => x.id !== p.old?.id))
        else if (p.new?.id) setRecs((xs) => [p.new as Rec, ...xs.filter((x) => x.id !== p.new.id)].sort(byAt))
      })
      .subscribe()
    return () => { dead = true; sb.removeChannel(ch) }
  }, [sb, kitchenId, tick])

  const add = useCallback(async <T,>(kind: Kind, data: T, at?: string) => {
    const r: Rec<T> = { id: newId(), kitchen_id: kitchenId, kind, at: at || iso(), data, by_user: me.id || null, by_name: me.name }
    setRecs((xs) => [r as Rec, ...xs].sort(byAt))
    const { error } = await sb.from('haccp_records').insert({ id: r.id, kitchen_id: r.kitchen_id, kind, at: r.at, data, by_name: me.name })
    if (error) { setRecs((xs) => xs.filter((x) => x.id !== r.id)); toast(`Non salvato: ${error.message}`, 'error'); return null }
    return r
  }, [sb, kitchenId, me, toast])

  const addMany = useCallback(async (rows: { kind: Kind; data: any; at: string; by_name?: string }[]) => {
    const full = rows.map((r) => ({ id: newId(), kitchen_id: kitchenId, kind: r.kind, at: r.at, data: r.data, by_name: r.by_name || me.name }))
    let n = 0
    for (let i = 0; i < full.length; i += 200) {
      const part = full.slice(i, i + 200)
      const { error } = await sb.from('haccp_records').insert(part)
      if (error) { toast(`Importazione interrotta: ${error.message}`, 'error'); break }
      n += part.length
      setRecs((xs) => [...(part as Rec[]), ...xs].sort(byAt))
    }
    return n
  }, [sb, kitchenId, me, toast])

  const update = useCallback(async <T,>(id: string, patch: Partial<T>) => {
    const prev = recs.find((x) => x.id === id)
    if (!prev) return false
    const data = { ...prev.data, ...patch }
    setRecs((xs) => xs.map((x) => (x.id === id ? { ...x, data } : x)))
    const { error } = await sb.from('haccp_records').update({ data, updated_at: iso() }).eq('id', id)
    if (error) { setRecs((xs) => xs.map((x) => (x.id === id ? prev : x))); toast(`Non salvato: ${error.message}`, 'error'); return false }
    return true
  }, [sb, recs, toast])

  const remove = useCallback(async (id: string) => {
    const prev = recs.find((x) => x.id === id)
    setRecs((xs) => xs.filter((x) => x.id !== id))
    const { error } = await sb.from('haccp_records').delete().eq('id', id)
    if (error && prev) { setRecs((xs) => [prev, ...xs].sort(byAt)); toast(`Non eliminato: ${error.message}`, 'error'); return false }
    return true
  }, [sb, recs, toast])

  const range = useCallback(async (from: string, to: string) => {
    const out: Rec[] = []
    for (let page = 0; page < 20; page++) {
      const { data, error } = await sb.from('haccp_records').select('*').eq('kitchen_id', kitchenId).gte('at', from).lte('at', to)
        .order('at', { ascending: true }).range(page * 1000, page * 1000 + 999)
      if (error) throw error
      out.push(...((data || []) as Rec[]))
      if (!data || data.length < 1000) break
    }
    return out
  }, [sb, kitchenId])

  const value: Store = { status, error, recs, cfg, me, kitchenId, add, addMany, update, remove, range, cfgUpsert: cfgUpsert as Store['cfgUpsert'], cfgRemove, reload: () => setTick((t) => t + 1) }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
