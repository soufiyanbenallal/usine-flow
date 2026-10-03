import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'

export type PdfLine = { cells: string[] }
export type PdfDocumentData = {
  title: string
  number?: string | null
  status?: string
  company: { name: string; lines: string[] }
  meta: { label: string; value: string }[]
  columns: { label: string; width: number; align?: 'left' | 'right' }[]
  rows: string[][]
  totals?: { label: string; value: string; bold?: boolean }[]
  notes?: string | null
  footer?: string
}

const A4: [number, number] = [595.28, 841.89]
const M = 40

/** WinAnsi-safe text (standard PDF fonts): keeps Latin accents, drops characters they cannot encode (e.g. Arabic). */
export const pdfSafe = (s: string) => s.replace(/[^\x20-\x7e -ÿ€’‘“”–—…]/g, '?').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const out: string[] = []
  for (const para of pdfSafe(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(next, size) <= width) line = next
      else {
        if (line) out.push(line)
        line = word
      }
    }
    out.push(line)
  }
  return out
}

/** Business document PDF (A4): letterhead, meta block, lines table, totals, notes. Generated client-side with pdf-lib. */
export async function buildDocumentPdf(data: PdfDocumentData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let page: PDFPage = pdf.addPage(A4)
  let y = A4[1] - M
  const text = (s: string, x: number, size = 9, f: PDFFont = font, color = rgb(0.1, 0.1, 0.1)) => page.drawText(pdfSafe(s), { x, y, size, font: f, color })
  const newPage = () => {
    page = pdf.addPage(A4)
    y = A4[1] - M
  }

  text(data.company.name, M, 14, bold)
  y -= 14
  for (const l of data.company.lines) {
    text(l, M, 8)
    y -= 11
  }
  const titleText = `${data.title}${data.number ? ' ' + data.number : ''}`
  page.drawText(pdfSafe(titleText), { x: A4[0] - M - bold.widthOfTextAtSize(pdfSafe(titleText), 16), y: A4[1] - M, size: 16, font: bold })
  y -= 8
  page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.6, color: rgb(0.7, 0.7, 0.7) })
  y -= 16

  for (let i = 0; i < data.meta.length; i += 2) {
    for (const [j, m] of data.meta.slice(i, i + 2).entries()) {
      const x = M + j * 260
      page.drawText(pdfSafe(m.label), { x, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) })
      page.drawText(pdfSafe(m.value || '-'), { x, y: y - 11, size: 10, font: bold })
    }
    y -= 28
  }
  y -= 4

  const total = data.columns.reduce((a, c) => a + c.width, 0)
  const scale = (A4[0] - 2 * M) / total
  const xs: number[] = []
  let cx = M
  for (const c of data.columns) {
    xs.push(cx)
    cx += c.width * scale
  }
  const header = () => {
    page.drawRectangle({ x: M, y: y - 4, width: A4[0] - 2 * M, height: 16, color: rgb(0.93, 0.93, 0.93) })
    data.columns.forEach((c, i) => {
      const w = c.width * scale
      const label = pdfSafe(c.label)
      const x = c.align === 'right' ? xs[i]! + w - 4 - bold.widthOfTextAtSize(label, 8) : xs[i]! + 4
      page.drawText(label, { x, y, size: 8, font: bold })
    })
    y -= 18
  }
  header()
  for (const row of data.rows) {
    const wrapped = row.map((cell, i) => wrap(cell, font, 8.5, data.columns[i]!.width * scale - 8))
    const height = Math.max(...wrapped.map((w) => w.length)) * 11 + 4
    if (y - height < M + 60) {
      newPage()
      header()
    }
    wrapped.forEach((lines, i) => {
      const w = data.columns[i]!.width * scale
      lines.forEach((l, k) => {
        const x = data.columns[i]!.align === 'right' ? xs[i]! + w - 4 - font.widthOfTextAtSize(l, 8.5) : xs[i]! + 4
        page.drawText(l, { x, y: y - k * 11, size: 8.5, font })
      })
    })
    y -= height
    page.drawLine({ start: { x: M, y: y + 2 }, end: { x: A4[0] - M, y: y + 2 }, thickness: 0.3, color: rgb(0.85, 0.85, 0.85) })
  }

  y -= 14
  for (const t of data.totals ?? []) {
    if (y < M + 30) newPage()
    const f = t.bold ? bold : font
    const label = pdfSafe(t.label)
    const value = pdfSafe(t.value)
    page.drawText(label, { x: A4[0] - M - 200, y, size: 9, font: f })
    page.drawText(value, { x: A4[0] - M - f.widthOfTextAtSize(value, 9), y, size: 9, font: f })
    y -= 14
  }
  if (data.notes) {
    y -= 10
    for (const l of wrap(data.notes, font, 9, A4[0] - 2 * M)) {
      if (y < M + 20) newPage()
      text(l, M, 9)
      y -= 12
    }
  }
  const footer = data.footer ?? `${data.company.name} — document généré par UsineFlow`
  for (const [i, p] of pdf.getPages().entries()) {
    p.drawText(pdfSafe(`${footer}  |  ${i + 1}/${pdf.getPageCount()}`), { x: M, y: 24, size: 7, font, color: rgb(0.5, 0.5, 0.5) })
  }
  return pdf.save()
}

export function downloadBytes(filename: string, bytes: Uint8Array, type = 'application/pdf') {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
