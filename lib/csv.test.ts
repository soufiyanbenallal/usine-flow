// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadCsv } from './csv'

describe('downloadCsv', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it('writes a BOM-prefixed, semicolon-separated, quoted CSV', () => {
    const parts: unknown[][] = []
    vi.stubGlobal('Blob', class { constructor(p: unknown[]) { parts.push(p) } })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    downloadCsv('x.csv', [{ key: 'a', label: 'Nom', value: (r: { n: string }) => r.n }, { key: 'b', label: 'Montant', value: () => 5 }], [{ n: 'Dupont "SARL"' }])
    expect(parts[0][0]).toBe('\ufeff"Nom";"Montant"\r\n"Dupont ""SARL""";"5"')
  })
})
