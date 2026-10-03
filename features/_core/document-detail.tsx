'use client'

import { Banner, Button, Modal, TextField } from '@xco-agency/corex-ui'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, FileDown, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { Skeleton } from '@/components/ui/skeleton'
import { EntityHistory } from '../audit/entity-history'
import { useDocumentApproval } from '../approvals/hooks'
import { AttachmentsPanel } from '../documents/attachments-panel'
import { useOrgPath, useOrganization } from '../organization/context'
import { useOrganizationDetails } from '../organization/hooks'
import { usePermissions } from '../organization/permissions'
import { formatDate, formatMoney } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { buildDocumentPdf, downloadBytes } from '@/lib/pdf'
import type { Permission } from '@/lib/permissions'
import type { CrudHooks } from './crud-hooks'
import { FieldValue } from './field-value'
import { ChildTable } from './child-table'
import { FieldGrid, rowToValues, validateValues, valuesToPayload, type EntityField, type FormValues } from './fields'
import { Status } from './status'

type Payload = Record<string, unknown>
export type DocHeader = { id: string; status: string; number?: string | null; subtotal?: number; tax_amount?: number; total_amount?: number; notes?: string | null }

export type DocAction<H> = {
  key: string
  label: string
  tone?: 'primary' | 'secondary' | 'critical'
  visible: (h: H) => boolean
  run: (h: H, reason?: string) => Promise<unknown>
  /** Called with the RPC result; `go` navigates to an organization-relative path (e.g. the document just created). */
  after?: (result: unknown, go: (path: string) => void) => void
  confirm?: string
  /** Prompts for a mandatory reason (reversals, cancellations). */
  reasonLabel?: string
  permission?: Permission
}

export type DocumentConfig<H extends DocHeader, L extends { id: string }> = {
  title: string
  singular: string
  icon: LucideIcon
  /** Organization-relative list path, e.g. `achats/commandes`. */
  listPath: string
  /** Audited table name (history panel) and attachments entity type. */
  entity: string
  header: { hooks: CrudHooks<H, Payload, Payload>; fields: EntityField[]; editPermission: Permission; editable?: (h: H) => boolean }
  lines?: {
    hooks: CrudHooks<L, Payload, Payload>
    fk: string
    fields: EntityField[]
    useColumns: () => DataTableColumn<L>[]
    permission?: Permission
    editable?: (h: H) => boolean
    defaults?: FormValues
    singular?: string
  }
  actions: DocAction<H>[]
  /** Extra panels under the lines (e.g. receipts of a purchase order). */
  extra?: (h: H, lines: L[]) => ReactNode
  /** Panels shown on top (progress, links). */
  top?: (h: H, lines: L[]) => ReactNode
  /** Document type used by the approval engine (`submit_document`). */
  approvalType?: string
  /** Show HT / TVA / TTC totals (priced documents). */
  totals?: boolean
}

function LinesTable<H extends DocHeader, L extends { id: string }>({ config, header }: { config: DocumentConfig<H, L>; header: H }) {
  const cfg = config.lines!
  const columns = cfg.useColumns()
  const { can } = usePermissions()
  const editable = (cfg.editable ?? ((h: H) => h.status === 'draft'))(header) && can(cfg.permission ?? config.header.editPermission)
  return (
    <ChildTable<L>
      title={cfg.singular ? `Lignes — ${cfg.singular}` : 'Lignes'}
      singular={cfg.singular ?? 'ligne'}
      hooks={cfg.hooks}
      fk={cfg.fk}
      parentId={header.id}
      fields={cfg.fields}
      columns={columns}
      canEdit={editable}
      defaults={cfg.defaults}
    />
  )
}

/**
 * Detail page of a business document: header (editable while draft), lines, totals, workflow actions
 * (submit → approve → post → reverse), approval progress, attachments, change history and PDF export.
 * Posting rules live in the database: this view only calls the RPCs and shows their errors.
 */
