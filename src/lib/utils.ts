import { type ClassValue, clsx } from 'clsx'
import { useSyncExternalStore } from 'react'
import { twMerge } from 'tailwind-merge'
import { getSnapshot, subscribe } from './db'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const useShop = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

const reducedQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
export const useReducedMotion = () =>
  useSyncExternalStore(
    (fn) => {
      reducedQuery?.addEventListener('change', fn)
      return () => reducedQuery?.removeEventListener('change', fn)
    },
    () => reducedQuery?.matches ?? false,
    () => false,
  )

export const formatDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
