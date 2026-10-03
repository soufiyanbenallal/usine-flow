import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, resolveSettings } from './types'

describe('resolveSettings', () => {
  it('returns the defaults for empty / missing settings', () => {
    expect(resolveSettings({})).toEqual(DEFAULT_SETTINGS)
    expect(resolveSettings(null)).toEqual(DEFAULT_SETTINGS)
  })
  it('keeps valid stored values and ignores invalid ones', () => {
    const s = resolveSettings({ vat_default: 14, po_prefix: 'cmd', retention_default: 250, notifications: { low_stock: false, nope: true }, locale: 'xx' })
    expect(s).toMatchObject({ vat_default: 14, po_prefix: 'CMD', retention_default: 100, locale: 'fr' })
    expect(s.notifications).toEqual({ overdue_payments: true, low_stock: false, missing_receipts: true, budget_overrun: true })
    expect(resolveSettings({ vat_default: 13, po_prefix: 'bad prefix!' })).toMatchObject({ vat_default: 20, po_prefix: 'BC' })
  })
})
