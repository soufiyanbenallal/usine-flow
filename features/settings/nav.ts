import { Bell, Boxes, Building2, CreditCard, Gauge, Globe, Hash, KeyRound, ListChecks, MapPin, Percent, Plug, ShieldCheck, SlidersHorizontal, Users, type LucideIcon } from 'lucide-react'

export type SettingsNavItem = { path: string; label: string; icon: LucideIcon; keywords?: string }
export type SettingsNavGroup = { label?: string; items: SettingsNavItem[] }

/** Paths are relative to the organization (`/<slug>/<path>`). `parametres` itself is the first page. */
export const SETTINGS_ROOT = 'parametres'

export const settingsNav: SettingsNavGroup[] = [
  {
    items: [
      { path: SETTINGS_ROOT, label: 'Entreprise', icon: Building2, keywords: 'ice rc patente cnss adresse url slug' },
      { path: `${SETTINGS_ROOT}/utilisateurs`, label: 'Utilisateurs', icon: Users, keywords: 'membres invitations rôles équipe' },
      { path: `${SETTINGS_ROOT}/sites`, label: 'Sites', icon: MapPin, keywords: 'usine atelier entrepôt bureau' },
      { path: `${SETTINGS_ROOT}/roles`, label: 'Rôles et permissions', icon: KeyRound, keywords: 'droits accès matrice' },
    ],
  },
  {
    label: 'Espace de travail',
    items: [
      { path: `${SETTINGS_ROOT}/preferences`, label: 'Préférences', icon: SlidersHorizontal, keywords: 'bon de commande préfixe retenue' },
      { path: `${SETTINGS_ROOT}/modules`, label: 'Modules', icon: Boxes, keywords: 'activer mode usine atelier entrepôt fonctionnalités' },
      { path: `${SETTINGS_ROOT}/numerotation`, label: 'Numérotation', icon: Hash, keywords: 'préfixe séquence documents' },
      { path: `${SETTINGS_ROOT}/approbations`, label: 'Approbations', icon: ListChecks, keywords: 'workflow validation seuil' },
      { path: `${SETTINGS_ROOT}/taxes`, label: 'Taxes et TVA', icon: Percent, keywords: 'tva taux' },
      { path: `${SETTINGS_ROOT}/notifications`, label: 'Notifications', icon: Bell, keywords: 'alertes stock retard' },
      { path: `${SETTINGS_ROOT}/region`, label: 'Langue et région', icon: Globe, keywords: 'devise mad fuseau' },
    ],
  },
  {
    label: 'Compte',
    items: [
      { path: `${SETTINGS_ROOT}/integrations`, label: 'Intégrations', icon: Plug, keywords: 'webhook api clé erp' },
      { path: `${SETTINGS_ROOT}/usage`, label: 'Utilisation et quotas', icon: Gauge, keywords: 'plan limites consommation' },
      { path: `${SETTINGS_ROOT}/facturation`, label: 'Plan et facturation', icon: CreditCard, keywords: 'abonnement factures paiement' },
      { path: `${SETTINGS_ROOT}/securite`, label: 'Sécurité', icon: ShieldCheck, keywords: 'mot de passe session' },
    ],
  },
]

export const settingsItems = settingsNav.flatMap((g) => g.items)

/** Case/diacritic-insensitive filter over labels + keywords; empty query keeps the groups untouched. */
export function filterSettingsNav(query: string): SettingsNavGroup[] {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  const q = norm(query.trim())
  if (!q) return settingsNav
  return settingsNav
    .map((g) => ({ ...g, items: g.items.filter((i) => norm(`${i.label} ${i.keywords ?? ''}`).includes(q)) }))
    .filter((g) => g.items.length > 0)
}

/** The page is active on its exact path; `parametres` (the root) must not match its children. */
export const isSettingsItemActive = (pathname: string, slug: string, path: string) => {
  const full = `/${slug}/${path}`
  return path === SETTINGS_ROOT ? pathname === full : pathname === full || pathname.startsWith(`${full}/`)
}
