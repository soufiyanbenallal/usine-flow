'use client'

import { NumberField } from '@xco-agency/corex-ui'

/** Money field in MAD (string value, exact decimals — never parsed as a float until saved). */
export function MoneyInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return <NumberField label={label} value={value} onChange={onChange} step={0.01} min={0} suffix="MAD" error={error} />
}
