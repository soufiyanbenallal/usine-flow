import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'
import type { SearchItem, SearchKind } from './index'

export type TableSearchConfig = {
  kind: SearchKind
  table: string
  select: string
  searchCols: string[]
  orderCol?: string
  map: (row: Record<string, unknown>) => SearchItem
}

/** Registry of searchable data tables in UsineFlow (extensible for Factory/Workshop/Warehouse modules) */
const str = (v: unknown) => (v == null ? '' : String(v))
const entity = (kind: SearchKind, table: string, select: string, searchCols: string[], path: (row: Record<string, unknown>) => string, label: (row: Record<string, unknown>) => string, hint: (row: Record<string, unknown>) => string, orderCol = 'created_at'): TableSearchConfig => ({
  kind, table, select, searchCols, orderCol,
  map: (row) => ({ id: `${table}:${str(row.id)}`, kind, label: label(row), hint: hint(row), path: path(row) }),
})

export const DATA_TABLE_CONFIGS: Partial<Record<SearchKind, TableSearchConfig>> = {
  Articles: entity('Articles', 'items', 'id, sku, name, internal_ref', ['sku', 'name', 'internal_ref'], (r) => `catalogue/articles/${str(r.id)}`, (r) => str(r.name), (r) => str(r.sku), 'sku'),
  Partenaires: entity('Partenaires', 'partners', 'id, code, name, kinds', ['code', 'name'], () => 'catalogue/partenaires', (r) => str(r.name), (r) => str(r.code), 'name'),
  Lots: entity('Lots', 'lots', 'id, lot_number, status', ['lot_number'], () => 'inventaire/lots', (r) => str(r.lot_number), (r) => str(r.status)),
  'Commandes d’achat': entity('Commandes d’achat', 'purchase_orders', 'id, number, status', ['number'], (r) => `achats/commandes/${str(r.id)}`, (r) => str(r.number), (r) => str(r.status)),
  'Commandes clients': entity('Commandes clients', 'sales_orders', 'id, number, status', ['number'], (r) => `ventes/commandes/${str(r.id)}`, (r) => str(r.number), (r) => str(r.status)),
  'Ordres de fabrication': entity('Ordres de fabrication', 'production_orders', 'id, number, status', ['number'], (r) => `production/ordres/${str(r.id)}`, (r) => str(r.number), (r) => str(r.status)),
  Équipements: entity('Équipements', 'assets', 'id, code, name', ['code', 'name'], (r) => `maintenance/equipements/${str(r.id)}`, (r) => str(r.name), (r) => str(r.code), 'code'),
  Employés: entity('Employés', 'employees', 'id, code, full_name', ['code', 'full_name'], (r) => `equipe/employes/${str(r.id)}`, (r) => str(r.full_name), (r) => str(r.code), 'code'),
}

export type SearchQueryResult = {
  items: SearchItem[]
  hasMore: boolean
}

const sanitizeIlike = (q: string) =>
  q.trim().replace(/[%_\\]/g, '').slice(0, 50)

export async function searchSingleTable(
  config: TableSearchConfig,
  organizationId: string,
  query: string,
  limit = 20,
  offset = 0,
): Promise<SearchQueryResult> {
  if (!isSupabaseConfigured) return { items: [], hasMore: false }

  try {
    const supabase = requireSupabase()
    let qb = supabase
      .from(config.table)
      .select(config.select)
      .eq('organization_id', organizationId)

    const clean = sanitizeIlike(query)
    if (clean) {
      const orClause = config.searchCols.map((col) => `${col}.ilike.%${clean}%`).join(',')
      qb = qb.or(orClause)
    }

    qb = qb
      .order(config.orderCol ?? 'created_at', { ascending: false })
      .range(offset, offset + limit)

    const { data, error } = await qb
    if (error) {
      console.warn(`[searchApi] Error querying ${config.table}:`, error)
      return { items: [], hasMore: false }
    }

    const rows = data ?? []
    const hasMore = rows.length > limit
    const pageRows = hasMore ? rows.slice(0, limit) : rows
    return {
      items: (pageRows as unknown as Record<string, unknown>[]).map(config.map),
      hasMore,
    }
  } catch (err) {
    console.warn(`[searchApi] Failed querying ${config.table}:`, err)
    return { items: [], hasMore: false }
  }
}

export async function searchAllTables(
  organizationId: string,
  query: string,
  limitPerTable = 5,
  offset = 0,
): Promise<SearchQueryResult> {
  if (!isSupabaseConfigured) return { items: [], hasMore: false }
  const clean = sanitizeIlike(query)
  if (!clean) return { items: [], hasMore: false }

  const configs = Object.values(DATA_TABLE_CONFIGS).filter(Boolean) as TableSearchConfig[]
  if (configs.length === 0) return { items: [], hasMore: false }

  try {
    const results = await Promise.all(
      configs.map((config) =>
        searchSingleTable(config, organizationId, clean, limitPerTable, offset),
      ),
    )

    const allItems = results.flatMap((r) => r.items)
    const hasMore = results.some((r) => r.hasMore)

    return {
      items: allItems,
      hasMore,
    }
  } catch (err) {
    console.warn('[searchApi] Unified search error:', err)
    return { items: [], hasMore: false }
  }
}
