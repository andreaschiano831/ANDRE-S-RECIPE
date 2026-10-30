'use client'
import { createContext, useContext } from 'react'
export type ETab = 'panoramica' | 'acquisti' | 'vendite' | 'foodcost' | 'magazzino' | 'conto'
export type Enav = { go: (t: ETab, intent?: string) => void; intent?: string | null; clearIntent?: () => void; files?: File[] | null; clearFiles?: () => void }
export const EnavCtx = createContext<Enav>({ go: () => {} })
export const useEnav = () => useContext(EnavCtx)
