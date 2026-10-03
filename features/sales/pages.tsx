'use client'

import { Banner } from '@xco-agency/corex-ui'
import { FileSignature, FileText, RotateCcw, Truck, ShoppingBag } from 'lucide-react'
import { useMemo } from 'react'
import type { DataTableColumn } from '@/components/data-table'
import { Panel } from '@/components/page-shell'
import { formatDate, formatMoney, formatQty } from '@/lib/format'
import { marginPct } from '@/lib/decimal'
import { cancelAction, reverseAction, rpcAction, submitAction } from '../_core/doc-actions'
import { DocumentDetail, type DocAction, type DocumentConfig } from '../_core/document-detail'
import { EntityPage } from '../_core/entity-page'
import { PRICED_LINE_FIELDS, usePricedColumns } from '../_core/priced-lines'
import { Status } from '../_core/status'
import { lotPicker } from '../inventory/hooks'
import { itemPicker, useItemIndex } from '../items/hooks'
import { useOrganization } from '../organization/context'
import { partnerPicker, usePartnerIndex, useTransporterOptions } from '../partners/hooks'
import { useUomOptions } from '../uoms/hooks'
import { useLocationIndex, useLocationOptions, useWarehouseOptions } from '../warehouses/hooks'
import { paymentsService } from '../finance/service'
import { quotesService } from './service'
import { customerReturnHooks, customerReturnLineHooks, deliveryHooks, deliveryLineHooks, orderHooks, orderLineHooks, quoteHooks, quoteLineHooks, salesInvoiceHooks, salesInvoiceLineHooks, useCustomerExposure } from './hooks'
import { DELIVERY_STAGES, RETURN_CONDITIONS, type CustomerReturn, type CustomerReturnLine, type Delivery, type DeliveryLine, type Quote, type QuoteLine, type SalesInvoice, type SalesInvoiceLine, type SalesOrder, type SalesOrderLine } from './types'
import { salesApi } from './service'

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }))
const customerName = (idx: ReturnType<typeof usePartnerIndex>, id: string) => idx.get(id)?.name ?? id

