import { toUserError } from '@/lib/errors'
import { rpc } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'
import type { DailyAmount, DowntimeReason, Kpis, OeeDaily, PartnerBalance, ProductionDaily, ProgressRow, QualityDaily } from './types'

async function view<T>(name: string, organizationId: string, opts: { since?: string; sinceColumn?: string; order?: string; limit?: number } = {}): Promise<T[]> {
  let q = requireSupabase().from(name).select('*').eq('organization_id', organizationId)
  if (opts.since) q = q.gte(opts.sinceColumn ?? 'day', opts.since)
  if (opts.order) q = q.order(opts.order, { ascending: true })
  const { data, error } = await q.limit(opts.limit ?? 2000)
  if (error) throw toUserError(error)
  return (data ?? []) as T[]
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)

export const analyticsApi = {
  kpis: (organizationId: string) => rpc<Kpis>('dashboard_kpis', { p_org: organizationId }),
  sales: (org: string, days = 90) => view<DailyAmount>('sales_daily_view', org, { since: daysAgo(days), order: 'day' }),
  purchases: (org: string, days = 90) => view<DailyAmount>('purchasing_daily_view', org, { since: daysAgo(days), order: 'day' }),
  production: (org: string, days = 30) => view<ProductionDaily>('production_daily_view', org, { since: daysAgo(days), order: 'day' }),
  quality: (org: string, days = 90) => view<QualityDaily>('quality_daily_view', org, { since: daysAgo(days), order: 'day' }),
  oee: (org: string, days = 30) => view<OeeDaily>('oee_daily_view', org, { since: daysAgo(days), order: 'day' }),
  downtimeReasons: (org: string) => view<DowntimeReason>('downtime_by_reason_view', org),
  balances: (org: string) => view<PartnerBalance>('partner_balances_view', org),
  progress: (org: string) => view<ProgressRow>('production_progress_view', org),
  supplierPerformance: (org: string) => view<Record<string, unknown>>('supplier_performance_view', org),
  stockSummary: (org: string) => view<Record<string, unknown>>('item_stock_summary', org),
  aging: (org: string) => view<Record<string, unknown>>('stock_aging_view', org),
  margins: (org: string) => view<Record<string, unknown>>('sales_margin_view', org),
  otif: (org: string) => view<Record<string, unknown>>('order_otif_view', org),
  productionCosts: (org: string) => view<Record<string, unknown>>('production_costs_view', org),
  reliability: (org: string) => view<Record<string, unknown>>('asset_reliability_view', org),
}
export { daysAgo }
