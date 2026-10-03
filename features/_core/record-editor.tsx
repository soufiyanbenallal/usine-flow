'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { useState } from 'react'
import { Panel } from '@/components/page-shell'
import { useCan } from '../organization/permissions'
import type { Permission } from '@/lib/permissions'
import type { CrudHooks } from './crud-hooks'
import { FieldGrid, rowToValues, validateValues, valuesToPayload, type EntityField, type FormValues } from './fields'

/** Inline edit form of one existing record (detail pages). Locked fields stay read-only. */
export function RecordEditor<Row extends { id: string }>({ title, hooks, row, fields, permission }: { title: string; hooks: CrudHooks<Row, Record<string, unknown>, Record<string, unknown>>; row: Row; fields: EntityField[]; permission: Permission }) {
  const can = useCan(permission)
  const update = hooks.useUpdate()
  const [values, setValues] = useState<FormValues | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = values ?? rowToValues(fields, row as unknown as Record<string, unknown>)

  const save = async () => {
    const errs = validateValues(fields, current)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      await update.mutateAsync({ id: row.id, patch: valuesToPayload(fields.filter((f) => !f.lockedOnEdit), current) })
      setSaved(true)
      setValues(null)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <Panel title={title}>
      <div className="space-y-3">
        {error && <Banner tone="critical">{error}</Banner>}
        {saved && <Banner tone="success">Modifications enregistrées.</Banner>}
        <FieldGrid fields={fields} values={current} onChange={(k, v) => { setSaved(false); setValues({ ...current, [k]: v }) }} errors={errors} disabled={!can} editing />
        {can && (
          <Button variant="primary" loading={update.isPending} onClick={() => void save()}>
            Enregistrer
          </Button>
        )}
      </div>
    </Panel>
  )
}
