'use client'

import { Banknote, Timer } from 'lucide-react'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DataTableColumn } from '@/components/data-table'
import { DataTable } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { formatDateTime, formatMoney, formatQty } from '@/lib/format'
import { EntityPage } from '../_core/entity-page'
import { Status } from '../_core/status'
import { useView } from '../_core/view-hooks'
import { useItemIndex } from '../items/hooks'
import { useAssetOptions } from '../maintenance/hooks'
import { useDowntimeReasons as useDowntimeReasonOptions } from '../quality/hooks'
import { StandardCostsPanel } from './master-pages'
import { downtimeHooks, useDowntimeReasons, useWorkCenterIndex, useWorkCenterOptions } from './hooks'
import { DOWNTIME_CATEGORIES, type CostSnapshot, type Downtime } from './types'

const axis = { fontSize: 12, fill: '#6b6b6b' }

/** Actual vs standard production cost per order with variance split (material / labor / machine / other). */
export function ProductionCostsPage() {
  const costs = useView<CostSnapshot & { number: string; item_id: string }>('production_cost_snapshots', 'production_costs_view', { order: { column: 'computed_at', ascending: false } })
  const items = useItemIndex()
  const rows = (costs.data ?? []).map((c) => ({ ...c, id: c.production_order_id }))
  const columns: DataTableColumn<(typeof rows)[number]>[] = [
    { key: 'number', label: 'OF', value: (c) => c.number },
    { key: 'item', label: 'Article', value: (c) => items.get(c.item_id)?.sku ?? c.item_id },
    { key: 'qty', label: 'Produit', align: 'right', value: (c) => formatQty(c.produced_qty) },
    { key: 'actual', label: 'Coût réel / u', align: 'right', value: (c) => c.unit_cost, render: (c) => formatMoney(c.unit_cost) },
    { key: 'std', label: 'Standard / u', align: 'right', value: (c) => c.standard_unit, render: (c) => formatMoney(c.standard_unit) },
    { key: 'var', label: 'Écart total', align: 'right', value: (c) => c.variance, render: (c) => <span className={c.variance > 0 ? 'font-medium text-red-700' : 'text-emerald-700'}>{formatMoney(c.variance)}</span> },
    { key: 'mat', label: 'Dont matières', align: 'right', value: (c) => c.material_variance, render: (c) => formatMoney(c.material_variance) },
    { key: 'lab', label: 'Dont M.O.', align: 'right', value: (c) => c.labor_variance, render: (c) => formatMoney(c.labor_variance) },
    { key: 'mac', label: 'Dont machine', align: 'right', value: (c) => c.machine_variance, render: (c) => formatMoney(c.machine_variance) },
    { key: 'oth', label: 'Autres', align: 'right', value: (c) => c.other_variance, render: (c) => formatMoney(c.other_variance) },
  ]
  const chart = rows.slice(0, 12).map((c) => ({ name: c.number, 'Matières': c.material_variance, 'Main-d’œuvre': c.labor_variance, Machine: c.machine_variance, Autres: c.other_variance }))
  return (
    <PageShell title="Coûts de production" icon={Banknote} description="Coût réel (consommations valorisées, temps, machines, sous-traitance) comparé au coût standard." error={costs.error?.message}>
      <Panel title="Écarts par ordre de fabrication">
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ left: -8 }} stackOffset="sign">
              <CartesianGrid vertical={false} stroke="#ebebeb" /><XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} /><Tooltip formatter={(v) => formatMoney(Number(v))} /><Legend />
              <Bar dataKey="Matières" stackId="a" fill="#1a1a1a" /><Bar dataKey="Main-d’œuvre" stackId="a" fill="#6b7280" /><Bar dataKey="Machine" stackId="a" fill="#9ca3af" /><Bar dataKey="Autres" stackId="a" fill="#d1d5db" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <DataTable title="Coûts" singular="ordre terminé" columns={columns} rows={rows} loading={costs.isPending} />
      <StandardCostsPanel />
    </PageShell>
  )
}

/** Production downtime log + Pareto by reason. */
export function DowntimePage() {
  const wcs = useWorkCenterIndex()
  const reasons = useDowntimeReasons()
  const reasonOptions = useDowntimeReasonOptions()
  const pareto = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of reasons.data ?? []) m.set(r.reason, (m.get(r.reason) ?? 0) + r.minutes)
    return [...m.entries()].map(([reason, minutes]) => ({ reason, minutes })).sort((a, b) => b.minutes - a.minutes).slice(0, 8)
  }, [reasons.data])
  const columns: DataTableColumn<Downtime>[] = [
    { key: 'wc', label: 'Poste', value: (d) => (d.work_center_id ? (wcs.get(d.work_center_id)?.name ?? '—') : '—') },
    { key: 'cat', label: 'Catégorie', value: (d) => DOWNTIME_CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category },
    { key: 'reason', label: 'Motif', value: (d) => reasonOptions.find((r) => r.value === d.reason_id)?.label ?? '—' },
    { key: 'start', label: 'Début', value: (d) => formatDateTime(d.started_at) },
    { key: 'end', label: 'Fin', value: (d) => (d.ended_at ? formatDateTime(d.ended_at) : 'En cours'), render: (d) => (d.ended_at ? formatDateTime(d.ended_at) : <Status value="open" />) },
    { key: 'min', label: 'Durée (min)', align: 'right', value: (d) => d.minutes },
  ]
  return (
    <EntityPage<Downtime>
      title="Arrêts de production" singular="arrêt" icon={Timer} description="Journal des arrêts (pannes, réglages, manque matière…) avec analyse de Pareto des causes." hooks={downtimeHooks} permission="production.report" columns={columns}
      filter={{ label: 'Catégorie', options: DOWNTIME_CATEGORIES, getValue: (d) => d.category }}
      intro={
        <Panel title="Pareto des causes (90 jours)">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pareto} margin={{ left: -8 }}>
                <CartesianGrid vertical={false} stroke="#ebebeb" /><XAxis dataKey="reason" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="minutes" name="Minutes" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      }
      fields={[
        { key: 'work_center_id', label: 'Poste de charge', type: 'relation', useOptions: useWorkCenterOptions, required: true },
        { key: 'asset_id', label: 'Équipement', type: 'relation', useOptions: useAssetOptions },
        { key: 'category', label: 'Catégorie', type: 'select', options: DOWNTIME_CATEGORIES, required: true, default: 'other' },
        { key: 'reason_id', label: 'Motif', type: 'relation', useOptions: useDowntimeReasonOptions },
        { key: 'started_at', label: 'Début', type: 'datetime', required: true },
        { key: 'ended_at', label: 'Fin', type: 'datetime' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      beforeSave={(payload) => {
        const start = payload.started_at ? new Date(String(payload.started_at)).getTime() : null
        const end = payload.ended_at ? new Date(String(payload.ended_at)).getTime() : null
        return { ...payload, minutes: start && end && end > start ? Math.round((end - start) / 60000) : 0 }
      }}
      exportName="arrets"
    />
  )
}
