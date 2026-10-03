'use client'

import { useQuery } from '@tanstack/react-query'
import { useOrganization } from '../organization/context'
import { analyticsApi } from './service'

function useView<T>(key: string, fn: (org: string) => Promise<T>, staleTime = 60_000) {
  const org = useOrganization()
  return useQuery<T, Error>({ queryKey: ['org', org.id, 'analytics', key], queryFn: () => fn(org.id), staleTime })
}
export const useKpis = () => {
  const org = useOrganization()
  return useQuery({ queryKey: ['org', org.id, 'analytics', 'kpis'], queryFn: () => analyticsApi.kpis(org.id), staleTime: 30_000, refetchInterval: 60_000 })
}
export const useSalesDaily = () => useView('sales', (o) => analyticsApi.sales(o))
export const usePurchasesDaily = () => useView('purchases', (o) => analyticsApi.purchases(o))
export const useProductionDaily = () => useView('production', (o) => analyticsApi.production(o))
export const useQualityDaily = () => useView('quality', (o) => analyticsApi.quality(o))
export const useOeeDaily = () => useView('oee', (o) => analyticsApi.oee(o))
export const useDowntimeReasons = () => useView('downtime', analyticsApi.downtimeReasons)
export const useBalances = () => useView('balances', analyticsApi.balances)
export const useProgress = () => useView('progress', analyticsApi.progress)
export const useSupplierPerformance = () => useView('supplier-performance', analyticsApi.supplierPerformance)
export const useStockSummary = () => useView('stock-summary', analyticsApi.stockSummary)
export const useAging = () => useView('aging', analyticsApi.aging)
export const useMarginsView = () => useView('margins', analyticsApi.margins)
export const useOtifView = () => useView('otif', analyticsApi.otif)
export const useProductionCosts = () => useView('production-costs', analyticsApi.productionCosts)
export const useReliabilityView = () => useView('reliability', analyticsApi.reliability)
