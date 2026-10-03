'use client'

import type { DataTableColumn } from '@/components/data-table'
import { formatMoney, formatQty } from '@/lib/format'
import { itemPicker, useItemIndex } from '../items/hooks'
import { VAT_OPTIONS } from '../items/types'
import { useUomOptions } from '../uoms/hooks'
import type { EntityField } from './form-values'

export type PricedLine = { id: string; item_id: string | null; description?: string | null; quantity: number; uom_id?: string | null; unit_price: number; discount_pct: number; vat_rate: number; line_total: number }

/** Form fields of a quoted / priced document line (quotes, orders, invoices). */
export const PRICED_LINE_FIELDS: EntityField[] = [
  { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true },
  { key: 'description', label: 'Description (optionnel)' },
  { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, required: true, default: 1 },
  { key: 'uom_id', label: 'Unité', type: 'relation', useOptions: useUomOptions, help: 'Vide = unité de base de l’article.' },
  { key: 'unit_price', label: 'Prix unitaire HT (MAD)', type: 'money', min: 0, required: true, default: 0 },
  { key: 'discount_pct', label: 'Remise (%)', type: 'number', min: 0, default: 0 },
  { key: 'vat_rate', label: 'TVA', type: 'select', options: VAT_OPTIONS, required: true, default: '20' },
]

/** Table columns of priced lines (item, quantity, price, discount, VAT, total). */
export function usePricedColumns<L extends PricedLine>(extra: DataTableColumn<L>[] = []): DataTableColumn<L>[] {
  const items = useItemIndex()
  const uoms = useUomOptions()
  return [
    { key: 'item', label: 'Article', value: (l) => (l.item_id ? `${items.get(l.item_id)?.sku ?? l.item_id} — ${items.get(l.item_id)?.name ?? ''}` : (l.description ?? '')) },
    { key: 'qty', label: 'Quantité', align: 'right', value: (l) => `${formatQty(l.quantity)} ${uoms.find((u) => u.value === l.uom_id)?.label ?? ''}`.trim() },
    { key: 'price', label: 'PU HT', align: 'right', value: (l) => formatMoney(l.unit_price) },
    { key: 'disc', label: 'Remise', align: 'right', value: (l) => (l.discount_pct ? `${l.discount_pct} %` : '—') },
    { key: 'vat', label: 'TVA', align: 'right', value: (l) => `${l.vat_rate} %` },
    ...extra,
    { key: 'total', label: 'Total HT', align: 'right', value: (l) => formatMoney(l.line_total) },
  ]
}
