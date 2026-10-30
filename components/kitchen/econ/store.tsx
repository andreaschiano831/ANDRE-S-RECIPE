'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useHub } from '../hub/ui'
import type { EKind, ERec } from './model'

type Status = 'loading' | 'ready' | 'missing' | 'error'
type Store = {
  status: Status; error: string; recs: ERec[]; me: { id: string; name: string }
  add: <T>(kind: EKind, data: T, at: string) => Promise<ERec<T> | null>
  update: <T>(id: string, data: Partial<T>, at?: string) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  reload: () => void
}
const Ctx = createContext<Store | null>(null)
export const useEcon = () => useContext(Ctx)!

const isMissing = (e: any) => e && (e.code === '42P01' || e.code === 'PGRST205' || (/econ_records/.test(e.message || '') && /not find|does not exist/i.test(e.message || '')))
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16)))
const byAt = (a: ERec, b: ERec) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)

export function EconProvider({ children }: { children: React.ReactNode }) {
  const { k, bridge, toast } = useHub()
  const sb = useMemo(() => createClient(), [])
  const kitchenId: string = bridge?.kitchenId || k.id || ''
  const me = useMemo(() => {
    const m = (bridge?.members || []).find((x: any) => x.id === bridge?.userId)
    return { id: bridge?.userId || '', name: m?.name || 'Io' }
  }, [bridge])
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [recs, setRecs] = useState<ERec[]>([])
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!kitchenId) return
    let dead = false
    ;(async () => {
      // due anni di storico bastano per conto economico e confronti
      const since = new Date(new Date().getFullYear() - 1, 0, 1).toISOString()
      const out: ERec[] = []
      for (let page = 0; page < 10; page++) {
        const { data, error } = await sb.from('econ_records').select('*').eq('kitchen_id', kitchenId)
          .or(`at.gte.${since},kind.eq.costo`).order('at', { ascending: false }).range(page * 1000, page * 1000 + 999)
        if (dead) return
        if (error) { setStatus(isMissing(error) ? 'missing' : 'error'); setError(error.message); return }
        out.push(...((data || []) as ERec[]))
        if (!data || data.length < 1000) break
      }
      setRecs(out); setStatus('ready'); setError('')
    })()
    const ch = sb.channel('econ-' + kitchenId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'econ_records', filter: `kitchen_id=eq.${kitchenId}` }, (p: any) => {
        if (p.eventType === 'DELETE') setRecs((xs) => xs.filter((x) => x.id !== p.old?.id))
        else if (p.new?.id) setRecs((xs) => [p.new as ERec, ...xs.filter((x) => x.id !== p.new.id)].sort(byAt))
      })
      .subscribe()
    return () => { dead = true; sb.removeChannel(ch) }
  }, [sb, kitchenId, tick])

  const add = useCallback(async <T,>(kind: EKind, data: T, at: string) => {
    const r: ERec<T> = { id: newId(), kitchen_id: kitchenId, kind, at, data, by_user: me.id || null, by_name: me.name }
    setRecs((xs) => [r as ERec, ...xs].sort(byAt))
    const { error } = await sb.from('econ_records').insert({ id: r.id, kitchen_id: kitchenId, kind, at, data, by_name: me.name })
    if (error) { setRecs((xs) => xs.filter((x) => x.id !== r.id)); toast(`Non salvato: ${error.message}`, 'error'); return null }
    return r
  }, [sb, kitchenId, me, toast])

  const update = useCallback(async <T,>(id: string, patch: Partial<T>, at?: string) => {
    const prev = recs.find((x) => x.id === id)
    if (!prev) return false
    const data = { ...prev.data, ...patch }
    const next = { ...prev, data, at: at || prev.at }
    setRecs((xs) => xs.map((x) => (x.id === id ? next : x)).sort(byAt))
    const { error } = await sb.from('econ_records').update({ data, at: next.at, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setRecs((xs) => xs.map((x) => (x.id === id ? prev : x))); toast(`Non salvato: ${error.message}`, 'error'); return false }
    return true
  }, [sb, recs, toast])

  const remove = useCallback(async (id: string) => {
    const prev = recs.find((x) => x.id === id)
    setRecs((xs) => xs.filter((x) => x.id !== id))
    const { error } = await sb.from('econ_records').delete().eq('id', id)
    if (error && prev) { setRecs((xs) => [prev, ...xs].sort(byAt)); toast(`Non eliminato: ${error.message}`, 'error'); return false }
    return true
  }, [sb, recs, toast])

  return <Ctx.Provider value={{ status, error, recs, me, add, update, remove, reload: () => setTick((t) => t + 1) }}>{children}</Ctx.Provider>
}
