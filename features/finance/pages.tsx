'use client'

import { Banner } from '@xco-agency/corex-ui'
import { Banknote, CreditCard, Landmark, Receipt, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { StatStrip } from '@/components/stat-strip'
import { formatDate, formatMoney } from '@/lib/format'
import { sumOf } from '@/lib/decimal'
import { cancelAction, submitAction, rpcAction } from '../_core/doc-actions'
import { DocumentDetail, type DocumentConfig } from '../_core/document-detail'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { useListOptions } from '../_core/options'
import { Status } from '../_core/status'
import { usePartnerBalances, partnerPicker, usePartnerIndex } from '../partners/hooks'
import { cashHooks, costCenterHooks, expenseHooks, paymentHooks, salesInvoicePicker, supplierInvoicePicker } from './hooks'
import { financeApi } from './service'
import { COST_CENTER_KINDS, EXPENSE_CATEGORIES, PAYMENT_METHODS, type CashMovement, type CostCenter, type Expense, type Payment } from './types'
import type { PartnerBalance } from '../partners/types'

const useCostCenterOptions = () => useListOptions('cost_centers')
const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }))

const PAYMENT_HEADER = [
  { key: 'direction', label: 'Sens', type: 'select' as const, options: [{ value: 'in', label: 'Encaissement (client)' }, { value: 'out', label: 'Décaissement (fournisseur)' }], required: true, default: 'in', lockedOnEdit: true },
  { key: 'partner_id', label: 'Tiers', type: 'picker' as const, picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'sales_invoice_id', label: 'Facture client', type: 'picker' as const, picker: salesInvoicePicker, lockedOnEdit: true, hidden: (v: Record<string, string | boolean>) => v.direction !== 'in' },
  { key: 'supplier_invoice_id', label: 'Facture fournisseur', type: 'picker' as const, picker: supplierInvoicePicker, lockedOnEdit: true, hidden: (v: Record<string, string | boolean>) => v.direction !== 'out' },
  { key: 'amount', label: 'Montant (MAD)', type: 'money' as const, min: 0.01, required: true, lockedOnEdit: true },
  { key: 'method', label: 'Mode de paiement', type: 'select' as const, options: PAYMENT_METHODS, required: true, default: 'bank_transfer' },
  { key: 'paid_on', label: 'Date', type: 'date' as const },
  { key: 'reference', label: 'Référence (n° chèque, virement…)' },
  { key: 'cost_center_id', label: 'Centre de coûts', type: 'relation' as const, useOptions: useCostCenterOptions },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]

export function PaymentsPage() {
  const partners = usePartnerIndex()
  const columns: DataTableColumn<Payment>[] = [
    { key: 'number', label: 'N°', value: (p) => p.number ?? '—' },
    { key: 'dir', label: 'Sens', value: (p) => (p.direction === 'in' ? 'Encaissement' : 'Décaissement'), render: (p) => <Pill tone={p.direction === 'in' ? 'success' : 'info'}>{p.direction === 'in' ? 'Encaissement' : 'Décaissement'}</Pill> },
    { key: 'partner', label: 'Tiers', value: (p) => partners.get(p.partner_id)?.name ?? p.partner_id },
    { key: 'amount', label: 'Montant', align: 'right', value: (p) => p.amount, render: (p) => formatMoney(p.amount) },
    { key: 'method', label: 'Mode', value: (p) => PAYMENT_METHODS.find((m) => m.value === p.method)?.label ?? p.method },
    { key: 'date', label: 'Date', value: (p) => formatDate(p.paid_on) },
    { key: 'status', label: 'Statut', value: (p) => p.status, render: (p) => <Status value={p.status} /> },
  ]
  return (
    <EntityPage<Payment> title="Paiements" singular="paiement" icon={CreditCard} description="Règlements clients et fournisseurs, rattachés aux factures (soldes et statuts mis à jour à la comptabilisation)." hooks={paymentHooks} permission="finance.write" columns={columns}
      filter={{ label: 'Statut', options: opts(['draft', 'pending_approval', 'approved', 'posted', 'reversed', 'cancelled']), getValue: (p) => p.status }} fields={PAYMENT_HEADER} detailPath={(p) => `finance/paiements/${p.id}`} afterCreatePath={(p) => `finance/paiements/${p.id}`} exportName="paiements" />
  )
}

export function PaymentDetailPage() {
  const config: DocumentConfig<Payment, { id: string }> = {
    title: 'Paiements', singular: 'Paiement', icon: CreditCard, listPath: 'finance/paiements', entity: 'payments', approvalType: 'payment',
    header: { hooks: paymentHooks, fields: PAYMENT_HEADER, editPermission: 'finance.write' },
    actions: [
      submitAction('payment', 'finance.write'),
      rpcAction({ key: 'post', label: 'Comptabiliser le paiement', fn: 'post_payment', tone: 'primary', permission: 'finance.write', visible: (h) => h.status === 'draft' || h.status === 'approved', confirm: 'Le solde de la facture et la trésorerie seront mis à jour.' }),
      { key: 'reverse', label: 'Contre-passer', tone: 'critical', permission: 'finance.write', reasonLabel: 'Motif de la contre-passation', visible: (h) => h.status === 'posted', run: (h, reason) => financeApi.reversePayment(h.id, reason ?? '') },
      cancelAction('payment', 'finance.write'),
    ],
  }
  return <DocumentDetail config={config} />
}

