For this product I would **not build a generic ERP**. I would build a **Morocco-focused Industrial Operations OS** that can operate in three modes:

> **Factory → Workshop → Warehouse**

The core is shared, while production, maintenance, quality, and workshop capabilities are modular.

Morocco PME is actively supporting industrial digital transformation, including acquisition/deployment of information systems and cloud solutions, with support that can reach 80% for eligible SMEs and 90% for eligible TPEs. Its operational-excellence program explicitly identifies production, maintenance, purchasing, logistics, quality, and supply-chain optimization as needs. ([marocpme.gov.ma][1])

At the same time, Moroccan vendors already cover many traditional ERP features—MRP, BOMs, production orders, quality, maintenance, traceability, stock and costing—so our differentiation should be **simpler implementation, excellent warehouse/shop-floor UX, offline operation, strong traceability, and a modular product that a 10–100-person company can actually adopt without an ERP project**. ([Thalès Informatique][2])

---

# 1. Product definition

Working name:

# **Industrial OS**

A cloud SaaS for Moroccan factories, workshops and large warehouses.

### Three operating modes

```text
                    INDUSTRIAL OS
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
          WAREHOUSE     WORKSHOP      FACTORY
             │            │            │
          Inventory     Jobs/WO      Production
          Purchasing    Services     BOM/MRP
          Receiving     Materials    Work centers
          Picking       Labor        Quality
          Dispatch      Maintenance  Maintenance
             │            │            │
             └────────────┼────────────┘
                          ↓
                   SHARED PLATFORM
```

A warehouse-only customer shouldn't need to see production screens.

A small workshop shouldn't need MRP.

A factory can activate every module.

This is essential for sales.

---

# 2. The product boundary

I recommend defining the product as:

### **Operations ERP**, not Accounting ERP.

We manage:

```text
Sales
Purchasing
Inventory
Warehouses
Production
Workshops
Quality
Maintenance
Workforce
Costs
Documents
Analytics
```

But we initially **do not attempt to replace**:

```text
Full accounting
Full payroll
Tax accounting
Bank reconciliation
General ledger
HRIS
```

Instead:

```text
                 INDUSTRIAL OS

Sales ─────┐
Purchasing ┤
Inventory ─┤
Production ┤──→ operational financial data
Quality ───┤
Maintenance┤
             │
             ↓
      Accounting export/API
             │
             ↓
     Accountant / Accounting ERP
```

This makes implementation far easier.

---

# 3. Complete module architecture

I would divide the system into **17 modules**.

## A. Platform / Tenant

Every other module depends on this.

### Features

- Organizations
- Organization profile
- Company legal information
- Multiple companies
- Sites
- Factories
- Facilities
- Warehouses
- Warehouse zones
- Storage locations/bins
- Teams
- Departments
- Users
- Roles
- Permissions
- Role assignments
- Site-level permissions
- Warehouse-level permissions
- Module enablement
- Subscription plans
- Usage limits
- Feature flags
- Audit logs
- Activity logs
- Localization
- Timezone
- Currency
- Number formats
- Fiscal year
- Document numbering
- Data import/export

### Tenant hierarchy

```text
Organization
│
├── Site
│   ├── Facility
│   │   ├── Warehouse
│   │   │   ├── Zone
│   │   │   │   └── Location
│   │   │
│   │   └── Production Lines
│   │
│   └── Departments
│
└── Users / Teams / Roles
```

---

# 4. Master Data / Catalog

This is one of the most important modules.

## Items

Don't create separate systems for raw material/product/component.

Use one universal inventory object:

```text
Item
├── Raw Material
├── Component
├── Consumable
├── Packaging
├── Semi-Finished
├── Finished Product
├── Spare Part
└── Service
```

### Item features

- SKU
- Internal reference
- Barcode
- QR code
- Name
- Arabic name
- French name
- Description
- Category
- Brand
- Product family
- Type
- Base unit
- Purchase unit
- Sales unit
- Production unit
- Conversion factors
- Weight
- Volume
- Dimensions
- Minimum stock
- Maximum stock
- Reorder point
- Reorder quantity
- Lead time
- Supplier references
- Manufacturer reference
- Batch tracking
- Serial tracking
- Expiry tracking
- Valuation method
- Cost
- Standard cost
- Last purchase cost
- Active/inactive
- Images
- Technical documents
- Certificates

### Categories

```text
Raw materials
Components
Packaging
Finished products
Consumables
Spare parts
Tools
Services
```

---

# 5. Units of Measure

Absolutely do this properly from the beginning.

Examples:

```text
kg
g
ton
L
ml
m
cm
m²
m³
piece
box
carton
pallet
roll
sheet
```

Relationships:

```text
1 carton = 24 pieces
1 pallet = 40 cartons
1 ton = 1,000 kg
```

The database must preserve exact conversion rules.

Use PostgreSQL `numeric`, not JavaScript floating-point arithmetic, for quantities and money.

---

# 6. Partners

A shared partner model:

```text
Business Partner
├── Customer
├── Supplier
├── Subcontractor
├── Transporter
└── Other
```

### Customer

- Company
- Contacts
- Addresses
- Delivery addresses
- Payment terms
- Credit limit
- Tax profile
- Price list
- Customer category
- Sales history
- Outstanding balance
- Documents

### Supplier

- Company
- Contacts
- Addresses
- Payment terms
- Lead times
- Supplier catalog
- Supplier prices
- Performance
- Purchase history
- Quality history

---

# 7. Inventory Management

This is the **core engine**.

Do not model inventory as:

```text
product.stock_quantity
```

alone.

Use an immutable inventory ledger.

```text
             INVENTORY LEDGER

Purchase receipt      +100
Transfer              -30 / +30
Production consume    -20
Production output     +80
Sale                   -15
Adjustment              -2
Return                  +3
```

Then calculate/maintain:

```text
Stock Balance
=
Opening
+
Inbound
-
Outbound
+
Adjustments
```

### Features

- Stock balances
- Stock movements
- Inventory ledger
- Multi-warehouse
- Multi-location
- Transfers
- Receipts
- Issues
- Adjustments
- Reservations
- Allocations
- Available stock
- On-hand stock
- Reserved stock
- Available-to-promise
- Incoming stock
- Damaged stock
- Quarantine stock
- Scrap stock
- Consignment stock
- Batch/lot tracking
- Serial numbers
- Expiry dates
- Cycle counts
- Full stocktakes
- Stock reconciliation
- Inventory valuation
- FIFO
- Weighted average
- Stock aging
- Dead stock
- Slow-moving stock
- Reorder alerts
- Min/max levels
- Automatic replenishment suggestions

---

# 8. Warehouse Management — WMS

This should be one of our strongest differentiators.

### Warehouse structure

```text
Warehouse
│
├── Receiving
├── Quality
├── Bulk Storage
├── Picking
├── Packing
├── Dispatch
├── Quarantine
└── Scrap
```

### Operations