const QUOTE_HEADER = [
  { key: 'customer_id', label: 'Client', type: 'picker' as const, picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'quote_date', label: 'Date du devis', type: 'date' as const },
  { key: 'valid_until', label: 'Valable jusqu’au', type: 'date' as const },
  { key: 'currency', label: 'Devise', default: 'MAD', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]
const ORDER_HEADER = [
  { key: 'customer_id', label: 'Client', type: 'picker' as const, picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'warehouse_id', label: 'Entrepôt de départ', type: 'relation' as const, useOptions: useWarehouseOptions, help: 'Le stock disponible de cet entrepôt est réservé à la confirmation.' },
  { key: 'order_date', label: 'Date de commande', type: 'date' as const },
  { key: 'requested_date', label: 'Livraison souhaitée', type: 'date' as const },
  { key: 'payment_terms_days', label: 'Délai de paiement (jours)', type: 'number' as const, min: 0, default: 30 },
  { key: 'currency', label: 'Devise', default: 'MAD', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]
const DELIVERY_HEADER = [
  { key: 'customer_id', label: 'Client', type: 'picker' as const, picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'warehouse_id', label: 'Entrepôt', type: 'relation' as const, useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'carrier_id', label: 'Transporteur', type: 'relation' as const, useOptions: useTransporterOptions },
  { key: 'vehicle', label: 'Véhicule' },
  { key: 'driver', label: 'Chauffeur' },
  { key: 'tracking_no', label: 'N° de suivi' },
  { key: 'delivery_date', label: 'Date de livraison', type: 'date' as const },
  { key: 'stage', label: 'Étape logistique', type: 'select' as const, options: DELIVERY_STAGES, default: 'pending' },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]
const RETURN_HEADER = [
  { key: 'customer_id', label: 'Client', type: 'picker' as const, picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'warehouse_id', label: 'Entrepôt de retour', type: 'relation' as const, useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'reason', label: 'Motif', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]
const INVOICE_HEADER = [
  { key: 'customer_id', label: 'Client', type: 'picker' as const, picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'invoice_date', label: 'Date de facture', type: 'date' as const },
  { key: 'due_date', label: 'Échéance', type: 'date' as const, help: 'Vide = date + délai de paiement du client.' },
  { key: 'currency', label: 'Devise', default: 'MAD', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
]

/* ───────── quotes ───────── */
export function QuotesPage() {
  const customers = usePartnerIndex()
  const columns: DataTableColumn<Quote>[] = [
    { key: 'number', label: 'N°', value: (q) => q.number ?? '—' },
    { key: 'customer', label: 'Client', value: (q) => customerName(customers, q.customer_id) },
    { key: 'date', label: 'Date', value: (q) => formatDate(q.quote_date) },
    { key: 'valid', label: 'Valable jusqu’au', value: (q) => formatDate(q.valid_until) },
    { key: 'total', label: 'Total TTC', align: 'right', value: (q) => q.total_amount, render: (q) => formatMoney(q.total_amount) },
    { key: 'status', label: 'Statut', value: (q) => q.status, render: (q) => <Status value={q.status} /> },
  ]
  return (
    <EntityPage<Quote> title="Devis" singular="devis" icon={FileSignature} description="Chiffrage client avec remises, validité et conversion en commande." hooks={quoteHooks} permission="sales.write" columns={columns}
      filter={{ label: 'Statut', options: opts(['draft', 'approved', 'sent', 'accepted', 'rejected', 'converted', 'cancelled']), getValue: (q) => q.status }} fields={QUOTE_HEADER}
      detailPath={(q) => `ventes/devis/${q.id}`} afterCreatePath={(q) => `ventes/devis/${q.id}`} exportName="devis" />
  )
}

export function QuoteDetailPage() {
  const columns = usePricedColumns<QuoteLine>()
  const mark = (key: string, label: string, status: string, visible: (h: Quote) => boolean): DocAction<Quote> => ({ key, label, permission: 'sales.write', visible, run: (h) => quotesService.update(h.id, { status }) })
  const config: DocumentConfig<Quote, QuoteLine> = {
    title: 'Devis', singular: 'Devis', icon: FileSignature, listPath: 'ventes/devis', entity: 'quotes', approvalType: 'quote', totals: true,
    header: { hooks: quoteHooks, fields: QUOTE_HEADER, editPermission: 'sales.write' },
    lines: { hooks: quoteLineHooks, fk: 'quote_id', singular: 'ligne de devis', fields: PRICED_LINE_FIELDS, useColumns: () => columns },
    actions: [
      submitAction('quote', 'sales.write'),
      mark('sent', 'Marquer comme envoyé', 'sent', (h) => h.status === 'approved'),
      mark('accepted', 'Accepté par le client', 'accepted', (h) => h.status === 'sent'),
      mark('rejected', 'Refusé par le client', 'rejected', (h) => h.status === 'sent'),
      rpcAction({ key: 'convert', label: 'Convertir en commande', fn: 'convert_quote_to_order', arg: 'p_quote', tone: 'primary', permission: 'sales.write', visible: (h) => ['approved', 'sent', 'accepted'].includes(h.status), after: (id, go) => go(`ventes/commandes/${id}`) }),
      cancelAction('quote', 'sales.write'),
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── sales orders ───────── */
export function SalesOrdersPage() {
  const customers = usePartnerIndex()
  const columns: DataTableColumn<SalesOrder>[] = [
    { key: 'number', label: 'N°', value: (o) => o.number ?? '—' },
    { key: 'customer', label: 'Client', value: (o) => customerName(customers, o.customer_id) },
    { key: 'date', label: 'Date', value: (o) => formatDate(o.order_date) },
    { key: 'req', label: 'Souhaité', value: (o) => formatDate(o.requested_date) },
    { key: 'total', label: 'Total TTC', align: 'right', value: (o) => o.total_amount, render: (o) => formatMoney(o.total_amount) },
    { key: 'status', label: 'Statut', value: (o) => o.status, render: (o) => <Status value={o.status} /> },
  ]
  return (
    <EntityPage<SalesOrder> title="Commandes clients" singular="commande client" icon={ShoppingBag} description="Confirmation avec contrôle du plafond de crédit et réservation du stock, puis livraison et facturation." hooks={orderHooks} permission="sales.write" columns={columns}
      filter={{ label: 'Statut', options: opts(['draft', 'pending_approval', 'approved', 'confirmed', 'partially_delivered', 'delivered', 'invoiced', 'cancelled']), getValue: (o) => o.status }} fields={ORDER_HEADER}
      detailPath={(o) => `ventes/commandes/${o.id}`} afterCreatePath={(o) => `ventes/commandes/${o.id}`} exportName="commandes-clients" />
  )
}

function OrderMargin({ order, lines }: { order: SalesOrder; lines: SalesOrderLine[] }) {
  const exposure = useCustomerExposure(order.customer_id)
  const revenue = lines.reduce((a, l) => a + (l.delivered_qty * l.unit_price * (1 - l.discount_pct / 100)), 0)
  const cost = lines.reduce((a, l) => a + l.cost_amount, 0)
  return (
    <Panel title="Marge et risque client">
      <dl className="grid gap-3 text-[13px] sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Chiffre d’affaires livré</dt><dd className="font-semibold">{formatMoney(revenue)}</dd></div>
        <div><dt className="text-muted-foreground">Coût des ventes</dt><dd className="font-semibold">{formatMoney(cost)}</dd></div>
        <div><dt className="text-muted-foreground">Marge</dt><dd className="font-semibold">{formatMoney(revenue - cost)} ({marginPct(revenue, cost).toNumber()} %)</dd></div>
        <div><dt className="text-muted-foreground">Encours client</dt><dd className="font-semibold">{formatMoney(exposure.data ?? 0)}</dd></div>
      </dl>
    </Panel>
  )
}

export function SalesOrderDetailPage() {
  const base = usePricedColumns<SalesOrderLine>()
  const columns = useMemo(() => {
    const delivered: DataTableColumn<SalesOrderLine> = { key: 'delivered', label: 'Livré', align: 'right', value: (l) => `${formatQty(l.delivered_qty)} / ${formatQty(l.quantity)}` }
    return [...base.slice(0, -1), delivered, base[base.length - 1]!]
  }, [base])
  const confirmable = (h: SalesOrder) => h.status === 'draft' || h.status === 'approved'
  const config: DocumentConfig<SalesOrder, SalesOrderLine> = {
    title: 'Commandes clients', singular: 'Commande client', icon: ShoppingBag, listPath: 'ventes/commandes', entity: 'sales_orders', approvalType: 'sales_order', totals: true,
    header: { hooks: orderHooks, fields: ORDER_HEADER, editPermission: 'sales.write' },
    lines: { hooks: orderLineHooks, fk: 'so_id', singular: 'ligne de commande', fields: [...PRICED_LINE_FIELDS, { key: 'requested_date', label: 'Livraison souhaitée', type: 'date' }], useColumns: () => columns },
    actions: [
      submitAction('sales_order', 'sales.write'),
      rpcAction({ key: 'confirm', label: 'Confirmer (crédit + réservation)', fn: 'confirm_sales_order', tone: 'primary', permission: 'sales.write', visible: confirmable }),
      rpcAction({ key: 'pick', label: 'Créer la préparation', fn: 'create_pick_list_from_so', arg: 'p_so', permission: 'warehouse.pick', visible: (h) => ['confirmed', 'partially_delivered'].includes(h.status), after: (id, go) => go(`entrepot/preparation/${id}`) }),
      rpcAction({ key: 'deliver', label: 'Créer la livraison', fn: 'create_delivery_from_so', arg: 'p_so', tone: 'primary', permission: 'warehouse.dispatch', visible: (h) => ['confirmed', 'partially_delivered'].includes(h.status), after: (id, go) => go(`ventes/livraisons/${id}`) }),
      rpcAction({ key: 'invoice', label: 'Facturer', fn: 'create_invoice_from_so', arg: 'p_so', permission: 'finance.write', visible: (h) => ['partially_delivered', 'delivered'].includes(h.status), after: (id, go) => go(`ventes/factures/${id}`) }),
      cancelAction('sales_order', 'sales.write'),
    ],
    extra: (h, lines) => <OrderMargin order={h} lines={lines} />,
    top: (h) => (h.status === 'confirmed' ? <Banner tone="info">Commande confirmée : le stock disponible est réservé.</Banner> : null),
  }
  return <DocumentDetail config={config} />
}

/* ───────── deliveries ───────── */
export function DeliveriesPage() {
  const customers = usePartnerIndex()
  const columns: DataTableColumn<Delivery>[] = [
    { key: 'number', label: 'N°', value: (d) => d.number ?? '—' },
    { key: 'customer', label: 'Client', value: (d) => customerName(customers, d.customer_id) },
    { key: 'date', label: 'Date', value: (d) => formatDate(d.delivery_date) },
    { key: 'stage', label: 'Étape', value: (d) => d.stage, render: (d) => <Status value={d.stage} /> },
    { key: 'tracking', label: 'Suivi', value: (d) => d.tracking_no ?? '—' },
    { key: 'status', label: 'Statut', value: (d) => d.status, render: (d) => <Status value={d.status} /> },
  ]
  return (
    <EntityPage<Delivery> title="Livraisons" singular="livraison" icon={Truck} description="Bons de livraison : préparation → colisage → chargement → expédition. La comptabilisation sort le stock (FEFO par lot)." hooks={deliveryHooks} permission="warehouse.dispatch" columns={columns}
      filter={{ label: 'Étape', options: DELIVERY_STAGES, getValue: (d) => d.stage }} fields={DELIVERY_HEADER} detailPath={(d) => `ventes/livraisons/${d.id}`} afterCreatePath={(d) => `ventes/livraisons/${d.id}`} exportName="livraisons" />
  )
}

export function DeliveryDetailPage() {
  const items = useItemIndex()
  const locations = useLocationIndex()
  const stageAction = (stage: string, label: string, from: string[]): DocAction<Delivery> => ({
    key: `stage-${stage}`, label, permission: 'warehouse.dispatch', visible: (h) => h.status === 'draft' && from.includes(h.stage), run: (h) => salesApi.setStage(h.id, stage),
  })
  const config: DocumentConfig<Delivery, DeliveryLine> = {
    title: 'Livraisons', singular: 'Bon de livraison', icon: Truck, listPath: 'ventes/livraisons', entity: 'deliveries',
    header: { hooks: deliveryHooks, fields: DELIVERY_HEADER, editPermission: 'warehouse.dispatch' },
    lines: {
      hooks: deliveryLineHooks, fk: 'delivery_id', singular: 'ligne de livraison',
      fields: [
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, required: true },
        { key: 'uom_id', label: 'Unité', type: 'relation', useOptions: useUomOptions },
        { key: 'lot_id', label: 'Lot (vide = FEFO automatique)', type: 'picker', picker: lotPicker },
        { key: 'location_id', label: 'Emplacement', type: 'relation', useOptions: () => useLocationOptions() },
        { key: 'serials', label: 'Numéros de série', type: 'tags' },
      ],
      useColumns: () => [
        { key: 'item', label: 'Article', value: (l) => (items.get(l.item_id) ? `${items.get(l.item_id)!.sku} — ${items.get(l.item_id)!.name}` : l.item_id) },
        { key: 'qty', label: 'Quantité', align: 'right', value: (l) => formatQty(l.quantity) },
        { key: 'lot', label: 'Lot', value: (l) => l.lot_id ?? 'FEFO' },
        { key: 'loc', label: 'Emplacement', value: (l) => (l.location_id ? (locations.get(l.location_id)?.code ?? '—') : 'auto') },
      ],
    },
    actions: [
      stageAction('picking', 'Début préparation', ['pending']),
      stageAction('packed', 'Marquer emballé', ['pending', 'picking']),
      stageAction('loaded', 'Marquer chargé', ['packed']),
      rpcAction({ key: 'post', label: 'Expédier (comptabiliser)', fn: 'post_delivery', tone: 'primary', permission: 'warehouse.dispatch', visible: (h) => h.status === 'draft', confirm: 'Le stock sera sorti et la commande mise à jour.' }),
      cancelAction('delivery', 'warehouse.dispatch'),
      reverseAction('delivery', 'warehouse.dispatch'),
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── customer returns ───────── */
export function CustomerReturnsPage() {
  const customers = usePartnerIndex()
  const columns: DataTableColumn<CustomerReturn>[] = [
    { key: 'number', label: 'N°', value: (r) => r.number ?? '—' },
    { key: 'customer', label: 'Client', value: (r) => customerName(customers, r.customer_id) },
    { key: 'reason', label: 'Motif', value: (r) => r.reason ?? '—' },
    { key: 'status', label: 'Statut', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
  ]
  return <EntityPage<CustomerReturn> title="Retours clients" singular="retour client" icon={RotateCcw} hooks={customerReturnHooks} permission="warehouse.receive" columns={columns} fields={RETURN_HEADER} detailPath={(r) => `ventes/retours/${r.id}`} afterCreatePath={(r) => `ventes/retours/${r.id}`} />
}

export function CustomerReturnDetailPage() {
  const items = useItemIndex()
  const config: DocumentConfig<CustomerReturn, CustomerReturnLine> = {
    title: 'Retours clients', singular: 'Retour client', icon: RotateCcw, listPath: 'ventes/retours', entity: 'customer_returns',
    header: { hooks: customerReturnHooks, fields: RETURN_HEADER, editPermission: 'warehouse.receive' },
    lines: {
      hooks: customerReturnLineHooks, fk: 'return_id', singular: 'ligne de retour',
      fields: [
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, required: true },
        { key: 'condition', label: 'État', type: 'select', options: RETURN_CONDITIONS, required: true, default: 'good' },
        { key: 'lot_id', label: 'Lot', type: 'picker', picker: lotPicker },
        { key: 'location_id', label: 'Emplacement', type: 'relation', useOptions: () => useLocationOptions() },
        { key: 'unit_cost', label: 'Coût unitaire (MAD)', type: 'money', min: 0 },
      ],
      useColumns: () => [
        { key: 'item', label: 'Article', value: (l) => (items.get(l.item_id) ? `${items.get(l.item_id)!.sku} — ${items.get(l.item_id)!.name}` : l.item_id) },
        { key: 'qty', label: 'Quantité', align: 'right', value: (l) => formatQty(l.quantity) },
        { key: 'cond', label: 'État', value: (l) => RETURN_CONDITIONS.find((c) => c.value === l.condition)?.label ?? l.condition },
      ],
    },
    actions: [
      rpcAction({ key: 'post', label: 'Comptabiliser le retour', fn: 'post_customer_return', tone: 'primary', permission: 'warehouse.receive', visible: (h) => h.status === 'draft', confirm: 'Les articles retournés seront remis en stock selon leur état.' }),
      cancelAction('customer_return', 'warehouse.receive'),
      reverseAction('customer_return', 'warehouse.receive'),
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── invoices ───────── */
export function SalesInvoicesPage() {
  const customers = usePartnerIndex()
  const columns: DataTableColumn<SalesInvoice>[] = [
    { key: 'number', label: 'N°', value: (i) => i.number ?? '—' },
    { key: 'customer', label: 'Client', value: (i) => customerName(customers, i.customer_id) },
    { key: 'date', label: 'Date', value: (i) => formatDate(i.invoice_date) },
    { key: 'due', label: 'Échéance', value: (i) => formatDate(i.due_date) },
    { key: 'total', label: 'Total TTC', align: 'right', value: (i) => i.total_amount, render: (i) => formatMoney(i.total_amount) },
    { key: 'paid', label: 'Encaissé', align: 'right', value: (i) => i.paid_amount, render: (i) => formatMoney(i.paid_amount) },
    { key: 'pay', label: 'Paiement', value: (i) => i.payment_status, render: (i) => <Status value={i.payment_status} /> },
    { key: 'status', label: 'Statut', value: (i) => i.status, render: (i) => <Status value={i.status} /> },
  ]
  return (
    <EntityPage<SalesInvoice> title="Factures clients" singular="facture client" icon={FileText} description="Factures issues des commandes livrées ; comptabilisation figée, correction par contre-passation." hooks={salesInvoiceHooks} permission="finance.write" columns={columns}
      filter={{ label: 'Paiement', options: opts(['unpaid', 'partial', 'paid']), getValue: (i) => i.payment_status }} fields={INVOICE_HEADER} detailPath={(i) => `ventes/factures/${i.id}`} afterCreatePath={(i) => `ventes/factures/${i.id}`} exportName="factures-clients" />
  )
}

export function SalesInvoiceDetailPage() {
  const org = useOrganization()
  const columns = usePricedColumns<SalesInvoiceLine>()
  const config: DocumentConfig<SalesInvoice, SalesInvoiceLine> = {
    title: 'Factures clients', singular: 'Facture client', icon: FileText, listPath: 'ventes/factures', entity: 'sales_invoices', totals: true,
    header: { hooks: salesInvoiceHooks, fields: INVOICE_HEADER, editPermission: 'finance.write' },
    lines: {
      hooks: salesInvoiceLineHooks, fk: 'invoice_id', singular: 'ligne de facture',
      fields: [
        { key: 'description', label: 'Désignation', required: true },
        { key: 'item_id', label: 'Article (optionnel)', type: 'picker', picker: itemPicker },
        { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, required: true, default: 1 },
        { key: 'unit_price', label: 'Prix unitaire HT (MAD)', type: 'money', min: 0, required: true },
        { key: 'discount_pct', label: 'Remise (%)', type: 'number', min: 0, default: 0 },
        { key: 'vat_rate', label: 'TVA (%)', type: 'number', min: 0, default: 20, required: true },
      ],
      useColumns: () => columns,
    },
    actions: [
      rpcAction({ key: 'post', label: 'Comptabiliser la facture', fn: 'post_sales_invoice', tone: 'primary', permission: 'finance.write', visible: (h) => h.status === 'draft' || h.status === 'approved', confirm: 'La facture ne pourra plus être modifiée (correction par contre-passation).' }),
      {
        key: 'pay', label: 'Enregistrer un encaissement', permission: 'finance.write', visible: (h) => h.status === 'posted' && h.payment_status !== 'paid',
        run: (h) => paymentsService.create(org.id, { direction: 'in', partner_id: h.customer_id, sales_invoice_id: h.id, amount: Math.round((h.total_amount - h.paid_amount) * 100) / 100, reference: h.number }),
        after: (p, go) => go(`finance/paiements/${(p as { id: string }).id}`),
      },
      cancelAction('sales_invoice', 'finance.write'),
      reverseAction('sales_invoice', 'finance.write'),
    ],
  }
  return <DocumentDetail config={config} />
}
