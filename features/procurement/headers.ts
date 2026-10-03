import type { EntityField } from '../_core/form-values'
import { useListOptions } from '../_core/options'
import { partnerPicker } from '../partners/hooks'
import { useWarehouseOptions, useLocationOptions } from '../warehouses/hooks'
import { AGREEMENT_STATUS } from './types'

export const useDepartmentOptions = () => useListOptions('departments')

export const REQUEST_HEADER: EntityField[] = [
  { key: 'department_id', label: 'Département', type: 'relation', useOptions: useDepartmentOptions },
  { key: 'requested_by_name', label: 'Demandeur' },
  { key: 'needed_on', label: 'Besoin pour le', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
export const ORDER_HEADER: EntityField[] = [
  { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'warehouse_id', label: 'Entrepôt de réception', type: 'relation', useOptions: useWarehouseOptions },
  { key: 'order_date', label: 'Date de commande', type: 'date' },
  { key: 'expected_date', label: 'Livraison prévue', type: 'date' },
  { key: 'payment_terms_days', label: 'Délai de paiement (jours)', type: 'number', min: 0, default: 30 },
  { key: 'currency', label: 'Devise', default: 'MAD', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
export const RECEIPT_HEADER: EntityField[] = [
  { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'warehouse_id', label: 'Entrepôt', type: 'relation', useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'location_id', label: 'Emplacement de réception', type: 'relation', useOptions: () => useLocationOptions(), help: 'Un emplacement en zone « Réception » génère des tâches de mise en stock.' },
  { key: 'supplier_delivery_note', label: 'Bon de livraison fournisseur' },
  { key: 'received_on', label: 'Date de réception', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
export const SUPPLIER_RETURN_HEADER: EntityField[] = [
  { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'warehouse_id', label: 'Entrepôt', type: 'relation', useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
  { key: 'reason', label: 'Motif', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
export const INVOICE_HEADER: EntityField[] = [
  { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'supplier_invoice_no', label: 'N° de facture fournisseur', required: true },
  { key: 'invoice_date', label: 'Date de facture', type: 'date' },
  { key: 'due_date', label: 'Échéance', type: 'date', help: 'Vide = date de facture + délai de paiement du fournisseur.' },
  { key: 'currency', label: 'Devise', default: 'MAD', required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
export const AGREEMENT_HEADER: EntityField[] = [
  { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker, required: true, lockedOnEdit: true },
  { key: 'valid_from', label: 'Valable du', type: 'date', required: true },
  { key: 'valid_to', label: 'Au', type: 'date' },
  { key: 'status', label: 'Statut', type: 'select', options: AGREEMENT_STATUS, required: true, default: 'draft' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
export const RFQ_HEADER: EntityField[] = [
  { key: 'due_date', label: 'Réponse avant le', type: 'date' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
