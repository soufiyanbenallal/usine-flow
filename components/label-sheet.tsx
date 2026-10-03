'use client'

import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'

export type LabelData = { code: string; title: string; subtitle?: string; extra?: string }

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (!ref.current) return
    try {
      JsBarcode(ref.current, value, { format: 'CODE128', height: 40, displayValue: true, fontSize: 11, margin: 0 })
    } catch {
      /* unprintable characters: leave empty */
    }
  }, [value])
  return <svg ref={ref} className="max-w-full" />
}

function Qr({ value }: { value: string }) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    let live = true
    QRCode.toDataURL(value, { margin: 0, width: 160 }).then((u) => live && setSrc(u)).catch(() => undefined)
    return () => { live = false }
  }, [value])
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={value} className="size-20" /> : <div className="size-20" />
}

/** Printable grid of labels (Code 128 or QR). Use the browser's print dialog; the grid is styled for A4 sheets. */
export function LabelSheet({ labels, symbology, columns = 3 }: { labels: LabelData[]; symbology: 'code128' | 'qr'; columns?: number }) {
  return (
    <div className="label-sheet grid gap-2 print:gap-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {labels.map((l, i) => (
        <div key={`${l.code}-${i}`} className="flex break-inside-avoid items-center gap-2 rounded-md border border-dashed p-2 text-[11px]">
          {symbology === 'qr' && <Qr value={l.code} />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{l.title}</div>
            {l.subtitle && <div className="truncate text-muted-foreground">{l.subtitle}</div>}
            {symbology === 'code128' && <Barcode value={l.code} />}
            {symbology === 'qr' && <div className="font-mono">{l.code}</div>}
            {l.extra && <div className="truncate text-muted-foreground">{l.extra}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}
