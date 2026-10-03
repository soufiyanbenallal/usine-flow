'use client'

import { Banner, Button, NumberField } from '@xco-agency/corex-ui'
import { ClipboardList, PackageCheck, ReceiptText, Scale, ShoppingCart, Undo2, ScrollText } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DataTableColumn } from '@/components/data-table'
import { Panel } from '@/components/page-shell'
import { useOrganization, useOrgPath } from '../organization/context'
import { formatDate, formatMoney, formatQty } from '@/lib/format'
import { ChildTable } from '../_core/child-table'
import { cancelAction, reverseAction, rpcAction, submitAction } from '../_core/doc-actions'
import { DocumentDetail, type DocumentConfig } from '../_core/document-detail'
import { EntityPage } from '../_core/entity-page'
import { PRICED_LINE_FIELDS, usePricedColumns } from '../_core/priced-lines'
import { Status } from '../_core/status'
import { itemPicker, useItemIndex } from '../items/hooks'
import { lotPicker } from '../inventory/hooks'
import { partnerPicker, usePartnerIndex } from '../partners/hooks'
import { useLocationIndex, useLocationOptions, useWarehouseOptions } from '../warehouses/hooks'
import { useUomOptions } from '../uoms/hooks'
import { useMutation } from '@tanstack/react-query'
import { AGREEMENT_HEADER, INVOICE_HEADER, ORDER_HEADER, RECEIPT_HEADER, REQUEST_HEADER, RFQ_HEADER, SUPPLIER_RETURN_HEADER } from './headers'
import {
  agreementHooks, agreementLineHooks, orderHooks, orderLineHooks, receiptHooks, receiptLineHooks, requestHooks, requestLineHooks, rfqHooks, rfqLineHooks, rfqQuoteHooks, supplierInvoiceHooks,
  supplierInvoiceLineHooks, supplierReturnHooks, supplierReturnLineHooks,
} from './hooks'
import { procurementApi, requestLinesService, rfqsService } from './service'
import {
  AGREEMENT_STATUS, SUPPLIER_RETURN_BUCKETS, type PurchaseAgreement, type PurchaseAgreementLine, type PurchaseOrder, type PurchaseOrderLine, type PurchaseReceipt, type PurchaseReceiptLine, type PurchaseRequest,
  type PurchaseRequestLine, type Rfq, type RfqLine, type RfqQuote, type RfqQuoteLine, type SupplierInvoice, type SupplierInvoiceLine, type SupplierReturn, type SupplierReturnLine,
} from './types'
import { rfqQuoteLineHooks } from './hooks'
import { paymentsService } from '../finance/service'

const statusOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }))
const supplierName = (index: ReturnType<typeof usePartnerIndex>, id: string) => index.get(id)?.name ?? id

/* ───────── purchase requests ───────── */

