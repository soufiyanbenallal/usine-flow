import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'
import type { SearchItem, SearchKind } from './index'

export type TableSearchConfig = {
  kind: SearchKind
  table: string
  select: string
  searchCols: string[]
  orderCol?: string
  map: (row: any) => SearchItem
}

/** Registry of searchable data tables in UsineFlow (extensible for Factory/Workshop/Warehouse modules) */
export const DATA_TABLE_CONFIGS: Partial<Record<SearchKind, TableSearchConfig>> = {}

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
      items: pageRows.map(config.map),
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