```text
Receive
↓
Put Away
↓
Store
↓
Reserve
↓
Pick
↓
Pack
↓
Dispatch
```

### Features

- Receiving
- Put-away
- Bin management
- Directed put-away
- Picking
- Pick lists
- Wave picking
- Batch picking
- Packing
- Dispatch
- Loading
- Delivery notes
- Returns
- Internal transfers
- Warehouse tasks
- Stock counting
- Barcode scanning
- QR scanning
- Scanner devices
- Label printing
- Mobile warehouse UI
- Warehouse worker dashboard

### Scanner UX

```text
SCAN

[ Camera / Barcode ]

┌───────────────────────┐
│ SKU: RM-004821        │
│ Steel Sheet 2mm       │
│                       │
│ Available: 218 pcs    │
│ Location: A-03-12     │
└───────────────────────┘

Quantity
[ - ]  25  [ + ]

[ Confirm ]
```

A hardware scanner should also work as keyboard input.

---

# 9. Procurement

### Workflow

```text
Purchase Request
      ↓
Approval
      ↓
RFQ
      ↓
Supplier Quotes
      ↓
Purchase Order
      ↓
Receipt
      ↓
Quality Inspection
      ↓
Stock
      ↓
Supplier Invoice
```

### Features

- Purchase requests
- Approval workflows
- RFQs
- Supplier quotation comparison
- Purchase orders
- PO lines
- Partial receipts
- Backorders
- Purchase returns
- Supplier delivery notes
- Supplier invoices
- Supplier pricing
- Lead times
- Minimum order quantities
- Purchase agreements
- Supplier performance
- Price history
- Purchase price variance
- Receiving discrepancies

---

# 10. Sales / Order Management

This is necessary even for factories.

### Workflow

```text
Quote
 ↓
Sales Order
 ↓
Stock Reservation
 ↓
Production Demand
 ↓
Picking
 ↓
Delivery
 ↓
Invoice
 ↓
Payment
```

### Features

- Customers
- Quotes
- Sales orders
- Sales order approval
- Product availability
- Reservations
- Backorders
- Delivery
- Returns
- Customer price lists
- Customer-specific prices
- Discounts
- Minimum order quantities
- Payment terms
- Credit limits
- Customer documents
- Order history
- Margin per order
- Margin per customer
- Margin per product

---

# 11. Manufacturing — the main module

This is where the Factory OS becomes a true industrial application.

## Bill of Materials

```text
TABLE A

Wood
├── Top       1
├── Leg       4
├── Screw    16
├── Paint   0.4 L
└── Packaging 1
```

Features:

- BOMs
- Multi-level BOMs
- BOM versions
- BOM effective dates
- Alternative components
- Subassemblies
- Co-products
- By-products
- Scrap factors
- Expected waste
- Component substitution
- Engineering changes

---

# 12. Routing / Operations

```text
Product
 ↓
Cutting
 ↓
Assembly
 ↓
Welding
 ↓
Painting
 ↓
Quality
 ↓
Packaging
```

Each operation has:

- Work center
- Machine
- Labor
- Setup time
- Run time
- Move time
- Queue time
- Required skills
- Standard cost
- Capacity

---

# 13. Production Orders

### Example

```text
OF-2026-00942

Product:
Table T-420

Quantity:
500

BOM:
v3

Routing:
R-02

Status:
In Production

Progress:
64%
```

### Operations

```text
Cutting       ✓
Assembly      ✓
Welding       68%
Painting       0%
Packaging      0%
```

### Materials

```text
Wood            1,500 / 1,500
Screws          8,000 / 8,000
Paint             120 / 250 L
Packaging        250 / 500
```

### Features

- Production orders
- Planned orders
- Material reservation
- Material issue
- Consumption
- Backflush
- Manual consumption
- Partial production
- Production completion
- Rework
- Scrap
- Downtime
- Output
- Co-products
- By-products
- WIP
- Production cost
- Actual vs standard cost
- Production variance

---

# 14. MRP

Don't implement a giant SAP-style MRP initially.

Build a focused engine:

```text
Demand
+
Current stock
+
Reserved stock
+
Incoming purchase
+
Open production
-
Required quantity
=
Net requirement
```

Then:

```text
Net requirement
        ↓
Purchase suggestion
        OR
Production suggestion
```

### MRP features

- Demand calculation
- Minimum stock
- Safety stock
- Lead time
- Reorder point
- Planned production
- Planned purchase
- Material availability
- Shortage detection
- Supplier lead time
- Capacity warnings

Later:

- finite-capacity planning
- demand forecasting
- sales forecast
- seasonality

---

# 15. Shop Floor

This should be **extremely simple**.

A factory worker should not see ERP complexity.

### Worker screen

```text
MY WORK

OF-00942
Table T-420

Assembly

500 units

[ START ]

Produced
320

Scrap
4

[ Report ]

[ Complete ]
```

### Supervisor screen

```text
PRODUCTION FLOOR

Assembly
███████████████░░ 82%

Welding
██████████░░░░░░ 61%

Painting
STOPPED ⚠

Machine M-04
Maintenance required
```

This is a huge UX opportunity.

---

# 16. Quality Management

Quality shouldn't be an afterthought.

### Incoming quality

```text
Supplier
   ↓
Receipt
   ↓
Inspection
   ↓
Accept / Reject / Quarantine
```

### Production quality

```text
Operation
 ↓
Inspection point
 ↓
Result
 ↓
Pass / Fail
```

### Outgoing quality

```text
Finished product
 ↓
Final inspection
 ↓
Shipment
```

### Features

- Inspection plans
- QC checkpoints
- Inspection templates
- Sampling
- Measurements
- Tolerance ranges
- Pass/fail
- Defects
- Non-conformance
- Quarantine
- Corrective action
- Preventive action
- CAPA
- Supplier quality
- Product quality
- Production quality
- Quality certificates
- Attachments
- Traceability
- Recall support

---

# 17. Traceability

This is a major industrial differentiator.

```text
RAW MATERIAL LOT
        ↓
Production Order
        ↓
Semi-Finished
        ↓
Finished Product LOT
        ↓
Customer Delivery
```

And reverse:

```text
Customer complained
       ↓
Finished lot #F2026-00942
       ↓
Production order
       ↓
Raw material lots
       ↓
Supplier
```

Support:

- Lots
- Serial numbers
- Batch genealogy
- Forward traceability
- Backward traceability
- Expiry
- Recall workflow
- Quarantine

---

# 18. Maintenance / GMAO

### Asset hierarchy

```text
Factory
 └── Production Line
       ├── Machine A
       │    ├── Motor
       │    └── Pump
       └── Machine B
```

### Features

- Machines
- Equipment
- Components
- Asset hierarchy
- Preventive maintenance
- Corrective maintenance
- Work orders
- Breakdown reports
- Maintenance calendar
- Maintenance schedules
- Meter readings
- Operating hours
- Spare parts
- Technician assignment
- Maintenance costs
- Downtime
- Failure reasons
- MTBF
- MTTR
- Maintenance history