export function PurchaseRequestsPage() {
  const columns: DataTableColumn<PurchaseRequest>[] = [
    { key: 'number', label: 'N°', value: (r) => r.number ?? '—' },
    { key: 'by', label: 'Demandeur', value: (r) => r.requested_by_name ?? '—' },
    { key: 'needed', label: 'Besoin', value: (r) => formatDate(r.needed_on) },
    { key: 'total', label: 'Estimation', align: 'right', value: (r) => r.total_amount, render: (r) => formatMoney(r.total_amount) },
    { key: 'status', label: 'Statut', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
  ]
  return (
    <EntityPage<PurchaseRequest>
      title="Demandes d’achat"
      singular="demande d’achat"
      icon={ClipboardList}
      description="Besoins exprimés par les équipes, soumis à approbation puis convertis en commande fournisseur."
      hooks={requestHooks}
      permission="purchase.write"
      columns={columns}
      filter={{ label: 'Statut', options: statusOptions(['draft', 'pending_approval', 'approved', 'converted', 'cancelled']), getValue: (r) => r.status }}
      fields={REQUEST_HEADER}
      detailPath={(r) => `achats/demandes/${r.id}`}
      afterCreatePath={(r) => `achats/demandes/${r.id}`}
    />
  )
}

export function PurchaseRequestDetailPage() {
  const org = useOrganization()
  const columns = usePricedColumns<PurchaseRequestLine>()
  const config: DocumentConfig<PurchaseRequest, PurchaseRequestLine> = {
    title: 'Demandes d’achat', singular: 'Demande d’achat', icon: ClipboardList, listPath: 'achats/demandes', entity: 'purchase_requests', approvalType: 'purchase_request', totals: true,
    header: { hooks: requestHooks, fields: REQUEST_HEADER, editPermission: 'purchase.write' },
    lines: { hooks: requestLineHooks, fk: 'request_id', singular: 'ligne', fields: PRICED_LINE_FIELDS, useColumns: () => columns },
    actions: [
      submitAction('purchase_request', 'purchase.write'),
      cancelAction('purchase_request', 'purchase.write'),
      {
        key: 'to_po', label: 'Créer une commande', tone: 'primary', permission: 'purchase.write', visible: (h) => h.status === 'approved',
        run: async (h) => {
          const lines = await requestLinesService.listBy(org.id, 'request_id', h.id)
          const supplier = lines.find((l) => l.supplier_id)?.supplier_id
          if (!supplier) throw new Error('Renseignez un fournisseur sur au moins une ligne de la demande.')
          return procurementApi.createPoFromRequest(h.id, supplier)
        },
        after: (id, go) => go(`achats/commandes/${id}`),
      },
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── purchase orders ───────── */

export function PurchaseOrdersPage() {
  const suppliers = usePartnerIndex()
  const columns: DataTableColumn<PurchaseOrder>[] = [
    { key: 'number', label: 'N°', value: (o) => o.number ?? '—' },
    { key: 'supplier', label: 'Fournisseur', value: (o) => supplierName(suppliers, o.supplier_id) },
    { key: 'date', label: 'Date', value: (o) => formatDate(o.order_date) },
    { key: 'expected', label: 'Livraison', value: (o) => formatDate(o.expected_date) },
    { key: 'total', label: 'Total TTC', align: 'right', value: (o) => o.total_amount, render: (o) => formatMoney(o.total_amount) },
    { key: 'status', label: 'Statut', value: (o) => o.status, render: (o) => <Status value={o.status} /> },
  ]
  return (
    <EntityPage<PurchaseOrder>
      title="Commandes d’achat"
      singular="commande d’achat"
      icon={ShoppingCart}
      description="Brouillon → approbation (selon montant) → envoyée → réceptionnée → clôturée."
      hooks={orderHooks}
      permission="purchase.write"
      columns={columns}
      filter={{ label: 'Statut', options: statusOptions(['draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'received', 'closed', 'cancelled']), getValue: (o) => o.status }}
      fields={ORDER_HEADER}
      detailPath={(o) => `achats/commandes/${o.id}`}
      afterCreatePath={(o) => `achats/commandes/${o.id}`}
      exportName="commandes-achat"
    />
  )
}

function PoReceipts({ po }: { po: PurchaseOrder }) {
  const href = useOrgPath()
  const { data } = receiptHooks.useListBy('po_id', po.id)
  return (
    <Panel title="Réceptions liées">
      {(data ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Aucune réception.</p>}
      <ul className="divide-y text-[13px]">
        {(data ?? []).map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2">
            <Link href={href(`achats/receptions/${r.id}`)} className="font-medium underline">{r.number}</Link>
            <span className="text-muted-foreground">{formatDate(r.received_on)}</span>
            <Status value={r.status} />
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function PurchaseOrderDetailPage() {
  const baseColumns = usePricedColumns<PurchaseOrderLine>()
  const columns = useMemo(() => {
    const received: DataTableColumn<PurchaseOrderLine> = { key: 'received', label: 'Reçu', align: 'right', value: (l) => `${formatQty(l.received_qty)} / ${formatQty(l.quantity)}` }
    return [...baseColumns.slice(0, -1), received, baseColumns[baseColumns.length - 1]!]
  }, [baseColumns])
  const config: DocumentConfig<PurchaseOrder, PurchaseOrderLine> = {
    title: 'Commandes d’achat', singular: 'Commande d’achat', icon: ShoppingCart, listPath: 'achats/commandes', entity: 'purchase_orders', approvalType: 'purchase_order', totals: true,
    header: { hooks: orderHooks, fields: ORDER_HEADER, editPermission: 'purchase.write' },
    lines: { hooks: orderLineHooks, fk: 'po_id', singular: 'ligne de commande', fields: [...PRICED_LINE_FIELDS, { key: 'expected_date', label: 'Livraison prévue', type: 'date' }], useColumns: () => columns },
    actions: [
      submitAction('purchase_order', 'purchase.write'),
      rpcAction({ key: 'send', label: 'Envoyer au fournisseur', fn: 'send_purchase_order', tone: 'primary', permission: 'purchase.write', visible: (h) => h.status === 'approved' }),
      rpcAction({ key: 'receive', label: 'Créer la réception', fn: 'create_receipt_from_po', arg: 'p_po', tone: 'primary', permission: 'warehouse.receive', visible: (h) => ['approved', 'ordered', 'partially_received'].includes(h.status), after: (id, go) => go(`achats/receptions/${id}`) }),
      rpcAction({ key: 'close', label: 'Clôturer', fn: 'close_purchase_order', permission: 'purchase.write', visible: (h) => ['ordered', 'partially_received', 'received'].includes(h.status), confirm: 'Clôturer la commande : les quantités non reçues sont abandonnées.' }),
      cancelAction('purchase_order', 'purchase.write'),
    ],
    extra: (h) => <PoReceipts po={h} />,
  }
  return <DocumentDetail config={config} />
}

/* ───────── receipts ───────── */

export function ReceiptsPage() {
  const suppliers = usePartnerIndex()
  const warehouses = useWarehouseOptions()
  const columns: DataTableColumn<PurchaseReceipt>[] = [
    { key: 'number', label: 'N°', value: (r) => r.number ?? '—' },
    { key: 'supplier', label: 'Fournisseur', value: (r) => supplierName(suppliers, r.supplier_id) },
    { key: 'wh', label: 'Entrepôt', value: (r) => warehouses.find((w) => w.value === r.warehouse_id)?.label ?? '—' },
    { key: 'note', label: 'BL fournisseur', value: (r) => r.supplier_delivery_note ?? '—' },
    { key: 'date', label: 'Reçu le', value: (r) => formatDate(r.received_on) },
    { key: 'status', label: 'Statut', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
  ]
  return (
    <EntityPage<PurchaseReceipt>
      title="Réceptions"
      singular="réception"
      icon={PackageCheck}
      description="À la comptabilisation : entrée en stock, création des lots, contrôle qualité à la réception (quarantaine) et tâches de mise en stock."
      hooks={receiptHooks}
      permission="warehouse.receive"
      columns={columns}
      filter={{ label: 'Statut', options: statusOptions(['draft', 'posted', 'reversed', 'cancelled']), getValue: (r) => r.status }}
      fields={RECEIPT_HEADER}
      detailPath={(r) => `achats/receptions/${r.id}`}
      afterCreatePath={(r) => `achats/receptions/${r.id}`}
      exportName="receptions"
    />
  )
}

export function ReceiptDetailPage() {
  const items = useItemIndex()
  const locations = useLocationIndex()
  const config: DocumentConfig<PurchaseReceipt, PurchaseReceiptLine> = {
    title: 'Réceptions', singular: 'Réception', icon: PackageCheck, listPath: 'achats/receptions', entity: 'purchase_receipts',
    header: { hooks: receiptHooks, fields: RECEIPT_HEADER, editPermission: 'warehouse.receive' },
    lines: {
      hooks: receiptLineHooks, fk: 'receipt_id', singular: 'ligne de réception',
      fields: [
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'quantity', label: 'Quantité reçue', type: 'number', min: 0.0001, required: true },
        { key: 'uom_id', label: 'Unité', type: 'relation', useOptions: useUomOptions },
        { key: 'unit_cost', label: 'Coût unitaire (MAD)', type: 'money', min: 0 },
        { key: 'lot_number', label: 'N° de lot', help: 'Obligatoire pour les articles suivis par lot.' },
        { key: 'expires_on', label: 'Péremption', type: 'date' },
        { key: 'manufactured_on', label: 'Fabrication', type: 'date' },
        { key: 'location_id', label: 'Emplacement', type: 'relation', useOptions: () => useLocationOptions() },
        { key: 'serials', label: 'Numéros de série', type: 'tags' },
        { key: 'discrepancy_note', label: 'Écart constaté' },
      ],
      useColumns: () => [
        { key: 'item', label: 'Article', value: (l) => (items.get(l.item_id) ? `${items.get(l.item_id)!.sku} — ${items.get(l.item_id)!.name}` : l.item_id) },
        { key: 'qty', label: 'Quantité', align: 'right', value: (l) => formatQty(l.quantity) },
        { key: 'lot', label: 'Lot', value: (l) => l.lot_number ?? '—' },
        { key: 'exp', label: 'Péremption', value: (l) => formatDate(l.expires_on) },
        { key: 'loc', label: 'Emplacement', value: (l) => (l.location_id ? (locations.get(l.location_id)?.code ?? '—') : '—') },
        { key: 'cost', label: 'Coût unit.', align: 'right', value: (l) => (l.unit_cost === null ? '—' : formatMoney(l.unit_cost)) },
        { key: 'note', label: 'Écart', value: (l) => l.discrepancy_note ?? '' },
      ],
    },
    actions: [
      rpcAction({ key: 'post', label: 'Comptabiliser la réception', fn: 'post_purchase_receipt', tone: 'primary', permission: 'warehouse.receive', visible: (h) => h.status === 'draft', confirm: 'Le stock sera augmenté ; les articles à contrôler passent en quarantaine.' }),
      cancelAction('purchase_receipt', 'warehouse.receive'),
      reverseAction('purchase_receipt', 'warehouse.receive'),
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── supplier returns ───────── */

export function SupplierReturnsPage() {
  const suppliers = usePartnerIndex()
  const columns: DataTableColumn<SupplierReturn>[] = [
    { key: 'number', label: 'N°', value: (r) => r.number ?? '—' },
    { key: 'supplier', label: 'Fournisseur', value: (r) => supplierName(suppliers, r.supplier_id) },
    { key: 'reason', label: 'Motif', value: (r) => r.reason ?? '—' },
    { key: 'status', label: 'Statut', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
  ]
  return (
    <EntityPage<SupplierReturn>
      title="Retours fournisseurs"
      singular="retour fournisseur"
      icon={Undo2}
      hooks={supplierReturnHooks}
      permission="warehouse.dispatch"
      columns={columns}
      fields={SUPPLIER_RETURN_HEADER}
      detailPath={(r) => `achats/retours/${r.id}`}
      afterCreatePath={(r) => `achats/retours/${r.id}`}
    />
  )
}

export function SupplierReturnDetailPage() {
  const items = useItemIndex()
  const config: DocumentConfig<SupplierReturn, SupplierReturnLine> = {
    title: 'Retours fournisseurs', singular: 'Retour fournisseur', icon: Undo2, listPath: 'achats/retours', entity: 'supplier_returns',
    header: { hooks: supplierReturnHooks, fields: SUPPLIER_RETURN_HEADER, editPermission: 'warehouse.dispatch' },
    lines: {
      hooks: supplierReturnLineHooks, fk: 'return_id', singular: 'ligne de retour',
      fields: [
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, required: true },
        { key: 'bucket', label: 'Stock concerné', type: 'select', options: SUPPLIER_RETURN_BUCKETS, required: true, default: 'damaged' },
        { key: 'lot_id', label: 'Lot', type: 'picker', picker: lotPicker },
        { key: 'location_id', label: 'Emplacement', type: 'relation', useOptions: () => useLocationOptions() },
      ],
      useColumns: () => [
        { key: 'item', label: 'Article', value: (l) => (items.get(l.item_id) ? `${items.get(l.item_id)!.sku} — ${items.get(l.item_id)!.name}` : l.item_id) },
        { key: 'qty', label: 'Quantité', align: 'right', value: (l) => formatQty(l.quantity) },
        { key: 'bucket', label: 'Stock', value: (l) => l.bucket },
      ],
    },
    actions: [
      rpcAction({ key: 'post', label: 'Comptabiliser le retour', fn: 'post_supplier_return', tone: 'primary', permission: 'warehouse.dispatch', visible: (h) => h.status === 'draft', confirm: 'Le stock sera diminué.' }),
      cancelAction('supplier_return', 'warehouse.dispatch'),
      reverseAction('supplier_return', 'warehouse.dispatch'),
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── supplier invoices ───────── */

export function SupplierInvoicesPage() {
  const suppliers = usePartnerIndex()
  const columns: DataTableColumn<SupplierInvoice>[] = [
    { key: 'number', label: 'N°', value: (i) => i.number ?? '—' },
    { key: 'ref', label: 'Facture fournisseur', value: (i) => i.supplier_invoice_no },
    { key: 'supplier', label: 'Fournisseur', value: (i) => supplierName(suppliers, i.supplier_id) },
    { key: 'due', label: 'Échéance', value: (i) => formatDate(i.due_date) },
    { key: 'total', label: 'Total TTC', align: 'right', value: (i) => i.total_amount, render: (i) => formatMoney(i.total_amount) },
    { key: 'paid', label: 'Payé', align: 'right', value: (i) => i.paid_amount, render: (i) => formatMoney(i.paid_amount) },
    { key: 'pay', label: 'Paiement', value: (i) => i.payment_status, render: (i) => <Status value={i.payment_status} /> },
    { key: 'status', label: 'Statut', value: (i) => i.status, render: (i) => <Status value={i.status} /> },
  ]
  return (
    <EntityPage<SupplierInvoice>
      title="Factures fournisseurs"
      singular="facture fournisseur"
      icon={ReceiptText}
      description="Saisie des factures reçues, rapprochement avec commandes et réceptions, échéancier de paiement."
      hooks={supplierInvoiceHooks}
      permission="finance.write"
      columns={columns}
      filter={{ label: 'Paiement', options: statusOptions(['unpaid', 'partial', 'paid']), getValue: (i) => i.payment_status }}
      fields={INVOICE_HEADER}
      detailPath={(i) => `achats/factures/${i.id}`}
      afterCreatePath={(i) => `achats/factures/${i.id}`}
      exportName="factures-fournisseurs"
    />
  )
}

export function SupplierInvoiceDetailPage() {
  const org = useOrganization()
  const columns = usePricedColumns<SupplierInvoiceLine>()
  const config: DocumentConfig<SupplierInvoice, SupplierInvoiceLine> = {
    title: 'Factures fournisseurs', singular: 'Facture fournisseur', icon: ReceiptText, listPath: 'achats/factures', entity: 'supplier_invoices', approvalType: 'supplier_invoice', totals: true,
    header: { hooks: supplierInvoiceHooks, fields: INVOICE_HEADER, editPermission: 'finance.write' },
    lines: {
      hooks: supplierInvoiceLineHooks, fk: 'invoice_id', singular: 'ligne de facture',
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
      submitAction('supplier_invoice', 'finance.write'),
      rpcAction({ key: 'post', label: 'Comptabiliser', fn: 'post_supplier_invoice', tone: 'primary', permission: 'finance.write', visible: (h) => h.status === 'draft' || h.status === 'approved' }),
      {
        key: 'pay', label: 'Enregistrer un paiement', permission: 'finance.write', visible: (h) => h.status === 'posted' && h.payment_status !== 'paid',
        run: (h) => paymentsService.create(org.id, { direction: 'out', partner_id: h.supplier_id, supplier_invoice_id: h.id, amount: Math.round((h.total_amount - h.paid_amount) * 100) / 100, reference: h.supplier_invoice_no }),
        after: (p, go) => go(`finance/paiements/${(p as { id: string }).id}`),
      },
      cancelAction('supplier_invoice', 'finance.write'),
      reverseAction('supplier_invoice', 'finance.write'),
    ],
  }
  return <DocumentDetail config={config} />
}

/* ───────── agreements ───────── */

export function AgreementsPage() {
  const suppliers = usePartnerIndex()
  const columns: DataTableColumn<PurchaseAgreement>[] = [
    { key: 'number', label: 'N°', value: (a) => a.number ?? '—' },
    { key: 'supplier', label: 'Fournisseur', value: (a) => supplierName(suppliers, a.supplier_id) },
    { key: 'from', label: 'Du', value: (a) => formatDate(a.valid_from) },
    { key: 'to', label: 'Au', value: (a) => formatDate(a.valid_to) },
    { key: 'status', label: 'Statut', value: (a) => AGREEMENT_STATUS.find((s) => s.value === a.status)?.label ?? a.status },
  ]
  return (
    <EntityPage<PurchaseAgreement>
      title="Contrats d’achat"
      singular="contrat d’achat"
      icon={ScrollText}
      description="Prix négociés par article et par palier de quantité, avec période de validité."
      hooks={agreementHooks}
      permission="purchase.write"
      columns={columns}
      fields={AGREEMENT_HEADER}
      detailPath={(a) => `achats/contrats/${a.id}`}
      afterCreatePath={(a) => `achats/contrats/${a.id}`}
    />
  )
}

export function AgreementDetailPage() {
  const items = useItemIndex()
  const config: DocumentConfig<PurchaseAgreement, PurchaseAgreementLine> = {
    title: 'Contrats d’achat', singular: 'Contrat d’achat', icon: ScrollText, listPath: 'achats/contrats', entity: 'purchase_agreements',
    header: { hooks: agreementHooks, fields: AGREEMENT_HEADER, editPermission: 'purchase.write', editable: () => true },
    lines: {
      hooks: agreementLineHooks, fk: 'agreement_id', singular: 'prix négocié', editable: () => true,
      fields: [
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'price', label: 'Prix négocié (MAD)', type: 'money', min: 0, required: true },
        { key: 'min_qty', label: 'Quantité minimale', type: 'number', min: 0, default: 0 },
        { key: 'max_qty', label: 'Quantité maximale', type: 'number', min: 0 },
      ],
      useColumns: () => [
        { key: 'item', label: 'Article', value: (l) => (items.get(l.item_id) ? `${items.get(l.item_id)!.sku} — ${items.get(l.item_id)!.name}` : l.item_id) },
        { key: 'price', label: 'Prix', align: 'right', value: (l) => formatMoney(l.price) },
        { key: 'min', label: 'Min', align: 'right', value: (l) => formatQty(l.min_qty) },
        { key: 'max', label: 'Max', align: 'right', value: (l) => (l.max_qty === null ? '—' : formatQty(l.max_qty)) },
      ],
    },
    actions: [],
  }
  return <DocumentDetail config={config} />
}

/* ───────── RFQ ───────── */

export function RfqsPage() {
  const columns: DataTableColumn<Rfq>[] = [
    { key: 'number', label: 'N°', value: (r) => r.number ?? '—' },
    { key: 'due', label: 'Réponse avant', value: (r) => formatDate(r.due_date) },
    { key: 'status', label: 'Statut', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
    { key: 'created', label: 'Créé le', value: (r) => formatDate(r.created_at.slice(0, 10)) },
  ]
  return (
    <EntityPage<Rfq>
      title="Appels d’offres"
      singular="appel d’offres"
      icon={Scale}
      description="Consultez plusieurs fournisseurs, comparez leurs offres ligne par ligne et attribuez la commande."
      hooks={rfqHooks}
      permission="purchase.write"
      columns={columns}
      fields={RFQ_HEADER}
      detailPath={(r) => `achats/appels-offres/${r.id}`}
      afterCreatePath={(r) => `achats/appels-offres/${r.id}`}
    />
  )
}

/** Supplier quotation comparison: one column per invited supplier, lowest price highlighted, award = purchase order. */
function RfqComparison({ rfq, lines }: { rfq: Rfq; lines: RfqLine[] }) {
  const org = useOrganization()
  const suppliers = usePartnerIndex()
  const items = useItemIndex()
  const quotes = rfqQuoteHooks.useListBy('rfq_id', rfq.id)
  const quoteLines = rfqQuoteLineHooks.useList()
  const client = useQueryClient()
  const save = useMutation({
    mutationFn: ({ quote, line, price }: { quote: string; line: string; price: number }) => procurementApi.saveQuotePrice(org.id, quote, line, price),
    onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }),
  })
  const award = useMutation({ mutationFn: (quote: string) => procurementApi.awardRfq(quote), onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }) })
  const href = useOrgPath()
  const qs = quotes.data ?? []
  const priceOf = (quote: RfqQuote, line: RfqLine): RfqQuoteLine | undefined => (quoteLines.data ?? []).find((q) => q.quote_id === quote.id && q.rfq_line_id === line.id)
  const best = (line: RfqLine) => Math.min(...qs.map((q) => priceOf(q, line)?.unit_price ?? Infinity))
  const cheapest = qs.reduce<RfqQuote | null>((acc, q) => (q.total_amount > 0 && (!acc || q.total_amount < acc.total_amount) ? q : acc), null)
  return (
    <>
      <ChildTable<RfqQuote>
        title="Fournisseurs consultés"
        singular="offre fournisseur"
        hooks={rfqQuoteHooks}
        fk="rfq_id"
        parentId={rfq.id}
        canEdit
        columns={[
          { key: 'supplier', label: 'Fournisseur', value: (q) => supplierName(suppliers, q.supplier_id) },
          { key: 'lead', label: 'Délai (j)', align: 'right', value: (q) => q.lead_time_days ?? '—' },
          { key: 'valid', label: 'Valable jusqu’au', value: (q) => formatDate(q.valid_until) },
          { key: 'total', label: 'Total HT', align: 'right', value: (q) => formatMoney(q.total_amount) },
          { key: 'status', label: 'Statut', value: (q) => q.status, render: (q) => <Status value={q.status} /> },
        ]}
        fields={[
          { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker, required: true, lockedOnEdit: true },
          { key: 'lead_time_days', label: 'Délai de livraison (jours)', type: 'number', min: 0 },
          { key: 'valid_until', label: 'Offre valable jusqu’au', type: 'date' },
          { key: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        extraRowActions={(q) =>
          q.status !== 'selected' && rfq.status !== 'awarded' && q.total_amount > 0 ? (
            <Button variant="tertiary" loading={award.isPending} onClick={() => award.mutate(q.id, { onSuccess: (po) => { window.location.href = href(`achats/commandes/${po}`) } })}>
              Attribuer
            </Button>
          ) : null
        }
      />
      {award.error && <Banner tone="critical">{award.error.message}</Banner>}
      {qs.length > 0 && lines.length > 0 && (
        <Panel title="Comparatif des offres (prix unitaires HT)">
          {save.error && <Banner tone="critical">{save.error.message}</Banner>}
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Article</th>
                  <th className="px-3 text-right font-medium">Qté</th>
                  {qs.map((q) => (
                    <th key={q.id} className="px-3 text-right font-medium">{supplierName(suppliers, q.supplier_id)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="py-2 pr-3">{items.get(l.item_id)?.sku ?? l.item_id}</td>
                    <td className="px-3 text-right tabular-nums">{formatQty(l.quantity)}</td>
                    {qs.map((q) => {
                      const p = priceOf(q, l)
                      const isBest = p && p.unit_price === best(l)
                      return (
                        <td key={q.id} className={`px-3 text-right ${isBest ? 'font-semibold text-emerald-700' : ''}`}>
                          <div className="ml-auto w-28">
                            <NumberField label="Prix" labelAccessibilityVisibility="exclusive" value={p ? String(p.unit_price) : ''} min={0} step={0.01} onBlur={(e: unknown) => { const v = Number((e as { currentTarget?: { value?: string } })?.currentTarget?.value); if (Number.isFinite(v) && v >= 0 && v !== p?.unit_price) save.mutate({ quote: q.id, line: l.id, price: v }) }} />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                <tr className="border-t font-semibold">
                  <td className="py-2" colSpan={2}>Total HT</td>
                  {qs.map((q) => (
                    <td key={q.id} className={`px-3 text-right ${cheapest?.id === q.id ? 'text-emerald-700' : ''}`}>{formatMoney(q.total_amount)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  )
}

export function RfqDetailPage() {
  const items = useItemIndex()
  const lineList = rfqLineHooks
  const config: DocumentConfig<Rfq, RfqLine> = {
    title: 'Appels d’offres', singular: 'Appel d’offres', icon: Scale, listPath: 'achats/appels-offres', entity: 'rfqs',
    header: { hooks: rfqHooks, fields: RFQ_HEADER, editPermission: 'purchase.write', editable: (h) => h.status !== 'awarded' },
    lines: {
      hooks: lineList, fk: 'rfq_id', singular: 'article demandé', editable: (h) => h.status !== 'awarded',
      fields: [
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, required: true },
        { key: 'uom_id', label: 'Unité', type: 'relation', useOptions: useUomOptions },
      ],
      useColumns: () => [
        { key: 'item', label: 'Article', value: (l) => (items.get(l.item_id) ? `${items.get(l.item_id)!.sku} — ${items.get(l.item_id)!.name}` : l.item_id) },
        { key: 'qty', label: 'Quantité', align: 'right', value: (l) => formatQty(l.quantity) },
      ],
    },
    actions: [
      { key: 'send', label: 'Marquer comme envoyé', permission: 'purchase.write', visible: (h) => h.status === 'draft', run: (h) => rfqHooksUpdate(h.id, 'sent') },
      cancelAction('rfq', 'purchase.write'),
    ],
    extra: (h) => <RfqLinesAware rfq={h} />,
  }
  return <DocumentDetail config={config} />
}

function RfqLinesAware({ rfq }: { rfq: Rfq }) {
  const lines = rfqLineHooks.useListBy('rfq_id', rfq.id)
  return <RfqComparison rfq={rfq} lines={lines.data ?? []} />
}

const rfqHooksUpdate = (id: string, status: string) => rfqsService.update(id, { status })

