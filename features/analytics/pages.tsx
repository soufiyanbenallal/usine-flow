'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { AlertTriangle, BarChart3, Download, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageShell, Panel } from '@/components/page-shell'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { downloadCsv } from '@/lib/csv'
import { downloadXlsx } from '@/lib/excel'
import { formatMoney, formatQty } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { useOrgPath, useOrganization } from '../organization/context'
import { useItemIndex } from '../items/hooks'
import { byWeek, oeeByDay, pct } from './aggregate'
import {
  useAging, useBalances, useDowntimeReasons, useKpis, useMarginsView, useOeeDaily, useOtifView, useProductionCosts, useProductionDaily, useProgress, usePurchasesDaily, useQualityDaily, useReliabilityView,
  useSalesDaily, useStockSummary, useSupplierPerformance,
} from './hooks'
import { DASHBOARD_ROLES, type DashboardRole, type Kpis } from './types'

const axis = { fontSize: 12, fill: '#6b6b6b' }
const COLORS = ['#303030', '#6b6b6b', '#2f7d4f', '#b45309', '#b42318']

type Card = { label: string; value: string; hint?: string; href?: string; tone?: 'critical' | 'warning' | 'ok' }
export function KpiCards({ cards }: { cards: Card[] }) {
  const href = useOrgPath()
  const t = useT()
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const body = (
          <div className={`h-full rounded-xl border bg-card p-4 shadow-xs ${c.href ? 'transition-colors hover:border-foreground/30' : ''}`}>
            <div className="text-xs text-muted-foreground">{t(c.label)}</div>
            <div className={`mt-1 text-xl font-semibold ${c.tone === 'critical' ? 'text-red-700' : c.tone === 'warning' ? 'text-amber-700' : ''}`}>{c.value}</div>
            {c.hint && <div className="mt-0.5 text-xs text-muted-foreground">{t(c.hint)}</div>}
          </div>
        )
        return c.href ? <Link key={c.label} href={href(c.href)}>{body}</Link> : <div key={c.label}>{body}</div>
      })}
    </div>
  )
}
const n0 = (v: number) => formatQty(v)
const flag = (v: number, tone: 'critical' | 'warning' = 'critical'): Card['tone'] => (v > 0 ? tone : 'ok')

