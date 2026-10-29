'use client'
import { useCallback, useState } from 'react'

export function useToast() {
  const [t, setT] = useState<{ msg: string; kind: 'ok' | 'err' | '' } | null>(null)
  const show = useCallback((msg: string, kind: 'ok' | 'err' | '' = '') => {
    setT({ msg, kind })
    window.setTimeout(() => setT(null), kind === 'err' ? 5000 : 2600)
  }, [])
  const node = t ? <div className={`toast ${t.kind}`} role="status">{t.msg}</div> : null
  return { show, node }
}
