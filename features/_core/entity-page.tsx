'use client'

import { Banner, Button, Modal } from '@xco-agency/corex-ui'
import type { LucideIcon } from 'lucide-react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, type ReactNode } from 'react'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/data-table'
import { ImportAction } from '@/components/import-action'
import { PageShell } from '@/components/page-shell'
import { useCan } from '@/features/organization/permissions'
import { useOrgPath } from '@/features/organization/context'
import { downloadCsv } from '@/lib/csv'
import type { ImportField } from '@/lib/csv-import'
import { useT } from '@/lib/i18n'
import type { Permission } from '@/lib/permissions'
import type { CrudHooks } from './crud-hooks'
import { FieldGrid, defaultValues, rowToValues, validateValues, valuesToPayload, type EntityField, type FormValues } from './fields'

type Payload = Record<string, unknown>

export type EntityPageProps<Row extends { id: string }> = {
  title: string
  singular: string
  icon: LucideIcon
  description?: string
  hooks: CrudHooks<Row, Payload, Payload>
  columns: DataTableColumn<Row>[]
  fields: EntityField[]
  /** Permission required to create / edit / delete. */
  permission: Permission
  filter?: DataTableFilter<Row>
  /** CSV import of rows (uses `useCreateMany`). */
  importConfig?: { fields: ImportField<Payload>[]; example: Record<string, string | number>; templateName: string }
  exportName?: string
  /** Organization-relative path of the detail page; when set, rows open it instead of the edit modal. */
  detailPath?: (row: Row) => string
  /** After creation: navigate (e.g. to the new document) — receives the created row. */
  afterCreatePath?: (row: Row) => string
  canDelete?: boolean | ((row: Row) => boolean)
  /** Extra header actions. */
  actions?: ReactNode
  /** Content rendered above the table. */
  intro?: ReactNode
  /** Extra content inside the modal under the form. */
  modalExtra?: (row: Row | null) => ReactNode
  /** Last-minute payload adjustments (computed fields, defaults). */
  beforeSave?: (payload: Payload, row: Row | null) => Payload
  /** Initial values of the create form. */
  initialValues?: FormValues
  /** Filter / sort rows before display (e.g. only suppliers). */
  select?: (rows: Row[]) => Row[]
  /** Payload merged into every created row (e.g. `{ kinds: ['customer'] }`). */
  createDefaults?: Payload
  modalTitle?: (row: Row | null) => string
  /** Adjust the form state when opening a row (derived fields that are not columns). */
  toValues?: (row: Row, base: FormValues) => FormValues
  loadingExtra?: boolean
}

/**
 * Generic list + create/edit modal for a table of the multi-tenant schema.
 * Business rules stay in the database (RLS, constraints, triggers): this component only maps forms to rows.
 */
