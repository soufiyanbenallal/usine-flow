import type { Permission } from './permissions'

/** Product modules that can be switched on/off per organization (table `org_modules`). */
export const MODULES = [
  { key: 'inventory', label: 'Inventaire', description: 'Grand livre de stock, lots, séries, ajustements, transferts, comptages.' },
  { key: 'warehouse', label: 'Entrepôt (WMS)', description: 'Emplacements, mise en stock, préparation, colisage, expédition, scanner.' },
  { key: 'procurement', label: 'Achats', description: 'Demandes, appels d’offres, commandes, réceptions, factures fournisseurs.' },
  { key: 'sales', label: 'Ventes', description: 'Devis, commandes clients, livraisons, retours, factures, marges.' },
  { key: 'manufacturing', label: 'Fabrication', description: 'Nomenclatures, gammes, ordres de fabrication, MRP, coûts.' },
  { key: 'shopfloor', label: 'Atelier', description: 'Interface simplifiée opérateur et superviseur.' },
  { key: 'quality', label: 'Qualité', description: 'Inspections, non-conformités, CAPA, traçabilité, rappels.' },
  { key: 'maintenance', label: 'Maintenance (GMAO)', description: 'Équipements, préventif, correctif, pièces de rechange, MTBF/MTTR.' },
  { key: 'workforce', label: 'Équipe', description: 'Employés, horaires, présence, temps passé, compétences.' },
  { key: 'finance', label: 'Finance opérationnelle', description: 'Paiements, dépenses, trésorerie, soldes, export comptable.' },
  { key: 'analytics', label: 'Analytique', description: 'Tableaux de bord par métier, KPI et rapports.' },
  { key: 'documents', label: 'Documents', description: 'Bibliothèque de pièces jointes et certificats.' },
  { key: 'ai', label: 'Assistant IA', description: 'Recommandations, prévisions et extraction de documents.' },
] as const
export type ModuleKey = (typeof MODULES)[number]['key']

export const OPERATING_MODES = [
  { key: 'factory', label: 'Usine', description: 'Production complète : BOM, MRP, qualité, maintenance.', modules: MODULES.map((m) => m.key) },
  { key: 'workshop', label: 'Atelier', description: 'Ordres de travail, matières, main-d’œuvre, maintenance.', modules: ['inventory', 'procurement', 'sales', 'manufacturing', 'shopfloor', 'maintenance', 'workforce', 'finance', 'analytics', 'documents'] },
  { key: 'warehouse', label: 'Entrepôt', description: 'Stock, réception, préparation, expédition.', modules: ['inventory', 'warehouse', 'procurement', 'sales', 'analytics', 'documents'] },
] as const satisfies readonly { key: string; label: string; description: string; modules: readonly ModuleKey[] }[]

export type FeatureFlag = { key: string; label: string; description: string }
export const FEATURE_FLAGS: FeatureFlag[] = [
  { key: 'allow_negative_stock', label: 'Autoriser le stock négatif', description: 'Permet de comptabiliser une sortie même si le stock est insuffisant (déconseillé).' },
  { key: 'offline_mode', label: 'Mode hors-ligne (PWA)', description: 'File d’attente locale pour scanner, compter et déclarer sans connexion.' },
  { key: 'ai_recommendations', label: 'Recommandations IA', description: 'Suggestions de réapprovisionnement et détection d’anomalies.' },
  { key: 'realtime_boards', label: 'Tableaux temps réel', description: 'Rafraîchissement instantané de l’atelier et de l’entrepôt.' },
]

export type NavPermission = Permission | undefined