---

# 19. Workforce / Operators

Not a complete payroll system.

Focus on operational workforce.

### Features

- Employees
- Operators
- Departments
- Teams
- Skills
- Certifications
- Work shifts
- Shift calendars
- Attendance
- Operator assignment
- Labor time
- Production time
- Overtime data
- Absence
- Productivity
- Approval

Then:

```text
Production Order
      ↓
Operation
      ↓
Operator
      ↓
Time
      ↓
Labor Cost
```

---

# 20. Costing

This is one of the features that makes the product valuable to management.

### Standard cost

```text
Materials
+
Labor
+
Machine
+
Overhead
+
Subcontracting
```

### Actual cost

```text
Actual materials
+
Actual labor
+
Actual machine time
+
Actual subcontracting
+
Actual overhead
```

Then:

```text
                  COST ANALYSIS

Standard cost       118.40 DH
Actual cost         126.75 DH

Variance              8.35 DH
                   +7.1%

Material variance    +4.20
Labor variance       +1.90
Machine variance     +1.25
Other variance       +1.00
```

---

# 21. Maintenance + Production relationship

Very important.

Don't isolate modules.

```text
Machine
  ↓
Production Operation
  ↓
Machine Runtime
  ↓
Maintenance Threshold
  ↓
Preventive Work Order
```

And:

```text
Machine Breakdown
      ↓
Production stopped
      ↓
Downtime
      ↓
Production delay
      ↓
Order delay
```

Now management can see the relationship.

---

# 22. Finance-lite

Operational finance only.

### Features

- Customer balances
- Supplier balances
- Payments
- Expenses
- Cash movements
- Cost centers
- Purchase totals
- Sales totals
- Production cost
- Project/department cost
- Payment status
- Due dates
- Credit limits
- Export

And:

```text
CSV
Excel
API
Accounting integration
```

Later.

---

# 23. Documents

Everything should be document-oriented.

### Documents

```text
Quote
Purchase Request
RFQ
Purchase Order
Receipt
Stock Transfer
Stock Adjustment
Sales Order
Delivery Note
Return
Production Order
Quality Inspection
Maintenance Order
Invoice
Payment
```

Each document should have:

```text
Draft
↓
Submitted
↓
Approved
↓
Posted
↓
Completed
```

Posted operational documents should not simply be edited.

Use:

```text
Correction
Reversal
Replacement
```

instead.

This protects inventory and financial history.

---

# 24. Approval Engine

Build this as a reusable platform feature.

```text
Purchase > 50,000 DH
        ↓
Manager Approval
        ↓
Finance Approval
        ↓
PO
```

The same engine handles:

- Purchase orders
- Purchase requests
- Stock adjustments
- Scrap
- Inventory corrections
- Production closure
- Supplier changes
- Customer credit changes
- Payments

Tables:

```text
approval_policies
approval_requests
approval_steps
approval_actions
```

---

# 25. Notifications

Central notification engine.

### Channels

```text
In-app
Email
WhatsApp
Push
```

### Events

```text
Low stock
Purchase received
Production delayed
Machine breakdown
Quality failure
PO awaiting approval
Customer order ready
Payment overdue
Maintenance due
MRP shortage
```

---

# 26. Activity / audit system

For enterprise software, this is mandatory.

```text
Ahmed
Changed
Purchase Order PO-4022

Status:
Submitted → Approved

Time:
14:42

IP:
...

Reason:
Approved by manager
```

Track:

- user
- organization
- action
- entity
- entity ID
- before
- after
- timestamp
- IP
- device/session
- source
- correlation ID

Critical business events should also have durable event history.

---

# 27. Analytics

The executive dashboard should answer:

### What is happening?

```text
Sales
Production
Stock
Purchasing
Quality
Maintenance
```

### What's going wrong?

```text
Low stock
Overstock
Delayed orders
Machine downtime
Quality failures
Production variance
Supplier delays
```

### Where is money going?

```text
Material cost
Labor cost
Machine cost
Waste
Inventory value
Purchase variance
Product margin
```

---

# 28. Core KPIs

### Inventory

- Inventory value
- Stock accuracy
- Stock turnover
- Days of inventory
- Dead stock
- Slow moving
- Stockout rate
- Reserved stock
- WIP

### Manufacturing

- Production quantity
- Production attainment
- OEE / TRS
- Availability
- Performance
- Quality rate
- Scrap rate
- Rework rate
- Cycle time
- Production variance
- Schedule adherence

### Quality

- Defect rate
- First-pass yield
- NCR count
- Supplier defect rate
- Rejection rate
- CAPA aging

### Maintenance

- OEE
- Downtime
- MTBF
- MTTR
- Preventive compliance
- Maintenance cost

### Procurement

- Supplier lead time
- Purchase price variance
- On-time delivery
- Supplier quality

### Orders

- OTIF
- Order cycle time
- Backorders
- Late orders
- Gross margin

---

# 29. Dashboard hierarchy

I wouldn't build one giant dashboard.

### Owner dashboard

```text
Revenue
Inventory
Production
Margin
Cash
Orders
Alerts
```

### Production manager

```text
Today's production
Work centers
Downtime
Material shortages
Delayed orders
Quality
```

### Warehouse manager

```text
Inbound
Outbound
Picking
Stock
Low stock
Cycle counts
```

### Maintenance manager

```text
Open breakdowns
Today's work
Preventive maintenance
Downtime
Parts
```

### Quality manager

```text
Inspections
Rejects
NCR
CAPA
Supplier issues
```

---

# 30. Search

This will be heavily used.

Global command palette:

```text
⌘ K

Search anything...

Product
RM-20482

Lot
LOT-2026-00482

Production
OF-20942

Supplier
Atlas Steel

Machine
M-042

Customer
Hotel Atlas
```

Use Postgres search initially. Supabase exposes extensions including `pg_trgm` and PGroonga, so we can keep search inside Postgres initially and add a dedicated search engine only if actual scale requires it. ([Supabase][3])

---

# 31. Import / migration system

This is extremely important commercially.

A factory already has:

```text
Excel
Excel
Excel
Excel
```

We need:

```text
Import Products
Import Suppliers
Import Customers
Import Opening Stock
Import BOMs
Import Warehouse Locations
Import Employees
```

With mapping:

```text
Excel column       →   System field

Référence          →   SKU
Désignation        →   Name
Unité              →   UOM
Stock              →   Opening quantity
```

And validation preview:

```text
1,842 rows

✓ 1,799 valid
⚠ 31 warnings
✕ 12 errors
```

This can become a major sales tool.

---

# 32. Offline / PWA

I strongly recommend this.

Next.js officially documents PWAs and service workers as a first-class approach for app-like experiences without a native app-store deployment. ([Next.js][4])

Warehouse/factory environments may have unreliable connectivity.