export function EntityPage<Row extends { id: string }>(props: EntityPageProps<Row>) {
  const { title, singular, icon, description, hooks, columns, fields, permission, filter, importConfig, exportName, detailPath, afterCreatePath, actions, intro, modalExtra, beforeSave, createDefaults, select } = props
  const t = useT()
  const router = useRouter()
  const href = useOrgPath()
  const can = useCan(permission)
  const list = hooks.useList()
  const create = hooks.useCreate()
  const createMany = hooks.useCreateMany()
  const update = hooks.useUpdate()
  const remove = hooks.useRemove()
  const visibleRef = useRef<Row[]>([])
  const [editing, setEditing] = useState<Row | 'new' | null>(null)
  const [values, setValues] = useState<FormValues>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const rows = select ? select(list.data ?? []) : (list.data ?? [])
  const row = editing && editing !== 'new' ? editing : null
  const busy = create.isPending || update.isPending || remove.isPending
  const canRemove = typeof props.canDelete === 'function' ? (row ? props.canDelete(row) : false) : (props.canDelete ?? true)

  const open = (target: Row | 'new') => {
    setFormError(null)
    setErrors({})
    setConfirmDelete(false)
    setValues(
      target === 'new'
        ? { ...defaultValues(fields), ...props.initialValues }
        : (() => {
            const base = rowToValues(fields, target as unknown as Record<string, unknown>)
            return props.toValues ? props.toValues(target as Row, base) : base
          })(),
    )
    setEditing(target)
  }
  const close = () => setEditing(null)
  const change = (key: string, value: string | boolean) => setValues((v) => ({ ...v, [key]: value }))

  const save = async () => {
    const errs = validateValues(fields, values)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    let payload = valuesToPayload(fields.filter((f) => !(row && f.lockedOnEdit)), values)
    if (!row && createDefaults) payload = { ...createDefaults, ...payload }
    if (beforeSave) payload = beforeSave(payload, row)
    try {
      if (row) await update.mutateAsync({ id: row.id, patch: payload })
      else {
        const created = await create.mutateAsync(payload)
        if (afterCreatePath) {
          close()
          router.push(href(afterCreatePath(created)))
          return
        }
      }
      close()
    } catch (e) {
      setFormError((e as Error).message)
    }
  }

  const doDelete = async () => {
    if (!row) return
    if (!confirmDelete) return setConfirmDelete(true)
    try {
      await remove.mutateAsync(row.id)
      close()
    } catch (e) {
      setFormError((e as Error).message)
    }
  }

  const exportCsv = () =>
    downloadCsv(`${exportName ?? title.toLowerCase().replace(/\s+/g, '-')}.csv`, columns.map((c) => ({ label: c.label, value: c.value })), visibleRef.current)

  const secondary = [
    { content: t('Annuler'), onAction: close, disabled: busy },
    ...(row && can && canRemove ? [{ content: confirmDelete ? t('Confirmer la suppression') : t('Supprimer'), onAction: doDelete, destructive: true, disabled: busy }] : []),
  ]

  return (
    <PageShell
      title={title}
      icon={icon}
      description={description}
      error={list.error?.message}
      actions={
        <>
          {actions}
          {rows.length > 0 && (
            <span className="hidden md:block">
              <Button variant="secondary" icon="export" onClick={exportCsv}>
                {t('Exporter')}
              </Button>
            </span>
          )}
          {can && importConfig && (
            <ImportAction
              title={`${t('Importer')} — ${title}`}
              fields={importConfig.fields}
              example={importConfig.example}
              templateName={importConfig.templateName}
              onImport={(imported) => createMany.mutateAsync(imported.map((r) => ({ ...createDefaults, ...r })))}
            />
          )}
          {can && (
            <Button variant="primary" onClick={() => open('new')}>
              <span className="inline-flex items-center gap-1.5">
                <Plus className="size-3.5" /> {t('Ajouter')}
              </span>
            </Button>
          )}
        </>
      }
    >
      {intro}
      <DataTable<Row>
        title={title}
        singular={singular}
        columns={columns}
        rows={rows}
        loading={list.isPending || props.loadingExtra}
        filter={filter}
        addLabel={can ? t('Ajouter') : undefined}
        onAdd={can ? () => open('new') : undefined}
        onOpen={(r) => (detailPath ? router.push(href(detailPath(r))) : open(r))}
        onVisibleChange={(v) => {
          visibleRef.current = v
        }}
      />

      <Modal
        open={editing !== null}
        onClose={close}
        title={props.modalTitle ? props.modalTitle(row) : row ? `${t('Modifier')} — ${singular}` : `${t('Ajouter')} — ${singular}`}
        primaryAction={can ? { content: t('Enregistrer'), onAction: save, loading: create.isPending || update.isPending, disabled: busy } : { content: t('Fermer'), onAction: close }}
        secondaryActions={can ? secondary : []}
      >
        <div className="space-y-3 p-4">
          {formError && <Banner tone="critical">{formError}</Banner>}
          {!can && <Banner tone="info">{t('Vous n’avez pas les droits pour modifier cet élément.')}</Banner>}
          <FieldGrid fields={fields} values={values} onChange={change} errors={errors} disabled={!can} editing={!!row} />
          {modalExtra?.(row)}
        </div>
      </Modal>
    </PageShell>
  )
}
