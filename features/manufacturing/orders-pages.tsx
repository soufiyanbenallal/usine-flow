'use client'

import { Banner, Button, NumberField } from '@xco-agency/corex-ui'
import { Factory } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DataTableColumn } from '@/components/data-table'
import { Panel } from '@/components/page-shell'
import { formatDate, formatDateTime, formatMoney, formatQty } from '@/lib/format'
import { cancelAction, submitAction } from '../_core/doc-actions'
import { DocumentDetail, type DocAction, type DocumentConfig } from '../_core/document-detail'
import { EntityPage } from '../_core/entity-page'
import { Status } from '../_core/status'
import { itemPicker, useItemIndex } from '../items/hooks'
import { useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { useLocationOptions, useWarehouseOptions } from '../warehouses/hooks'
import { useWorkCenterIndex, consumptionHooks, downtimeHooks, materialHooks, operationHooks, outputHooks, productionOrderHooks, scrapHooks, snapshotHooks } from './hooks'
import { OperationControls } from './operation-controls'
import { isLate, materialShortage, operationProgress, orderProgress, plannedMinutes } from './production-rules'
import { PRODUCTION_PRIORITIES, type ProductionMaterial, type ProductionOperation, type ProductionOrder } from './types'
import { manufacturingApi } from './service'
import { useView } from '../_core/view-hooks'

const ORDER_HEADER = [
  { key: 'item_id', label: 'Article à fabriquer', type: 'picker' as const, picker: itemPicker, required: true, lockedOnEdit: true },
  { key: 'quantity', label: 'Quantité', type: 'number' as const, min: 0.0001, required: true, lockedOnEdit: true },
  { key: 'warehouse_id', label: 'Entrepôt (matières et produits finis)', type: 'relation' as const, useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'output_location_id', label: 'Emplacement de sortie', type: 'relation' as const, useOptions: () => useLocationOptions() },
  { key: 'planned_start', label: 'Début planifié', type: 'date' as const },
  { key: 'planned_end', label: 'Fin planifiée', type: 'date' as const },
  { key: 'priority', label: 'Priorité', type: 'select' as const, options: PRODUCTION_PRIORITIES, default: '3', required: true },
  { key: 'lot_number', label: 'N° de lot de sortie (optionnel)' },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]

export function ProductionOrdersPage() {
  const items = useItemIndex()
  const today = new Date().toISOString().slice(0, 10)
  const columns: DataTableColumn<ProductionOrder>[] = [
    { key: 'number', label: 'OF', value: (o) => o.number ?? '—' },
    { key: 'item', label: 'Article', value: (o) => (items.get(o.item_id) ? `${items.get(o.item_id)!.sku} — ${items.get(o.item_id)!.name}` : o.item_id) },
    { key: 'qty', label: 'Quantité', align: 'right', value: (o) => `${formatQty(o.produced_qty)} / ${formatQty(o.quantity)}` },
    { key: 'progress', label: 'Avancement', align: 'right', value: (o) => orderProgress(o.produced_qty, o.quantity), render: (o) => `${orderProgress(o.produced_qty, o.quantity)} %` },
    { key: 'end', label: 'Fin planifiée', value: (o) => formatDate(o.planned_end), render: (o) => <span className={isLate(o.planned_end, o.status, today) ? 'font-medium text-red-700' : ''}>{formatDate(o.planned_end)}{isLate(o.planned_end, o.status, today) ? ' ⚠' : ''}</span> },
    { key: 'status', label: 'Statut', value: (o) => o.status, render: (o) => <Status value={o.status} /> },
  ]
  return (
    <EntityPage<ProductionOrder>
      title="Ordres de fabrication" singular="ordre de fabrication" icon={Factory} description="Brouillon → lancé (éclatement de la nomenclature, gamme, réservation) → en cours → terminé → clôturé." hooks={productionOrderHooks} permission="production.write" columns={columns}
      filter={{ label: 'Statut', options: ['draft', 'pending_approval', 'approved', 'planned', 'released', 'in_progress', 'paused', 'completed', 'closed', 'cancelled'].map((v) => ({ value: v, label: v })), getValue: (o) => o.status }}
      fields={ORDER_HEADER} detailPath={(o) => `production/ordres/${o.id}`} afterCreatePath={(o) => `production/ordres/${o.id}`} exportName="ordres-de-fabrication"
    />
  )
}

function Progress({ pct }: { pct: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function MaterialsPanel({ order }: { order: ProductionOrder }) {
  const items = useItemIndex()
  const materials = materialHooks.useListBy('production_order_id', order.id)
  const stock = useView<{ item_id: string; on_hand: number }>('stock', 'inventory_stock_view', { eq: { warehouse_id: order.warehouse_id } })
  const consumptions = consumptionHooks.useListBy('production_order_id', order.id)
  const can = useCan('production.report')
  const client = useQueryClient()
  const org = useOrganization()
  const [qty, setQty] = useState<Record<string, string>>({})
  const consume = useMutation({ mutationFn: ({ m, q }: { m: ProductionMaterial; q: number }) => manufacturingApi.consume(order.id, m.id, q), onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }) })
  const open = ['released', 'in_progress', 'paused'].includes(order.status)
  const available = (itemId: string) => (stock.data ?? []).filter((s) => s.item_id === itemId).reduce((a, s) => a + s.on_hand, 0)
  return (
    <Panel title="Matières">
      {consume.error && <Banner tone="critical">{consume.error.message}</Banner>}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3 font-medium">Article</th><th className="px-3 text-right font-medium">Consommé / requis</th><th className="px-3 text-right font-medium">Disponible</th><th className="px-3 text-right font-medium">Manque</th>{open && can && <th className="px-3 font-medium">Consommation manuelle</th>}</tr></thead>
          <tbody>
            {(materials.data ?? []).map((m) => {
              const short = materialShortage({ required: m.required_qty, issued: m.issued_qty, available: available(m.item_id) })
              return (
                <tr key={m.id} className="border-t">
                  <td className="py-2 pr-3">{items.get(m.item_id) ? `${items.get(m.item_id)!.sku} — ${items.get(m.item_id)!.name}` : m.item_id}{m.backflush && <span className="ml-2 text-xs text-muted-foreground">backflush</span>}</td>
                  <td className="px-3 text-right tabular-nums">{formatQty(m.issued_qty)} / {formatQty(m.required_qty)}</td>
                  <td className="px-3 text-right tabular-nums">{formatQty(available(m.item_id))}</td>
                  <td className={`px-3 text-right tabular-nums ${short > 0 ? 'font-semibold text-red-700' : ''}`}>{short > 0 ? formatQty(short) : '—'}</td>
                  {open && can && (
                    <td className="px-3">
                      <div className="flex items-end gap-2">
                        <div className="w-24"><NumberField label="Qté" labelAccessibilityVisibility="exclusive" min={0} value={qty[m.id] ?? ''} onChange={(v) => setQty((s) => ({ ...s, [m.id]: v }))} /></div>
                        <Button variant="secondary" loading={consume.isPending} disabled={!Number(qty[m.id])} onClick={() => consume.mutate({ m, q: Number(qty[m.id]) }, { onSuccess: () => setQty((s) => ({ ...s, [m.id]: '' })) })}>Consommer</Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {(materials.data ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Les matières apparaissent au lancement de l’ordre (éclatement de la nomenclature).</p>}
      {(consumptions.data ?? []).length > 0 && <p className="mt-2 text-xs text-muted-foreground">{consumptions.data!.length} consommation(s) enregistrée(s) — coût matières {formatMoney(consumptions.data!.reduce((a, c) => a + c.value, 0))}.</p>}
    </Panel>
  )
}

function OperationsPanel({ order }: { order: ProductionOrder }) {
  const ops = operationHooks.useListBy('production_order_id', order.id)
  const wcs = useWorkCenterIndex()
  const rows: ProductionOperation[] = ops.data ?? []
  const last = Math.max(...rows.map((o) => o.seq), 0)
  const can = useCan('production.report')
  return (
    <Panel title="Opérations">
      <div className="space-y-3">
        {rows.map((op) => (
          <div key={op.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">{op.seq} — {op.name}</span>
              <span className="text-xs text-muted-foreground">{op.work_center_id ? wcs.get(op.work_center_id)?.name : 'Sans poste'}</span>
              <Status value={op.status} />
              <span className="ml-auto text-xs text-muted-foreground">{formatQty(op.done_qty)} / {formatQty(op.planned_qty)} · rebut {formatQty(op.scrap_qty)} · prévu {formatQty(plannedMinutes({ setup: op.setup_minutes, runPerUnit: op.run_minutes_per_unit }, op.planned_qty))} min · réel {formatQty(op.accumulated_minutes)} min</span>
            </div>
            <div className="my-2"><Progress pct={operationProgress({ status: op.status, plannedQty: op.planned_qty, doneQty: op.done_qty, scrapQty: op.scrap_qty })} /></div>
            {can && <OperationControls op={op} order={order} isLast={op.seq === last} compact />}
          </div>
        ))}
      </div>
      {rows.length === 0 && <p className="text-[13px] text-muted-foreground">Les opérations apparaissent au lancement de l’ordre (gamme ou opération unique).</p>}
    </Panel>
  )
}

function ResultsPanel({ order }: { order: ProductionOrder }) {
  const items = useItemIndex()
  const outputs = outputHooks.useListBy('production_order_id', order.id)
  const scrap = scrapHooks.useListBy('production_order_id', order.id)
  const downtime = downtimeHooks.useListBy('production_order_id', order.id)
  const snapshot = snapshotHooks.useListBy('production_order_id', order.id)
  const snap = snapshot.data?.[0]
  return (
    <>
      <Panel title="Production déclarée">
        {(outputs.data ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Aucune sortie.</p>}
        <ul className="divide-y text-[13px]">
          {(outputs.data ?? []).map((o) => (
            <li key={o.id} className="flex flex-wrap gap-3 py-2"><span className="font-medium">{formatQty(o.quantity)} × {items.get(o.item_id)?.sku ?? o.item_id}</span><span className="text-muted-foreground">{o.kind}</span><span className="text-muted-foreground">coût {formatMoney(o.unit_cost)}</span><span className="ml-auto text-muted-foreground">{formatDateTime(o.reported_at)}</span></li>
          ))}
        </ul>
      </Panel>
      {(scrap.data ?? []).length > 0 && (
        <Panel title="Rebuts">
          <ul className="divide-y text-[13px]">{scrap.data!.map((s) => <li key={s.id} className="flex gap-3 py-2"><span>{formatQty(s.quantity)} × {items.get(s.item_id)?.sku ?? s.item_id}</span><span className="text-muted-foreground">{formatMoney(s.cost)}</span><span className="ml-auto text-muted-foreground">{formatDateTime(s.reported_at)}</span></li>)}</ul>
        </Panel>
      )}
      {(downtime.data ?? []).length > 0 && (
        <Panel title="Arrêts">
          <ul className="divide-y text-[13px]">{downtime.data!.map((d) => <li key={d.id} className="flex gap-3 py-2"><span>{d.category}</span><span>{d.minutes} min</span>{!d.ended_at && <Status value="open" />}<span className="ml-auto text-muted-foreground">{formatDateTime(d.started_at)}</span></li>)}</ul>
        </Panel>
      )}
      {snap && (
        <Panel title="Coût de revient (réel vs standard)">
          <dl className="grid gap-3 text-[13px] sm:grid-cols-3 lg:grid-cols-5">
            {([['Matières', snap.material_cost], ['Main-d’œuvre', snap.labor_cost], ['Machine', snap.machine_cost], ['Frais généraux', snap.overhead_cost], ['Sous-traitance', snap.subcontract_cost]] as const).map(([k, val]) => <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{formatMoney(val)}</dd></div>)}
          </dl>
          <p className="mt-3 text-[13px]">Coût total {formatMoney(snap.total_cost)} · unitaire {formatMoney(snap.unit_cost)} · standard {formatMoney(snap.standard_unit)} · écart <strong className={snap.variance > 0 ? 'text-red-700' : 'text-emerald-700'}>{formatMoney(snap.variance)}</strong></p>
        </Panel>
      )}
    </>
  )
}

export function ProductionOrderDetailPage() {
  const config: DocumentConfig<ProductionOrder, { id: string }> = {
    title: 'Ordres de fabrication', singular: 'Ordre de fabrication', icon: Factory, listPath: 'production/ordres', entity: 'production_orders', approvalType: 'production_order',
    header: { hooks: productionOrderHooks, fields: ORDER_HEADER, editPermission: 'production.write' },
    actions: ((): DocAction<ProductionOrder>[] => [
      submitAction('production_order', 'production.write'),
      { key: 'release', label: 'Lancer l’ordre', tone: 'primary', permission: 'production.start', visible: (h) => ['draft', 'approved', 'planned'].includes(h.status), confirm: 'Les matières sont éclatées depuis la nomenclature active, les opérations créées et le stock disponible réservé.', run: (h) => manufacturingApi.release(h.id) },
      { key: 'complete', label: 'Terminer l’ordre', tone: 'primary', permission: 'production.complete', visible: (h) => ['released', 'in_progress', 'paused'].includes(h.status) && h.produced_qty > 0, confirm: 'Les opérations restantes sont clôturées, le coût de revient est calculé.', run: (h) => manufacturingApi.complete(h.id) },
      { key: 'ask-close', label: 'Demander l’approbation de clôture', permission: 'production.complete', visible: (h) => h.status === 'completed', run: (h) => manufacturingApi.requestCloseApproval(h.id) },
      { key: 'close', label: 'Clôturer', tone: 'primary', permission: 'production.complete', visible: (h) => h.status === 'completed', confirm: 'La clôture fige le coût de revient.', run: (h) => manufacturingApi.close(h.id) },
      cancelAction('production_order', 'production.write'),
    ])(),
    top: (h) => (
      <Panel>
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <span className="text-sm font-semibold">Avancement {orderProgress(h.produced_qty, h.quantity)} %</span>
          <span>{formatQty(h.produced_qty)} / {formatQty(h.quantity)} produits</span>
          <span>Rebut {formatQty(h.scrap_qty)}</span>
          {h.actual_start && <span className="text-muted-foreground">Démarré le {formatDateTime(h.actual_start)}</span>}
        </div>
        <div className="mt-2"><Progress pct={orderProgress(h.produced_qty, h.quantity)} /></div>
      </Panel>
    ),
    extra: (h) => (
      <>
        <OperationsPanel order={h} />
        <MaterialsPanel order={h} />
        <ResultsPanel order={h} />
      </>
    ),
  }
  return <DocumentDetail config={config} />
}
