'use client'
import { useEffect } from 'react'
import { useHub } from './ui'
import { lineaItems } from './model'
import { underMin } from './ops'

/** manda alla barra laterale i contatori che contano: cosa scade, cosa preparare, cosa comprare */
export default function BadgeEmitter() {
  const { k, stock } = useHub()
  const now = Date.now()
  const giacenze = stock.filter((s) => s.location !== 'counter' && s.expiresAt && new Date(s.expiresAt).getTime() - now < 48 * 36e5).length
  const preparazioni = (k.preparazioni || []).filter((p: any) => p.status === 'da_fare' || p.status === 'in_corso').length
  const spesa = (k.shopping || []).filter((x: any) => !x.checked).length
  const linea = underMin(lineaItems(k)).length
  const key = `${giacenze}|${preparazioni}|${spesa}|${linea}`
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('kp-badges', { detail: { giacenze, preparazioni, spesa, linea } }))
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { window.dispatchEvent(new CustomEvent('kp-badges', { detail: {} })) }, [])
  return null
}
