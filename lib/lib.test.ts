import { describe, expect, it } from 'vitest'
import { formatDate, formatPercent, sum } from './format'
import { fileLabel } from './storage'
import { RESERVED_SLUGS, orgPath } from './routes'
import { toUserError } from './errors'
import { isEntityId, newId } from './ids'

describe('lib', () => {
  it('builds organization-scoped paths', () => {
    expect(orgPath('atlas')).toBe('/atlas')
    expect(orgPath('atlas', 'parametres')).toBe('/atlas/parametres')
    expect(orgPath('atlas', '/parametres/utilisateurs')).toBe('/atlas/parametres/utilisateurs')
  })
  it('reserves the top-level route names', () => {
    for (const s of ['login', 'signup', 'api', 'forgot-password', 'reset-password']) expect(RESERVED_SLUGS).toContain(s)
  })
  it('formats values', () => {
    expect(formatDate('2026-10-02')).toBe('2 oct. 2026')
    expect(formatDate(null)).toBe('—')
    expect(formatPercent(68.4)).toBe('68 %')
    expect(sum([1, 2, 3.5])).toBe(6.5)
  })
  it('maps Postgres errors to French messages', () => {
    expect(toUserError({ code: '42501', message: 'x' }).message).toMatch(/droits/)
    expect(toUserError({ code: '23505', message: 'x' }).message).toMatch(/existe déjà/)
    expect(toUserError({ code: '9999', message: 'boom' }).message).toBe('boom')
  })
  it('generates cuid ids and recovers file labels', () => {
    const id = newId()
    expect(isEntityId(id)).toBe(true)
    expect(id).toHaveLength(24)
    expect(fileLabel(`org/receipts/${id}-ticket.pdf`)).toBe('ticket.pdf')
    expect(fileLabel(null)).toBe('')
  })
})
