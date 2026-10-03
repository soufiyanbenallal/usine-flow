'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { createPickerSource } from '../_core/picker'
import { useOrganization } from '../organization/context'
import { barcodesService, itemPricesService, itemStockService, itemSuppliersService, itemsService, itemUomsService } from './service'
import type { Item, ItemStock } from './types'

export const itemHooks = createCrudHooks('items', itemsService, ['stock'])
export const barcodeHooks = createCrudHooks('item_barcodes', barcodesService)
export const itemSupplierHooks = createCrudHooks('item_suppliers', itemSuppliersService)
export const itemPriceHooks = createCrudHooks('item_prices', itemPricesService)
export const itemUomHooks = createCrudHooks('item_uoms', itemUomsService)

/** Items (SKU + name) as a server-side typeahead: scales to 100k+ articles. */
export const itemPicker = createPickerSource<Pick<Item, 'id' | 'sku' | 'name'>>({
  feature: 'items', table: 'items', select: 'id, sku, name', searchColumns: ['sku', 'name'], order: 'sku', where: { active: true },
  toOption: (i) => ({ value: i.id, label: i.sku, hint: i.name }),
})
/** Same without the `active` filter, to display historical rows. */
export const anyItemPicker = createPickerSource<Pick<Item, 'id' | 'sku' | 'name'>>({
  feature: 'items', table: 'items', select: 'id, sku, name', searchColumns: ['sku', 'name'], order: 'sku',
  toOption: (i) => ({ value: i.id, label: i.sku, hint: i.name }),
})

export function useItemStock() {
  const org = useOrganization()
  return useQuery<ItemStock[], Error>({ queryKey: [...featureKey(org.id, 'stock'), 'summary'], queryFn: () => itemStockService.list(org.id) })
}

/** SKU → item name map for table columns (cached list of items). */
export function useItemIndex() {
  const { data } = itemHooks.useList()
  return useMemo(() => new Map((data ?? []).map((i) => [i.id, i])), [data])
}

export function useItemOptions(filter?: (i: Item) => boolean): Option[] {
  const { data } = itemHooks.useList()
  return useMemo(() => (data ?? []).filter((i) => i.active && (!filter || filter(i))).map((i) => ({ value: i.id, label: i.sku, hint: i.name })), [data, filter])
}
