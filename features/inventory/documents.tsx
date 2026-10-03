'use client'

import { Banner, Button, NumberField } from '@xco-agency/corex-ui'
import { ClipboardCheck, ArrowLeftRight, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import type { DataTableColumn } from '@/components/data-table'
import { Panel } from '@/components/page-shell'
import { formatDate, formatMoney, formatQty } from '@/lib/format'
import { pct, sub } from '@/lib/decimal'
import { cancelAction, reverseAction, rpcAction, submitAction } from '../_core/doc-actions'
import { DocumentDetail, type DocumentConfig } from '../_core/document-detail'
import { EntityPage } from '../_core/entity-page'
import { Status } from '../_core/status'
import { useInvalidateFeatures } from '../_core/crud-hooks'
import { itemPicker, useItemIndex } from '../items/hooks'
import { useLocationIndex, useLocationOptions, useWarehouseOptions } from '../warehouses/hooks'
import { stockAccuracy } from './calculations'
import {
  adjustmentHooks, adjustmentLineHooks, countHooks, countLineHooks, lotPicker, transferHooks, transferLineHooks, STOCK_FEATURES, useRecordCountLine,
} from './hooks'
import { inventoryApi } from './service'
import { ADJUSTMENT_KINDS, COUNT_KINDS, bucketOptions, type InventoryCount, type InventoryCountLine, type StockAdjustment, type StockAdjustmentLine, type StockTransfer, type StockTransferLine } from './types'

function useLookups() {
  const items = useItemIndex()
  const locations = useLocationIndex()
  const warehouses = useWarehouseOptions()
  return {
    item: (id: string) => (items.get(id) ? `${items.get(id)!.sku} — ${items.get(id)!.name}` : id),
    location: (id: string | null) => (id ? (locations.get(id)?.code ?? id) : '—'),
    warehouse: (id: string) => warehouses.find((w) => w.value === id)?.label ?? id,
  }
}

/* ───────── adjustments ───────── */

const ADJ_HEADER = [
  { key: 'warehouse_id', label: 'Entrepôt', type: 'relation' as const, useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'kind', label: 'Type', type: 'select' as const, options: ADJUSTMENT_KINDS, required: true, default: 'adjustment' },
  { key: 'adjusted_on', label: 'Date', type: 'date' as const },
  { key: 'reason', label: 'Motif' },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]

export function AdjustmentsPage() {
  const l = useLookups()
  const columns: DataTableColumn<StockAdjustment>[] = [
    { key: 'number', label: 'N°', value: (a) => a.number ?? '—' },
    { key: 'kind', label: 'Type', value: (a) => ADJUSTMENT_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind },
    { key: 'wh', label: 'Entrepôt', value: (a) => l.warehouse(a.warehouse_id) },
    { key: 'date', label: 'Date', value: (a) => formatDate(a.adjusted_on) },
    { key: 'value', label: 'Valeur', align: 'right', value: (a) => a.total_value, render: (a) => formatMoney(a.total_value) },
    { key: 'status', label: 'Statut', value: (a) => a.status, render: (a) => <Status value={a.status} /> },
  ]
  return (
    <EntityPage<StockAdjustment>
      title="Ajustements"
      singular="ajustement"
      icon={SlidersHorizontal}
      description="Corrections de stock par document (casse, rebut, surplus, stock initial). Chaque ligne crée un mouvement dans le grand livre."
      hooks={adjustmentHooks}
      permission="inventory.adjust"
      columns={columns}
      filter={{ label: 'Statut', options: ['draft', 'pending_approval', 'approved', 'posted', 'reversed', 'cancelled'].map((s) => ({ value: s, label: s })), getValue: (a) => a.status }}
      fields={ADJ_HEADER}
      detailPath={(a) => `inventaire/ajustements/${a.id}`}
      afterCreatePath={(a) => `inventaire/ajustements/${a.id}`}
    />
  )
}

export function AdjustmentDetailPage() {
  const l = useLookups()
  const config: DocumentConfig<StockAdjustment, StockAdjustmentLine> = {
    title: 'Ajustements', singular: 'Ajustement de stock', icon: SlidersHorizontal, listPath: 'inventaire/ajustements', entity: 'stock_adjustments', approvalType: 'stock_adjustment',
    header: { hooks: adjustmentHooks, fields: ADJ_HEADER, editPermission: 'inventory.adjust' },
    lines: {
      hooks: adjustmentLineHooks, fk: 'adjustment_id', singular: 'ligne d’ajustement',
      fields: [
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'quantity_delta', label: 'Variation (+ entrée / − sortie)', type: 'number', required: true, help: 'Quantité dans l’unité de base de l’article.' },
        { key: 'location_id', label: 'Emplacement', type: 'relation', useOptions: () => useLocationOptions() },
        { key: 'lot_number', label: 'N° de lot (entrées)' },
        { key: 'expires_on', label: 'Péremption (entrées)', type: 'date' },
        { key: 'lot_id', label: 'Lot existant (sorties)', type: 'picker', picker: lotPicker },
        { key: 'bucket', label: 'État du stock', type: 'select', options: bucketOptions, required: true, default: 'available' },
        { key: 'unit_cost', label: 'Coût unitaire (entrées)', type: 'money', min: 0 },
        { key: 'serials', label: 'Numéros de série', type: 'tags' },
        { key: 'reason', label: 'Motif de la ligne' },
      ],
      useColumns: () => [
        { key: 'item', label: 'Article', value: (x) => l.item(x.item_id) },
        { key: 'loc', label: 'Emplacement', value: (x) => l.location(x.location_id) },
        { key: 'lot', label: 'Lot', value: (x) => x.lot_number ?? '—' },
        { key: 'qty', label: 'Variation', align: 'right', value: (x) => x.quantity_delta, render: (x) => <span className={x.quantity_delta < 0 ? 'text-red-700' : 'text-emerald-700'}>{x.quantity_delta > 0 ? '+' : ''}{formatQty(x.quantity_delta)}</span> },
        { key: 'cost', label: 'Coût unit.', align: 'right', value: (x) => x.unit_cost ?? '—' },
      ],
    },
    actions: [
      submitAction('stock_adjustment', 'inventory.adjust'),
      rpcAction({ key: 'post', label: 'Comptabiliser', fn: 'post_stock_adjustment', tone: 'primary', permission: 'inventory.adjust', visible: (h) => h.status === 'draft' || h.status === 'approved', confirm: 'Les mouvements de stock seront créés et le document ne pourra plus être modifié.' }),
      cancelAction('stock_adjustment', 'inventory.adjust'),
      reverseAction('stock_adjustment', 'inventory.adjust'),
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── transfers ───────── */

const TRF_HEADER = [
  { key: 'from_warehouse_id', label: 'Entrepôt source', type: 'relation' as const, useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'to_warehouse_id', label: 'Entrepôt destination', type: 'relation' as const, useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'transfer_date', label: 'Date', type: 'date' as const },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]

export function TransfersPage() {
  const l = useLookups()
  const columns: DataTableColumn<StockTransfer>[] = [
    { key: 'number', label: 'N°', value: (t) => t.number ?? '—' },
    { key: 'from', label: 'De', value: (t) => l.warehouse(t.from_warehouse_id) },
    { key: 'to', label: 'Vers', value: (t) => l.warehouse(t.to_warehouse_id) },
    { key: 'date', label: 'Date', value: (t) => formatDate(t.transfer_date) },
    { key: 'status', label: 'Statut', value: (t) => t.status, render: (t) => <Status value={t.status} /> },
  ]
  return (
    <EntityPage<StockTransfer>
      title="Transferts"
      singular="transfert"
      icon={ArrowLeftRight}
      description="Transferts entre entrepôts ou emplacements : sortie et entrée liées dans le grand livre, valorisation inchangée."
      hooks={transferHooks}
      permission="inventory.transfer"
      columns={columns}
      fields={TRF_HEADER}
      detailPath={(t) => `inventaire/transferts/${t.id}`}
      afterCreatePath={(t) => `inventaire/transferts/${t.id}`}
    />
  )
}

export function TransferDetailPage() {
  const l = useLookups()
  const config: DocumentConfig<StockTransfer, StockTransferLine> = {
    title: 'Transferts', singular: 'Transfert de stock', icon: ArrowLeftRight, listPath: 'inventaire/transferts', entity: 'stock_transfers',
    header: { hooks: transferHooks, fields: TRF_HEADER, editPermission: 'inventory.transfer' },
    lines: {
      hooks: transferLineHooks, fk: 'transfer_id', singular: 'ligne de transfert',
      fields: [
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'quantity', label: 'Quantité (unité de base)', type: 'number', min: 0.0001, required: true },
        { key: 'from_location_id', label: 'Emplacement source', type: 'relation', useOptions: () => useLocationOptions() },
        { key: 'to_location_id', label: 'Emplacement destination', type: 'relation', useOptions: () => useLocationOptions() },
        { key: 'lot_id', label: 'Lot', type: 'picker', picker: lotPicker },
      ],
      useColumns: () => [
        { key: 'item', label: 'Article', value: (x) => l.item(x.item_id) },
        { key: 'qty', label: 'Quantité', align: 'right', value: (x) => x.quantity, render: (x) => formatQty(x.quantity) },
        { key: 'from', label: 'De', value: (x) => l.location(x.from_location_id) },
        { key: 'to', label: 'Vers', value: (x) => l.location(x.to_location_id) },
      ],
    },
    actions: [
      rpcAction({ key: 'post', label: 'Comptabiliser le transfert', fn: 'post_stock_transfer', tone: 'primary', permission: 'inventory.transfer', visible: (h) => h.status === 'draft', confirm: 'Le stock sera déplacé (sortie + entrée).' }),
      cancelAction('stock_transfer', 'inventory.transfer'),
      reverseAction('stock_transfer', 'inventory.transfer'),
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── counts ───────── */

const COUNT_HEADER = [
  { key: 'warehouse_id', label: 'Entrepôt', type: 'relation' as const, useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'kind', label: 'Type', type: 'select' as const, options: COUNT_KINDS, required: true, default: 'cycle' },
  { key: 'scheduled_on', label: 'Date prévue', type: 'date' as const },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]

export function CountsPage() {
  const l = useLookups()
  const columns: DataTableColumn<InventoryCount>[] = [
    { key: 'number', label: 'N°', value: (c) => c.number ?? '—' },
    { key: 'kind', label: 'Type', value: (c) => COUNT_KINDS.find((k) => k.value === c.kind)?.label ?? c.kind },
    { key: 'wh', label: 'Entrepôt', value: (c) => l.warehouse(c.warehouse_id) },
    { key: 'date', label: 'Prévu le', value: (c) => formatDate(c.scheduled_on) },
    { key: 'variance', label: 'Écart valorisé', align: 'right', value: (c) => c.total_variance_value, render: (c) => formatMoney(c.total_variance_value) },
    { key: 'status', label: 'Statut', value: (c) => c.status, render: (c) => <Status value={c.status} /> },
  ]
  return (
    <EntityPage<InventoryCount>
      title="Comptages"
      singular="inventaire"
      icon={ClipboardCheck}
      description="Inventaires tournants ou complets : instantané du stock théorique, saisie des quantités comptées, comptabilisation des écarts."
      hooks={countHooks}
      permission="inventory.count"
      columns={columns}
      fields={COUNT_HEADER}
      detailPath={(c) => `inventaire/comptages/${c.id}`}
      afterCreatePath={(c) => `inventaire/comptages/${c.id}`}
    />
  )
}

/** Counting sheet: expected vs counted quantity per line, variance and accuracy. Quantities are saved line by line. */
function CountSheet({ count }: { count: InventoryCount }) {
  const l = useLookups()
  const lines = countLineHooks.useListBy('count_id', count.id)
  const record = useRecordCountLine()
  const [draft, setDraft] = useState<Record<string, string>>({})
  const open = count.status === 'in_progress' || count.status === 'review'
  const rows = lines.data ?? []
  const accuracy = stockAccuracy(rows.map((r) => ({ expected: r.expected_qty, counted: r.counted_qty })))
  const counted = rows.filter((r) => r.counted_qty !== null).length
  return (
    <Panel title={`Feuille de comptage — ${counted}/${rows.length} lignes · exactitude ${accuracy} %`}>
      {record.error && <Banner tone="critical">{record.error.message}</Banner>}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Article</th>
              <th className="px-3 font-medium">Emplacement</th>
              <th className="px-3 text-right font-medium">Théorique</th>
              <th className="px-3 text-right font-medium">Compté</th>
              <th className="px-3 text-right font-medium">Écart</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: InventoryCountLine) => {
              const value = draft[r.id] ?? (r.counted_qty === null ? '' : String(r.counted_qty))
              const variance = value === '' ? null : sub(value, r.expected_qty).toNumber()
              return (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-3">{l.item(r.item_id)}</td>
                  <td className="px-3">{l.location(r.location_id)}</td>
                  <td className="px-3 text-right tabular-nums">{formatQty(r.expected_qty)}</td>
                  <td className="px-3 text-right">
                    {open ? (
                      <div className="ml-auto w-28">
                        <NumberField label="Compté" labelAccessibilityVisibility="exclusive" value={value} min={0} onChange={(v) => setDraft((d) => ({ ...d, [r.id]: v }))} onBlur={() => { const v = draft[r.id]; if (v !== undefined && v !== '' && Number(v) !== r.counted_qty) record.mutate({ line: r.id, counted: Number(v) }) }} />
                      </div>
                    ) : (
                      formatQty(r.counted_qty ?? 0)
                    )}
                  </td>
                  <td className={`px-3 text-right tabular-nums ${variance ? (variance < 0 ? 'text-red-700' : 'text-emerald-700') : ''}`}>{variance === null ? '—' : `${variance > 0 ? '+' : ''}${formatQty(variance)}`}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="py-4 text-center text-[13px] text-muted-foreground">Aucune ligne : démarrez l’inventaire pour figer le stock théorique.</p>}
      {rows.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Exactitude du stock : {pct(rows.filter((r) => r.counted_qty === r.expected_qty).length, Math.max(counted, 1)).toNumber()} % des lignes comptées sans écart.</p>}
    </Panel>
  )
}

export function CountDetailPage() {
  const invalidate = useInvalidateFeatures()
  const config: DocumentConfig<InventoryCount, InventoryCountLine> = {
    title: 'Comptages', singular: 'Inventaire', icon: ClipboardCheck, listPath: 'inventaire/comptages', entity: 'inventory_counts', approvalType: 'inventory_count',
    header: { hooks: countHooks, fields: COUNT_HEADER, editPermission: 'inventory.count' },
    actions: [
      { key: 'start', label: 'Démarrer l’inventaire', tone: 'primary', permission: 'inventory.count', visible: (h) => h.status === 'draft' || h.status === 'in_progress', run: async (h) => { await inventoryApi.startCount(h.id); await invalidate(...STOCK_FEATURES) } },
      { key: 'post', label: 'Comptabiliser les écarts', tone: 'primary', permission: 'inventory.count', confirm: 'Les écarts seront comptabilisés comme ajustements dans le grand livre.', visible: (h) => h.status === 'in_progress' || h.status === 'review', run: (h) => inventoryApi.postCount(h.id) },
      cancelAction('inventory_count', 'inventory.count'),
      reverseAction('inventory_count', 'inventory.count'),
    ],
    extra: (h) => <CountSheet count={h} />,
  }
  return <DocumentDetail config={config} />
}