const EXPENSE_HEADER = [
  { key: 'category', label: 'Catégorie', type: 'select' as const, options: EXPENSE_CATEGORIES, required: true, default: 'other' },
  { key: 'description', label: 'Description', required: true },
  { key: 'amount', label: 'Montant (MAD)', type: 'money' as const, min: 0.01, required: true },
  { key: 'spent_on', label: 'Date', type: 'date' as const },
  { key: 'partner_id', label: 'Fournisseur / bénéficiaire', type: 'picker' as const, picker: partnerPicker },
  { key: 'cost_center_id', label: 'Centre de coûts', type: 'relation' as const, useOptions: useCostCenterOptions },
  { key: 'paid', label: 'Payée immédiatement', type: 'checkbox' as const },
  { key: 'method', label: 'Mode de paiement', type: 'select' as const, options: PAYMENT_METHODS, default: 'cash' },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]

export function ExpensesPage() {
  const columns: DataTableColumn<Expense>[] = [
    { key: 'number', label: 'N°', value: (e) => e.number ?? '—' },
    { key: 'cat', label: 'Catégorie', value: (e) => EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category },
    { key: 'desc', label: 'Description', value: (e) => e.description },
    { key: 'amount', label: 'Montant', align: 'right', value: (e) => e.amount, render: (e) => formatMoney(e.amount) },
    { key: 'date', label: 'Date', value: (e) => formatDate(e.spent_on) },
    { key: 'status', label: 'Statut', value: (e) => e.status, render: (e) => <Status value={e.status} /> },
  ]
  return (
    <EntityPage<Expense> title="Dépenses" singular="dépense" icon={Receipt} description="Dépenses opérationnelles par catégorie et centre de coûts." hooks={expenseHooks} permission="finance.write" columns={columns}
      filter={{ label: 'Catégorie', options: EXPENSE_CATEGORIES, getValue: (e) => e.category }} fields={EXPENSE_HEADER} detailPath={(e) => `finance/depenses/${e.id}`} afterCreatePath={(e) => `finance/depenses/${e.id}`} exportName="depenses" />
  )
}

export function ExpenseDetailPage() {
  const config: DocumentConfig<Expense, { id: string }> = {
    title: 'Dépenses', singular: 'Dépense', icon: Receipt, listPath: 'finance/depenses', entity: 'expenses', approvalType: 'expense',
    header: { hooks: expenseHooks, fields: EXPENSE_HEADER, editPermission: 'finance.write' },
    actions: [
      submitAction('expense', 'finance.write'),
      rpcAction({ key: 'post', label: 'Comptabiliser', fn: 'post_expense', tone: 'primary', permission: 'finance.write', visible: (h) => h.status === 'draft' || h.status === 'approved' }),
      cancelAction('expense', 'finance.write'),
    ],
  }
  return <DocumentDetail config={config} />
}

