import { describe, expect, it } from 'vitest'
import { isInside, mainNav } from './nav'

describe('navigation', () => {
  it('matches root dashboard path', () => {
    expect(isInside('/atlas', 'atlas', '', true)).toBe(true)
    expect(isInside('/atlas/parametres', 'atlas', '', true)).toBe(false)
  })
  it('exposes unique navigation items', () => {
    const paths = mainNav.flatMap((n) => [n.path, ...(n.children ?? []).map((c) => c.path)])
    expect(new Set(paths).size).toBe(paths.length)
  })
})
