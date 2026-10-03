# UsineFlow — Industrial Operations OS

> Morocco-focused Industrial Operations OS for Factories, Workshops, and Warehouses.

UsineFlow is an operational ERP starter built with Next.js (App Router), Supabase (Auth & Multi-Tenant RLS), Tailwind CSS, and CoreX UI.

## Architecture & Modes

Based on [docs/usine-flow-guide.md](docs/usine-flow-guide.md), UsineFlow operates across three modular operational modes:
- **🏭 Usine (Factory)**: BOM multi-niveaux, gammes d'opérations, ordres de fabrication (OF) et suivi du TRS.
- **🔧 Atelier (Workshop)**: Ordres de travail, réparations, matériaux, main-d'œuvre et maintenance.
- **📦 Entrepôt (Warehouse)**: Grand livre d'inventaire, multi-zones, emplacements / bacs, réceptions et expéditions.

## Starter Highlights

- **Multi-Tenant Organization Architecture**: URL-slug scoped organizations (`/[org]`) with team invitations, role-based access control, and Supabase RLS.
- **Morocco-Ready Legal & Fiscal Settings**: Native support for ICE, IF, RC, Patente, CNSS, Moroccan VAT (20%, 14%, 10%, 7%), and MAD currency formatting.
- **Modern Industrial Dashboard**: Operational StatStrip metrics, weekly production cadence charts (Recharts), and quick action panels.
- **Unified Navigation & Command Palette**: Instant in-memory search (`⌘K`) across navigation and organization settings.
- **Authentication**: Fully functional signup, login, password recovery, and team invite acceptance.

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Run development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) to view the landing page.
