'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import { LOCALES, dictionary, type Locale } from './dictionaries'

export type { Locale } from './dictionaries'
export { LOCALES } from './dictionaries'

const STORAGE_KEY = 'usineflow.locale'

type I18nValue = {
  locale: Locale
  dir: 'ltr' | 'rtl'
  setLocale: (l: Locale) => void
  /** French source text → current language (falls back to the source). */
  t: (fr: string) => string
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string
  formatMoney: (n: number) => string
  formatDate: (iso: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export const intlLocale = (l: Locale) => (l === 'ar' ? 'ar-MA-u-nu-latn' : l === 'en' ? 'en-GB' : 'fr-MA')
export const translate = (locale: Locale, fr: string) => (locale === 'fr' ? fr : (dictionary[fr]?.[locale] ?? fr))

const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', cb)
  }
}
function readStored(): Locale {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return v === 'ar' || v === 'en' || v === 'fr' ? v : 'fr'
  } catch {
    return 'fr'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore<Locale>(subscribe, readStored, () => 'fr')

  const dir = LOCALES.find((l) => l.value === locale)?.dir ?? 'ltr'
  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dir
  }, [locale, dir])

  const setLocale = useCallback((l: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* private mode: language stays the default */
    }
    listeners.forEach((cb) => cb())
  }, [])

  const value = useMemo<I18nValue>(() => {
    const tag = intlLocale(locale)
    return {
      locale,
      dir,
      setLocale,
      t: (fr) => translate(locale, fr),
      formatNumber: (n, o) => new Intl.NumberFormat(tag, o).format(n),
      formatMoney: (n) => new Intl.NumberFormat(tag, { style: 'currency', currency: 'MAD', maximumFractionDigits: 2 }).format(n),
      formatDate: (iso, o) => (iso ? new Intl.DateTimeFormat(tag, o ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(typeof iso === 'string' ? new Date(iso) : iso) : '—'),
    }
  }, [locale, dir, setLocale])

  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

export const useT = () => useI18n().t
