'use client'

import { Checkbox, DateField, NumberField, Select, TextField } from '@xco-agency/corex-ui'
import { useId, type ReactNode } from 'react'
import type { EntityField, FormValues } from './form-values'

export * from './form-values'

function RelationInput({ field, value, onChange, error, disabled }: { field: EntityField; value: string; onChange: (v: string) => void; error?: string; disabled?: boolean }) {
  const options = field.useOptions?.() ?? []
  const withEmpty = field.clearable === false || field.required ? options : [{ value: '', label: '—' }, ...options]
  return (
    <Select
      label={field.label}
      value={value}
      options={withEmpty.map((o) => ({ value: o.value, label: o.hint ? `${o.label} — ${o.hint}` : o.label }))}
      onChange={onChange}
      error={error}
      disabled={disabled}
      helpText={field.help}
      required={field.required}
    />
  )
}

export function FieldInput({ field, values, onChange, errors, disabled }: { field: EntityField; values: FormValues; onChange: (key: string, value: string | boolean) => void; errors: Record<string, string>; disabled?: boolean }) {
  const id = useId()
  const value = values[field.key]
  const error = errors[field.key]
  const common = { label: field.label, error, disabled, helpText: field.help, required: field.required, id: `${id}-${field.key}` }
  const str = typeof value === 'string' ? value : ''
  switch (field.type) {
    case 'checkbox':
      return <Checkbox label={field.label} checked={Boolean(value)} disabled={disabled} helpText={field.help} onChange={(c) => onChange(field.key, c)} />
    case 'textarea':
      return <TextField {...common} multiline={3} value={str} placeholder={field.placeholder} onChange={(v) => onChange(field.key, v)} />
    case 'number':
    case 'money':
      return (
        <NumberField
          {...common}
          value={str}
          min={field.min}
          step={field.step ?? (field.type === 'money' ? 0.01 : undefined)}
          suffix={field.type === 'money' ? 'MAD' : undefined}
          onChange={(v) => onChange(field.key, v)}
        />
      )
    case 'date':
      return <DateField {...common} value={str} onChange={(e) => onChange(field.key, typeof e === 'string' ? e : String((e.currentTarget as { value?: string }).value ?? ''))} />
    case 'datetime':
      return (
        <label className="flex flex-col gap-1 text-[13px]">
          <span className="font-medium">{field.label}</span>
          <input
            type="datetime-local"
            value={str}
            disabled={disabled}
            required={field.required}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          {error && <span className="text-xs text-red-700">{error}</span>}
        </label>
      )
    case 'select':
      return (
        <Select
          label={field.label}
          value={str}
          options={field.required || field.clearable === false ? (field.options ?? []) : [{ value: '', label: '—' }, ...(field.options ?? [])]}
          onChange={(v) => onChange(field.key, v)}
          error={error}
          disabled={disabled}
          helpText={field.help}
          required={field.required}
        />
      )
    case 'relation':
      return <RelationInput field={field} value={str} onChange={(v) => onChange(field.key, v)} error={error} disabled={disabled} />
    case 'email':
      return <TextField {...common} value={str} placeholder={field.placeholder} onChange={(v) => onChange(field.key, v)} />
    case 'phone':
      return <TextField {...common} value={str} placeholder={field.placeholder} onChange={(v) => onChange(field.key, v)} />
    case 'tags':
      return <TextField {...common} value={str} placeholder={field.placeholder ?? 'valeur1, valeur2'} onChange={(v) => onChange(field.key, v)} />
    default:
      return <TextField {...common} value={str} placeholder={field.placeholder} onChange={(v) => onChange(field.key, v)} />
  }
}

/** Two-column responsive grid of fields. */
export function FieldGrid({ fields, values, onChange, errors, disabled, editing }: { fields: EntityField[]; values: FormValues; onChange: (key: string, value: string | boolean) => void; errors: Record<string, string>; disabled?: boolean; editing?: boolean }) {
  const visible = fields.filter((f) => !f.hidden?.(values))
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {visible.map((f) => (
        <div key={f.key} className={f.wide || f.type === 'textarea' ? 'sm:col-span-2' : undefined}>
          <FieldInput field={f} values={values} onChange={onChange} errors={errors} disabled={disabled || (editing && f.lockedOnEdit)} />
        </div>
      ))}
    </div>
  )
}

export function FormBanner({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{children}</div>
}
