'use client'

import { Percent } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { StatStrip } from '@/components/stat-strip'
import { formatMoney } from '@/lib/format'
import { marginPct, sumOf } from '@/lib/decimal'
import { useItemIndex } from '../items/hooks'
import { usePartnerIndex } from '../partners/hooks'
import { aggregateMargins, otifRate, type MarginGroup } from './margins'
import { useMargins, useOtif } from './hooks'

type Tab = 'item_id' | 'customer_id' | 'so_id'
const axis = { fontSize: 12, fill: '#6b6b6b' }
const since = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

/** Gross margin per product, customer and order, plus OTIF (on-time in-full) delivery rate. */
export function MarginsPage() {
  const [tab, setTab] = useState<Tab>('item_id')
  const [days, setDays] = useState(90)
  const margins = useMargins(since(days))
  const otif = useOtif()
  const items = useItemIndex()
  const customers = usePartnerIndex()
  const groups = useMemo(() => aggregateMargins(margins.data ?? [], tab), [margins.data, tab])
  const label = (key: string) => (tab === 'item_id' ? (items.get(key)?.name ?? key) : tab === 'customer_id' ? (customers.get(key)?.name ?? key) : key)
  const revenue = sumOf((margins.data ?? []).map((r) => r.revenue)).toNumber()
  const cost = sumOf((margins.data ?? []).map((r) => r.cost)).toNumber()
  const rate = otifRate(otif.data ?? [])
  const columns: DataTableColumn<MarginGroup & { id: string }>[] = [
    { key: 'name', label: tab === 'item_id' ? 'Article' : tab === 'customer_id' ? 'Client' : 'Commande', value: (g) => label(g.key) },
    { key: 'orders', label: 'Commandes', align: 'right', value: (g) => g.orders },
    { key: 'rev', label: 'Chiffre d’affaires', align: 'right', value: (g) => g.revenue, render: (g) => formatMoney(g.revenue) },
    { key: 'cost', label: 'Coût', align: 'right', value: (g) => g.cost, render: (g) => formatMoney(g.cost) },
    { key: 'margin', label: 'Marge', align: 'right', value: (g) => g.margin, render: (g) => <span className={g.margin < 0 ? 'text-red-700' : ''}>{formatMoney(g.margin)}</span> },
    { key: 'pct', label: 'Marge %', align: 'right', value: (g) => g.marginPct, render: (g) => `${g.marginPct} %` },
  ]
  return (
    <PageShell title="Marges" icon={Percent} description="Marge brute = chiffre d’affaires livré − coût des ventes (coût FIFO / moyen pondéré du grand livre)." error={margins.error?.message}>
      <StatStrip
        period={`${days} jours`}
        stats={[
          { label: 'Chiffre d’affaires', value: formatMoney(revenue) },
          { label: 'Marge brute', value: formatMoney(revenue - cost), hint: `${marginPct(revenue, cost).toNumber()} %` },
          { label: 'OTIF', value: `${rate.otif} %`, hint: `${rate.count} commandes` },
          { label: 'À l’heure / complet', value: `${rate.onTime} % / ${rate.inFull} %` },
        ]}
      />
      <SegmentedTabs<Tab>
        tabs={[{ id: 'item_id', label: 'Par produit' }, { id: 'customer_id', label: 'Par client' }, { id: 'so_id', label: 'Par commande' }]}
        value={tab}
        onChange={setTab}
        right={
          <select aria-label="Période" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 rounded-lg border border-input bg-transparent px-2 text-[13px]">
            {[30, 90, 180, 365].map((d) => <option key={d} value={d}>{d} jours</option>)}
          </select>
        }
      />
      <Panel title="Top 10 — marge">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groups.slice(0, 10).map((g) => ({ name: label(g.key), margin: g.margin }))} margin={{ left: -8 }}>
              <CartesianGrid vertical={false} stroke="#ebebeb" />
              <XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              <Bar dataKey="margin" name="Marge" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <DataTable title="Marges" singular="ligne" columns={columns} rows={groups.map((g) => ({ ...g, id: g.key }))} loading={margins.isPending} />
    </PageShell>
  )
}