### Offline-capable tasks

```text
Barcode scanning
Stock counting
Picking
Receiving
Production reporting
Machine checks
Quality inspections
Photos
```

Architecture:

```text
Browser
  ↓
Dexie / IndexedDB
  ↓
Local command queue
  ↓
Internet restored
  ↓
Sync engine
  ↓
Supabase
```

Every offline command needs:

```text
client_operation_id
created_at
user_id
device_id
entity_id
idempotency_key
```

Never blindly replay mutations.

---

# 33. AI layer

AI should be a **separate layer**, not embedded into the core domain.

### Phase 1 AI

Document extraction:

```text
Supplier PDF
 ↓
AI extraction
 ↓
Purchase receipt draft
```

### Phase 2

Ask:

> "Which raw materials are likely to run out this month?"

### Phase 3

> "Why was production below target yesterday?"

### Phase 4

Demand forecasting:

```text
Historical demand
+
Open orders
+
Seasonality
+
Lead time
        ↓
Recommended purchases
```

### Phase 5

Anomaly detection:

```text
Machine M-04

Normal downtime:
1.8 h/day

Today:
5.6 h

⚠ Anomaly detected
```

AI must **recommend**, not silently post inventory/financial operations.

---

# 34. Moroccan localization

The first release should support:

```text
French
Arabic
English optional
```

And:

```text
RTL
MAD
Metric units
French dates
Arabic names
French names
Moroccan company fields
Tax profiles
Document numbering
```

Company profile should allow the appropriate local identifiers and tax configuration, but final legal/accounting requirements should be validated with a Moroccan accountant before marketing the system as legally compliant.

### Example

```text
Entreprise

Raison sociale
ICE
IF
RC
Adresse
Ville
Téléphone
Email

Configuration

Devise: MAD
Langue: Français
Langue secondaire: العربية
```

---

# 35. Technical architecture

## My recommendation

**Modular monolith.**

Not microservices.

```text
                  NEXT.JS APP
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
     Server          Client         PWA
   Components       Components
        │              │
        └──────────────┼──────────────┘
                       ↓
                 Domain Services
                       │
      ┌────────────────┼────────────────┐
      ↓                ↓                ↓
   Inventory       Production        Quality
      │                │                │
      └────────────────┼────────────────┘
                       ↓
                  PostgreSQL
                    Supabase
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
      Auth          Storage        Realtime
        │                             │
        └──────────────┬──────────────┘
                       ↓
                  Event / Queue
                       │
                       ↓
                Edge Functions
```

This can later split services only when there is a genuine reason.

---

# 36. Recommended stack

As of October 3, 2026, I would use:

| Layer             | Choice                                    |
| ----------------- | ----------------------------------------- |
| Framework         | **Next.js 16.3.8**                        |
| React             | React 19                                  |
| Language          | TypeScript                                |
| Styling           | **Tailwind CSS 4**                        |
| Main UI           | **@xco-agency/corex-ui**                  |
| Primitives        | **shadcn/ui + Base UI**                   |
| State             | **Zustand 5.x**                           |
| Server cache      | **TanStack Query 5**                      |
| Tables            | **TanStack Table 9**                      |
| Virtualization    | **TanStack Virtual 3**                    |
| Forms             | React Hook Form                           |
| Validation        | **Zod 4**                                 |
| Server Actions    | **next-safe-action**                      |
| Backend           | Supabase                                  |
| DB                | PostgreSQL                                |
| Auth              | Supabase Auth                             |
| Files             | Supabase Storage                          |
| Realtime          | Supabase Realtime                         |
| Jobs              | Supabase Queues / pgmq                    |
| Scheduled jobs    | pg_cron                                   |
| PWA               | Native Service Worker / Next PWA approach |
| Offline DB        | Dexie / IndexedDB                         |
| Scanner           | `@zxing/browser`                          |
| Charts            | Recharts                                  |
| Dates             | date-fns                                  |
| URL state         | nuqs                                      |
| Icons             | lucide-react                              |
| Decimal math      | decimal.js                                |
| PDF               | `@react-pdf/renderer` or `pdf-lib`        |
| Error monitoring  | Sentry                                    |
| Product analytics | PostHog                                   |
| Unit tests        | Vitest                                    |
| E2E               | Playwright                                |
| Load testing      | k6                                        |

Next.js 16 is the current major line, with 16.3.8 designated Active LTS in the September 30, 2026 security release. Next.js 16 also introduced the current Cache Components model and modern App Router behavior. ([Next.js][5])

Tailwind's current Next.js setup uses Tailwind 4 with `@tailwindcss/postcss`. ([Tailwind CSS][6])

New shadcn projects now default to Base UI, while Radix remains supported. ([shadcn/ui][7])

`@xco-agency/corex-ui` is currently published at 0.1.7 and explicitly positions itself as a React wrapper/UI layer around Shopify Polaris-style web components. ([npm][8])

TanStack Table is now v9, TanStack Query is v5, and TanStack Virtual is v3. ([TanStack][9])

Zod is in the 4.x line, with 4.6.5 currently listed as latest, while Zustand is in 5.x. ([GitHub][10])

---

# 37. How I would use Corex + shadcn

Don't let the two libraries compete.

### Corex owns

```text
Buttons
Inputs
Selects
Comboboxes
Cards
Badges
Tabs
Tooltips
Popover patterns
Shopify-style compact controls
```

### shadcn/Base UI owns

```text
Command
Dialog
Sheet
Dropdown
Context menu
Calendar
Resizable
Data presentation
Specialized primitives
```

### Tailwind owns

```text
Layout
Spacing
Grid
Responsive
Typography
Colors
Borders
Elevation
Transitions
```

Then create our own abstraction:

```text
components/
├── ui/
│   ├── button
│   ├── input
│   ├── combobox
│   ├── dialog
│   └── ...
│
├── business/
│   ├── entity-picker
│   ├── money-input
│   ├── quantity-input
│   ├── sku-picker
│   ├── stock-badge
│   ├── document-status
│   ├── barcode-input
│   ├── lot-picker
│   └── ...
```

That protects us from dependency churn.

---

# 38. Don't use an ORM initially

I would **not add Prisma**.

And I would not make Drizzle the primary data layer.

Use:

```text
Supabase
   +
PostgreSQL
   +
Supabase generated TypeScript types
   +
SQL migrations
   +
Postgres functions/RPC
```

Why?

Manufacturing and inventory contain operations that must be atomic.

For example:

```text
POST RECEIPT

1. Create receipt
2. Create receipt lines
3. Add stock ledger entries
4. Update stock balance
5. Close receipt
6. Emit event
```

This should be a database transaction.

A Postgres function can guarantee that atomicity.

---

# 39. Supabase architecture

Supabase is a good fit because it gives us:

```text
PostgreSQL
Auth
Storage
Realtime
Edge Functions
Queues
CLI
Branches
```