export function DocumentDetail<H extends DocHeader, L extends { id: string }>({ config }: { config: DocumentConfig<H, L> }) {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const router = useRouter()
  const org = useOrganization()
  const client = useQueryClient()
  const { can } = usePermissions()
  const orgDetails = useOrganizationDetails()
  const one = config.header.hooks.useOne(id)
  const lineQuery = config.lines ? config.lines.hooks.useListBy(config.lines.fk, id) : null
  const update = config.header.hooks.useUpdate()
  const approval = useDocumentApproval(config.approvalType ?? config.entity.replace(/s$/, ''), id)
  const doc = one.data
  const lines = lineQuery?.data ?? []
  const [editing, setEditing] = useState(false)
  const [values, setValues] = useState<FormValues>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [reasonFor, setReasonFor] = useState<DocAction<H> | null>(null)
  const [reason, setReason] = useState('')
  const [confirmFor, setConfirmFor] = useState<DocAction<H> | null>(null)
  const texts = useRef<Record<string, string>>({})
  const onText = useCallback((key: string, text: string) => {
    texts.current[key] = text
  }, [])
  const lineColumns = config.lines?.useColumns() ?? []

  const run = async (action: DocAction<H>, why?: string) => {
    if (!doc) return
    setActionError(null)
    setPending(action.key)
    try {
      const result = await action.run(doc, why)
      await client.invalidateQueries({ queryKey: ['org', org.id] })
      action.after?.(result, (path) => router.push(href(path)))
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setPending(null)
      setReasonFor(null)
      setConfirmFor(null)
      setReason('')
    }
  }
  const trigger = (a: DocAction<H>) => {
    if (a.reasonLabel) setReasonFor(a)
    else if (a.confirm) setConfirmFor(a)
    else void run(a)
  }

  const editable = !!doc && (config.header.editable ?? ((h: H) => h.status === 'draft'))(doc) && can(config.header.editPermission)
  const startEdit = () => {
    if (!doc) return
    setErrors({})
    setValues(rowToValues(config.header.fields, doc as unknown as Record<string, unknown>))
    setEditing(true)
  }
  const saveHeader = async () => {
    const errs = validateValues(config.header.fields, values)
    setErrors(errs)
    if (Object.keys(errs).length > 0 || !doc) return
    try {
      await update.mutateAsync({ id: doc.id, patch: valuesToPayload(config.header.fields.filter((f) => !f.lockedOnEdit), values) })
      setEditing(false)
    } catch (e) {
      setActionError((e as Error).message)
    }
  }

  const exportPdf = async () => {
    if (!doc) return
    const o = orgDetails.data
    const meta = [
      { label: 'Statut', value: t(doc.status) },
      ...config.header.fields.map((f) => ({ label: f.label, value: texts.current[f.key] ?? '' })).filter((m) => m.value && m.value !== '—'),
    ]
    const cols = lineColumns
    const hasTotals = !!config.totals && doc.total_amount !== undefined
    const bytes = await buildDocumentPdf({
      title: config.singular,
      number: doc.number,
      company: { name: o?.name ?? org.name, lines: [[o?.ice && `ICE ${o.ice}`, o?.if_number && `IF ${o.if_number}`, o?.rc && `RC ${o.rc}`].filter(Boolean).join(' · '), [o?.address, o?.city].filter(Boolean).join(', '), [o?.phone, o?.email].filter(Boolean).join(' · ')].filter(Boolean) as string[] },
      meta,
      columns: cols.map((c) => ({ label: c.label, width: c.key === cols[1]?.key ? 220 : 90, align: c.align })),
      rows: lines.map((l) => cols.map((c) => String(c.value(l)))),
      totals: hasTotals ? [{ label: 'Total HT', value: formatMoney(doc.subtotal ?? 0) }, { label: 'TVA', value: formatMoney(doc.tax_amount ?? 0) }, { label: 'Total TTC', value: formatMoney(doc.total_amount ?? 0), bold: true }] : undefined,
      notes: doc.notes,
    })
    downloadBytes(`${doc.number ?? config.singular}.pdf`, bytes)
  }

  const visibleActions = doc ? config.actions.filter((a) => a.visible(doc) && (!a.permission || can(a.permission))) : []

  return (
    <PageShell
      title={doc ? `${config.singular} ${doc.number ?? ''}` : config.singular}
      icon={config.icon}
      error={one.error?.message}
      actions={
        <>
          <Link href={href(config.listPath)}>
            <Button variant="secondary">
              <span className="inline-flex items-center gap-1">
                <ArrowLeft className="size-3.5" /> {t(config.title)}
              </span>
            </Button>
          </Link>
          {doc && (
            <Button variant="secondary" onClick={() => void exportPdf()}>
              <span className="inline-flex items-center gap-1.5">
                <FileDown className="size-3.5" /> PDF
              </span>
            </Button>
          )}
        </>
      }
    >
      {one.isPending && <Skeleton className="h-40 w-full rounded-xl" />}
      {!one.isPending && !doc && <Banner tone="warning">Document introuvable.</Banner>}
      {doc && (
        <>
          {actionError && <Banner tone="critical">{actionError}</Banner>}
          <div className="flex flex-wrap items-center gap-2">
            <Status value={doc.status} />
            {approval.data && approval.data.status !== 'cancelled' && (
              <span className="text-xs text-muted-foreground">
                Approbation : <Status value={approval.data.status} />
              </span>
            )}
            <span className="ml-auto flex flex-wrap gap-2">
              {visibleActions.map((a) => (
                <Button key={a.key} variant={a.tone === 'primary' ? 'primary' : 'secondary'} tone={a.tone === 'critical' ? 'critical' : undefined} loading={pending === a.key} disabled={pending !== null} onClick={() => trigger(a)}>
                  {t(a.label)}
                </Button>
              ))}
            </span>
          </div>

          {config.top?.(doc, lines)}

          <Panel
            title="Informations"
            action={
              editable && !editing ? (
                <Button variant="secondary" onClick={startEdit}>
                  <span className="inline-flex items-center gap-1.5">
                    <Pencil className="size-3.5" /> {t('Modifier')}
                  </span>
                </Button>
              ) : null
            }
          >
            {editing ? (
              <div className="space-y-3">
                <FieldGrid fields={config.header.fields} values={values} onChange={(k, v) => setValues((s) => ({ ...s, [k]: v }))} errors={errors} editing />
                <div className="flex gap-2">
                  <Button variant="primary" loading={update.isPending} onClick={() => void saveHeader()}>
                    {t('Enregistrer')}
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(false)}>
                    {t('Annuler')}
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
                {config.header.fields
                  .filter((f) => f.type !== 'textarea')
                  .map((f) => (
                    <div key={f.key}>
                      <dt className="text-xs text-muted-foreground">{t(f.label)}</dt>
                      <dd className="font-medium">
                        <FieldValue field={f} value={(doc as unknown as Record<string, unknown>)[f.key]} onText={onText} />
                      </dd>
                    </div>
                  ))}
                {doc.notes && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <dt className="text-xs text-muted-foreground">Notes</dt>
                    <dd>{doc.notes}</dd>
                  </div>
                )}
              </dl>
            )}
          </Panel>

          {config.lines && <LinesTable config={config} header={doc} />}

          {config.totals && doc.total_amount !== undefined && config.lines && (
            <div className="ml-auto w-full max-w-xs space-y-1 rounded-xl border bg-card p-4 text-[13px]">
              <div className="flex justify-between"><span>Total HT</span><span className="tabular-nums">{formatMoney(doc.subtotal ?? 0)}</span></div>
              <div className="flex justify-between"><span>TVA</span><span className="tabular-nums">{formatMoney(doc.tax_amount ?? 0)}</span></div>
              <div className="flex justify-between border-t pt-1 text-sm font-semibold"><span>Total TTC</span><span className="tabular-nums">{formatMoney(doc.total_amount)}</span></div>
            </div>
          )}

          {config.extra?.(doc, lines)}
          <AttachmentsPanel entityType={config.entity} entityId={doc.id} />
          <EntityHistory entity={config.entity} entityId={doc.id} />
          <p className="text-xs text-muted-foreground">Créé le {formatDate(String((doc as unknown as { created_at?: string }).created_at ?? '').slice(0, 10))}</p>
        </>
      )}

      <Modal open={reasonFor !== null} onClose={() => setReasonFor(null)} title={reasonFor?.label ?? ''}
        primaryAction={{ content: t('Valider'), onAction: () => reasonFor && void run(reasonFor, reason), disabled: reason.trim().length < 3, loading: pending !== null }}
        secondaryActions={[{ content: t('Annuler'), onAction: () => setReasonFor(null) }]}>
        <div className="p-4">
          <TextField label={reasonFor?.reasonLabel ?? 'Motif'} value={reason} onChange={setReason} multiline={3} />
        </div>
      </Modal>
      <Modal open={confirmFor !== null} onClose={() => setConfirmFor(null)} title={confirmFor?.label ?? ''}
        primaryAction={{ content: t('Valider'), onAction: () => confirmFor && void run(confirmFor), loading: pending !== null }}
        secondaryActions={[{ content: t('Annuler'), onAction: () => setConfirmFor(null) }]}>
        <p className="p-4 text-sm">{confirmFor?.confirm}</p>
      </Modal>
    </PageShell>
  )
}
