'use client'

import { Package } from 'lucide-react'
import { useMemo } from 'react'
import type { DataTableColumn, DataTableFilter } from '@/components/data-table'
import { formatMoney, formatQty } from '@/lib/format'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { useCategoryOptions } from '../categories/hooks'
import { ITEM_CREATE_FIELDS } from './fields'
import { itemHooks, useItemStock } from './hooks'
import { ITEM_TYPE_LABELS, itemTypeOptions, type Item } from './types'

const filter: DataTableFilter<Item> = { label: 'Type', options: itemTypeOptions, getValue: (i) => i.item_type }

/** Item master (one universal object for raw materials, components, finished goods, spare parts, services…). */
export function ItemsPage() {
  const stock = useItemStock()
  const categories = useCategoryOptions()
  const byItem = useMemo(() => new Map((stock.data ?? []).map((s) => [s.item_id, s])), [stock.data])
  const columns: DataTableColumn<Item>[] = [
    { key: 'sku', label: 'Référence', value: (i) => i.sku },
    { key: 'name', label: 'Désignation', value: (i) => i.name },
    { key: 'type', label: 'Type', value: (i) => ITEM_TYPE_LABELS[i.item_type] },
    { key: 'category', label: 'Catégorie', value: (i) => categories.find((c) => c.value === i.category_id)?.label ?? '—' },
    {
      key: 'available', label: 'Disponible', align: 'right', value: (i) => byItem.get(i.id)?.available ?? 0,
      render: (i) => {
        const s = byItem.get(i.id)
        return s?.low_stock ? <Pill tone="critical">{formatQty(s.available)}</Pill> : formatQty(s?.available ?? 0)
      },
    },
    { key: 'cost', label: 'Coût moyen', align: 'right', value: (i) => i.avg_cost, render: (i) => formatMoney(i.avg_cost) },
    { key: 'price', label: 'Prix de vente', align: 'right', value: (i) => i.sale_price, render: (i) => formatMoney(i.sale_price) },
    { key: 'active', label: 'Statut', value: (i) => (i.active ? 'Actif' : 'Inactif'), render: (i) => <Pill tone={i.active ? 'success' : 'neutral'}>{i.active ? 'Actif' : 'Inactif'}</Pill> },
  ]
  return (
    <EntityPage<Item>
      title="Articles"
      singular="article"
      icon={Package}
      description="Un seul objet pour matières premières, composants, emballages, semi-finis, produits finis, pièces de rechange et services."
      hooks={itemHooks}
      permission="catalog.write"
      columns={columns}
      filter={filter}
      fields={ITEM_CREATE_FIELDS}
      detailPath={(i) => `catalogue/articles/${i.id}`}
      exportName="articles"
    />
  )
}
