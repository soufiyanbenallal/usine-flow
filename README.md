# UsineFlow — Industrial Operations OS

> Morocco-focused Industrial Operations OS for Factories, Workshops, and Warehouses.

UsineFlow is an operational ERP starter built with Next.js (App Router), Supabase (Auth & Multi-Tenant RLS), Tailwind CSS, and CoreX UI.

## Architecture & Modes

Based on [docs/usine-flow-guide.md](docs/usine-flow-guide.md), UsineFlow operates across three modular operational modes:
- **🏭 Usine (Factory)**: BOM multi-niveaux, gammes d'opérations, ordres de fabrication (OF) et suivi du TRS.
- **🔧 Atelier (Workshop)**: Ordres de travail, réparations, matériaux, main-d'œuvre et maintenance.
- **📦 Entrepôt (Warehouse)**: Grand livre d'inventaire, multi-zones, emplacements / bacs, réceptions et expéditions.

## What is in the box

Every module follows the same layout — `features/<module>/{types.ts, service.ts, hooks.ts, pages.tsx}` plus thin routes in `app/[org]/…` — on top of a config-driven UI kit (`features/_core`: `EntityPage`, `DocumentDetail`, `ChildTable`, `RecordEditor`).

| Area | Highlights |
| --- | --- |
| **Catalogue** | Items (lots/serials/expiry, UoM conversions, barcodes, suppliers, prices), partners, categories, price lists |
| **Inventory** | Immutable movement ledger, FIFO / average valuation, reservations (FEFO), adjustments, transfers, cycle counts, reorder, aging, slow movers |
| **Warehouse (WMS)** | Zones/locations, tasks, put-away, pick lists & waves, packing, dispatch stages, returns, camera scanner (ZXing), Code128/QR labels, operator workspace |
| **Procurement** | Requests → RFQs → purchase orders → receipts (quarantine + inspection) → supplier invoices, returns, contracts, price history, supplier scorecards |
| **Sales** | Quotes → orders (credit-limit check) → deliveries → invoices, returns, margins, OTIF |
| **Manufacturing** | Multi-level BOMs, routings, work centers, production orders (backflush, genealogy, scrap), downtime, subcontracting, MRP engine, standard vs actual costing |
| **Quality** | Inspection plans, inspections, NCRs, CAPA, lot genealogy (forward/backward), recalls |
| **Maintenance (CMMS)** | Asset tree, preventive plans (time/meter), breakdowns → work orders, spare parts, MTBF/MTTR/availability |
| **Workforce** | Employees, skills, certifications (expiry alerts), shifts, planning grid, attendance, absences, time logs → labour cost |
| **Finance (operational)** | Payments, expenses, cash, cost centers, partner balances, accounting export |
| **Analytics & AI** | Role dashboards, exportable reports, demand forecast, anomaly detection, reorder advice, tool-using chat assistant (Anthropic, read-only) |
| **Platform** | Granular permissions with per-org overrides, approval engine, audit log, notifications, realtime (Broadcast), documents, import/export + opening stock wizard, webhooks + API keys, modules/feature flags, numbering, quotas |
| **Offline / PWA** | Installable, service worker shell, Dexie queue with idempotent sync (`apply_client_operation`) |
| **i18n** | French (source), Arabic (RTL) and English |

Business rules live in Postgres (RLS, constraints, triggers, `SECURITY DEFINER` posting functions) and are covered by SQL tests; pure logic (MRP, BOM, costing, OEE, forecasting…) is covered by Vitest.

## Commands

```bash
pnpm dev            # development server
pnpm check          # typecheck + lint + unit tests + build
pnpm test           # Vitest
pnpm test:db        # applies every migration to a scratch Postgres and runs supabase/tests/*.test.sql
pnpm test:e2e       # Playwright smoke tests (set PW_CHROMIUM_PATH to reuse an installed Chromium)
k6 run perf/api-load.js   # API load test (see header of the file for env vars)
```

Copy `.env.example` to `.env.local`. Edge functions (`supabase/functions`) deliver webhooks and run nightly jobs — see their README.

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
