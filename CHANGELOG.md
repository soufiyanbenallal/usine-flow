# Changelog
Toutes les modifications notables apportées au projet Buildo sont documentées dans ce fichier.

## [2026-10-03] - V1.1 : recherche globale, impressions PDF, rapports, import CSV

- **Palette de commandes & Recherche globale (Shopify Admin Spotlight Style)** :
  - **Refonte UI/UX minimaliste & cohérente** : adoption du canevas clair (`bg-white` avec bordure douce et ombre portée profonde), abandon des couleurs sombres de la barre latérale pour la modale, garantissant un contraste lisible et élégant.
  - **Icônes dédiées par élément** : chaque lien de navigation (`Home`, `Building2`, `Package`, `Truck`, `ShoppingCart`, `HardHat`, `ClipboardCheck`, `Handshake`, `ReceiptText`, `Landmark`, `FileText`, `BarChart3`) et chaque page de paramètres (`Percent`, `Bell`, `Globe`, `CreditCard`, `ShieldCheck`, etc.) arbore désormais son icône native spécifique.
  - **Requête unifiée à la demande & Zéro chargement initial** : fin des 10 requêtes simultanées au premier affichage. À l'ouverture (état vide), seules les suggestions locales et la navigation s'affichent instantanément sans appel réseau. Dès qu'une recherche est saisie ou qu'un filtre est sélectionné, l'API dédiée ([search-api.ts](file:///Users/user/Documents/beyonders/new-apps/buildo/features/search/search-api.ts)) interroge uniquement la table ciblée (ou l'ensemble avec un `limit`).
  - **Pagination & Chargement au défilement (Infinite Scroll)** : chargement dynamique des résultats suivants au fur et à mesure que l'utilisateur défile dans la liste (`loadMore`), avec pagination `range()` par lot.
  - **État de recherche centré épuré** : affichage du message discret « Recherche dans votre espace… » centré lors de l'exécution de la requête, conforme au style Shopify Admin.
  - **Onglets de filtrage par catégorie dynamiques** : affichage de pilules de filtres horizontales avec compteurs en temps réel sous la barre de recherche (`Paramètres 8`, `Navigation 3`, `Matériaux 4`...), et inclusion de la puce de filtre active dans l'input (`[Matériaux ✕]`).
  - **Nouveau composant `Kbd` minimaliste** : remplacement des anciens blocs sombres en biseau 3D par des touches de raccourci épurées, discrètes et parfaitement proportionnées (`border border-black/10 bg-[#f4f4f4] text-neutral-600 rounded-[4px]`), tant dans la modale que sur le déclencheur de la barre latérale.
  - **Transition fluide sans web-component** : utilisation de `<Transition />` de Corex-ui (`@xco-agency/corex-ui`) pour l'animation d'apparition et de fermeture sans avertissement DOM React.
- **Barre latérale (mode replié)** : affichage au survol du logo d'un déclencheur d'agrandissement (`PanelLeftOpen`) avec infobulle latérale.

- **Correctif CI** : les 10 formulaires créés/modifiés par la migration architecturale utilisaient `setState` dans un `useEffect` (échec de `eslint`). Chaque `*FormPage` est désormais découpée en un chargeur (404, droits, chargement) et un corps dont l'état est initialisé depuis la ligne chargée. Les valeurs par défaut des bons de commande (préfixe, TVA) et des sous-traitants (retenue) ne sont plus réappliquées à chaque rafraîchissement.
- **Nettoyage** : suppression des configurations `ResourceDef`, de `components/resource/*` (pages et formulaires génériques), de `features/_core/form.ts` et `features/relations.ts`. Les libellés/statuts vivent dans `features/<feature>/labels.ts`.
- **Recherche globale ⌘K / Ctrl+K** (`features/search`) : pages + chantiers, projets, clients, fournisseurs, matériaux, ouvriers, sous-traitants, achats, dépenses, paiements.
- **Impressions** : bon de commande (`/achats/<id>/imprimer`, en-tête légal ICE/IF/RC, montant en lettres) et fiche chantier (`/chantiers/<id>/fiche`), via « Imprimer / PDF ».
- **Rapports** : onglets Budget vs réel, Dépenses par poste, Achats par fournisseur, Trésorerie prévisionnelle.
- **Tableaux** : sélecteur de colonnes fonctionnel.
- **Import CSV** (fournisseurs, clients, matériaux, ouvriers) : modèle téléchargeable, aperçu, erreurs par ligne.
- **Organisation** : écran de création pour un compte sans organisation.

## [2026-10-03] - Migration architecturale : Transition du routage dynamique par configuration vers des pages et composants TSX dédiés

### Contexte & Problématique
Initialement, les 11 fonctionnalités principales de l'application (`chantiers`, `projets`, `clients`, `materiaux`, `fournisseurs`, `achats`, `equipes`, `sous-traitants`, `depenses`, `paiements`, `documents`) étaient servies par une unique route dynamique Next.js catch-all (`app/[org]/[resource]`) interprétant des objets de configuration TypeScript (`ResourceDef` via `features/registry.ts`).

Cette approche présentait plusieurs limites majeures :
- **Perte du typage et du découpage de code (code-splitting)** de Next.js App Router.
- **Impossibilité de concevoir des parcours utilisateurs sur mesure** (détail personnalisé de chantier, gestion des lignes de commande, téléversement direct de justificatifs, etc.).
- **Fuites d'abstraction croissantes** dans `ResourceDef` (`DetailPage`, `CreateModal`, `onRowOpen`, `afterCreate`...).

### Changements apportés

