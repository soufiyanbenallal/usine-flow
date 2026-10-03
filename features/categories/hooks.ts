'use client'

import { useMemo } from 'react'
import { createCrudHooks } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { categoriesService } from './service'

export const categoryHooks = createCrudHooks('item_categories', categoriesService, ['items'])

export function useCategoryOptions(): Option[] {
  const { data } = categoryHooks.useList()
  return useMemo(() => (data ?? []).filter((c) => c.active).map((c) => ({ value: c.id, label: c.name, hint: c.code })), [data])
}
