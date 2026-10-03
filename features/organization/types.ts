export type OrgRole =
  | 'owner'
  | 'admin'
  | 'site_manager'
  | 'accountant'
  | 'warehouse_manager'
  | 'purchasing_manager'
  | 'sales_manager'
  | 'production_manager'
  | 'quality_manager'
  | 'maintenance_manager'
  | 'operator'
  | 'viewer'

/** Organization the signed-in user belongs to, plus their role in it. */
export type Organization = { id: string; name: string; slug: string; role: OrgRole }

/** Full organization row (company legal information). */
export type OrganizationDetails = {
  id: string
  name: string
  slug: string
  legal_form: string | null
  ice: string | null
  if_number: string | null
  rc: string | null
  patente: string | null
  cnss: string | null
  address: string | null
  city: string | null
  phone: string | null
  email: string | null
  currency: string
  created_at: string
  /** Raw JSON; use `useSettings()` for the resolved, defaulted version. */
  settings: Record<string, unknown>
}

export type OrganizationPatch = Partial<Omit<OrganizationDetails, 'id' | 'currency' | 'created_at'>>

export const WRITE_ROLES: OrgRole[] = ['owner', 'admin', 'site_manager', 'accountant', 'warehouse_manager', 'purchasing_manager', 'sales_manager', 'production_manager', 'quality_manager', 'maintenance_manager']
export const ADMIN_ROLES: OrgRole[] = ['owner', 'admin']

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: 'Propriétaire',
  admin: 'Administrateur',
  site_manager: 'Responsable de site',
  accountant: 'Comptable',
  warehouse_manager: 'Responsable entrepôt',
  purchasing_manager: 'Responsable achats',
  sales_manager: 'Responsable ventes',
  production_manager: 'Responsable production',
  quality_manager: 'Responsable qualité',
  maintenance_manager: 'Responsable maintenance',
  operator: 'Opérateur',
  viewer: 'Lecture seule',
}
/** Roles that can be assigned through invitations / role changes (ownership transfer is not supported yet). */
export const ASSIGNABLE_ROLES: OrgRole[] = ['admin', 'site_manager', 'accountant', 'warehouse_manager', 'purchasing_manager', 'sales_manager', 'production_manager', 'quality_manager', 'maintenance_manager', 'operator', 'viewer']