export function CostCentersPage() {
  const columns: DataTableColumn<CostCenter>[] = [
    { key: 'code', label: 'Code', value: (c) => c.code },
    { key: 'name', label: 'Nom', value: (c) => c.name },
    { key: 'kind', label: 'Type', value: (c) => COST_CENTER_KINDS.find((k) => k.value === c.kind)?.label ?? c.kind },
    { key: 'active', label: 'Statut', value: (c) => (c.active ? 'Actif' : 'Inactif'), render: (c) => <Pill tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Actif' : 'Inactif'}</Pill> },
  ]
  return (
    <EntityPage<CostCenter> title="Centres de coûts" singular="centre de coûts" icon={Landmark} description="Axes d’analyse : départements, projets, sites." hooks={costCenterHooks} permission="finance.write" columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'kind', label: 'Type', type: 'select', options: COST_CENTER_KINDS, required: true, default: 'department' },
        { key: 'department_id', label: 'Département', type: 'relation', useOptions: () => useListOptions('departments') },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      importConfig={{ fields: [{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Nom', required: true }], example: { code: 'PROD', name: 'Production' }, templateName: 'modele-centres-couts.csv' }} />
  )
}

/** Cash and bank movements with running balance. */
export function CashPage() {
  const list = cashHooks.useList()
  const [account, setAccount] = useState('')
  const rows = useMemo(() => (list.data ?? []).filter((m) => !account || m.account === account), [list.data, account])
  const balance = sumOf(rows.map((m) => (m.kind === 'in' ? m.amount : -m.amount))).toNumber()
  const chart = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const m of [...rows].sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))) byDay.set(m.occurred_on, (byDay.get(m.occurred_on) ?? 0) + (m.kind === 'in' ? m.amount : -m.amount))
    let acc = 0
    return [...byDay.entries()].map(([day, v]) => ({ day, balance: Math.round((acc += v) * 100) / 100 }))
  }, [rows])
  const columns: DataTableColumn<CashMovement>[] = [
    { key: 'date', label: 'Date', value: (m) => formatDate(m.occurred_on) },
    { key: 'label', label: 'Libellé', value: (m) => m.label },
    { key: 'account', label: 'Compte', value: (m) => (m.account === 'cash' ? 'Caisse' : 'Banque') },
    { key: 'in', label: 'Entrée', align: 'right', value: (m) => (m.kind === 'in' ? m.amount : ''), render: (m) => (m.kind === 'in' ? <span className="text-emerald-700">{formatMoney(m.amount)}</span> : '') },
    { key: 'out', label: 'Sortie', align: 'right', value: (m) => (m.kind === 'out' ? m.amount : ''), render: (m) => (m.kind === 'out' ? <span className="text-red-700">{formatMoney(m.amount)}</span> : '') },
  ]
  return (
    <PageShell title="Trésorerie" icon={Wallet} description="Mouvements de caisse et de banque issus des paiements et dépenses comptabilisés." error={list.error?.message}>
      <StatStrip period="Cumul" stats={[{ label: 'Solde', value: formatMoney(balance) }, { label: 'Entrées', value: formatMoney(sumOf(rows.filter((m) => m.kind === 'in').map((m) => m.amount)).toNumber()) }, { label: 'Sorties', value: formatMoney(sumOf(rows.filter((m) => m.kind === 'out').map((m) => m.amount)).toNumber()) }]} />
      <select aria-label="Compte" value={account} onChange={(e) => setAccount(e.target.value)} className="h-8 w-48 rounded-lg border border-input bg-transparent px-2 text-[13px]">
        <option value="">Caisse + banque</option>
        <option value="cash">Caisse</option>
        <option value="bank">Banque</option>
      </select>
      <Panel title="Évolution du solde">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ left: -8 }}>
              <CartesianGrid vertical={false} stroke="#ebebeb" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b6b6b' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => formatMoney(Number(v))} />
              <Area dataKey="balance" name="Solde" stroke="#1a1a1a" fill="#e5e7eb" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <DataTable<CashMovement> title="Mouvements" singular="mouvement" columns={columns} rows={rows} loading={list.isPending} />
    </PageShell>
  )
}

/** Receivable / payable balances per partner with overdue amounts and credit-limit warnings. */
export function BalancesPage() {
  const { data, isPending, error } = usePartnerBalances()
  const rows = useMemo(() => (data ?? []).filter((b) => b.receivable !== 0 || b.payable !== 0 || b.credit_limit > 0).map((b) => ({ ...b, id: b.partner_id })), [data])
  const columns: DataTableColumn<PartnerBalance & { id: string }>[] = [
    { key: 'name', label: 'Tiers', value: (b) => b.name },
    { key: 'rec', label: 'À encaisser', align: 'right', value: (b) => b.receivable, render: (b) => formatMoney(b.receivable) },
    { key: 'recod', label: 'Dont en retard', align: 'right', value: (b) => b.receivable_overdue, render: (b) => <span className={b.receivable_overdue > 0 ? 'font-medium text-red-700' : ''}>{formatMoney(b.receivable_overdue)}</span> },
    { key: 'limit', label: 'Plafond', align: 'right', value: (b) => b.credit_limit, render: (b) => (b.credit_limit > 0 ? formatMoney(b.credit_limit) : '—') },
    { key: 'pay', label: 'À payer', align: 'right', value: (b) => b.payable, render: (b) => formatMoney(b.payable) },
    { key: 'payod', label: 'Dont en retard', align: 'right', value: (b) => b.payable_overdue, render: (b) => <span className={b.payable_overdue > 0 ? 'font-medium text-red-700' : ''}>{formatMoney(b.payable_overdue)}</span> },
  ]
  const total = (k: 'receivable' | 'payable' | 'receivable_overdue') => sumOf(rows.map((r) => r[k])).toNumber()
  return (
    <PageShell title="Soldes partenaires" icon={Banknote} description="Créances et dettes par client / fournisseur, échéances dépassées et plafonds de crédit." error={error?.message}>
      <StatStrip period="Maintenant" stats={[{ label: 'Créances', value: formatMoney(total('receivable')) }, { label: 'Dont en retard', value: formatMoney(total('receivable_overdue')) }, { label: 'Dettes fournisseurs', value: formatMoney(total('payable')) }]} />
      {rows.some((r) => r.credit_limit > 0 && r.receivable > r.credit_limit) && <Banner tone="warning">Certains clients dépassent leur plafond de crédit.</Banner>}
      <DataTable title="Soldes" singular="tiers" columns={columns} rows={rows} loading={isPending} />
    </PageShell>
  )
}