#### 1. Nouvelles routes explicites dans `app/[org]/`
Remplacement de la route dynamique `[resource]` par des routes dédiées pour chaque domaine métier :
- **Chantiers** :
  - `app/[org]/chantiers/page.tsx` : Liste et tableau de bord des chantiers
  - `app/[org]/chantiers/new/page.tsx` : Formulaire de création de chantier
  - `app/[org]/chantiers/[id]/page.tsx` : Page détaillée du chantier (avancement, localisation, planning, raccourcis achats/dépenses/pointage)
  - `app/[org]/chantiers/[id]/edit/page.tsx` : Modification d'un chantier existant
- **Projets** :
  - `app/[org]/projets/page.tsx` : Liste des projets
  - `app/[org]/projets/new/page.tsx` : Création de projet
  - `app/[org]/projets/[id]/page.tsx` : Détail / modification de projet
- **Clients** :
  - `app/[org]/clients/page.tsx` : Liste des clients
  - `app/[org]/clients/new/page.tsx` : Création de client
  - `app/[org]/clients/[id]/page.tsx` : Détail / modification de client
- **Matériaux** :
  - `app/[org]/materiaux/page.tsx` : Liste des matériaux et alertes de stock
  - `app/[org]/materiaux/new/page.tsx` : Création de référence
  - `app/[org]/materiaux/[id]/page.tsx` : Détail / modification de référence
- **Fournisseurs** :
  - `app/[org]/fournisseurs/page.tsx` : Liste des fournisseurs partenaires
  - `app/[org]/fournisseurs/new/page.tsx` : Création de fournisseur
  - `app/[org]/fournisseurs/[id]/page.tsx` : Détail / modification de fournisseur
- **Achats (Bons de commande)** :
  - `app/[org]/achats/page.tsx` : Liste des bons de commande
  - `app/[org]/achats/new/page.tsx` : Création de bon de commande
  - `app/[org]/achats/[id]/page.tsx` : Détail du bon de commande avec gestion des articles / lignes
  - `app/[org]/achats/[id]/edit/page.tsx` : Modification de l'en-tête du bon de commande
- **Équipes (Ouvriers)** :
  - `app/[org]/equipes/page.tsx` : Liste des ouvriers et statuts
  - `app/[org]/equipes/new/page.tsx` : Ajout d'ouvrier
  - `app/[org]/equipes/[id]/page.tsx` : Fiche ouvrier / modification
- **Sous-traitants** :
  - `app/[org]/sous-traitants/page.tsx` : Liste des sous-traitants et retenues de garantie
  - `app/[org]/sous-traitants/new/page.tsx` : Ajout de sous-traitant
  - `app/[org]/sous-traitants/[id]/page.tsx` : Détail / modification de sous-traitant
- **Dépenses** :
  - `app/[org]/depenses/page.tsx` : Liste des dépenses de chantier et de fonctionnement
  - `app/[org]/depenses/new/page.tsx` : Saisie de dépense avec upload de justificatif
  - `app/[org]/depenses/[id]/page.tsx` : Détail / modification de dépense
- **Paiements** :
  - `app/[org]/paiements/page.tsx` : Trésorerie (encaissements, décaissements, retards)
  - `app/[org]/paiements/new/page.tsx` : Enregistrement de règlement
  - `app/[org]/paiements/[id]/page.tsx` : Détail / modification de paiement
- **Documents** :
  - `app/[org]/documents/page.tsx` : GED avec téléversement et accès sécurisé aux fichiers privés
- **Rapports** :
  - `app/[org]/rapports/page.tsx` : Rapports financiers et consommations budgétaires par chantier

#### 2. Nouveaux composants React dédiés par domaine dans `features/<feature>/components/`
- `features/chantiers/components/` : `ChantiersListPage`, `ChantierFormPage`, `ChantierDetailPage`
- `features/projects/components/` : `ProjectsListPage`, `ProjectFormPage`
- `features/clients/components/` : `ClientsListPage`, `ClientFormPage`
- `features/materials/components/` : `MaterialsListPage`, `MaterialFormPage`
- `features/suppliers/components/` : `SuppliersListPage`, `SupplierFormPage`
- `features/purchase-orders/components/` : `PurchaseOrdersListPage`, `PurchaseOrderFormPage`
- `features/purchase-order-lines/components/` : `PurchaseOrderLinesSection`
- `features/workers/components/` : `WorkersListPage`, `WorkerFormPage`
- `features/subcontractors/components/` : `SubcontractorsListPage`, `SubcontractorFormPage`
- `features/expenses/components/` : `ExpensesListPage`, `ExpenseFormPage`
- `features/payments/components/` : `PaymentsListPage`, `PaymentFormPage`
- `features/documents/components/` : `DocumentsListPage`
- `features/reports/components/` : `ReportsPage`

#### 3. Briques de présentation réutilisables
- **`components/data-table.tsx`** : Tableau de données modulaire avec recherche textuelle instantanée, sélection multiple, pagination/squelettes de chargement, filtre popover dynamique et état vide contextualisé.
- **`components/form-page-layout.tsx`** : Structure type pour les formulaires pleine page (en-tête avec bouton retour, cartes thématiques, barre d'actions fixe en bas avec suppression sécurisée).
- **`components/resource/csv.ts`** : Helper universel d'exportation CSV avec encodage UTF-8 avec BOM.

#### 4. Nettoyage du code
- Suppression définitive du dossier `app/[org]/[resource]/`.
- Suppression définitive de `features/registry.ts`.
- Mise à jour de la documentation d'architecture dans `docs/03-ARCHITECTURE.md`.
