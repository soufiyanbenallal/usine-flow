import type { EntityField } from '../_core/form-values'
import { useCategoryOptions } from '../categories/hooks'
import { useUomOptions } from '../uoms/hooks'
import { VAT_OPTIONS, itemTypeOptions, trackingOptions, valuationOptions } from './types'

/** Fields of the quick-create form. */
export const ITEM_CREATE_FIELDS: EntityField[] = [
  { key: 'sku', label: 'Référence (SKU)', required: true, lockedOnEdit: true },
  { key: 'name', label: 'Désignation', required: true },
  { key: 'item_type', label: 'Type', type: 'select', options: itemTypeOptions, required: true, default: 'raw_material' },
  { key: 'base_uom_id', label: 'Unité de base', type: 'relation', useOptions: useUomOptions, required: true },
  { key: 'category_id', label: 'Catégorie', type: 'relation', useOptions: useCategoryOptions },
  { key: 'tracking', label: 'Traçabilité', type: 'select', options: trackingOptions, required: true, default: 'none' },
  { key: 'valuation_method', label: 'Valorisation', type: 'select', options: valuationOptions, required: true, default: 'average' },
  { key: 'standard_cost', label: 'Coût standard (MAD)', type: 'money', min: 0, default: 0 },
  { key: 'sale_price', label: 'Prix de vente (MAD)', type: 'money', min: 0, default: 0 },
  { key: 'vat_rate', label: 'TVA', type: 'select', options: VAT_OPTIONS, required: true, default: '20' },
  { key: 'min_stock', label: 'Stock minimum', type: 'number', min: 0, default: 0 },
  { key: 'reorder_point', label: 'Point de commande', type: 'number', min: 0, default: 0 },
  { key: 'requires_inspection', label: 'Contrôle qualité à la réception', type: 'checkbox' },
  { key: 'is_purchasable', label: 'Achetable', type: 'checkbox', default: true },
  { key: 'is_sellable', label: 'Vendable', type: 'checkbox' },
  { key: 'active', label: 'Actif', type: 'checkbox', default: true },
]

export type FieldSection = { title: string; fields: EntityField[] }

/** Full item form, grouped like the guide's "Item features" (§4). */
export const ITEM_SECTIONS: FieldSection[] = [
  {
    title: 'Identification',
    fields: [
      { key: 'sku', label: 'Référence (SKU)', required: true, lockedOnEdit: true },
      { key: 'internal_ref', label: 'Référence interne' },
      { key: 'name', label: 'Désignation', required: true },
      { key: 'name_fr', label: 'Nom (français)' },
      { key: 'name_ar', label: 'Nom (arabe)', placeholder: 'الاسم بالعربية' },
      { key: 'item_type', label: 'Type', type: 'select', options: itemTypeOptions, required: true },
      { key: 'category_id', label: 'Catégorie', type: 'relation', useOptions: useCategoryOptions },
      { key: 'brand', label: 'Marque' },
      { key: 'family', label: 'Famille de produits' },
      { key: 'manufacturer_ref', label: 'Référence fabricant' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    title: 'Unités',
    fields: [
      { key: 'base_uom_id', label: 'Unité de base', type: 'relation', useOptions: useUomOptions, required: true, lockedOnEdit: true, help: 'Non modifiable : le stock est exprimé dans cette unité.' },
      { key: 'purchase_uom_id', label: 'Unité d’achat', type: 'relation', useOptions: useUomOptions },
      { key: 'sales_uom_id', label: 'Unité de vente', type: 'relation', useOptions: useUomOptions },
      { key: 'production_uom_id', label: 'Unité de production', type: 'relation', useOptions: useUomOptions },
    ],
  },
  {
    title: 'Dimensions',
    fields: [
      { key: 'weight', label: 'Poids (kg)', type: 'number', min: 0 },
      { key: 'volume', label: 'Volume (m³)', type: 'number', min: 0 },
      { key: 'length', label: 'Longueur (cm)', type: 'number', min: 0 },
      { key: 'width', label: 'Largeur (cm)', type: 'number', min: 0 },
      { key: 'height', label: 'Hauteur (cm)', type: 'number', min: 0 },
    ],
  },
  {
    title: 'Stock et approvisionnement',
    fields: [
      { key: 'min_stock', label: 'Stock minimum', type: 'number', min: 0 },
      { key: 'max_stock', label: 'Stock maximum', type: 'number', min: 0 },
      { key: 'safety_stock', label: 'Stock de sécurité', type: 'number', min: 0 },
      { key: 'reorder_point', label: 'Point de commande', type: 'number', min: 0 },
      { key: 'reorder_qty', label: 'Quantité de réapprovisionnement', type: 'number', min: 0 },
      { key: 'lead_time_days', label: 'Délai (jours)', type: 'number', min: 0 },
      { key: 'tracking', label: 'Traçabilité', type: 'select', options: trackingOptions, required: true },
      { key: 'expiry_tracking', label: 'Suivi des dates de péremption', type: 'checkbox' },
      { key: 'requires_inspection', label: 'Contrôle qualité à la réception', type: 'checkbox' },
    ],
  },
  {
    title: 'Coûts et prix',
    fields: [
      { key: 'valuation_method', label: 'Méthode de valorisation', type: 'select', options: valuationOptions, required: true },
      { key: 'standard_cost', label: 'Coût standard (MAD)', type: 'money', min: 0 },
      { key: 'sale_price', label: 'Prix de vente (MAD)', type: 'money', min: 0 },
      { key: 'vat_rate', label: 'TVA', type: 'select', options: VAT_OPTIONS, required: true },
    ],
  },
  {
    title: 'Statut',
    fields: [
      { key: 'is_purchasable', label: 'Achetable', type: 'checkbox' },
      { key: 'is_sellable', label: 'Vendable', type: 'checkbox' },
      { key: 'is_manufactured', label: 'Fabriqué', type: 'checkbox' },
      { key: 'active', label: 'Actif', type: 'checkbox' },
    ],
  },
]
