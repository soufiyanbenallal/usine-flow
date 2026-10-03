import { describe, expect, it } from 'vitest'
import { groupByKind, score, searchItems, type SearchItem } from './index'

const items: SearchItem[] = [
  { id: '1', kind: 'Navigation', label: 'Tableau de bord', hint: 'Opérations', path: '' },
  { id: '2', kind: 'Paramètres', label: 'Entreprise', hint: 'Raison sociale', path: 'parametres' },
  { id: '3', kind: 'Paramètres', label: 'Utilisateurs', hint: 'Équipe et rôles', path: 'parametres/utilisateurs' },
]

describe('search', () => {
  it('ignores case and accents', () => {
    expect(searchItems(items, 'TABLEAU').map((i) => i.id)).toEqual(['1'])
    expect(searchItems(items, 'entreprise').map((i) => i.id)).toEqual(['2'])
  })
  it('ranks prefix before word-start before substring before hint', () => {
    expect(score(items[0]!, 'tableau')).toBe(3)
    expect(score(items[0]!, 'bord')).toBe(2)
  })
  it('returns nothing for an empty query and honours the limit', () => {
    expect(searchItems(items, '  ')).toEqual([])
    expect(searchItems(items, 'a', 2)).toHaveLength(2)
  })
  it('groups by kind in rank order', () => {
    const g = groupByKind(searchItems(items, 'utilisateurs'))
    expect(g.map((x) => x.kind)).toEqual(['Paramètres'])
  })
})
