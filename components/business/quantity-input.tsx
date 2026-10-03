'use client'

import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import { D } from '@/lib/decimal'

/** Big [ − ] qty [ + ] stepper for scanners and touch screens. Values are decimals (strings) to avoid floating point. */
export function QuantityInput({ value, onChange, step = 1, min = 0, max, label = 'Quantité', size = 'lg' }: { value: string; onChange: (v: string) => void; step?: number; min?: number; max?: number; label?: string; size?: 'md' | 'lg' }) {
  const id = useId()
  const clamp = (n: ReturnType<typeof D>) => {
    let v = n
    if (v.lt(min)) v = D(min)
    if (max !== undefined && v.gt(max)) v = D(max)
    return v.toString()
  }
  const btn = size === 'lg' ? 'size-12 text-xl' : 'size-9'
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Diminuer" className={`${btn} grid place-items-center rounded-xl border bg-card hover:bg-secondary`} onClick={() => onChange(clamp(D(value).minus(step)))}>
          <Minus className="size-5" />
        </button>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(',', '.'))}
          className={`${size === 'lg' ? 'h-12 text-2xl' : 'h-9 text-base'} w-28 rounded-xl border bg-transparent text-center font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50`}
        />
        <button type="button" aria-label="Augmenter" className={`${btn} grid place-items-center rounded-xl border bg-card hover:bg-secondary`} onClick={() => onChange(clamp(D(value).plus(step)))}>
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  )
}
