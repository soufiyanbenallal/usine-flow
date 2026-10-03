'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { createPickerSource } from '../_core/picker'
import { useOrganization } from '../organization/context'
import { addressesService, contactsService, partnerReports, partnersService } from './service'
import type { Partner, PartnerBalance, PartnerKind, SupplierPerformance } from './types'

export const partnerHooks = createCrudHooks('partners', partnersService, ['balances'])
export const contactHooks = createCrudHooks('partner_contacts', contactsService)
export const addressHooks = createCrudHooks('partner_addresses', addressesService)

/** Typeahead over every partner (use `usePartnerOptions(kind)` for lists limited to one role). */
export const partnerPicker = createPickerSource<Pick<Partner, 'id' | 'code' | 'name'>>({
  feature: 'partners', table: 'partners', select: 'id, code, name', searchColumns: ['name', 'code'], order: 'name',
  toOption: (p) => ({ value: p.id, label: p.name, hint: p.code }),
})

export function usePartnerOptions(kind?: PartnerKind): Option[] {
  const { data } = partnerHooks.useList()
  return useMemo(() => (data ?? []).filter((p) => p.active && (!kind || p.kinds.includes(kind))).map((p) => ({ value: p.id, label: p.name, hint: p.code })), [data, kind])
}
export const useCustomerOptions = () => usePartnerOptions('customer')
export const useSupplierOptions = () => usePartnerOptions('supplier')
export const useTransporterOptions = () => usePartnerOptions('transporter')

export function usePartnerIndex() {
  const { data } = partnerHooks.useList()
  return useMemo(() => new Map((data ?? []).map((p) => [p.id, p])), [data])
}

export function usePartnerBalances() {
  const org = useOrganization()
  return useQuery<PartnerBalance[], Error>({ queryKey: [...featureKey(org.id, 'balances')], queryFn: () => partnerReports.balances(org.id) })
}
export function useSupplierPerformance() {
  const org = useOrganization()
  return useQuery<SupplierPerformance[], Error>({ queryKey: [...featureKey(org.id, 'supplier_performance')], queryFn: () => partnerReports.supplierPerformance(org.id) })
}
