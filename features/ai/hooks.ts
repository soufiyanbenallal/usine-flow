'use client'

import { useQuery } from '@tanstack/react-query'
import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { useOrganization } from '../organization/context'

export type DemandRow = { item_id: string; month: string; quantity: number; value: number }
export type StockRow = { item_id: string; sku: string; name: string; on_hand: number; incoming: number; reorder_point: number }

export function useMonthlyDemand() {
  const org = useOrganization()
  return useQuery<DemandRow[], Error>({
    queryKey: ['org', org.id, 'ai', 'demand'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(); since.setMonth(since.getMonth() - 18)
      const { data, error } = await requireSupabase().from('item_demand_monthly_view').select('item_id, month, quantity, value').eq('organization_id', org.id).gte('month', since.toISOString().slice(0, 10)).order('month').limit(5000)
      if (error) throw toUserError(error)
      return (data ?? []) as DemandRow[]
    },
  })
}

export function useStockLevels() {
  const org = useOrganization()
  return useQuery<StockRow[], Error>({
    queryKey: ['org', org.id, 'ai', 'stock'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('item_stock_summary').select('item_id, sku, name, on_hand, incoming, reorder_point').eq('organization_id', org.id).eq('active', true).limit(2000)
      if (error) throw toUserError(error)
      return (data ?? []) as StockRow[]
    },
  })
}