Supabase recommends RLS as the database authorization layer and explicitly recommends enabling RLS for exposed tables and testing policies. ([Supabase][11])

For our product:

```text
Browser
   ↓
Supabase Auth session
   ↓
RLS
   ↓
Organization membership
   ↓
Site permissions
   ↓
Warehouse permissions
```

Never put the Supabase service-role key in the browser.

---

# 40. Multi-tenancy

Every business record should ultimately belong to:

```text
organization_id
```

Many records also get:

```text
site_id
warehouse_id
```

Example:

```text
inventory_items
organization_id
site_id
warehouse_id
location_id
item_id
```

RLS then guarantees:

```text
Organization A
    ✕
Organization B

Organization A
    ✓ Site 1
    ✓ Site 2
    ✕ Site 3
```

This must be part of the architecture from day one.

---

# 41. Core database domains

I'd use logical domains like:

```text
core
catalog
inventory
warehouse
procurement
sales
manufacturing
quality
maintenance
workforce
finance_ops
documents
notifications
audit
billing
```

Whether these become separate PostgreSQL schemas or remain tables within the public/exposed model can be decided by the database agent after testing Supabase API/RLS implications.

---

# 42. Core database model

A simplified model:

```text
organizations
    │
    ├── organization_members
    ├── sites
    │     ├── facilities
    │     ├── warehouses
    │     │      └── locations
    │     └── work_centers
    │
    └── settings
```

```text
items
 ├── item_categories
 ├── item_uoms
 ├── item_suppliers
 ├── item_barcodes
 ├── item_documents
 └── item_prices
```

```text
business_partners
 ├── contacts
 ├── addresses
 ├── customer_profiles
 └── supplier_profiles
```

Inventory:

```text
inventory_lots
inventory_serials

inventory_movements
       │
       ├── purchase receipt
       ├── transfer
       ├── issue
       ├── production consume
       ├── production output
       ├── sale
       ├── return
       └── adjustment

inventory_balances
inventory_reservations
inventory_counts
inventory_count_lines
```

Procurement:

```text
purchase_requests
purchase_orders
purchase_order_lines
purchase_receipts
purchase_receipt_lines
supplier_returns
```

Sales:

```text
quotes
sales_orders
sales_order_lines
deliveries
delivery_lines
customer_returns
```

Manufacturing:

```text
boms
bom_versions
bom_lines

routings
routing_operations
work_centers

production_orders
production_order_materials
production_order_operations
production_outputs
production_scrap
production_downtime
```

Quality:

```text
inspection_plans
inspection_points
inspections
inspection_results
non_conformances
capa_actions
```

Maintenance:

```text
assets
asset_components
maintenance_plans
maintenance_work_orders
maintenance_readings
maintenance_parts
```

Platform:

```text
approvals
notifications
documents
domain_events
audit_logs
subscriptions
usage_counters
```

---

# 43. Critical relationships

The system should revolve around these relationships:

```text
Supplier
   ↓
Purchase Order
   ↓
Receipt
   ↓
Quality Inspection
   ↓
Inventory
```

```text
Customer
   ↓
Sales Order
   ↓
Stock Reservation
   ↓
Delivery
   ↓
Invoice
```

```text
Customer Order
   ↓
Production Demand
   ↓
Production Order
   ↓
Material Reservation
   ↓
Material Consumption
   ↓
Production
   ↓
Quality
   ↓
Finished Goods
   ↓
Warehouse
```

```text
Production Order
   ↓
Routing
   ↓
Work Center
   ↓
Machine
   ↓
Operator
   ↓
Labor + Machine Cost
```

```text
Machine
   ↓
Downtime
   ↓
Maintenance Order
   ↓
Spare Part Consumption
   ↓
Machine restored
```

```text
Quality Failure
   ↓
Non-Conformance
   ↓
Quarantine
   ↓
Root Cause
   ↓
CAPA
   ↓
Resolution
```

That is the heart of the system.

---

# 44. Domain event architecture

We should implement an outbox/domain-event model early.

Example:

```text
purchase.receipt.posted
inventory.stock.increased
quality.inspection.required
quality.inspection.failed
production.order.started
production.output.posted
production.scrap.recorded
machine.breakdown.reported
maintenance.work_order.completed
sales.order.confirmed
delivery.completed
```

Then:

```text
Domain Action
    ↓
DB transaction
    ↓
domain_events / queue
    ↓
Consumers
```

Supabase Queues is now a durable Postgres-native message queue built around `pgmq`, with guaranteed delivery and archival, which fits these asynchronous workflows well. ([Supabase][12])

Use queues for:

```text
Email
Notifications
WhatsApp
PDF generation
AI jobs
Imports
Reports
Forecasts
Webhook delivery
```

Not for core synchronous inventory correctness.

---

# 45. Realtime

Use Supabase Realtime where people genuinely benefit from live state:

```text
Shop floor
Warehouse dashboard
Production board
Machine status
Approvals
Notifications
Inventory alerts
```

Prefer **Broadcast** for scalable real-time UI events; Supabase currently recommends Broadcast over raw Postgres Changes when scalability and security matter. ([Supabase][13])

---

# 46. Files

Private Storage buckets:

```text
company-documents
product-files
supplier-documents
quality-certificates
maintenance-files
production-files
avatars
exports
```

Use private storage with signed URLs rather than public document links. Supabase supports time-limited signed URLs for private objects. ([Supabase][14])

---

# 47. Next.js architecture

Use App Router.

```text
app/
│
├── (marketing)/
│
├── (auth)/
│   ├── login
│   ├── forgot-password
│   └── ...
│
└── (app)/
    └── [orgSlug]/
        ├── dashboard/
        ├── inventory/
        ├── warehouse/
        ├── procurement/
        ├── sales/
        ├── manufacturing/
        ├── quality/
        ├── maintenance/
        ├── workforce/
        ├── reports/
        ├── documents/
        └── settings/
```

Then:

```text
src/
├── modules/
│   ├── inventory/
│   ├── warehouse/
│   ├── procurement/
│   ├── manufacturing/
│   ├── quality/
│   ├── maintenance/
│   ├── sales/
│   └── ...
│
├── components/
├── lib/
├── server/
├── hooks/
├── stores/
└── types/
```

---

# 48. Each module follows the same structure

Example:

```text
src/modules/inventory/

├── domain/
│   ├── inventory-types.ts
│   ├── inventory-rules.ts
│   └── inventory-calculations.ts
│
├── application/
│   ├── receive-stock.ts
│   ├── transfer-stock.ts
│   ├── reserve-stock.ts
│   └── adjust-stock.ts
│
├── server/
│   ├── queries.ts
│   ├── mutations.ts
│   └── permissions.ts
│
├── schemas/
│   ├── receipt.schema.ts
│   └── transfer.schema.ts
│
├── ui/
│   ├── stock-table.tsx
│   ├── stock-form.tsx
│   └── stock-history.tsx
│
└── index.ts
```

This makes every module independently understandable by coding agents.

