'use client'
import { createContext, useContext } from 'react'
import type { EtiData, NcData } from './model'

export type Tab = 'oggi' | 'temp' | 'sanif' | 'merci' | 'nc' | 'abb' | 'eti' | 'olio' | 'scad' | 'archivio'
export type Nav = {
  go: (t: Tab) => void
  openNc: (prefill?: Partial<NcData> & { id?: string }) => void
  openEtichetta: (prefill?: Partial<EtiData>) => void
  openTemp: (unitId: string) => void
  intent?: string | null
  clearIntent?: () => void
}
export const NavCtx = createContext<Nav>({ go: () => {}, openNc: () => {}, openEtichetta: () => {}, openTemp: () => {} })
export const useNav = () => useContext(NavCtx)
