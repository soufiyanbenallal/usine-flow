import type { EntityField } from '../_core/form-values'
import { useListOptions } from '../_core/options'
import { TAX_PROFILES } from './types'

export const usePriceListOptions = () => useListOptions('price_lists')

const IDENTITY: EntityField[] = [
  { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
  { key: 'name', label: 'Raison sociale', required: true },
  { key: 'name_ar', label: 'Nom (arabe)', placeholder: 'الاسم بالعربية' },
  { key: 'category', label: 'Catégorie' },
  { key: 'ice', label: 'ICE', help: '15 chiffres' },
  { key: 'if_number', label: 'Identifiant fiscal (IF)' },
  { key: 'rc', label: 'Registre de commerce (RC)' },
  { key: 'tax_profile', label: 'Profil fiscal', type: 'select', options: TAX_PROFILES, default: 'standard', required: true },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'phone', label: 'Téléphone', type: 'phone' },
  { key: 'website', label: 'Site web' },
  { key: 'payment_terms_days', label: 'Délai de paiement (jours)', type: 'number', min: 0, default: 30 },
]
const TAIL: EntityField[] = [
  { key: 'notes', label: 'Notes', type: 'textarea' },
  { key: 'active', label: 'Actif', type: 'checkbox', default: true },
]
const CUSTOMER: EntityField[] = [
  { key: 'credit_limit', label: 'Plafond de crédit (MAD, 0 = illimité)', type: 'money', min: 0, default: 0 },
  { key: 'price_list_id', label: 'Liste de prix', type: 'relation', useOptions: usePriceListOptions },
]
const SUPPLIER: EntityField[] = [
  { key: 'lead_time_days', label: 'Délai de livraison (jours)', type: 'number', min: 0, default: 0 },
  { key: 'rating', label: 'Note (0-10)', type: 'number', min: 0 },
]
const KINDS: EntityField = { key: 'kinds', label: 'Rôles', type: 'tags', placeholder: 'customer, supplier, subcontractor, transporter', required: true }

export type PartnerVariant = 'customer' | 'supplier' | 'other'
export const partnerFields = (variant: PartnerVariant): EntityField[] => [
  ...IDENTITY,
  ...(variant === 'customer' ? CUSTOMER : variant === 'supplier' ? SUPPLIER : [KINDS]),
  ...TAIL,
]
/** Every field (detail page): roles can be changed, customer and supplier terms are both editable. */
export const ALL_PARTNER_FIELDS: EntityField[] = [...IDENTITY, KINDS, ...CUSTOMER, ...SUPPLIER, ...TAIL]
