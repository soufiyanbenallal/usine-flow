# Journal des modifications (Changelog) — UsineFlow

Toutes les modifications notables apportées au projet **UsineFlow** sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/), et ce projet adhère à [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
