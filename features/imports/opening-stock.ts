import type { ImportField } from '@/lib/csv-import'

export type OpeningRow = { sku: string; location: string | null; quantity: number; unit_cost: number; lot_number: string | null; expires_on: string | null }

export const OPENING_FIELDS: ImportField<OpeningRow>[] = [
  { key: 'sku', label: 'SKU', aliases: ['article', 'référence', 'reference'], required: true },
  { key: 'quantity', label: 'Quantité', aliases: ['quantity', 'qte', 'qté'], kind: 'number', required: true, min: 0.0001 },
  { key: 'unit_cost', label: 'Coût unitaire', aliases: ['unit_cost', 'cout', 'prix'], kind: 'number', fallback: 0, min: 0 },
  { key: 'location', label: 'Emplacement', aliases: ['location', 'emplacement'] },
  { key: 'lot_number', label: 'Lot', aliases: ['lot_number', 'numero de lot'] },
  { key: 'expires_on', label: 'Date d’expiration', aliases: ['expires_on', 'dlc', 'dluo'] },
]
export const OPENING_EXAMPLE = { sku: 'RM-001', quantity: 120, unit_cost: 8.5, location: 'A-01-01', lot_number: 'L2026-01', expires_on: '2027-06-30' }

export type ResolvedLine = { item_id: string; location_id: string | null; quantity_delta: number; unit_cost: number; lot_number: string | null; expires_on: string | null }
export type Resolution = { lines: ResolvedLine[]; errors: { line: number; message: string }[] }

const ISO = /^\d{4}-\d{2}-\d{2}$/
const FR = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
/** Accepts YYYY-MM-DD and DD/MM/YYYY (Moroccan habit); returns ISO or null when unreadable. */
export function parseDate(raw: string | null): string | null | undefined {
  if (!raw) return null
  if (ISO.test(raw)) return raw
  const m = FR.exec(raw)
  if (m) return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`
  return undefined
}

/** Resolves SKUs / locations of the file against the organization's master data; reports every unresolved line. */
export function resolveOpening(rows: OpeningRow[], items: Map<string, { id: string; tracking: string; expiry_tracking: boolean }>, locations: Map<string, string>): Resolution {
  const lines: ResolvedLine[] = []
  const errors: { line: number; message: string }[] = []
  rows.forEach((r, i) => {
    const line = i + 2
    const item = items.get(r.sku.toLowerCase())
    if (!item) return void errors.push({ line, message: `Article « ${r.sku} » introuvable` })
    let locationId: string | null = null
    if (r.location) {
      locationId = locations.get(r.location.toLowerCase()) ?? null
      if (!locationId) return void errors.push({ line, message: `Emplacement « ${r.location} » introuvable dans cet entrepôt` })
    }
    if (item.tracking === 'lot' && !r.lot_number) return void errors.push({ line, message: `Article « ${r.sku} » suivi par lot : numéro de lot requis` })
    const expires = parseDate(r.expires_on)
    if (expires === undefined) return void errors.push({ line, message: `Date d’expiration illisible « ${r.expires_on} » (AAAA-MM-JJ ou JJ/MM/AAAA)` })
    lines.push({ item_id: item.id, location_id: locationId, quantity_delta: r.quantity, unit_cost: r.unit_cost, lot_number: r.lot_number, expires_on: expires })
  })
  return { lines, errors }
}
