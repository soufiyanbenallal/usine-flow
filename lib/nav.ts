import {
  BarChart3, Bell, BookOpen, Boxes, CalendarClock, CheckSquare, ClipboardCheck, Cog, Factory, FileText, Gauge, GitBranch, History, Home, Layers, ListChecks,
  Package, Plug, Rocket, Ruler, ScanLine, ShieldCheck, ShoppingCart, Sparkles, Tags, Truck, Upload, Users, Wallet, Warehouse, Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ModuleKey } from './modules'

export type NavChild = { title: string; path: string; icon?: LucideIcon }
/** A parent page (links to its own hub) with related pages nested underneath. */
export type NavItem = {
  title: string
  path: string
  icon: LucideIcon
  end?: boolean
  children?: NavChild[]
  /** Sidebar section (French source label, see lib/i18n). */
  group: string
  /** Hidden when this module is disabled for the organization. */
  module?: ModuleKey
  /** Short description shown on the module hub. */
  description?: string
}

/**
 * UsineFlow navigation: Overview → Operations → Production → Quality → Maintenance → Analytics → Platform
 * (docs/usine-flow-guide.md §57). Items depend on enabled modules.
 */
export const mainNav: NavItem[] = [
  { title: 'Tableau de bord', path: '', icon: Home, end: true, group: 'Aperçu' },

  {
    title: 'Catalogue', path: 'catalogue', icon: Package, group: 'Opérations', module: undefined,
    description: 'Données de base : articles, unités, partenaires, listes de prix.',
    children: [
      { title: 'Articles', path: 'catalogue/articles' },
      { title: 'Catégories', path: 'catalogue/categories' },
      { title: 'Unités de mesure', path: 'catalogue/unites' },
      { title: 'Clients', path: 'catalogue/clients' },
      { title: 'Fournisseurs', path: 'catalogue/fournisseurs' },
      { title: 'Autres partenaires', path: 'catalogue/partenaires' },
      { title: 'Listes de prix', path: 'catalogue/listes-de-prix' },
    ],
  },
  {
    title: 'Inventaire', path: 'inventaire', icon: Boxes, group: 'Opérations', module: 'inventory',
    description: 'Grand livre de stock immuable, soldes, lots, séries, comptages.',
    children: [
      { title: 'Stock', path: 'inventaire/stock' },
      { title: 'Mouvements', path: 'inventaire/mouvements' },
      { title: 'Lots', path: 'inventaire/lots' },
      { title: 'Numéros de série', path: 'inventaire/series' },
      { title: 'Ajustements', path: 'inventaire/ajustements' },
      { title: 'Transferts', path: 'inventaire/transferts' },
      { title: 'Comptages', path: 'inventaire/comptages' },
      { title: 'Réservations', path: 'inventaire/reservations' },
      { title: 'Valorisation', path: 'inventaire/valorisation' },
      { title: 'Réapprovisionnement', path: 'inventaire/reapprovisionnement' },
    ],
  },
  {
    title: 'Entrepôt', path: 'entrepot', icon: Warehouse, group: 'Opérations', module: 'warehouse',
    description: 'Structure, réception, mise en stock, préparation, colisage et expédition.',
    children: [
      { title: 'Entrepôts', path: 'entrepot/entrepots' },
      { title: 'Zones', path: 'entrepot/zones' },
      { title: 'Emplacements', path: 'entrepot/emplacements' },
      { title: 'Espace opérateur', path: 'entrepot/operateur' },
      { title: 'Tâches', path: 'entrepot/taches' },
      { title: 'Réception', path: 'entrepot/reception' },
      { title: 'Préparation', path: 'entrepot/preparation' },
      { title: 'Vagues de préparation', path: 'entrepot/vagues' },
      { title: 'Colisage', path: 'entrepot/colisage' },
      { title: 'Expédition', path: 'entrepot/expedition' },
      { title: 'Retours', path: 'entrepot/retours' },
      { title: 'Scanner', path: 'entrepot/scanner' },
      { title: 'Étiquettes', path: 'entrepot/etiquettes' },
    ],
  },
  {
    title: 'Achats', path: 'achats', icon: ShoppingCart, group: 'Opérations', module: 'procurement',
    description: 'De la demande d’achat à la facture fournisseur.',
    children: [
      { title: 'Demandes d’achat', path: 'achats/demandes' },
      { title: 'Appels d’offres', path: 'achats/appels-offres' },
      { title: 'Commandes d’achat', path: 'achats/commandes' },
      { title: 'Réceptions', path: 'achats/receptions' },
      { title: 'Retours fournisseurs', path: 'achats/retours' },
      { title: 'Factures fournisseurs', path: 'achats/factures' },
      { title: 'Contrats d’achat', path: 'achats/contrats' },
      { title: 'Performance fournisseurs', path: 'achats/performance' },
      { title: 'Historique des prix', path: 'achats/prix' },
    ],
  },
  {
    title: 'Ventes', path: 'ventes', icon: Truck, group: 'Opérations', module: 'sales',
    description: 'Du devis au paiement, avec réservation de stock et marges.',
    children: [
      { title: 'Devis', path: 'ventes/devis' },
      { title: 'Commandes clients', path: 'ventes/commandes' },
      { title: 'Livraisons', path: 'ventes/livraisons' },
      { title: 'Retours clients', path: 'ventes/retours' },
      { title: 'Factures clients', path: 'ventes/factures' },
      { title: 'Marges', path: 'ventes/marges' },
    ],
  },

  {
    title: 'Production', path: 'production', icon: Factory, group: 'Production', module: 'manufacturing',
    description: 'Nomenclatures, gammes, ordres de fabrication, planification et coûts.',
    children: [
      { title: 'Ordres de fabrication', path: 'production/ordres' },
      { title: 'Planification (MRP)', path: 'production/planification' },
      { title: 'Atelier', path: 'production/atelier' },
      { title: 'Supervision', path: 'production/supervision' },
      { title: 'Nomenclatures (BOM)', path: 'production/nomenclatures' },
      { title: 'Gammes', path: 'production/gammes' },
      { title: 'Postes de charge', path: 'production/postes' },
      { title: 'Arrêts de production', path: 'production/arrets' },
      { title: 'Sous-traitance', path: 'production/sous-traitance' },
      { title: 'Coûts de production', path: 'production/couts' },
    ],
  },
  {
    title: 'Qualité', path: 'qualite', icon: ShieldCheck, group: 'Qualité', module: 'quality',
    description: 'Contrôles, non-conformités, CAPA, traçabilité et rappels.',
    children: [
      { title: 'Inspections', path: 'qualite/inspections' },
      { title: 'Plans de contrôle', path: 'qualite/plans' },
      { title: 'Non-conformités', path: 'qualite/non-conformites' },
      { title: 'Actions CAPA', path: 'qualite/capa' },
      { title: 'Certificats', path: 'qualite/certificats' },
      { title: 'Traçabilité', path: 'qualite/tracabilite' },
      { title: 'Rappels de lots', path: 'qualite/rappels' },
      { title: 'Codes motifs', path: 'qualite/codes' },
    ],
  },
  {
    title: 'Maintenance', path: 'maintenance', icon: Wrench, group: 'Maintenance', module: 'maintenance',
    description: 'GMAO : équipements, préventif, correctif, pièces et indicateurs.',
    children: [
      { title: 'Équipements', path: 'maintenance/equipements' },
      { title: 'Ordres de travail', path: 'maintenance/ordres' },
      { title: 'Plans préventifs', path: 'maintenance/plans' },
      { title: 'Relevés compteurs', path: 'maintenance/releves' },
      { title: 'Calendrier', path: 'maintenance/calendrier' },
      { title: 'Indicateurs', path: 'maintenance/indicateurs' },
    ],
  },
  {
    title: 'Équipe', path: 'equipe', icon: Users, group: 'Équipe', module: 'workforce',
    description: 'Opérateurs, horaires, présence, compétences et temps passé.',
    children: [
      { title: 'Employés', path: 'equipe/employes' },
      { title: 'Départements', path: 'equipe/departements' },
      { title: 'Équipes', path: 'equipe/equipes' },
      { title: 'Compétences', path: 'equipe/competences' },
      { title: 'Habilitations', path: 'equipe/habilitations' },
      { title: 'Horaires (shifts)', path: 'equipe/horaires' },
      { title: 'Planning', path: 'equipe/planning' },
      { title: 'Présence', path: 'equipe/presence' },
      { title: 'Absences', path: 'equipe/absences' },
      { title: 'Temps de travail', path: 'equipe/temps' },
    ],
  },
  {
    title: 'Finance', path: 'finance', icon: Wallet, group: 'Finance', module: 'finance',
    description: 'Finance opérationnelle : paiements, dépenses, trésorerie, soldes.',
    children: [
      { title: 'Paiements', path: 'finance/paiements' },
      { title: 'Dépenses', path: 'finance/depenses' },
      { title: 'Trésorerie', path: 'finance/tresorerie' },
      { title: 'Centres de coûts', path: 'finance/centres-de-couts' },
      { title: 'Soldes partenaires', path: 'finance/soldes' },
      { title: 'Export comptable', path: 'finance/export' },
    ],
  },

  {
    title: 'Analytique', path: 'analytique', icon: BarChart3, group: 'Analytique', module: 'analytics',
    description: 'Tableaux de bord par métier et rapports.',
    children: [
      { title: 'Vue d’ensemble', path: 'analytique/vue-densemble' },
      { title: 'Rapports', path: 'analytique/rapports' },
    ],
  },

  { title: 'Approbations', path: 'approbations', icon: CheckSquare, group: 'Plateforme' },
  { title: 'Notifications', path: 'notifications', icon: Bell, group: 'Plateforme' },
  { title: 'Documents', path: 'documents', icon: FileText, group: 'Plateforme', module: 'documents' },
  { title: 'Journal d’audit', path: 'audit', icon: History, group: 'Plateforme' },
  { title: 'Import / Export', path: 'import', icon: Upload, group: 'Plateforme' },
  { title: 'Assistant IA', path: 'assistant', icon: Sparkles, group: 'Plateforme', module: 'ai' },
  { title: 'Intégrations', path: 'integrations', icon: Plug, group: 'Plateforme' },
  { title: 'Mode hors-ligne', path: 'hors-ligne', icon: ScanLine, group: 'Plateforme' },
  { title: 'Démarrage', path: 'onboarding', icon: Rocket, group: 'Plateforme' },
]

/** Icons used by hub pages and the command palette for specific nav children. */
export const navIcons = { Cog, Gauge, GitBranch, Layers, ListChecks, Ruler, Tags, CalendarClock, ClipboardCheck, BookOpen }

/** Items visible with the given enabled modules (a missing `module` means always visible). */
export function visibleNav(enabled: ReadonlySet<ModuleKey> | null): NavItem[] {
  return mainNav.filter((item) => !item.module || enabled === null || enabled.has(item.module))
}

/** Groups items by their section, keeping declaration order. */
export function groupNav(items: NavItem[]): { group: string; items: NavItem[] }[] {
  const groups: { group: string; items: NavItem[] }[] = []
  for (const item of items) {
    const g = groups.find((x) => x.group === item.group)
    if (g) g.items.push(item)
    else groups.push({ group: item.group, items: [item] })
  }
  return groups
}

/** True when `pathname` (e.g. `/atlas/parametres`) is inside the nav path. */
export function isInside(pathname: string, slug: string, path: string, end = false) {
  const base = path ? `/${slug}/${path}` : `/${slug}`
  return end ? pathname === base : pathname === base || pathname.startsWith(base + '/')
}
