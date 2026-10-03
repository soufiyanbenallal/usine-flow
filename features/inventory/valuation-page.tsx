'use client'

import { Coins } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { StatStrip } from '@/components/stat-strip'
import { formatDate, formatMoney, formatQty } from '@/lib/format'
import { sumOf } from '@/lib/decimal'
import { useView } from '../_core/view-hooks'
import { Pill } from '../_core/pill'
import { useItemStock } from '../items/hooks'
import { AGE_BUCKETS, abcClassification, daysOfInventory, inventoryTurnover, type MovementClass } from './calculations'
import { useAgingBuckets, useSlowMoving, useValueSnapshots } from './hooks'

type Tab = 'value' | 'aging' | 'slow' | 'abc'
const axis = { fontSize: 12, fill: '#6b6b6b' }
const CLASS_TONE: Record<MovementClass, 'success' | 'warning' | 'critical'> = { active: 'success', slow: 'warning', dead: 'critical' }
const CLASS_LABEL: Record<MovementClass, string> = { active: 'Actif', slow: 'Lent', dead: 'Dormant' }

/** Inventory valuation (FIFO layers / weighted average), aging, slow-moving & dead stock, turnover and ABC classification. */
export function ValuationPage() {
  const [tab, setTab] = useState<Tab>('value')
  const stock = useItemStock()
  const aging = useAgingBuckets()
  const slow = useSlowMoving()
  const snapshots = useValueSnapshots()
  const consumption = useView<{ item_id: string; consumption_value: number; consumption_qty: number }>('stock', 'item_consumption_view', {}, tab === 'abc' || tab === 'value')

  const rows = useMemo(() => stock.data ?? [], [stock.data])
  const total = sumOf(rows.map((r) => r.stock_value)).toNumber()
  const cogs = sumOf((consumption.data ?? []).map((c) => c.consumption_value)).toNumber()
  const avgValue = snapshots.data && snapshots.data.length > 0 ? sumOf(snapshots.data.map((s) => s.total_value)).div(snapshots.data.length).toNumber() : total
  const turnover = inventoryTurnover(cogs, avgValue)

  const abc = useMemo(() => abcClassification((consumption.data ?? []).map((c) => ({ id: c.item_id, value: c.consumption_value }))), [consumption.data])
  const agingChart = AGE_BUCKETS.map((b) => ({ bucket: b, value: sumOf((aging.data ?? []).filter((a) => a.age_bucket === b).map((a) => a.value)).toNumber() }))

  const valueColumns: DataTableColumn<(typeof rows)[number] & { id: string }>[] = [
    { key: 'sku', label: 'Référence', value: (s) => s.sku },
    { key: 'name', label: 'Désignation', value: (s) => s.name },
    { key: 'qty', label: 'Quantité', align: 'right', value: (s) => s.on_hand, render: (s) => formatQty(s.on_hand) },
    { key: 'cost', label: 'Coût moyen', align: 'right', value: (s) => s.avg_cost, render: (s) => formatMoney(s.avg_cost) },
    { key: 'value', label: 'Valeur', align: 'right', value: (s) => s.stock_value, render: (s) => formatMoney(s.stock_value) },
    { key: 'abc', label: 'ABC', value: (s) => abc.get(s.item_id) ?? 'C' },
  ]
  const slowColumns: DataTableColumn<NonNullable<typeof slow.data>[number] & { id: string }>[] = [
    { key: 'sku', label: 'Référence', value: (s) => s.sku },
    { key: 'name', label: 'Désignation', value: (s) => s.name },
    { key: 'qty', label: 'En stock', align: 'right', value: (s) => s.on_hand, render: (s) => formatQty(s.on_hand) },
    { key: 'value', label: 'Valeur immobilisée', align: 'right', value: (s) => s.stock_value, render: (s) => formatMoney(s.stock_value) },
    { key: 'last', label: 'Dernière sortie', value: (s) => formatDate(s.last_movement) },
    { key: 'idle', label: 'Jours sans sortie', align: 'right', value: (s) => (s.days_idle > 5000 ? '—' : s.days_idle) },
    { key: 'class', label: 'Classe', value: (s) => CLASS_LABEL[s.classification], render: (s) => <Pill tone={CLASS_TONE[s.classification]}>{CLASS_LABEL[s.classification]}</Pill> },
  ]
  const dead = (slow.data ?? []).filter((s) => s.classification === 'dead')

  return (
    <PageShell title="Valorisation" icon={Coins} description="Valeur du stock issue des couches FIFO et du coût moyen pondéré, ancienneté, stock dormant, rotation et classification ABC." error={stock.error?.message}>
      <StatStrip
        period="Maintenant"
        stats={[
          { label: 'Valeur du stock', value: formatMoney(total) },
          { label: 'Rotation (12 mois)', value: `${turnover} ×`, hint: turnover > 0 ? `${daysOfInventory(turnover)} jours de stock` : undefined },
          { label: 'Stock dormant', value: formatMoney(sumOf(dead.map((d) => d.stock_value)).toNumber()), hint: `${dead.length} article(s)` },
        ]}
      />
      <SegmentedTabs<Tab>
        tabs={[{ id: 'value', label: 'Valeur' }, { id: 'aging', label: 'Ancienneté' }, { id: 'slow', label: 'Stock dormant', badge: dead.length }, { id: 'abc', label: 'Classification ABC' }]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'value' && (
        <>
          <Panel title="Évolution de la valeur du stock (instantané quotidien)">
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={snapshots.data ?? []} margin={{ left: -8 }}>
                  <CartesianGrid vertical={false} stroke="#ebebeb" />
                  <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatMoney(Number(v))} />
                  <Area dataKey="total_value" name="Valeur" stroke="#1a1a1a" fill="#e5e7eb" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <DataTable title="Valeur par article" singular="article" columns={valueColumns} rows={rows.map((r) => ({ ...r, id: r.item_id }))} loading={stock.isPending} />
        </>
      )}
      {tab === 'aging' && (
        <Panel title="Valeur du stock par ancienneté (couches de valorisation)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingChart} margin={{ left: -8 }}>
                <CartesianGrid vertical={false} stroke="#ebebeb" />
                <XAxis dataKey="bucket" tick={axis} axisLine={false} tickLine={false} />
                <YAxis tick={axis} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatMoney(Number(v))} />
                <Bar dataKey="value" name="Valeur" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}
      {tab === 'slow' && <DataTable title="Stock lent et dormant" singular="article" columns={slowColumns} rows={(slow.data ?? []).map((s) => ({ ...s, id: s.item_id }))} loading={slow.isPending} filter={{ label: 'Classe', options: [{ value: 'dead', label: 'Dormant' }, { value: 'slow', label: 'Lent' }, { value: 'active', label: 'Actif' }].map((o) => ({ value: o.value, label: o.label })), getValue: (s) => s.classification }} />}
      {tab === 'abc' && (
        <Panel title="Classification ABC (valeur consommée sur 12 mois)">
          <div className="grid gap-3 sm:grid-cols-3">
            {(['A', 'B', 'C'] as const).map((k) => (
              <div key={k} className="rounded-lg border p-4 text-center">
                <p className="text-3xl font-bold">{k}</p>
                <p className="text-[13px] text-muted-foreground">{[...abc.values()].filter((v) => v === k).length} article(s)</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">A : 80 % de la valeur consommée · B : les 15 % suivants · C : le reste.</p>
        </Panel>
      )}
    </PageShell>
  )
}
