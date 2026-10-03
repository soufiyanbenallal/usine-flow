import { parseCsv } from './csv-import'

export type Cell = string | number | boolean | Date | null

const stringify = (v: unknown): string => (v === null || v === undefined ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v))

/** Normalizes raw spreadsheet rows (any cell type) to a string table, dropping fully empty rows. */
export const toStringTable = (rows: unknown[][]): string[][] => rows.map((r) => r.map(stringify)).filter((r) => r.some((c) => c.trim() !== ''))

/** Reads the first sheet of an .xlsx file or a CSV (`;` `,` or tab separated) into a string table (first row = headers). */
export async function readSpreadsheet(file: File): Promise<string[][]> {
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    return toStringTable((await readSheet(file)) as unknown[][])
  }
  return parseCsv(await file.text())
}

/** Downloads rows as a real .xlsx workbook (header row in bold). */
export async function downloadXlsx(filename: string, headers: string[], rows: Cell[][], sheet = 'Données') {
  const writeExcelFile = (await import('write-excel-file/browser')).default
  const header = headers.map((h) => ({ value: h, fontWeight: 'bold' as const }))
  const body = rows.map((r) => r.map((c) => (c === null ? null : c)))
  await writeExcelFile([{ data: [header, ...body] as never, sheet }] as never).toFile(filename)
}