---

# 49. State management rules

This is important.

Don't dump all application state into Zustand.

### Server state

Use:

```text
TanStack Query
```

for:

```text
Inventory data
Orders
Production
Suppliers
Reports
```

TanStack Query is designed for asynchronous server state and caching. ([TanStack][15])

### UI state

Use Zustand for:

```text
Sidebar
Selected warehouse
Scanner state
Command palette
Modals
Filters
Draft UI
Local workspace preferences
```

### URL state

Use:

```text
nuqs
```

for:

```text
?page=2
&warehouse=A
&status=active
&search=steel
```

### Form state

Use:

```text
React Hook Form
+
Zod
```

### Offline state

Use:

```text
Dexie
```

---

# 50. Do not make every Next page a Client Component

Use:

```text
Server Components
      ↓
initial data
      ↓
Client Components
      ↓
interaction
```

Next.js currently recommends Server Components by default, with Client Components only when state/event/browser APIs are needed. ([Next.js][16])

This will be important because this app will have **huge data tables**.

---

# 51. Large-table architecture

Industrial software will eventually have:

```text
100k products
500k stock movements
1m audit events
100k purchase lines
100k production operations
```

Use:

```text
Server pagination
+
cursor/keyset pagination where appropriate
+
TanStack Table
+
TanStack Virtual
```

TanStack Table v9 is specifically designed for headless table composition and has improved performance and state architecture; TanStack Virtual handles large list rendering. ([TanStack][9])

Never fetch:

```text
SELECT * FROM inventory_movements
```

into the browser.

---

# 52. Database integrity rules

These are non-negotiable.

### Rule 1

Every business row has:

```text
organization_id
created_at
updated_at
created_by
updated_by
```

when applicable.

### Rule 2

Inventory ledger is append-only.

### Rule 3

Posted documents cannot be silently modified.

### Rule 4

No stock mutation without an inventory movement.

### Rule 5

Every inventory movement has a source reference.

```text
movement.source_type
movement.source_id
```

### Rule 6

Every important mutation is idempotent.

```text
idempotency_key
```

### Rule 7

Never use floating point for:

```text
Money
Weight
Quantity
Dimensions
```

### Rule 8

Never trust client permissions.

RLS + server authorization.

---

# 53. Security architecture

```text
User
 ↓
Supabase Auth
 ↓
Organization membership
 ↓
Role
 ↓
Permission
 ↓
RLS
 ↓
Database
```

Example:

```text
warehouse.pick
warehouse.receive
inventory.adjust
inventory.transfer
production.start
production.complete
quality.inspect
maintenance.complete
purchase.approve
```

Not simply:

```text
role = "admin"
```

Use granular permissions.

Supabase's current RLS documentation specifically recommends policies per operation and database-level testing with `supabase test db`. ([Supabase][11])

---

# 54. Testing architecture

### Unit

```text
Vitest
```

Test:

```text
BOM calculations
MRP calculations
stock calculations
cost calculations
UOM conversion
margin
availability
```

### Database

```text
Supabase local
+
SQL migrations
+
RLS tests
```

Supabase recommends a local migration-based workflow, and its CLI supports local Supabase stacks plus versioned migrations. ([Supabase][17])

### E2E

```text
Playwright
```

Test complete workflows:

```text
Purchase
→ Receive
→ Inspect
→ Stock

Customer order
→ Production
→ Quality
→ Delivery

Machine failure
→ Maintenance
→ Complete
```

### Load testing

```text
k6
```

Simulate:

```text
100 warehouse users
500 scanner operations/min
production dashboard
inventory queries
```

---

# 55. Environment architecture

```text
local
  ↓
development
  ↓
preview
  ↓
staging
  ↓
production
```

Use:

```text
Supabase local
Supabase branches
Supabase staging
Supabase production
```

Supabase branching now provides isolated database environments for changes/PRs, which is useful for testing migrations and RLS safely. ([Supabase][18])

---

# 56. Recommended repository

I would use pnpm + Turborepo.

```text
industrial-os/
│
├── apps/
│   ├── web/
│   └── worker/
│
├── packages/
│   ├── ui/
│   ├── corex/
│   ├── domain/
│   ├── validation/
│   ├── config/
│   ├── database/
│   └── types/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── seed.sql
│   ├── tests/
│   └── config.toml
│
├── docs/
│   ├── architecture/
│   ├── domains/
│   ├── decisions/
│   └── workflows/
│
└── tooling/
```

But don't force the Edge Functions into the same Node package architecture. Keep shared packages free from Node-only APIs so selected pieces can be reused where practical.

---

# 57. Suggested initial navigation

Don't expose 17 modules in the sidebar.

Use:

```text
Overview

Operations
  Inventory
  Warehouse
  Purchasing
  Sales

Production
  Production Orders
  Planning
  Shop Floor

Quality
  Inspections
  Non-Conformances

Maintenance
  Machines
  Work Orders

Analytics

Documents

Settings
```

The module menu should depend on enabled features.

---

# 58. The first release

Do **not** build everything above before talking to customers.

The first sellable version should be:

## **Industrial OS v1**

```text
1. Organizations / users / permissions

2. Products / items
3. UOM
4. Suppliers
5. Customers

6. Warehouses
7. Locations
8. Stock
9. Barcode
10. Transfers
11. Inventory adjustments
12. Stock counts

13. Purchase orders
14. Receiving

15. Sales orders
16. Delivery

17. BOM
18. Production orders
19. Material consumption
20. Finished production

21. Basic quality inspection

22. Basic machine maintenance

23. Dashboard
24. Audit log
25. Excel import/export
26. PDF documents
27. French + Arabic
28. PWA
```

That's already a serious product.

---

# 59. What should NOT be in v1

Don't start with:

```text
Full MRP II
Advanced finite capacity planning
AI forecasting
IoT
PLC integration
Payroll
Full accounting
Banking
SAML
EDI
Complex CRM
Advanced MES
Complex mobile native app
```

Build the foundation so these can be added.

---

# 60. End-to-end roadmap

## Phase 0 — Domain discovery

Before coding:

```text
5 factory profiles

Textile
Food
Furniture
Metal
Packaging
```

Interview:

```text
Owner
Production manager
Warehouse manager
Purchasing
Quality
Maintenance
Worker
Accountant
```

Map:

```text
current process
Excel files
paper forms
WhatsApp
approvals
inventory problems
production problems
```

Deliverable:

```text
Factory Process Atlas
```

---

# 61. Phase 1 — Architecture foundation

Build:

```text
Next.js
Supabase
Auth
Tenant
RLS
Design system
Corex
shadcn
Tailwind
logging
error handling
CI/CD
migrations
seed data
```

Deliverable:

```text
empty SaaS shell
```

with:

```text
login
organization creation
team invitation
role assignment
site
warehouse
```

---

# 62. Phase 2 — Master data

Build:

```text
Items
Categories
UOM
Barcodes
Suppliers
Customers
Warehouses
Locations
```

