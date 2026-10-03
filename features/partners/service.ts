import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'
import type { Partner, PartnerAddress, PartnerBalance, PartnerContact, SupplierPerformance } from './types'

type Payload = Record<string, unknown>
export const partnersService = createCrudService<Partner, Payload, Payload>('partners', { order: { column: 'name', ascending: true } })
export const contactsService = createCrudService<PartnerContact, Payload, Payload>('partner_contacts')
export const addressesService = createCrudService<PartnerAddress, Payload, Payload>('partner_addresses')

export const partnerReports = {
  async balances(organizationId: string): Promise<PartnerBalance[]> {
    const { data, error } = await requireSupabase().from('partner_balances_view').select('*').eq('organization_id', organizationId).limit(5000)
    if (error) throw toUserError(error)
    return (data ?? []) as PartnerBalance[]
  },
  async supplierPerformance(organizationId: string): Promise<SupplierPerformance[]> {
    const { data, error } = await requireSupabase().from('supplier_performance_view').select('*').eq('organization_id', organizationId).limit(2000)
    if (error) throw toUserError(error)
    return (data ?? []) as SupplierPerformance[]
  },
}
