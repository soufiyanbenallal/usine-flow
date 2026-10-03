'use client'

import { Banner, Button, Modal } from '@xco-agency/corex-ui'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { DataTableColumn } from '@/components/data-table'
import { Panel } from '@/components/page-shell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useT } from '@/lib/i18n'
import type { CrudHooks } from './crud-hooks'
import { FieldGrid, defaultValues, rowToValues, validateValues, valuesToPayload, type EntityField, type FormValues } from './fields'

type Payload = Record<string, unknown>

/**
 * Editable table of child rows (document lines, barcodes, contacts…) bound to a parent record by a foreign key.
 * Reads with `useListBy(fk, parentId)`, creates with `{ [fk]: parentId }`.
 */
export function ChildTable<Row extends { id: string }>({
  title, singular, hooks, fk, parentId, fields, columns, canEdit, defaults, empty = 'Aucune ligne.', extraRowActions, beforeSave, footer,
}: {
  title: string
  singular: string
  hooks: CrudHooks<Row, Payload, Payload>
  fk: string
  parentId: string
  fields: EntityField[]
  columns: DataTableColumn<Row>[]
  canEdit: boolean
  defaults?: FormValues
  empty?: string
  extraRowActions?: (row: Row) => ReactNode
  beforeSave?: (payload: Payload, row: Row | null) => Payload
  footer?: ReactNode
}) {
  const t = useT()
  const list = hooks.useListBy(fk, parentId)
  const create = hooks.useCreate()
  const update = hooks.useUpdate()
  const remove = hooks.useRemove()
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [values, setValues] = useState<FormValues>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const rows = list.data ?? []
  const busy = create.isPending || update.isPending

  const open = (target: Row | 'new') => {
    setError(null)
    setErrors({})
    setValues(target === 'new' ? { ...defaultValues(fields), ...defaults } : rowToValues(fields, target as unknown as Record<string, unknown>))
    setEditing(target)
  }
  const save = async () => {
    const errs = validateValues(fields, values)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    const row = editing && editing !== 'new' ? editing : null
    let payload = valuesToPayload(fields, values)
    if (beforeSave) payload = beforeSave(payload, row)
    try {
      if (row) await update.mutateAsync({ id: row.id, patch: payload })
      else await create.mutateAsync({ ...payload, [fk]: parentId })
      setEditing(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Panel
      title={title}
      action={
        canEdit && (
          <Button variant="secondary" onClick={() => open('new')}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-3.5" /> {t('Ajouter')}
            </span>
          </Button>
        )
      }
    >
      {(list.error || remove.error) && <Banner tone="critical">{(list.error ?? remove.error)!.message}</Banner>}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-0 bg-muted hover:bg-muted">
              {columns.map((c) => (
                <TableHead key={c.key} className={`text-[13px] text-foreground ${c.align === 'right' ? 'text-right' : ''}`}>
                  {t(c.label)}
                </TableHead>
              ))}
              {(canEdit || extraRowActions) && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="h-16 text-center text-sm text-muted-foreground">
                  {list.isPending ? t('Chargement…') : t(empty)}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((c) => (
                  <TableCell key={c.key} className={`text-[13px] ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                    {c.render ? c.render(row) : c.value(row)}
                  </TableCell>
                ))}
                {(canEdit || extraRowActions) && (
                  <TableCell className="whitespace-nowrap text-right">
                    {extraRowActions?.(row)}
                    {canEdit && (
                      <>
                        <button type="button" aria-label={t('Modifier')} className="mx-1 text-muted-foreground hover:text-foreground" onClick={() => open(row)}>
                          <Pencil className="size-4" />
                        </button>
                        <button type="button" aria-label={t('Supprimer')} className="text-muted-foreground hover:text-red-600" onClick={() => remove.mutate(row.id)}>
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {footer}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`${editing === 'new' ? t('Ajouter') : t('Modifier')} — ${singular}`}
        primaryAction={{ content: t('Enregistrer'), onAction: save, loading: busy, disabled: busy }}
        secondaryActions={[{ content: t('Annuler'), onAction: () => setEditing(null), disabled: busy }]}
      >
        <div className="space-y-3 p-4">
          {error && <Banner tone="critical">{error}</Banner>}
          <FieldGrid fields={fields} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} errors={errors} editing={editing !== 'new'} />
        </div>
      </Modal>
    </Panel>
  )
}
