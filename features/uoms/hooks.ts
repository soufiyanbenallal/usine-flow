'use client'

import { useMemo } from 'react'
import { createCrudHooks } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { conversionsService, uomsService } from './service'

export const uomHooks = createCrudHooks('uoms', uomsService, ['items'])
export const conversionHooks = createCrudHooks('uom_conversions', conversionsService)

export function useUomOptions(): Option[] {
  const { data } = uomHooks.useList()
  return useMemo(() => (data ?? []).filter((u) => u.active).map((u) => ({ value: u.id, label: u.code, hint: u.name })), [data])
}
