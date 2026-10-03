import { describe, expect, it } from 'vitest'
import { PERMISSIONS, ROLE_PERMISSIONS, hasAnyPermission, hasPermission } from './permissions'

describe('permissions', () => {
  it('gives owners and admins everything', () => {
    for (const p of PERMISSIONS) {
      expect(hasPermission('owner', p)).toBe(true)
      expect(hasPermission('admin', p)).toBe(true)
    }
  })
  it('keeps viewers read-only and operators on the shop floor', () => {
    expect(PERMISSIONS.some((p) => hasPermission('viewer', p))).toBe(false)
    expect(hasPermission('operator', 'production.report')).toBe(true)
    expect(hasPermission('operator', 'inventory.adjust')).toBe(false)
    expect(hasPermission('operator', 'production.complete')).toBe(false)
  })
  it('does not let site managers manage the platform', () => {
    expect(hasPermission('site_manager', 'platform.manage')).toBe(false)
    expect(hasPermission('site_manager', 'purchase.write')).toBe(true)
  })
  it('applies per-organization overrides but never to owners', () => {
    expect(hasPermission('operator', 'inventory.adjust', { operator: { 'inventory.adjust': true } })).toBe(true)
    expect(hasPermission('accountant', 'finance.write', { accountant: { 'finance.write': false } })).toBe(false)
    expect(hasPermission('owner', 'finance.write', { owner: { 'finance.write': false } })).toBe(true)
  })
  it('only references known permissions', () => {
    for (const perms of Object.values(ROLE_PERMISSIONS)) for (const p of perms) expect(PERMISSIONS).toContain(p)
  })
  it('supports any-of checks', () => {
    expect(hasAnyPermission('operator', ['inventory.adjust', 'warehouse.pick'])).toBe(true)
    expect(hasAnyPermission(null, ['warehouse.pick'])).toBe(false)
  })
})
