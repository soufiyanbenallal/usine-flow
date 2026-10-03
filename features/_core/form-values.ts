export type Option = { value: string; label: string; hint?: string }
export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'date' | 'datetime' | 'select' | 'checkbox' | 'email' | 'phone' | 'relation' | 'tags'
export type FormValues = Record<string, string | boolean>

export type EntityField = {
  key: string
  label: string
  type?: FieldType
  required?: boolean
  /** Static options (select). */
  options?: Option[]
  /** Hook returning options (relation: another entity's rows). Called at render, must be stable per field. */
  useOptions?: () => Option[] | undefined
  /** Allow an empty choice for selects / relations. */
  clearable?: boolean
  min?: number
  step?: number
  help?: string
  placeholder?: string
  default?: string | number | boolean
  /** Not editable once the row exists. */
  lockedOnEdit?: boolean
  /** Hide the field depending on the other values. */
  hidden?: (values: FormValues) => boolean
  /** Spans both columns of the form grid. */
  wide?: boolean
}

export const defaultValues = (fields: EntityField[]): FormValues =>
  Object.fromEntries(fields.map((f) => [f.key, f.type === 'checkbox' ? Boolean(f.default ?? false) : f.default !== undefined ? String(f.default) : '']))

const toLocalInput = (iso: string) => (iso.length >= 16 ? iso.slice(0, 16) : iso)

/** Row (from the API) → string-valued form state. */
export function rowToValues(fields: EntityField[], row: Record<string, unknown>): FormValues {
  const out: FormValues = {}
  for (const f of fields) {
    const v = row[f.key]
    if (f.type === 'checkbox') out[f.key] = Boolean(v)
    else if (f.type === 'tags') out[f.key] = Array.isArray(v) ? v.join(', ') : ''
    else if (f.type === 'datetime') out[f.key] = typeof v === 'string' ? toLocalInput(v) : ''
    else out[f.key] = v === null || v === undefined ? '' : String(v)
  }
  return out
}

/** Form state → API payload (empty → null, numbers parsed, tags split). */
export function valuesToPayload(fields: EntityField[], values: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (f.hidden?.(values)) continue
    const raw = values[f.key]
    switch (f.type) {
      case 'checkbox':
        out[f.key] = Boolean(raw)
        break
      case 'number':
      case 'money': {
        const s = String(raw ?? '').trim().replace(',', '.')
        out[f.key] = s === '' ? null : Number(s)
        break
      }
      case 'tags': {
        out[f.key] = String(raw ?? '').split(',').map((t) => t.trim()).filter(Boolean)
        break
      }
      case 'datetime': {
        const s = String(raw ?? '')
        out[f.key] = s ? new Date(s).toISOString() : null
        break
      }
      default: {
        const s = String(raw ?? '').trim()
        out[f.key] = s === '' ? null : s
      }
    }
  }
  return out
}

/** Returns `{ field: message }` for missing required values and out-of-range numbers. */
export function validateValues(fields: EntityField[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of fields) {
    if (f.hidden?.(values)) continue
    const raw = values[f.key]
    const empty = raw === '' || raw === undefined || raw === null
    if (f.required && f.type !== 'checkbox' && empty) errors[f.key] = 'Ce champ est obligatoire.'
    else if ((f.type === 'number' || f.type === 'money') && !empty) {
      const n = Number(String(raw).replace(',', '.'))
      if (!Number.isFinite(n)) errors[f.key] = 'Nombre invalide.'
      else if (f.min !== undefined && n < f.min) errors[f.key] = `Doit être ≥ ${f.min}.`
    } else if (f.type === 'email' && !empty && !/^\S+@\S+\.\S+$/.test(String(raw))) errors[f.key] = 'Adresse e-mail invalide.'
  }
  return errors
}