function cardsFor(role: DashboardRole, k: Kpis): Card[] {
  switch (role) {
    case 'purchasing': return [
      { label: 'Commandes fournisseurs ouvertes', value: n0(k.open_purchase_orders), href: 'achats/commandes' }, { label: 'Achats (30 j)', value: formatMoney(k.purchases_30d), href: 'achats/commandes' },
      { label: 'Approbations en attente', value: n0(k.pending_approvals), href: 'approbations', tone: flag(k.pending_approvals, 'warning') }, { label: 'Dettes fournisseurs', value: formatMoney(k.payable), href: 'finance/soldes' },
    ]
    case 'sales': return [
      { label: 'Commandes clients ouvertes', value: n0(k.open_sales_orders), href: 'ventes/commandes' }, { label: 'Ventes (30 j)', value: formatMoney(k.sales_30d), href: 'ventes/commandes' },
      { label: 'Créances', value: formatMoney(k.receivable), href: 'finance/soldes' }, { label: 'Créances en retard', value: formatMoney(k.receivable_overdue), href: 'finance/soldes', tone: flag(k.receivable_overdue) },
    ]
    case 'production': return [
      { label: 'Ordres en cours', value: n0(k.production_in_progress), href: 'production/ordres' }, { label: 'Ordres en retard', value: n0(k.production_late), href: 'production/ordres', tone: flag(k.production_late) },
      { label: 'Produit (7 j)', value: n0(k.produced_7d) }, { label: 'Rebuts (7 j)', value: n0(k.scrap_7d), hint: `${pct(k.scrap_7d, k.produced_7d + k.scrap_7d)} %`, tone: flag(k.scrap_7d, 'warning') },
    ]
    case 'quality': return [
      { label: 'Non-conformités ouvertes', value: n0(k.open_ncr), href: 'qualite/non-conformites', tone: flag(k.open_ncr, 'warning') }, { label: 'CAPA en retard', value: n0(k.overdue_capa), href: 'qualite/capa', tone: flag(k.overdue_capa) },
      { label: 'Inspections en attente', value: n0(k.pending_inspections), href: 'qualite/inspections' }, { label: 'Lots expirant (30 j)', value: n0(k.expiring_lots), href: 'inventaire/lots', tone: flag(k.expiring_lots, 'warning') },
    ]
    case 'maintenance': return [
      { label: 'Pannes ouvertes', value: n0(k.open_breakdowns), href: 'maintenance/ordres', tone: flag(k.open_breakdowns) }, { label: 'Machines à l’arrêt', value: n0(k.machines_stopped), href: 'maintenance/equipements', tone: flag(k.machines_stopped) },
      { label: 'Préventif à venir (7 j)', value: n0(k.preventive_due), href: 'maintenance/plans' }, { label: 'Arrêts (7 j)', value: `${n0(k.downtime_minutes_7d)} min`, href: 'maintenance/indicateurs' },
    ]
    case 'warehouse': return [
      { label: 'Tâches ouvertes', value: n0(k.open_tasks), href: 'entrepot/taches' }, { label: 'Articles sous le seuil', value: n0(k.low_stock_count), href: 'inventaire/reapprovisionnement', tone: flag(k.low_stock_count, 'warning') },
      { label: 'Lots expirant (30 j)', value: n0(k.expiring_lots), href: 'inventaire/lots', tone: flag(k.expiring_lots, 'warning') }, { label: 'Valeur du stock', value: formatMoney(k.inventory_value), href: 'inventaire/valorisation' },
    ]
    case 'finance': return [
      { label: 'Trésorerie', value: formatMoney(k.cash_balance), href: 'finance/tresorerie' }, { label: 'Créances', value: formatMoney(k.receivable), href: 'finance/soldes' },
      { label: 'Créances en retard', value: formatMoney(k.receivable_overdue), tone: flag(k.receivable_overdue) }, { label: 'Dettes fournisseurs', value: formatMoney(k.payable), href: 'finance/soldes' },
    ]
    default: return [
      { label: 'Valeur du stock', value: formatMoney(k.inventory_value), href: 'inventaire/valorisation' }, { label: 'Ventes (30 j)', value: formatMoney(k.sales_30d) },
      { label: 'Achats (30 j)', value: formatMoney(k.purchases_30d) }, { label: 'Trésorerie', value: formatMoney(k.cash_balance), href: 'finance/tresorerie' },
      { label: 'Ordres en retard', value: n0(k.production_late), href: 'production/ordres', tone: flag(k.production_late) }, { label: 'Pannes ouvertes', value: n0(k.open_breakdowns), href: 'maintenance/ordres', tone: flag(k.open_breakdowns) },
      { label: 'Non-conformités ouvertes', value: n0(k.open_ncr), href: 'qualite/non-conformites', tone: flag(k.open_ncr, 'warning') }, { label: 'Approbations en attente', value: n0(k.pending_approvals), href: 'approbations', tone: flag(k.pending_approvals, 'warning') },
    ]
  }
}

function Chart({ title, children, empty }: { title: string; children: React.ReactElement; empty?: boolean }) {
  const t = useT()
  return (
    <Panel title={title}>
      {empty ? <p className="text-[13px] text-muted-foreground">{t('Pas encore de données.')}</p> : <div className="h-64"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>}
    </Panel>
  )
}