Then import:

```text
CSV
Excel
```

Deliverable:

```text
customer can import their existing data
```

---

# 63. Phase 3 — Inventory + WMS

This should be the first real value milestone.

Implement:

```text
Receipt
Transfer
Issue
Adjustment
Count
Reservation
Lots
Serials
Barcode
Stock ledger
Stock balance
```

Then:

```text
Mobile scanner UI
```

Deliverable:

> Customer can replace Excel inventory tracking.

---

# 64. Phase 4 — Procurement + Sales

Build:

```text
Purchase request
PO
Receipt

Quote
Sales order
Delivery
Return
```

Connect both to inventory.

Deliverable:

```text
Order → stock → delivery
```

---

# 65. Phase 5 — Manufacturing core

Now build:

```text
BOM
BOM versions
Routing
Work centers
Production order
Material reservation
Material consumption
Output
Scrap
WIP
```

Deliverable:

```text
Customer order
→ production
→ finished product
```

---

# 66. Phase 6 — Shop floor

Build a dedicated simplified UI:

```text
Worker
Supervisor
Production Manager
```

With:

```text
Start
Pause
Complete
Produced qty
Scrap
Downtime
Quality
```

This is where the software starts becoming something workers actually use.

---

# 67. Phase 7 — Quality

Build:

```text
Inspection plans
Inspection points
Inspection result
NCR
Quarantine
CAPA
Traceability
```

Deliverable:

```text
raw material → production → customer
```

traceability.

---

# 68. Phase 8 — Maintenance

Build:

```text
Assets
Machines
Preventive maintenance
Corrective maintenance
Work orders
Spare parts
Downtime
```

Then connect maintenance to production.

---

# 69. Phase 9 — Analytics

Build dashboards from the operational ledger.

Not arbitrary frontend calculations.

Create:

```text
SQL views
Materialized views
Aggregations
```

Examples:

```text
inventory_snapshot_daily
production_daily
machine_downtime_daily
quality_daily
purchasing_daily
sales_daily
```

---

# 70. Phase 10 — Offline/mobile

Add:

```text
PWA
Service Worker
IndexedDB
Sync queue
Barcode scanner
Camera
Offline workflows
```

Supabase background tasks and queues can handle asynchronous processing without blocking requests, which fits import processing, notifications and other background work. ([Supabase][19])

---

# 71. Phase 11 — Integrations

Start with:

```text
Excel
CSV
Email
WhatsApp
PDF
Accounting export
```

Later:

```text
API
Webhooks
Accounting systems
GPS
IoT
Barcode printers
ERP integrations
```

---

# 72. Phase 12 — AI

Only after good operational data exists.

```text
AI Assistant
Demand forecasting
Stock recommendations
Supplier analysis
Production analysis
Quality anomaly detection
Document extraction
```

The data foundation matters much more than the AI UI.

---

# 73. Phase 13 — Commercialization

Create onboarding wizard:

```text
Company
 ↓
Sites
 ↓
Warehouses
 ↓
Products
 ↓
Suppliers
 ↓
Opening stock
 ↓
Users
 ↓
Roles
 ↓
Optional Production
 ↓
Go Live
```

Then offer:

### SaaS

```text
Monthly / annual subscription
```

### Setup

```text
Data migration
Configuration
Training
```

### Enterprise

```text
Custom integrations
Advanced permissions
Dedicated support
Custom reporting
```

For eligible industrial customers, the existing Maroc PME digital-transformation support environment could be worth exploring as a sales-enablement route rather than assuming every customer must finance the full project themselves. ([Maroc PME][1])

---

# 74. The agent research workspace

This is the part I'd make explicit in the repository.

Create:

```text
docs/agents/
```

and assign independent research tasks.

## Agent 01 — Manufacturing Domain Architect

**Mission**

Research real factory processes for:

```text
Textile
Food
Furniture
Metal
Packaging
```

Deliver:

```text
process maps
entities
states
exceptions
approvals
KPIs
```

Question:

> What processes differ between industries, and which abstractions can safely be shared?

---

## Agent 02 — Inventory/WMS Architect

Research:

```text
FIFO
FEFO
Lot
Serial
Reservations
Bins
Put-away
Picking
Cycle counting
Barcode
Offline
```

Deliver:

```text
ERD
state machine
stock invariants
transaction model
scanning workflow
offline strategy
```

Critical question:

> How do we guarantee stock correctness when two warehouse operators change the same inventory simultaneously?

---

## Agent 03 — Manufacturing/MRP Architect

Research:

```text
BOM
Routing
MRP
Capacity
WIP
Backflush
Subcontracting
Scrap
Rework
Co-products
By-products
```

Deliver:

```text
domain model
production state machine
MRP algorithms
costing model
```

---

## Agent 04 — Quality Architect

Research:

```text
Incoming QC
In-process QC
Final QC
Sampling
NCR
CAPA
Quarantine
Traceability
Certificates
```

Deliver:

```text
quality data model
workflows
relationships
audit requirements
```

---

## Agent 05 — Maintenance Architect

Research:

```text
Assets
Machines
Preventive maintenance
Corrective maintenance
Meters
Spare parts
Downtime
MTBF
MTTR
```

Deliver:

```text
asset hierarchy
maintenance workflows
event relationships
KPIs
```

---

## Agent 06 — Morocco Localization Agent

Research specifically:

```text
Moroccan invoice requirements
VAT/tax configuration
ICE
IF
RC
CNSS-related operational requirements
Accounting export requirements
French/Arabic UX
DGI-related digital requirements
```

Deliver:

```text
fields
document requirements
local terminology
integration requirements
compliance risks
```

This agent should use authoritative Moroccan sources and identify anything that requires accountant/legal confirmation.

---

## Agent 07 — Competitor Intelligence Agent

Research:

```text
Odoo
Sage
Sage Morocco
ProERP
Thalès
Planet Soft
Ordavia
SMARTERP
iMOZ
local GPAO products
industry-specific tools
```

Deliver:

```text
features
pricing
target customer
onboarding
UX
weaknesses
positioning
```

Existing competitors already demonstrate demand for production, inventory, quality and maintenance, but their feature sets also show exactly where a new entrant would otherwise become indistinguishable from an ERP. ([Thalès Informatique][2])

---

## Agent 08 — Database Scalability Agent

Model:

```text
10 tenants
100 tenants
1,000 tenants
10,000 tenants
```

and simulate:

```text
10k products
100k products
1m inventory movements
10m inventory movements
```

Deliver:

```text
indexes
constraints
partition strategy
query plans
materialized views
archival strategy
```

---

## Agent 09 — Security Agent

Research:

```text
RLS
tenant isolation
RBAC
MFA
file security
webhooks
API security
rate limiting
audit
data export
data deletion
```

Deliver:

```text
threat model
RLS policy design
security checklist
penetration scenarios
```

---

## Agent 10 — UX Agent

