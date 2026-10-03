'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { useOrganization } from '../organization/context'
import { featureKey } from './crud-hooks'
import type { Option } from './form-values'

export type OptionTable =
  | 'warehouses' | 'price_lists' | 'work_centers' | 'cost_centers' | 'departments' | 'teams' | 'shifts' | 'skills' | 'sites' | 'routings'
  | 'boms' | 'inspection_plans' | 'assets' | 'employees' | 'reason_codes' | 'facilities' | 'warehouse_zones' | 'production_orders'

/** Generic `{ id, label }` options for small reference tables (warehouses, price lists, zones…). */
export function useListOptions(table: OptionTable, labelColumn = 'name', hintColumn = 'code'): Option[] {
  const org = useOrganization()
  const { data } = useQuery<Record<string, string>[], Error>({
    queryKey: [...featureKey(org.id, 'options'), table],
    staleTime: 60_000,
    queryFn: async () => {
      const cols = ['id', labelColumn, hintColumn].join(', ')
      let { data, error } = await requireSupabase().from(table).select(cols).eq('organization_id', org.id).limit(2000)
      if (error) {
        const retry = await requireSupabase().from(table).select(['id', labelColumn].join(', ')).eq('organization_id', org.id).limit(2000)
        data = retry.data as typeof data
        error = retry.error
      }
      if (error) throw toUserError(error)
      return (data ?? []) as unknown as Record<string, string>[]
    },
  })
  return useMemo(() => (data ?? []).map((r) => ({ value: r.id as string, label: String(r[labelColumn] ?? r.id), hint: r[hintColumn] ? String(r[hintColumn]) : undefined })), [data, labelColumn, hintColumn])
}