function SalesPurchasesChart() {
  const sales = useSalesDaily()
  const purchases = usePurchasesDaily()
  const data = useMemo(() => {
    const s = new Map(byWeek(sales.data ?? []).map((w) => [w.week, w.total]))
    const p = new Map(byWeek(purchases.data ?? []).map((w) => [w.week, w.total]))
    return [...new Set([...s.keys(), ...p.keys()])].sort().map((week) => ({ week, ventes: s.get(week) ?? 0, achats: p.get(week) ?? 0 }))
  }, [sales.data, purchases.data])
  return (
    <Chart title="Ventes et achats (par semaine, 90 j)" empty={data.length === 0}>
      <BarChart data={data}><CartesianGrid vertical={false} stroke="#e5e5e5" /><XAxis dataKey="week" tick={axis} /><YAxis tick={axis} /><Tooltip formatter={(v) => formatMoney(Number(v))} /><Legend />
        <Bar dataKey="ventes" fill={COLORS[0]} radius={[3, 3, 0, 0]} /><Bar dataKey="achats" fill={COLORS[1]} radius={[3, 3, 0, 0]} /></BarChart>
    </Chart>
  )
}
function ProductionChart() {
  const { data = [] } = useProductionDaily()
  const rows = useMemo(() => {
    const m = new Map<string, { day: string; produit: number; rebut: number }>()
    for (const r of data) { const c = m.get(r.day) ?? { day: r.day, produit: 0, rebut: 0 }; c.produit += Number(r.produced_qty); c.rebut += Number(r.scrap_qty); m.set(r.day, c) }
    return [...m.values()]
  }, [data])
  return (
    <Chart title="Production quotidienne (30 j)" empty={rows.length === 0}>
      <AreaChart data={rows}><CartesianGrid vertical={false} stroke="#e5e5e5" /><XAxis dataKey="day" tick={axis} /><YAxis tick={axis} /><Tooltip /><Legend />
        <Area dataKey="produit" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.15} /><Area dataKey="rebut" stroke={COLORS[4]} fill={COLORS[4]} fillOpacity={0.15} /></AreaChart>
    </Chart>
  )
}
function OeeChart() {
  const { data = [] } = useOeeDaily()
  const rows = useMemo(() => oeeByDay(data), [data])
  return (
    <Chart title="TRS / OEE moyen (30 j)" empty={rows.length === 0}>
      <LineChart data={rows}><CartesianGrid vertical={false} stroke="#e5e5e5" /><XAxis dataKey="day" tick={axis} /><YAxis domain={[0, 100]} tick={axis} /><Tooltip formatter={(v) => `${v} %`} /><Line dataKey="oee" stroke={COLORS[0]} dot={false} strokeWidth={2} /></LineChart>
    </Chart>
  )
}
function QualityChart() {
  const { data = [] } = useQualityDaily()
  const weekly = useMemo(() => byWeek(data.map((d) => ({ day: d.day, orders: d.inspections, total: d.failed }))), [data])
  return (
    <Chart title="Inspections échouées (par semaine)" empty={weekly.length === 0}>
      <BarChart data={weekly}><CartesianGrid vertical={false} stroke="#e5e5e5" /><XAxis dataKey="week" tick={axis} /><YAxis tick={axis} allowDecimals={false} /><Tooltip /><Bar dataKey="total" name="Échecs" fill={COLORS[4]} radius={[3, 3, 0, 0]} /></BarChart>
    </Chart>
  )
}
function DowntimeChart() {
  const { data = [] } = useDowntimeReasons()
  const rows = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of data) m.set(r.reason, (m.get(r.reason) ?? 0) + Number(r.minutes))
    return [...m.entries()].map(([reason, minutes]) => ({ reason, minutes })).sort((a, b) => b.minutes - a.minutes).slice(0, 8)
  }, [data])
  return (
    <Chart title="Pareto des arrêts (90 j, minutes)" empty={rows.length === 0}>
      <BarChart data={rows} layout="vertical" margin={{ left: 40 }}><CartesianGrid horizontal={false} stroke="#e5e5e5" /><XAxis type="number" tick={axis} /><YAxis type="category" dataKey="reason" tick={axis} width={120} /><Tooltip /><Bar dataKey="minutes" fill={COLORS[3]} radius={[0, 3, 3, 0]} /></BarChart>
    </Chart>
  )
}
function ReceivablesChart() {
  const { data = [] } = useBalances()
  const rows = useMemo(() => data.filter((b) => Number(b.receivable) > 0).sort((a, b) => Number(b.receivable) - Number(a.receivable)).slice(0, 8).map((b) => ({ name: b.name, encours: Number(b.receivable), retard: Number(b.receivable_overdue) })), [data])
  return (
    <Chart title="Principaux encours clients" empty={rows.length === 0}>
      <BarChart data={rows}><CartesianGrid vertical={false} stroke="#e5e5e5" /><XAxis dataKey="name" tick={axis} /><YAxis tick={axis} /><Tooltip formatter={(v) => formatMoney(Number(v))} /><Legend />
        <Bar dataKey="encours" fill={COLORS[0]} radius={[3, 3, 0, 0]} /><Bar dataKey="retard" fill={COLORS[4]} radius={[3, 3, 0, 0]} /></BarChart>
    </Chart>
  )
}

