export type CsvColumn<Row> = {
  key?: string
  label: string
  value: (row: Row) => string | number
}

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Downloads rows as a UTF-8 CSV (with BOM so Excel reads accents) using the columns' plain values. */
export function downloadCsv<Row>(filename: string, columns: CsvColumn<Row>[], rows: Row[]) {
  const lines = [columns.map((c) => cell(c.label)).join(';'), ...rows.map((r) => columns.map((c) => cell(c.value(r))).join(';'))]
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
