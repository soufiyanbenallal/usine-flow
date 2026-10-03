export type PartnerKind = 'customer' | 'supplier' | 'subcontractor' | 'transporter' | 'other'

export type Partner = {
  id: string
  organization_id: string
  code: string
  name: string
  name_ar: string | null
  kinds: PartnerKind[]
  category: string | null
  ice: string | null
  if_number: string | null
  rc: string | null
  tax_profile: string | null
  email: string | null
  phone: string | null
  website: string | null
  payment_terms_days: number
  credit_limit: number
  currency: string
  price_list_id: string | null
  lead_time_days: number
  rating: number | null
  notes: string | null
  active: boolean
  created_at: string
}
export type PartnerContact = { id: string; partner_id: string; name: string; role: string | null; email: string | null; phone: string | null; is_primary: boolean }
export type PartnerAddress = { id: string; partner_id: string; kind: 'billing' | 'delivery' | 'other'; line1: string; line2: string | null; city: string | null; postal_code: string | null; country: string; is_default: boolean }
export type PartnerBalance = { partner_id: string; name: string; kinds: PartnerKind[]; credit_limit: number; receivable: number; receivable_overdue: number; payable: number; payable_overdue: number }
export type SupplierPerformance = { supplier_id: string; name: string; orders: number; receipts: number; on_time_pct: number | null; avg_lead_time_days: number | null; defect_rate_pct: number | null }

export const KIND_LABELS: Record<PartnerKind, string> = { customer: 'Client', supplier: 'Fournisseur', subcontractor: 'Sous-traitant', transporter: 'Transporteur', other: 'Autre' }
export const TAX_PROFILES = [
  { value: 'standard', label: 'Assujetti TVA (standard)' }, { value: 'exempt', label: 'Exonéré' }, { value: 'export', label: 'Export' }, { value: 'auto_entrepreneur', label: 'Auto-entrepreneur' },
]
export const ADDRESS_KINDS = [{ value: 'billing', label: 'Facturation' }, { value: 'delivery', label: 'Livraison' }, { value: 'other', label: 'Autre' }]
