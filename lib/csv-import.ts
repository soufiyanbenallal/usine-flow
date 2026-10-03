export type ImportKind = 'text' | 'number' | 'boolean'

export type ImportField<T> = {
  key: Extract<keyof T, string>
  label: string
  /** Extra header spellings accepted (compared without case/accents). */
  aliases?: string[]
  required?: boolean
  kind?: ImportKind
  /** Used when the column is absent or the cell is empty (non-required fields only). */
  fallback?: string | number | boolean | null
  min?: number
}

export type ImportResult<T> = {
  rows: T[]
  errors: { line: number; message: string }[]
  /** Headers of the file that matched no field (ignored). */
  ignoredHeaders: string[]
  /** Required fields whose column is missing altogether. */
  missingColumns: string[]
}

export const normalizeHeader = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** RFC-4180-style parser. The delimiter (`;`, `,` or tab) is detected from the first line; a UTF-8 BOM is ignored. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, '')
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ''
  const count = (ch: string) => firstLine.split(ch).length - 1
  const delimiter = [';', '\t', ','].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ';')

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

/** « 1 200,50 » / « 1.200,50 » / « 1200.5 » → number, or NaN. */
export function parseNumber(raw: string): number {
  let s = raw.replace(/[\s ]/g, '').replace(/(mad|dh|dhs)$/i, '')
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  else if (s.includes(',')) s = s.replace(',', '.')
  return s !== '' && /^-?\d*\.?\d+$/.test(s) ? Number(s) : NaN
}

const TRUE = ['oui', 'true', '1', 'vrai', 'actif', 'yes', 'x']
const FALSE = ['non', 'false', '0', 'faux', 'inactif', 'no']

/** Maps a parsed table (first row = headers) onto typed rows, collecting per-line errors instead of throwing. */
export function mapImport<T>(table: string[][], fields: ImportField<T>[]): ImportResult<T> {
  const [header = [], ...body] = table
  const index = new Map<string, number>()
  const used = new Set<number>()
  for (const f of fields) {
    const names = [f.label, f.key, ...(f.aliases ?? [])].map(normalizeHeader)
    const at = header.findIndex((h, i) => !used.has(i) && names.includes(normalizeHeader(h)))
    if (at >= 0) {
      index.set(f.key, at)
      used.add(at)
    }
  }
  const missingColumns = fields.filter((f) => f.required && !index.has(f.key)).map((f) => f.label)
  const ignoredHeaders = header.filter((h, i) => !used.has(i) && h.trim() !== '')
  const result: ImportResult<T> = { rows: [], errors: [], ignoredHeaders, missingColumns }
  if (missingColumns.length > 0) return result

  body.forEach((cells, n) => {
    const line = n + 2
    const out: Record<string, unknown> = {}
    const problems: string[] = []
    for (const f of fields) {
      const raw = (index.has(f.key) ? (cells[index.get(f.key)!] ?? '') : '').trim()
      const kind = f.kind ?? 'text'
      if (raw === '') {
        if (f.required) problems.push(`« ${f.label} » est vide`)
        out[f.key] = f.fallback !== undefined ? f.fallback : kind === 'number' ? 0 : kind === 'boolean' ? true : null
        continue
      }
      if (kind === 'number') {
        const v = parseNumber(raw)
        if (Number.isNaN(v)) problems.push(`« ${f.label} » : « ${raw} » n’est pas un nombre`)
        else if (f.min !== undefined && v < f.min) problems.push(`« ${f.label} » doit être ≥ ${f.min}`)
        else out[f.key] = v
      } else if (kind === 'boolean') {
        const v = raw.toLowerCase()
        if (TRUE.includes(v)) out[f.key] = true
        else if (FALSE.includes(v)) out[f.key] = false
        else problems.push(`« ${f.label} » : « ${raw} » (attendu oui/non)`)
      } else out[f.key] = raw
    }
    if (problems.length > 0) result.errors.push({ line, message: problems.join(' ; ') })
    else result.rows.push(out as T)
  })
  return result
}

/** Header line + one example row, ready to download as a template. */
export function templateCsv<T>(fields: ImportField<T>[], example: Partial<Record<Extract<keyof T, string>, string | number>>): string {
  const cell = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return '﻿' + [fields.map((f) => cell(f.label)).join(';'), fields.map((f) => cell(example[f.key])).join(';')].join('\r\n')
}
