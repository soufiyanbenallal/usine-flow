'use client'

import { Gauge, LineChart as LineIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { StatStrip } from '@/components/stat-strip'
import { formatDate, formatMoney } from '@/lib/format'
import { Pill } from '../_core/pill'
import { useItemIndex } from '../items/hooks'
import { usePartnerIndex, useSupplierPerformance } from '../partners/hooks'
import type { SupplierPerformance } from '../partners/types'
import { usePriceHistory } from './hooks'
import type { PriceHistoryRow } from './types'

const tone = (v: number | null, good: number, ok: number, inverse = false) => (v === null ? 'neutral' : (inverse ? v <= good : v >= good) ? 'success' : (inverse ? v <= ok : v >= ok) ? 'warning' : 'critical')

/** On-time delivery, average lead time and incoming defect rate per supplier (SQL view `supplier_performance_view`). */
export function SupplierPerformancePage() {
  const { data, isPending, error } = useSupplierPerformance()
  const rows = useMemo(() => (data ?? []).map((s) => ({ ...s, id: s.supplier_id })), [data])
  const avg = (k: 'on_time_pct' | 'defect_rate_pct') => {
    const v = rows.map((r) => r[k]).filter((x): x is number => x !== null)
    return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null
  }
  const columns: DataTableColumn<SupplierPerformance & { id: string }>[] = [
    { key: 'name', label: 'Fournisseur', value: (s) => s.name },
    { key: 'orders', label: 'Commandes', align: 'right', value: (s) => s.orders },
    { key: 'receipts', label: 'Réceptions', align: 'right', value: (s) => s.receipts },
    { key: 'ontime', label: 'Livraison à l’heure', align: 'right', value: (s) => s.on_time_pct ?? '—', render: (s) => (s.on_time_pct === null ? '—' : <Pill tone={tone(s.on_time_pct, 95, 85)}>{s.on_time_pct} %</Pill>) },
    { key: 'lead', label: 'Délai moyen (j)', align: 'right', value: (s) => s.avg_lead_time_days ?? '—' },
    { key: 'defect', label: 'Taux de défaut', align: 'right', value: (s) => s.defect_rate_pct ?? '—', render: (s) => (s.defect_rate_pct === null ? '—' : <Pill tone={tone(s.defect_rate_pct, 1, 3, true)}>{s.defect_rate_pct} %</Pill>) },
  ]
  return (
    <PageShell title="Performance fournisseurs" icon={Gauge} description="Respect des délais, délai moyen et qualité à la réception." error={error?.message}>
      <StatStrip period="Cumul" stats={[{ label: 'Livraison à l’heure', value: avg('on_time_pct') === null ? '—' : `${avg('on_time_pct')} %` }, { label: 'Taux de défaut moyen', value: avg('defect_rate_pct') === null ? '—' : `${avg('defect_rate_pct')} %` }, { label: 'Fournisseurs actifs', value: String(rows.filter((r) => r.orders > 0).length) }]} />
      <DataTable title="Fournisseurs" singular="fournisseur" columns={columns} rows={rows} loading={isPending} />
    </PageShell>
  )
}

/** Unit price history per article and supplier, with variance versus the standard cost (purchase price variance). */
export function PriceHistoryPage() {
  const [itemId, setItemId] = useState('')
  const items = useItemIndex()
  const suppliers = usePartnerIndex()
  const { data, isPending, error } = usePriceHistory(itemId || undefined)
  const rows = useMemo(() => (data ?? []).map((r) => ({ ...r, id: `${r.po_id}-${r.item_id}-${r.unit_price_base}` })), [data])
  const columns: DataTableColumn<PriceHistoryRow & { id: string }>[] = [
    { key: 'date', label: 'Date', value: (r) => formatDate(r.order_date) },
    { key: 'po', label: 'Commande', value: (r) => r.po_number ?? '—' },
    { key: 'item', label: 'Article', value: (r) => items.get(r.item_id)?.sku ?? r.item_id },
    { key: 'supplier', label: 'Fournisseur', value: (r) => suppliers.get(r.supplier_id)?.name ?? r.supplier_id },
    { key: 'price', label: 'Prix unitaire', align: 'right', value: (r) => r.unit_price_base, render: (r) => formatMoney(r.unit_price_base) },
    { key: 'std', label: 'Coût standard', align: 'right', value: (r) => r.standard_cost, render: (r) => formatMoney(r.standard_cost) },
    { key: 'var', label: 'Écart / standard', align: 'right', value: (r) => r.variance_vs_standard, render: (r) => <span className={r.variance_vs_standard > 0 ? 'text-red-700' : 'text-emerald-700'}>{r.variance_vs_standard > 0 ? '+' : ''}{formatMoney(r.variance_vs_standard)}</span> },
  ]
  const chart = [...rows].reverse().map((r) => ({ date: r.order_date, price: r.unit_price_base }))
  return (
    <PageShell title="Historique des prix" icon={LineIcon} description="Évolution des prix d’achat et écart par rapport au coût standard (PPV)." error={error?.message}>
      <div className="max-w-sm">
        <label className="flex flex-col gap-1 text-[13px]">
          <span className="font-medium">Article</span>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="">Tous les articles</option>
            {[...items.values()].slice(0, 2000).map((i) => (
              <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>
            ))}
          </select>
        </label>
      </div>
      {itemId && chart.length > 1 && (
        <Panel title="Prix d’achat dans le temps">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ left: -8 }}>
                <CartesianGrid vertical={false} stroke="#ebebeb" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Line dataKey="price" stroke="#1a1a1a" dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}
      <DataTable title="Prix" singular="prix d’achat" columns={columns} rows={rows} loading={isPending} />
    </PageShell>
  )
}