Research workflows for:

```text
Owner
Warehouse manager
Warehouse worker
Production manager
Worker
Purchasing manager
Quality manager
Maintenance manager
```

Deliver:

```text
navigation
screens
mobile workflows
shortcuts
bulk operations
empty states
error states
permission states
```

The goal is to make:

> **warehouse/production users feel like they are operating a tool, not filling out ERP forms.**

---

# 75. Agent decision gates

Don't let agents endlessly research.

Every agent should return:

```text
DECISION

Problem
Recommendation
Alternatives
Chosen approach
Why
Database impact
API impact
UI impact
Migration impact
Risks
Open questions
```

Then an architecture agent merges those into:

```text
docs/architecture/decisions/
```

For example:

```text
ADR-001 Multi-Tenancy
ADR-002 Inventory Ledger
ADR-003 BOM Versioning
ADR-004 Production State Machine
ADR-005 Warehouse Location Model
ADR-006 Offline Sync
ADR-007 RLS Architecture
ADR-008 Domain Events
ADR-009 Costing
ADR-010 Document Numbering
```

This is extremely useful when using multiple coding agents.

---

# 76. Coding-agent rules

Put an `AGENTS.md` at the repository root.

The important rules should include:

```text
1. Never bypass domain services for business mutations.

2. Never modify inventory_balance directly from UI code.

3. Every stock operation creates an inventory movement.

4. Never use organization_id supplied by an untrusted client
   without verifying membership/context.

5. Never use service_role in browser code.

6. All mutations validate with Zod.

7. Critical multi-step mutations are transactional.

8. Posted documents are immutable.

9. Use TanStack Query for server state.

10. Use Zustand only for client/UI state.

11. Prefer Server Components for non-interactive views.

12. Tables must be server-paginated.

13. All new tables require RLS + tests.

14. Every migration must be reversible where practical.

15. Every domain module must have tests.

16. Never create duplicate UI primitives when an existing
    Corex/shadcn abstraction exists.
```

---

# 77. The architecture I would lock today

```text
                         INDUSTRIAL OS
                              │
 ┌────────────────────────────┼────────────────────────────┐
 │                            │                            │
 ↓                            ↓                            ↓
PLATFORM                    OPERATIONS                  INDUSTRIAL
 │                            │                            │
 Auth                         Sales                       Production
 Tenant                       Purchasing                  BOM
 RBAC                         Inventory                   Routing
 Audit                        Warehouse                   MRP
 Documents                    Partners                    Shop Floor
 Notifications               Logistics                   Quality
 Billing                      Costing                     Maintenance
 │                            │                            │
 └────────────────────────────┼────────────────────────────┘
                              ↓
                         DATA PLATFORM
                              │
                       PostgreSQL/Supabase
                              │
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
        Auth                Storage              Realtime
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ↓
                          EVENT LAYER
                              │
                      Queues / Domain Events
                              │
               ┌──────────────┼──────────────┐
               ↓              ↓              ↓
          Notifications      AI          Integrations
```

And the **single most important architectural decision** is:

> **Inventory Ledger + Business Documents + Domain Events become the backbone.**

Everything else connects to them.

That lets us later add:

```text
Factory
Workshop
Warehouse
Distribution
Fleet
IoT
AI
Accounting integrations
```

without rewriting the foundation.

---

## The first concrete milestone

I would make the initial engineering target:

```text
INDUSTRIAL OS V0.1

✓ Multi-tenant
✓ Auth / RBAC
✓ Sites
✓ Warehouses
✓ Locations
✓ Items
✓ UOM
✓ Suppliers
✓ Customers
✓ Barcode
✓ Inventory ledger
✓ Stock balances
✓ Receipts
✓ Transfers
✓ Adjustments
✓ Cycle counts
✓ Purchase orders
✓ Sales orders
✓ BOM
✓ Production orders
✓ Basic shop floor
✓ Basic quality
✓ Basic maintenance
✓ Audit log
✓ French / Arabic
✓ Excel import
✓ PWA
```

Then **V0.2** turns it into a serious factory product with MRP, costing, traceability, advanced quality, maintenance, offline sync and analytics.

The foundation should be built as a **modular monolith with Supabase/Postgres as the source of truth**, not as a collection of CRUD pages. That choice is what will let this evolve from a small Moroccan workshop application into a genuine multi-site industrial SaaS.

[1]: https://marocpme.gov.ma/mowakaba-tpme/accompagnement-technique/digitalisation-des-tpme/?utm_source=chatgpt.com "DIGITALISATION - MarocPME"
[2]: https://thales.ma/solutions/gestion-production?utm_source=chatgpt.com "Gestion de Production ERP : Planification & Qualité | Thalès Informatique"
[3]: https://supabase.com/docs/guides/database/extensions?utm_source=chatgpt.com "Postgres Extensions Overview | Supabase Docs"
[4]: https://nextjs.org/docs/app/guides/progressive-web-apps?utm_source=chatgpt.com "Guides: PWAs | Next.js"
[5]: https://nextjs.org/blog?utm_source=chatgpt.com "Next.js by Vercel - The React Framework | Next.js by Vercel - The React Framework"
[6]: https://tailwindcss.com/docs/installation/framework-guides/nextjs?utm_source=chatgpt.com "Install Tailwind CSS with Next.js - Tailwind CSS"
[7]: https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default?utm_source=chatgpt.com "July 2026 - Base UI as the Default - shadcn/ui"
[8]: https://www.npmjs.com/package/%40xco-agency/corex-ui?utm_source=chatgpt.com "@xco-agency/corex-ui - npm"
[9]: https://tanstack.com/table/latest/docs/framework/react?utm_source=chatgpt.com "React | TanStack Table React Docs"
[10]: https://github.com/colinhacks/zod/releases?utm_source=chatgpt.com "Releases · colinhacks/zod · GitHub"
[11]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
[12]: https://supabase.com/docs/guides/queues?utm_source=chatgpt.com "Supabase Queues | Supabase Docs"
[13]: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes?utm_source=chatgpt.com "Subscribing to Database Changes | Supabase Docs"
[14]: https://supabase.com/docs/guides/storage/serving/downloads?utm_source=chatgpt.com "Serving assets from Storage | Supabase Docs"
[15]: https://tanstack.com/query/latest/docs/framework/react?utm_source=chatgpt.com "React | TanStack Query React Docs"
[16]: https://nextjs.org/docs/app/getting-started/server-and-client-components?utm_source=chatgpt.com "Getting Started: Server and Client Components | Next.js"
[17]: https://supabase.com/docs/guides/local-development/database-migrations?utm_source=chatgpt.com "Database migrations | Supabase Docs"
[18]: https://supabase.com/docs/guides/deployment/branching?utm_source=chatgpt.com "Branching | Supabase Docs"
[19]: https://supabase.com/docs/guides/functions/background-tasks?utm_source=chatgpt.com "Background Tasks | Supabase Docs"