function ChartsFor({ role }: { role: DashboardRole }) {
  switch (role) {
    case 'purchasing': case 'sales': return <SalesPurchasesChart />
    case 'production': return <div className="grid gap-4 xl:grid-cols-2"><ProductionChart /><OeeChart /></div>
    case 'quality': return <div className="grid gap-4 xl:grid-cols-2"><QualityChart /><ProductionChart /></div>
    case 'maintenance': return <div className="grid gap-4 xl:grid-cols-2"><DowntimeChart /><OeeChart /></div>
    case 'finance': return <ReceivablesChart />
    case 'warehouse': return <StockAlerts />
    default: return <div className="grid gap-4 xl:grid-cols-2"><SalesPurchasesChart /><ProductionChart /></div>
  }
}

function StockAlerts() {
  const t = useT()
  const { data = [] } = useStockSummary()
  const low = data.filter((r) => r.low_stock === true).slice(0, 10)
  return (
    <Panel title="Articles sous le seuil de réapprovisionnement">
      <ul className="divide-y text-[13px]">{low.map((r, i) => <li key={i} className="flex justify-between py-2"><span>{String(r.name ?? r.sku)}</span><span className="text-muted-foreground">{formatQty(Number(r.on_hand ?? r.qty_on_hand ?? 0))}</span></li>)}</ul>
      {low.length === 0 && <p className="text-[13px] text-muted-foreground">{t('Aucune alerte de stock.')}</p>}
    </Panel>
  )
}

/** Role dashboard: KPI cards + charts. */
export function RoleDashboard({ role }: { role: DashboardRole }) {
  const kpis = useKpis()
  if (kpis.error) return <Banner tone="critical">{kpis.error.message}</Banner>
  return (
    <div className="space-y-4">
      {kpis.data && <KpiCards cards={cardsFor(role, kpis.data)} />}
      <ChartsFor role={role} />
    </div>
  )
}

const ROLE_BY_APP_ROLE: Record<string, DashboardRole> = {
  purchasing_manager: 'purchasing', buyer: 'purchasing', sales_manager: 'sales', sales_rep: 'sales', production_manager: 'production', operator: 'production',
  quality_manager: 'quality', maintenance_manager: 'maintenance', technician: 'maintenance', warehouse_manager: 'warehouse', warehouse_operator: 'warehouse', accountant: 'finance',
}

/** Home page: a dashboard tuned to the user's role, with a switcher to other views. */
export function DashboardHome() {
  const org = useOrganization()
  const initial = ROLE_BY_APP_ROLE[String(org.role)] ?? 'direction'
  const [role, setRole] = useState<DashboardRole>(initial)
  const kpis = useKpis()
  return (
    <PageShell title="Tableau de bord" icon={LayoutDashboard} description="Votre exploitation en un coup d’œil, mise à jour en continu.">
      {kpis.data && (kpis.data.production_late > 0 || kpis.data.machines_stopped > 0 || kpis.data.overdue_capa > 0) && (
        <Banner tone="warning"><span className="inline-flex items-center gap-2"><AlertTriangle className="size-4" />{kpis.data.production_late} ordre(s) en retard · {kpis.data.machines_stopped} machine(s) à l’arrêt · {kpis.data.overdue_capa} CAPA en retard</span></Banner>
      )}
      <SegmentedTabs tabs={DASHBOARD_ROLES.map((r) => ({ id: r.id, label: r.label }))} value={role} onChange={setRole} />
      <RoleDashboard role={role} />
    </PageShell>
  )
}

