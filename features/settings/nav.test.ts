import { describe, expect, it } from 'vitest'
import { filterSettingsNav, isSettingsItemActive, settingsItems } from './nav'

describe('settings nav', () => {
  it('has unique paths', () => {
    expect(new Set(settingsItems.map((i) => i.path)).size).toBe(settingsItems.length)
  })
  it('filters without diacritics', () => {
    const r = filterSettingsNav('securite').flatMap((g) => g.items.map((i) => i.label))
    expect(r).toEqual(['Sécurité'])
    expect(filterSettingsNav('').length).toBeGreaterThan(1)
    expect(filterSettingsNav('zzz')).toEqual([])
  })
  it('root item is not active on children', () => {
    expect(isSettingsItemActive('/a/parametres', 'a', 'parametres')).toBe(true)
    expect(isSettingsItemActive('/a/parametres/taxes', 'a', 'parametres')).toBe(false)
    expect(isSettingsItemActive('/a/parametres/taxes', 'a', 'parametres/taxes')).toBe(true)
  })
})
