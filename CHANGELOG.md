# Journal des modifications (Changelog) — UsineFlow

Toutes les modifications notables apportées au projet **UsineFlow** sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et ce projet adhère à [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0] - 2026-10-03

### Plateforme opérationnelle complète (guide `docs/usine-flow-guide.md`)

- **Base de données** : 14 migrations (catalogue, inventaire à grand livre immuable, achats, ventes, fabrication, qualité, maintenance, équipe, finance, WMS, analytique, traçabilité, temps réel, synchronisation hors-ligne) avec RLS, audit, approbations, outbox d'événements et tests SQL de bout en bout.
- **Modules applicatifs** : catalogue, inventaire, entrepôt (WMS), achats, ventes, fabrication, planification MRP, atelier, qualité, maintenance, équipe, finance, analytique, documents, import/export, intégrations (webhooks signés, clés API), assistant IA.
- **Plateforme** : permissions granulaires avec surcharges par organisation, modules et fonctionnalités activables, numérotation, quotas, temps réel (Broadcast), notifications, internationalisation fr/ar/en avec RTL.
- **Hors-ligne / PWA** : manifeste, service worker, file Dexie et synchronisation idempotente.
- **Qualité logicielle** : tests Vitest (logique métier), tests SQL, tests e2e Playwright, script de charge k6, fonctions Edge Supabase.

## [0.1.0] - 2026-10-03

### Initialisation du Starter UsineFlow (Industrial Operations OS)

- **Socle multi-tenant & architecture de base** :
  - Gestion des organisations avec sous-domaine/slug d'URL (`/[org]`).
  - Système d'authentification Supabase (inscription, connexion, réinitialisation de mot de passe, invitations d'équipe avec jeton sécurisé).
  - Gestion des profils et rôles (`owner`, `admin`, `site_manager`, `accountant`, `viewer`).
  - Isolation stricte des données via Row Level Security (RLS) PostgreSQL.
  - Génération d'identifiants 24 caractères (`cuid2`) uniformisée.

- **Paramètres entreprise & espace de travail** :
  - Support natif des identifiants légaux marocains (ICE, IF, RC, Patente, CNSS).
  - Gestion des devises (MAD par défaut) et TVA marocaine (20%, 14%, 10%, 7%).
  - Gestion des préférences, notifications d'alertes, membres et sécurité du compte.

- **Interface utilisateur & Dashboard** :
  - Design system avec CoreX UI, Tailwind CSS et support Dark/Light mode.
  - Barre latérale rétractable avec logo UsineFlow vectoriel.
  - Palette de commandes unifiée (`⌘K`) avec recherche instantanée en mémoire pour la navigation et les paramètres.
  - Tableau de bord des opérations industrielles avec KPIs de performance (TRS / OEE), statut des installations et cadence de production hebdomadaire.
  - Panneau d'assistant industriel contextuel.
  - Page d'accueil moderne présentant les trois modes d'exploitation : Usine (Factory), Atelier (Workshop) et Entrepôt (Warehouse).
