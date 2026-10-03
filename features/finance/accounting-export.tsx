'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { PageShell, Panel } from '@/components/page-shell'
import { downloadCsv } from '@/lib/csv'
import { downloadXlsx } from '@/lib/excel'
import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { useOrganization } from '../organization/context'

type Dataset = { key: string; label: string; table: string; select: string; dateColumn: string; extraFilter?: [string, string]; columns: { header: string; get: (r: Record<string, unknown>) => string | number }[] }

const n = (v: unknown) => Number(v ?? 0)
const s = (v: unknown) => String(v ?? '')
const DATASETS: Dataset[] = [
  {
    key: 'sales_invoices', label: 'Factures clients (ventes)', table: 'sales_invoices', select: '*, partners(code, name, ice)', dateColumn: 'invoice_date', extraFilter: ['status', 'posted'],
    columns: [
      { header: 'Journal', get: () => 'VE' }, { header: 'Date', get: (r) => s(r.invoice_date) }, { header: 'Pièce', get: (r) => s(r.number) },
      { header: 'Compte tiers', get: (r) => s((r.partners as { code?: string } | null)?.code) }, { header: 'Tiers', get: (r) => s((r.partners as { name?: string } | null)?.name) },
      { header: 'ICE', get: (r) => s((r.partners as { ice?: string } | null)?.ice) }, { header: 'Total HT', get: (r) => n(r.subtotal) }, { header: 'TVA', get: (r) => n(r.tax_amount) },
      { header: 'Total TTC', get: (r) => n(r.total_amount) }, { header: 'Échéance', get: (r) => s(r.due_date) }, { header: 'Réglé', get: (r) => n(r.paid_amount) },
    ],
  },
  {
    key: 'supplier_invoices', label: 'Factures fournisseurs (achats)', table: 'supplier_invoices', select: '*, partners(code, name, ice)', dateColumn: 'invoice_date', extraFilter: ['status', 'posted'],
    columns: [
      { header: 'Journal', get: () => 'AC' }, { header: 'Date', get: (r) => s(r.invoice_date) }, { header: 'Pièce', get: (r) => s(r.number) }, { header: 'Facture fournisseur', get: (r) => s(r.supplier_invoice_no) },
      { header: 'Compte tiers', get: (r) => s((r.partners as { code?: string } | null)?.code) }, { header: 'Tiers', get: (r) => s((r.partners as { name?: string } | null)?.name) },
      { header: 'ICE', get: (r) => s((r.partners as { ice?: string } | null)?.ice) }, { header: 'Total HT', get: (r) => n(r.subtotal) }, { header: 'TVA', get: (r) => n(r.tax_amount) },
      { header: 'Total TTC', get: (r) => n(r.total_amount) }, { header: 'Échéance', get: (r) => s(r.due_date) }, { header: 'Réglé', get: (r) => n(r.paid_amount) },
    ],
  },
  {
    key: 'payments', label: 'Règlements (banque / caisse)', table: 'payments', select: '*, partners(code, name)', dateColumn: 'paid_on', extraFilter: ['status', 'posted'],
    columns: [
      { header: 'Journal', get: (r) => (r.method === 'cash' ? 'CA' : 'BQ') }, { header: 'Date', get: (r) => s(r.paid_on) }, { header: 'Pièce', get: (r) => s(r.number) },
      { header: 'Sens', get: (r) => (r.direction === 'in' ? 'Encaissement' : 'Décaissement') }, { header: 'Tiers', get: (r) => s((r.partners as { name?: string } | null)?.name) },
      { header: 'Mode', get: (r) => s(r.method) }, { header: 'Référence', get: (r) => s(r.reference) }, { header: 'Montant', get: (r) => n(r.amount) },
    ],
  },
  {
    key: 'expenses', label: 'Dépenses', table: 'expenses', select: '*', dateColumn: 'spent_on', extraFilter: ['status', 'posted'],
    columns: [{ header: 'Date', get: (r) => s(r.spent_on) }, { header: 'Pièce', get: (r) => s(r.number) }, { header: 'Catégorie', get: (r) => s(r.category) }, { header: 'Description', get: (r) => s(r.description) }, { header: 'Montant', get: (r) => n(r.amount) }],
  },
  {
    key: 'inventory_movements', label: 'Mouvements de stock valorisés', table: 'inventory_movements', select: '*, items(sku, name)', dateColumn: 'occurred_at',
    columns: [
      { header: 'Date', get: (r) => s(r.occurred_at).slice(0, 10) }, { header: 'Type', get: (r) => s(r.movement_type) }, { header: 'Article', get: (r) => s((r.items as { sku?: string } | null)?.sku) },
      { header: 'Désignation', get: (r) => s((r.items as { name?: string } | null)?.name) }, { header: 'Quantité', get: (r) => n(r.quantity) }, { header: 'Coût unitaire', get: (r) => n(r.unit_cost) }, { header: 'Valeur', get: (r) => n(r.value) }, { header: 'Source', get: (r) => `${s(r.source_type)} ${s(r.source_id)}` },
    ],
  },
]

/** Accounting export (CSV / Excel) of posted operational documents, ready for the accountant or an accounting ERP. */
export function AccountingExportPage() {
  const org = useOrganization()
  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`)
  const [to, setTo] = useState(today)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (d: Dataset, format: 'csv' | 'xlsx') => {
    setBusy(`${d.key}-${format}`)
    setError(null)
    try {
      let qb = requireSupabase().from(d.table).select(d.select).eq('organization_id', org.id).gte(d.dateColumn, from).lte(d.dateColumn, `${to}T23:59:59`)
      if (d.extraFilter) qb = qb.eq(d.extraFilter[0], d.extraFilter[1])
      const { data, error: e } = await qb.order(d.dateColumn).limit(50000)
      if (e) throw toUserError(e)
      const rows = (data ?? []) as unknown as Record<string, unknown>[]
      if (format === 'csv') downloadCsv(`export-${d.key}-${from}-${to}.csv`, d.columns.map((c) => ({ label: c.header, value: (r: Record<string, unknown>) => c.get(r) })), rows)
      else await downloadXlsx(`export-${d.key}-${from}-${to}.xlsx`, d.columns.map((c) => c.header), rows.map((r) => d.columns.map((c) => c.get(r))), d.label.slice(0, 30))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageShell title="Export comptable" icon={FileSpreadsheet} description="UsineFlow gère la finance opérationnelle : exportez les écritures vers votre comptable ou votre logiciel de comptabilité (CSV, Excel). La conformité comptable doit être validée avec votre expert-comptable.">
      {error && <Banner tone="critical">{error}</Banner>}
      <Panel title="Période">
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-[13px]"><span className="font-medium">Du</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" /></label>
          <label className="flex flex-col gap-1 text-[13px]"><span className="font-medium">Au</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm" /></label>
        </div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        {DATASETS.map((d) => (
          <Panel key={d.key} title={d.label}>
            <div className="flex gap-2">
              <Button variant="secondary" loading={busy === `${d.key}-csv`} onClick={() => void run(d, 'csv')}>CSV</Button>
              <Button variant="primary" loading={busy === `${d.key}-xlsx`} onClick={() => void run(d, 'xlsx')}>Excel</Button>
            </div>
          </Panel>
        ))}
      </div>
    </PageShell>
  )
}
