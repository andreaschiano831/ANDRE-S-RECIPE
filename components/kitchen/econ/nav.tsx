'use client'
import { createContext, useContext } from 'react'
export type ETab = 'panoramica' | 'acquisti' | 'vendite' | 'foodcost' | 'magazzino' | 'conto'
export const EnavCtx = createContext<{ go: (t: ETab) => void }>({ go: () => {} })
export const useEnav = () => useContext(EnavCtx)
