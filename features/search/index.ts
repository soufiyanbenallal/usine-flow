import type { LucideIcon } from 'lucide-react'

export type SearchKind =
  | 'Navigation'
  | 'Paramètres'
  | 'Articles'
  | 'Partenaires'
  | 'Lots'
  | 'Commandes d’achat'
  | 'Commandes clients'
  | 'Ordres de fabrication'
  | 'Équipements'
  | 'Employés'

export type SearchItem = {
  id: string
  kind: SearchKind
  label: string
  /** Secondary text (subtitle, details…), also searched. */
  hint?: string
  /** Additional search keywords / synonyms. */
  keywords?: string
  /** Status badge */
  status?: string
  statusTone?: 'success' | 'warning' | 'critical' | 'neutral' | 'info'
  /** Metric badge */
  metric?: string
  /** Specific Lucide icon component for this item */
  icon?: LucideIcon
  /** Organization-relative path, e.g. `parametres`. */
  path: string
}

export const KIND_ORDER: SearchKind[] = [
  'Navigation',
  'Paramètres',
  'Articles',
  'Partenaires',
  'Lots',
  'Commandes d’achat',
  'Commandes clients',
  'Ordres de fabrication',
  'Équipements',
  'Employés',
]

export const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

/** 3 = label starts with query, 2 = word starts with query, 1 = label contains query, 0.8 = keywords match, 0.5 = hint or status matches. */
export function score(item: Pick<SearchItem, 'label' | 'hint' | 'status' | 'keywords'>, query: string): number {
  const q = normalize(query)
  if (!q) return 0
  const label = normalize(item.label)
  if (label.startsWith(q)) return 3
  if (label.split(/[\s\-–/’']+/).some((w) => w.startsWith(q))) return 2
  if (label.includes(q)) return 1
  if (item.keywords && normalize(item.keywords).includes(q)) return 0.8
  if (item.hint && normalize(item.hint).includes(q)) return 0.5
  if (item.status && normalize(item.status).includes(q)) return 0.5
  return 0
}

/** Best matches first (ties: kind order, then alphabetical), at most `limit`. Empty query → no results (unless kindFilter is provided). */
export function searchItems(items: SearchItem[], query: string, limit = 35, kindFilter?: SearchKind | null): SearchItem[] {
  const filtered = kindFilter ? items.filter((i) => i.kind === kindFilter) : items
  const q = query.trim()
  if (!q) {
    return kindFilter ? filtered.slice(0, limit) : []
  }
  return filtered
    .map((item) => ({ item, s: score(item, q) }))
    .filter((r) => r.s > 0)
    .sort(
      (a, b) =>
        b.s - a.s ||
        KIND_ORDER.indexOf(a.item.kind) - KIND_ORDER.indexOf(b.item.kind) ||
        a.item.label.localeCompare(b.item.label, 'fr', { numeric: true }),
    )
    .slice(0, limit)
    .map((r) => r.item)
}

/** Groups already-ranked results by kind, keeping the rank order of the groups' first hit. */
export function groupByKind(items: SearchItem[]): { kind: SearchKind; items: SearchItem[] }[] {
  const groups: { kind: SearchKind; items: SearchItem[] }[] = []
  for (const item of items) {
    const g = groups.find((x) => x.kind === item.kind)
    if (g) g.items.push(item)
    else groups.push({ kind: item.kind, items: [item] })
  }
  return groups
}
