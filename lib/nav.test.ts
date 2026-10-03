import { describe, expect, it } from 'vitest'
import { groupNav, isInside, mainNav, visibleNav } from './nav'
import { MODULES, type ModuleKey } from './modules'

describe('navigation', () => {
  it('matches root dashboard path', () => {
    expect(isInside('/atlas', 'atlas', '', true)).toBe(true)
    expect(isInside('/atlas/parametres', 'atlas', '', true)).toBe(false)
  })
  it('exposes unique navigation items', () => {
    const paths = mainNav.flatMap((n) => [n.path, ...(n.children ?? []).map((c) => c.path)])
    expect(new Set(paths).size).toBe(paths.length)
  })
  it('nests children under their parent path', () => {
    for (const item of mainNav) for (const c of item.children ?? []) expect(c.path.startsWith(item.path + '/')).toBe(true)
  })
  it('only references known modules', () => {
    const keys = new Set<string>(MODULES.map((m) => m.key))
    for (const item of mainNav) if (item.module) expect(keys.has(item.module)).toBe(true)
  })
  it('hides items of disabled modules', () => {
    const enabled = new Set<ModuleKey>(['inventory'])
    const titles = visibleNav(enabled).map((n) => n.title)
    expect(titles).toContain('Inventaire')
    expect(titles).not.toContain('Production')
    expect(titles).toContain('Tableau de bord')
    expect(visibleNav(null)).toHaveLength(mainNav.length)
  })
  it('groups by section in declaration order', () => {
    expect(groupNav(mainNav).map((g) => g.group)[0]).toBe('Aperçu')
  })
})
