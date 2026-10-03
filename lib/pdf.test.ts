import { describe, expect, it } from 'vitest'
import { buildDocumentPdf, pdfSafe } from './pdf'

describe('pdf', () => {
  it('keeps latin accents and replaces unsupported characters', () => {
    expect(pdfSafe('Désignation – prix ’TTC’')).toBe("Désignation - prix 'TTC'")
    expect(pdfSafe('مرحبا')).toBe('?????')
  })
  it('builds a multi-page PDF', async () => {
    const rows = Array.from({ length: 120 }, (_, i) => [`ART-${i}`, `Article numéro ${i} avec une désignation assez longue pour passer à la ligne suivante dans le tableau`, '10', '2,50', '25,00'])
    const bytes = await buildDocumentPdf({
      title: 'Bon de commande', number: 'BC-2026-00001', company: { name: 'Usine Alpha', lines: ['ICE 0000000000'] },
      meta: [{ label: 'Fournisseur', value: 'Atlas Steel' }, { label: 'Date', value: '3 oct. 2026' }],
      columns: [{ label: 'Réf.', width: 80 }, { label: 'Désignation', width: 250 }, { label: 'Qté', width: 50, align: 'right' }, { label: 'PU', width: 60, align: 'right' }, { label: 'Total', width: 70, align: 'right' }],
      rows, totals: [{ label: 'Total TTC', value: '3 600,00 MAD', bold: true }], notes: 'Livraison sous 7 jours.',
    })
    expect(String.fromCharCode(...bytes.slice(0, 5))).toBe('%PDF-')
    expect(bytes.length).toBeGreaterThan(2000)
  })
})
