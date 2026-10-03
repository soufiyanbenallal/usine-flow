'use client'

import { useQuery } from '@tanstack/react-query'
import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { useOrganization } from '../organization/context'
import { featureKey } from './crud-hooks'

export type ViewQuery = {
  /** Equality filters. */
  eq?: Record<string, string | number | boolean | null | undefined>
  order?: { column: string; ascending?: boolean }
  limit?: number
  gte?: Record<string, string | number>
  lte?: Record<string, string | number>
}

/** Read-only query over an analytics view (SQL aggregations computed in Postgres, RLS applies through `security_invoker`). */
export function useView<Row>(feature: string, view: string, query: ViewQuery = {}, enabled = true) {
  const org = useOrganization()
  return useQuery<Row[], Error>({
    queryKey: [...featureKey(org.id, feature), 'view', view, query],
    enabled,
    queryFn: async () => {
      let qb = requireSupabase().from(view).select('*').eq('organization_id', org.id)
      for (const [k, v] of Object.entries(query.eq ?? {})) if (v !== undefined && v !== null && v !== '') qb = qb.eq(k, v)
      for (const [k, v] of Object.entries(query.gte ?? {})) qb = qb.gte(k, v)
      for (const [k, v] of Object.entries(query.lte ?? {})) qb = qb.lte(k, v)
      if (query.order) qb = qb.order(query.order.column, { ascending: query.order.ascending ?? true })
      const { data, error } = await qb.limit(query.limit ?? 2000)
      if (error) throw toUserError(error)
      return (data ?? []) as Row[]
    },
  })
}
