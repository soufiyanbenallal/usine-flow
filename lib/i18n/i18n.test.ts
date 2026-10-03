import { describe, expect, it } from 'vitest'
import { dictionary } from './dictionaries'
import { intlLocale, translate } from './index'

describe('i18n', () => {
  it('uses French as the source language', () => {
    expect(translate('fr', 'Articles')).toBe('Articles')
  })
  it('translates known keys and falls back to French otherwise', () => {
    expect(translate('en', 'Articles')).toBe('Items')
    expect(translate('ar', 'Articles')).toBe('المواد')
    expect(translate('en', 'Texte inconnu')).toBe('Texte inconnu')
  })
  it('has both target languages for every entry', () => {
    for (const [fr, e] of Object.entries(dictionary)) {
      expect(e.ar.length, fr).toBeGreaterThan(0)
      expect(e.en.length, fr).toBeGreaterThan(0)
    }
  })
  it('keeps Latin digits for Arabic numbers (Moroccan practice)', () => {
    expect(intlLocale('ar')).toContain('nu-latn')
  })
})
