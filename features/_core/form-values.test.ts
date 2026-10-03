import { describe, expect, it } from 'vitest'
import { defaultValues, rowToValues, validateValues, valuesToPayload, type EntityField } from './form-values'

const fields: EntityField[] = [
  { key: 'name', label: 'Nom', required: true },
  { key: 'qty', label: 'Quantité', type: 'number', min: 0 },
  { key: 'price', label: 'Prix', type: 'money' },
  { key: 'active', label: 'Actif', type: 'checkbox', default: true },
  { key: 'tags', label: 'Tags', type: 'tags' },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'kind', label: 'Type', type: 'select', options: [{ value: 'a', label: 'A' }], default: 'a' },
  { key: 'hidden_when_a', label: 'X', hidden: (v) => v.kind === 'a' },
]

describe('form values', () => {
  it('builds defaults', () => {
    expect(defaultValues(fields)).toMatchObject({ name: '', active: true, kind: 'a', qty: '' })
  })
  it('converts rows to form state and back', () => {
    const values = rowToValues(fields, { name: 'Acier', qty: 12.5, price: null, active: false, tags: ['x', 'y'], email: null })
    expect(values).toMatchObject({ name: 'Acier', qty: '12.5', price: '', active: false, tags: 'x, y' })
    const payload = valuesToPayload(fields, { ...values, kind: 'a', qty: '1,5', tags: 'a, b ,' })
    expect(payload).toMatchObject({ name: 'Acier', qty: 1.5, price: null, active: false, tags: ['a', 'b'], email: null })
    expect(payload).not.toHaveProperty('hidden_when_a')
  })
  it('validates required fields, numbers and e-mail', () => {
    const errors = validateValues(fields, { ...defaultValues(fields), qty: '-3', email: 'oops' })
    expect(errors.name).toBeDefined()
    expect(errors.qty).toContain('≥ 0')
    expect(errors.email).toBeDefined()
    expect(validateValues(fields, { ...defaultValues(fields), name: 'ok', qty: '3' })).toEqual({})
  })
  it('flags non numeric input', () => {
    expect(validateValues(fields, { ...defaultValues(fields), name: 'ok', qty: 'abc' }).qty).toBe('Nombre invalide.')
  })
})