export function OverviewPage() {
  const [role, setRole] = useState<DashboardRole>('direction')
  const progress = useProgress()
  const items = useItemIndex()
  const active = (progress.data ?? []).filter((p) => ['released', 'in_progress', 'paused'].includes(p.status)).slice(0, 8)
  return (
    <PageShell title="Vue d’ensemble" icon={BarChart3} description="Tableaux de bord par métier : achats, ventes, production, qualité, maintenance, entrepôt, finance.">
      <SegmentedTabs tabs={DASHBOARD_ROLES.map((r) => ({ id: r.id, label: r.label }))} value={role} onChange={setRole} />
      <RoleDashboard role={role} />
      {(role === 'production' || role === 'direction') && active.length > 0 && (
        <Panel title="Avancement des ordres de fabrication">
          <ul className="space-y-3 text-[13px]">
            {active.map((p) => (
              <li key={p.production_order_id}>
                <div className="flex justify-between"><span className="font-medium">{p.number} — {items.get(p.item_id)?.name}</span><span>{p.progress_pct ?? 0} %</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-foreground" style={{ width: `${Math.min(100, Number(p.progress_pct ?? 0))}%` }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PageShell>
  )
}

/* ───────── reports ───────── */
type Col = { key: string; label: string; money?: boolean; qty?: boolean }
type ReportDef = { id: string; title: string; description: string; useRows: () => { data?: Record<string, unknown>[]; isLoading: boolean; error: Error | null }; columns: Col[] }
const REPORTS: ReportDef[] = [
  { id: 'stock', title: 'Stock par article', description: 'Quantités disponibles, réservées et seuils.', useRows: useStockSummary, columns: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Article' }, { key: 'on_hand', label: 'En stock', qty: true }, { key: 'reserved', label: 'Réservé', qty: true }, { key: 'available', label: 'Disponible', qty: true }, { key: 'reorder_point', label: 'Seuil', qty: true }] },
  { id: 'aging', title: 'Ancienneté du stock', description: 'Valeur du stock par tranche d’âge.', useRows: useAging, columns: [{ key: 'sku', label: 'SKU' }, { key: 'name', label: 'Article' }, { key: 'bucket', label: 'Tranche' }, { key: 'quantity', label: 'Quantité', qty: true }, { key: 'value', label: 'Valeur', money: true }] },
  { id: 'margins', title: 'Marges de vente', description: 'Chiffre d’affaires, coût et marge par ligne.', useRows: useMarginsView, columns: [{ key: 'order_number', label: 'Commande' }, { key: 'revenue', label: 'CA', money: true }, { key: 'cost', label: 'Coût', money: true }, { key: 'margin', label: 'Marge', money: true }, { key: 'margin_pct', label: 'Marge %' }] },
  { id: 'otif', title: 'OTIF clients', description: 'Livraisons complètes et à l’heure.', useRows: useOtifView, columns: [{ key: 'number', label: 'Commande' }, { key: 'requested_date', label: 'Date demandée' }, { key: 'delivered_on', label: 'Livré le' }, { key: 'on_time', label: 'À l’heure' }, { key: 'in_full', label: 'Complet' }] },
  { id: 'suppliers', title: 'Performance fournisseurs', description: 'Délais et conformité des réceptions.', useRows: useSupplierPerformance, columns: [{ key: 'name', label: 'Fournisseur' }, { key: 'orders', label: 'Commandes' }, { key: 'on_time_pct', label: 'À l’heure %' }, { key: 'reject_pct', label: 'Rejet %' }] },
  { id: 'prodcost', title: 'Coûts de production', description: 'Matière, main-d’œuvre et machine par ordre.', useRows: useProductionCosts, columns: [{ key: 'number', label: 'Ordre' }, { key: 'material_cost', label: 'Matière', money: true }, { key: 'labor_cost', label: 'Main-d’œuvre', money: true }, { key: 'machine_cost', label: 'Machine', money: true }, { key: 'total_cost', label: 'Total', money: true }] },
  { id: 'reliability', title: 'Fiabilité des équipements', description: 'MTBF, MTTR et coûts de maintenance.', useRows: useReliabilityView, columns: [{ key: 'code', label: 'Code' }, { key: 'name', label: 'Équipement' }, { key: 'failures', label: 'Pannes' }, { key: 'mtbf_hours', label: 'MTBF (h)' }, { key: 'mttr_minutes', label: 'MTTR (min)' }, { key: 'maintenance_cost', label: 'Coût', money: true }] },
  { id: 'balances', title: 'Soldes partenaires', description: 'Créances et dettes par client / fournisseur.', useRows: useBalances as ReportDef['useRows'], columns: [{ key: 'name', label: 'Partenaire' }, { key: 'receivable', label: 'Créances', money: true }, { key: 'receivable_overdue', label: 'En retard', money: true }, { key: 'payable', label: 'Dettes', money: true }, { key: 'payable_overdue', label: 'En retard', money: true }] },
]

function show(v: unknown, c: Col): string {
  if (v == null || v === '') return '—'
  if (c.money && !Number.isNaN(Number(v))) return formatMoney(Number(v))
  if (c.qty && !Number.isNaN(Number(v))) return formatQty(Number(v))
  return String(v)
}

function ReportTable({ def }: { def: ReportDef }) {
  const t = useT()
  const { data = [], isLoading, error } = def.useRows()
  const raw = (r: Record<string, unknown>, c: Col) => (r[c.key] == null ? '' : typeof r[c.key] === 'number' ? (r[c.key] as number) : String(r[c.key]))
  return (
    <Panel title={def.title}
      action={data.length > 0 && (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadCsv(def.id, def.columns.map((c) => ({ label: c.label, value: (r: Record<string, unknown>) => raw(r, c) })), data)}><span className="inline-flex items-center gap-1.5"><Download className="size-3.5" /> CSV</span></Button>
          <Button variant="secondary" onClick={() => downloadXlsx(def.id, def.columns.map((c) => c.label), data.map((r) => def.columns.map((c) => raw(r, c))))}>Excel</Button>
        </div>
      )}>
      {error && <Banner tone="critical">{error.message}</Banner>}
      <p className="mb-2 text-xs text-muted-foreground">{t(def.description)}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead><tr className="border-b text-left text-xs text-muted-foreground">{def.columns.map((c) => <th key={c.key} className={`p-2 font-medium ${c.money || c.qty ? 'text-right' : ''}`}>{t(c.label)}</th>)}</tr></thead>
          <tbody>{data.slice(0, 200).map((r, i) => <tr key={i} className="border-b last:border-0">{def.columns.map((c) => <td key={c.key} className={`p-2 ${c.money || c.qty ? 'text-right tabular-nums' : ''}`}>{show(r[c.key], c)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {!isLoading && data.length === 0 && <p className="py-4 text-[13px] text-muted-foreground">{t('Pas encore de données.')}</p>}
    </Panel>
  )
}

export function ReportsPage() {
  const [id, setId] = useState(REPORTS[0].id)
  const def = REPORTS.find((r) => r.id === id) ?? REPORTS[0]
  return (
    <PageShell title="Rapports" icon={BarChart3} description="Rapports tabulaires exportables en CSV et Excel.">
      <SegmentedTabs tabs={REPORTS.map((r) => ({ id: r.id, label: r.title }))} value={id} onChange={setId} />
      <ReportTable key={def.id} def={def} />
    </PageShell>
  )
}

