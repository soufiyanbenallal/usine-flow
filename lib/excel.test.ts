import { describe, expect, it } from 'vitest'
import { toStringTable } from './excel'

describe('excel helpers', () => {
  it('stringifies cells and drops empty rows', () => {
    expect(toStringTable([['Réf', 'Qté'], ['A-1', 12.5], [null, ''], ['B-2', new Date('2026-10-03T00:00:00Z')], [true, false]])).toEqual([
      ['Réf', 'Qté'], ['A-1', '12.5'], ['B-2', '2026-10-03'], ['true', 'false'],
    ])
  })
})
