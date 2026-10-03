export type AuditAction = 'insert' | 'update' | 'delete' | 'status_change'

export type AuditLog = {
  id: string
  organization_id: string
  user_id: string | null
  action: AuditAction
  entity: string
  entity_id: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  changed: string[] | null
  ip: string | null
  device: string | null
  source: string
  correlation_id: string | null
  reason: string | null
  created_at: string
}

export const ACTION_LABELS: Record<AuditAction, string> = {
  insert: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  status_change: 'Changement de statut',
}

/** Business-friendly names of the audited tables. */
export const ENTITY_LABELS: Record<string, string> = {
  items: 'Article', partners: 'Partenaire', warehouses: 'Entrepôt', locations: 'Emplacement', purchase_orders: 'Commande d’achat',
  purchase_receipts: 'Réception', sales_orders: 'Commande client', deliveries: 'Livraison', stock_adjustments: 'Ajustement', stock_transfers: 'Transfert',
  inventory_counts: 'Comptage', production_orders: 'Ordre de fabrication', boms: 'Nomenclature', bom_versions: 'Version de nomenclature',
  inspections: 'Inspection', non_conformances: 'Non-conformité', capa_actions: 'Action CAPA', assets: 'Équipement', maintenance_work_orders: 'Ordre de maintenance',
  employees: 'Employé', payments: 'Paiement', expenses: 'Dépense', sales_invoices: 'Facture client', supplier_invoices: 'Facture fournisseur',
}
export const entityLabel = (table: string) => ENTITY_LABELS[table] ?? table.replace(/_/g, ' ')
