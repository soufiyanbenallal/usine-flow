'use client'

import { useEffect } from 'react'
import { formatDate, formatDateTime, formatMoney, formatQty } from '@/lib/format'
import type { EntityField } from './form-values'
import { statusMeta } from './status'

/** Resolves the display text of a field value (relation → option label, select → label, money, dates). */
function useFieldText(field: EntityField, raw: unknown): string {
  const options = field.useOptions?.() ?? field.options
  if (raw === null || raw === undefined || raw === '') return '—'
  switch (field.type) {
    case 'checkbox':
      return raw ? 'Oui' : 'Non'
    case 'money':
      return formatMoney(Number(raw))
    case 'number':
      return formatQty(Number(raw))
    case 'date':
      return formatDate(String(raw))
    case 'datetime':
      return formatDateTime(String(raw))
    case 'tags':
      return Array.isArray(raw) ? raw.join(', ') : String(raw)
    case 'select':
    case 'relation':
      return options?.find((o) => o.value === String(raw))?.label ?? statusMeta(String(raw)).label
    default:
      return String(raw)
  }
}

export function FieldValue({ field, value, onText }: { field: EntityField; value: unknown; onText?: (key: string, text: string) => void }) {
  const text = useFieldText(field, value)
  useEffect(() => onText?.(field.key, text), [onText, field.key, text])
  return <span className="break-words">{text}</span>
}
