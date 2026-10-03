export type NotificationKey = 'overdue_payments' | 'low_stock' | 'missing_receipts' | 'budget_overrun'

export type OrgSettings = {
  /** Default VAT rate (%) proposed on new purchase orders. */
  vat_default: number
  /** Prefix of purchase-order references: BC → BC-2026-0001. */
  po_prefix: string
  /** Default retention (%) proposed on new subcontractors. */
  retention_default: number
  /** Which in-app alerts are shown. */
  notifications: Record<NotificationKey, boolean>
  locale: 'fr' | 'ar' | 'en'
}

export const DEFAULT_SETTINGS: OrgSettings = {
  vat_default: 20,
  po_prefix: 'BC',
  retention_default: 10,
  notifications: { overdue_payments: true, low_stock: true, missing_receipts: true, budget_overrun: true },
  locale: 'fr',
}

export const VAT_RATES = [0, 7, 10, 14, 20] as const

/** Merges stored JSON over the defaults (tolerates missing / unknown / wrongly-typed keys). */
export function resolveSettings(raw: Record<string, unknown> | null | undefined): OrgSettings {
  const r = raw ?? {}
  const n = r.notifications && typeof r.notifications === 'object' ? (r.notifications as Record<string, unknown>) : {}
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  return {
    vat_default: (VAT_RATES as readonly number[]).includes(num(r.vat_default, -1)) ? (r.vat_default as number) : DEFAULT_SETTINGS.vat_default,
    po_prefix: typeof r.po_prefix === 'string' && /^[A-Za-z0-9]{1,8}$/.test(r.po_prefix) ? r.po_prefix.toUpperCase() : DEFAULT_SETTINGS.po_prefix,
    retention_default: Math.min(100, Math.max(0, num(r.retention_default, DEFAULT_SETTINGS.retention_default))),
    notifications: Object.fromEntries(
      (Object.keys(DEFAULT_SETTINGS.notifications) as NotificationKey[]).map((k) => [k, typeof n[k] === 'boolean' ? n[k] : DEFAULT_SETTINGS.notifications[k]]),
    ) as OrgSettings['notifications'],
    locale: r.locale === 'ar' || r.locale === 'en' ? r.locale : 'fr',
  }
}
