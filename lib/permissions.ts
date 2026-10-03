import type { OrgRole } from '@/features/organization/types'

/** Granular permissions. Mirrors `public.role_permissions` (see supabase/migrations/…_platform.sql). */
export const PERMISSIONS = [
  'platform.manage', 'users.manage', 'integrations.manage', 'audit.view', 'approvals.decide', 'documents.write',
  'catalog.write', 'partners.write',
  'warehouse.manage', 'warehouse.receive', 'warehouse.pick', 'warehouse.dispatch',
  'inventory.adjust', 'inventory.transfer', 'inventory.count',
  'purchase.write', 'purchase.approve', 'sales.write', 'sales.approve',
  'production.write', 'production.start', 'production.report', 'production.complete', 'planning.run',
  'quality.manage', 'quality.inspect', 'maintenance.write', 'maintenance.report', 'maintenance.complete',
  'workforce.write', 'finance.write',
] as const
export type Permission = (typeof PERMISSIONS)[number]

const OPERATIONAL = PERMISSIONS.filter((p) => !['platform.manage', 'users.manage', 'integrations.manage'].includes(p)) as Permission[]

/** Default matrix (owners/admins have everything). Organizations can override it per role. */
export const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: PERMISSIONS,
  site_manager: OPERATIONAL,
  accountant: ['audit.view', 'partners.write', 'purchase.write', 'sales.write', 'finance.write', 'approvals.decide', 'purchase.approve', 'documents.write'],
  warehouse_manager: ['catalog.write', 'partners.write', 'warehouse.manage', 'warehouse.receive', 'warehouse.pick', 'warehouse.dispatch', 'inventory.adjust', 'inventory.transfer', 'inventory.count', 'documents.write', 'maintenance.report', 'quality.inspect'],
  purchasing_manager: ['catalog.write', 'partners.write', 'purchase.write', 'purchase.approve', 'warehouse.receive', 'approvals.decide', 'documents.write', 'planning.run'],
  sales_manager: ['catalog.write', 'partners.write', 'sales.write', 'sales.approve', 'approvals.decide', 'documents.write', 'warehouse.dispatch'],
  production_manager: ['catalog.write', 'production.write', 'production.start', 'production.report', 'production.complete', 'inventory.transfer', 'planning.run', 'workforce.write', 'approvals.decide', 'documents.write', 'maintenance.report', 'quality.inspect'],
  quality_manager: ['quality.manage', 'quality.inspect', 'documents.write', 'approvals.decide', 'audit.view'],
  maintenance_manager: ['maintenance.write', 'maintenance.report', 'maintenance.complete', 'inventory.transfer', 'documents.write', 'approvals.decide'],
  operator: ['production.report', 'warehouse.pick', 'warehouse.receive', 'inventory.count', 'quality.inspect', 'maintenance.report'],
  viewer: [],
}

export type PermissionOverrides = Partial<Record<OrgRole, Partial<Record<Permission, boolean>>>>

export const PERMISSION_LABELS: Record<Permission, string> = {
  'platform.manage': 'Gérer l’organisation, les sites et les modules',
  'users.manage': 'Gérer les utilisateurs et les rôles',
  'integrations.manage': 'Gérer les intégrations (webhooks, clés API)',
  'audit.view': 'Consulter le journal d’audit',
  'approvals.decide': 'Décider des approbations',
  'documents.write': 'Gérer les documents et pièces jointes',
  'catalog.write': 'Gérer le catalogue (articles, unités)',
  'partners.write': 'Gérer les clients et fournisseurs',
  'warehouse.manage': 'Gérer entrepôts, zones et emplacements',
  'warehouse.receive': 'Réceptionner la marchandise',
  'warehouse.pick': 'Préparer les commandes (picking)',
  'warehouse.dispatch': 'Expédier et livrer',
  'inventory.adjust': 'Ajuster le stock',
  'inventory.transfer': 'Transférer le stock',
  'inventory.count': 'Réaliser des inventaires',
  'purchase.write': 'Créer des achats (demandes, commandes)',
  'purchase.approve': 'Approuver les achats',
  'sales.write': 'Créer des ventes (devis, commandes)',
  'sales.approve': 'Approuver les ventes',
  'production.write': 'Gérer nomenclatures, gammes et ordres',
  'production.start': 'Lancer des ordres de fabrication',
  'production.report': 'Déclarer la production (atelier)',
  'production.complete': 'Terminer et clôturer des ordres',
  'planning.run': 'Lancer la planification (MRP)',
  'quality.manage': 'Gérer plans qualité, CAPA et rappels',
  'quality.inspect': 'Réaliser des inspections',
  'maintenance.write': 'Gérer équipements et plans de maintenance',
  'maintenance.report': 'Déclarer pannes et relevés',
  'maintenance.complete': 'Exécuter et clôturer les ordres de maintenance',
  'workforce.write': 'Gérer le personnel et les horaires',
  'finance.write': 'Gérer paiements, dépenses et factures',
}

/** Group of a permission (module), used by the roles matrix page. */
export const permissionGroup = (p: Permission) => p.split('.')[0]!

export function hasPermission(role: OrgRole | null | undefined, permission: Permission, overrides?: PermissionOverrides): boolean {
  if (!role) return false
  if (role === 'owner' || role === 'admin') return true
  const override = overrides?.[role]?.[permission]
  if (override !== undefined) return override
  return ROLE_PERMISSIONS[role].includes(permission)
}

export const hasAnyPermission = (role: OrgRole | null | undefined, permissions: Permission[], overrides?: PermissionOverrides) =>
  permissions.some((p) => hasPermission(role, p, overrides))
