import type { OrgRole } from '../organization/types'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type ApprovalPolicy = {
  id: string
  organization_id: string
  entity_type: string
  name: string
  min_amount: number
  steps: { role: OrgRole; label?: string }[]
  active: boolean
}
export type ApprovalRequest = {
  id: string
  organization_id: string
  entity_type: string
  entity_id: string
  summary: string | null
  amount: number
  policy_id: string | null
  status: ApprovalStatus
  current_step: number
  requested_by: string | null
  decided_at: string | null
  created_at: string
}
export type ApprovalStep = { id: string; request_id: string; step_no: number; role: OrgRole; label: string | null; status: 'waiting' | 'pending' | 'approved' | 'rejected' | 'skipped'; decided_by: string | null; decided_at: string | null }
export type ApprovalAction = { id: string; request_id: string; step_no: number; actor_id: string | null; action: 'requested' | 'approved' | 'rejected' | 'cancelled' | 'commented'; comment: string | null; created_at: string }

export const ENTITY_TYPES: { value: string; label: string; path: string }[] = [
  { value: 'purchase_order', label: 'Commande d’achat', path: 'achats/commandes' },
  { value: 'purchase_request', label: 'Demande d’achat', path: 'achats/demandes' },
  { value: 'stock_adjustment', label: 'Ajustement de stock', path: 'inventaire/ajustements' },
  { value: 'stock_scrap', label: 'Rebut', path: 'inventaire/ajustements' },
  { value: 'inventory_count', label: 'Comptage d’inventaire', path: 'inventaire/comptages' },
  { value: 'production_close', label: 'Clôture de production', path: 'production/ordres' },
  { value: 'sales_order', label: 'Commande client', path: 'ventes/commandes' },
  { value: 'quote', label: 'Devis', path: 'ventes/devis' },
  { value: 'supplier_invoice', label: 'Facture fournisseur', path: 'achats/factures' },
  { value: 'payment', label: 'Paiement', path: 'finance/paiements' },
  { value: 'expense', label: 'Dépense', path: 'finance/depenses' },
]
export const entityTypeLabel = (v: string) => ENTITY_TYPES.find((e) => e.value === v)?.label ?? v
export const entityTypePath = (v: string, id: string) => {
  const e = ENTITY_TYPES.find((x) => x.value === v)
  return e ? `${e.path}/${id}` : ''
}
