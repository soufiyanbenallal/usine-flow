'use client'

import { Banner, Button, Checkbox, NumberField, Select, TextField } from '@xco-agency/corex-ui'
import { AlertOctagon, ClipboardCheck, FileBadge, ListChecks, ShieldAlert, Tags } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { StatStrip } from '@/components/stat-strip'
import { QuantityInput } from '@/components/business/quantity-input'
import { formatDate, formatDateTime, formatQty } from '@/lib/format'
import { ChildTable } from '../_core/child-table'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { RecordEditor } from '../_core/record-editor'
import { Status } from '../_core/status'
import { EntityHistory } from '../audit/entity-history'
import { AttachmentsPanel } from '../documents/attachments-panel'
import { bucketOptions } from '../inventory/types'
import { lotPicker } from '../inventory/hooks'
import { itemPicker, useItemIndex } from '../items/hooks'
import { useOrgPath, useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { partnerPicker, usePartnerIndex } from '../partners/hooks'
import { useWarehouseOptions } from '../warehouses/hooks'
import { capaAging, judgeMeasurement } from './rules'
import { capaHooks, certificateHooks, inspectionHooks, ncrHooks, planHooks, pointHooks, reasonHooks, recallHooks, recallItemHooks, resultHooks, useDefectReasons } from './hooks'
import { qualityApi } from './service'
import {
  CAPA_STATUS, INSPECTION_KINDS, NCR_STATUS, POINT_KINDS, REASON_KINDS, SAMPLING_METHODS, SEVERITIES, type CapaAction, type Inspection, type InspectionPlan, type InspectionPoint, type InspectionResult,
  type NonConformance, type QualityCertificate, type ReasonCode, type Recall, type RecallItem,
} from './types'

const active = (a: boolean) => <Pill tone={a ? 'success' : 'neutral'}>{a ? 'Actif' : 'Inactif'}</Pill>
const SEV_TONE = { minor: 'info', major: 'warning', critical: 'critical' } as const

/* ───────── reason codes ───────── */
export function ReasonCodesPage() {
  const columns: DataTableColumn<ReasonCode>[] = [
    { key: 'kind', label: 'Domaine', value: (r) => REASON_KINDS.find((k) => k.value === r.kind)?.label ?? r.kind },
    { key: 'code', label: 'Code', value: (r) => r.code },
    { key: 'label', label: 'Libellé', value: (r) => r.label },
    { key: 'active', label: 'Statut', value: (r) => (r.active ? 'Actif' : 'Inactif'), render: (r) => active(r.active) },
  ]
  return (
    <EntityPage<ReasonCode>
      title="Codes motifs" singular="code motif" icon={Tags} description="Motifs normalisés : arrêts de production, rebuts, causes de panne, défauts qualité, retours, ajustements." hooks={reasonHooks} permission="quality.manage" columns={columns}
      filter={{ label: 'Domaine', options: REASON_KINDS, getValue: (r) => r.kind }}
      fields={[
        { key: 'kind', label: 'Domaine', type: 'select', options: REASON_KINDS, required: true, lockedOnEdit: true, default: 'defect' },
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'label', label: 'Libellé', required: true },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      importConfig={{ fields: [{ key: 'kind', label: 'Domaine', required: true }, { key: 'code', label: 'Code', required: true }, { key: 'label', label: 'Libellé', required: true }], example: { kind: 'defect', code: 'RAYURE', label: 'Rayure' }, templateName: 'modele-motifs.csv' }}
    />
  )
}

/* ───────── inspection plans ───────── */
export function InspectionPlansPage() {
  const items = useItemIndex()
  const columns: DataTableColumn<InspectionPlan>[] = [
    { key: 'code', label: 'Code', value: (p) => p.code },
    { key: 'name', label: 'Nom', value: (p) => p.name },
    { key: 'kind', label: 'Type', value: (p) => INSPECTION_KINDS.find((k) => k.value === p.kind)?.label ?? p.kind },
    { key: 'item', label: 'Article', value: (p) => (p.item_id ? (items.get(p.item_id)?.sku ?? '—') : 'Tous') },
    { key: 'sampling', label: 'Échantillonnage', value: (p) => SAMPLING_METHODS.find((m) => m.value === p.sampling_method)?.label ?? p.sampling_method },
    { key: 'active', label: 'Statut', value: (p) => (p.active ? 'Actif' : 'Inactif'), render: (p) => active(p.active) },
  ]
  return (
    <EntityPage<InspectionPlan>
      title="Plans de contrôle" singular="plan de contrôle" icon={ListChecks} description="Points de contrôle (mesures avec tolérances, conforme / non conforme, visuel) par type d’inspection, article ou catégorie." hooks={planHooks} permission="quality.manage" columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'kind', label: 'Type', type: 'select', options: INSPECTION_KINDS, required: true, default: 'incoming' },
        { key: 'item_id', label: 'Article (vide = tous)', type: 'picker', picker: itemPicker },
        { key: 'sampling_method', label: 'Échantillonnage', type: 'select', options: SAMPLING_METHODS, required: true, default: 'all' },
        { key: 'sample_percent', label: 'Pourcentage', type: 'number', min: 0, hidden: (v) => v.sampling_method !== 'percent' },
        { key: 'sample_size', label: 'Taille d’échantillon', type: 'number', min: 1, hidden: (v) => v.sampling_method !== 'fixed' && v.sampling_method !== 'aql' },
        { key: 'aql', label: 'AQL', type: 'number', min: 0, hidden: (v) => v.sampling_method !== 'aql' },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      detailPath={(p) => `qualite/plans/${p.id}`} afterCreatePath={(p) => `qualite/plans/${p.id}`}
    />
  )
}

export function InspectionPlanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const can = useCan('quality.manage')
  const one = planHooks.useOne(id)
  const plan = one.data
  const columns: DataTableColumn<InspectionPoint>[] = [
    { key: 'seq', label: 'Séq.', align: 'right', value: (p) => p.seq },
    { key: 'name', label: 'Point de contrôle', value: (p) => p.name },
    { key: 'kind', label: 'Type', value: (p) => POINT_KINDS.find((k) => k.value === p.kind)?.label ?? p.kind },
    { key: 'tol', label: 'Tolérance', value: (p) => (p.kind === 'measurement' ? `${p.min_value ?? '−∞'} … ${p.max_value ?? '+∞'} ${p.unit ?? ''}` : '—') },
    { key: 'target', label: 'Cible', align: 'right', value: (p) => p.target ?? '—' },
    { key: 'req', label: 'Obligatoire', value: (p) => (p.required ? 'Oui' : 'Non') },
  ]
  return (
    <PageShell title={plan ? `${plan.code} — ${plan.name}` : 'Plan de contrôle'} icon={ListChecks} error={one.error?.message} actions={<Link href={href('qualite/plans')}><Button variant="secondary">Plans de contrôle</Button></Link>}>
      {plan && (
        <>
          <ChildTable<InspectionPoint>
            title="Points de contrôle" singular="point" hooks={pointHooks} fk="plan_id" parentId={plan.id} canEdit={can} columns={columns}
            fields={[
              { key: 'seq', label: 'Séquence', type: 'number', min: 1, default: 10, required: true },
              { key: 'name', label: 'Point de contrôle', required: true },
              { key: 'kind', label: 'Type', type: 'select', options: POINT_KINDS, required: true, default: 'pass_fail' },
              { key: 'unit', label: 'Unité de mesure', hidden: (v) => v.kind !== 'measurement' },
              { key: 'target', label: 'Valeur cible', type: 'number', hidden: (v) => v.kind !== 'measurement' },
              { key: 'min_value', label: 'Minimum toléré', type: 'number', hidden: (v) => v.kind !== 'measurement' },
              { key: 'max_value', label: 'Maximum toléré', type: 'number', hidden: (v) => v.kind !== 'measurement' },
              { key: 'required', label: 'Obligatoire', type: 'checkbox', default: true },
              { key: 'instructions', label: 'Instructions', type: 'textarea' },
            ]}
          />
          <AttachmentsPanel entityType="inspection_plans" entityId={plan.id} kind="technical" title="Documents de référence" />
        </>
      )}
    </PageShell>
  )
}

/* ───────── inspections ───────── */
export function InspectionsPage() {
  const items = useItemIndex()
  const suppliers = usePartnerIndex()
  const list = inspectionHooks.useList()
  const open = (list.data ?? []).filter((i) => ['pending', 'in_progress'].includes(i.status)).length
  const failed = (list.data ?? []).filter((i) => i.status === 'failed').length
  const columns: DataTableColumn<Inspection>[] = [
    { key: 'number', label: 'N°', value: (i) => i.number ?? '—' },
    { key: 'kind', label: 'Type', value: (i) => INSPECTION_KINDS.find((k) => k.value === i.kind)?.label ?? i.kind },
    { key: 'item', label: 'Article', value: (i) => (items.get(i.item_id) ? `${items.get(i.item_id)!.sku} — ${items.get(i.item_id)!.name}` : i.item_id) },
    { key: 'supplier', label: 'Fournisseur', value: (i) => (i.supplier_id ? (suppliers.get(i.supplier_id)?.name ?? '—') : '—') },
    { key: 'qty', label: 'Quantité', align: 'right', value: (i) => formatQty(i.quantity) },
    { key: 'rejected', label: 'Rejeté', align: 'right', value: (i) => formatQty(i.rejected_qty) },
    { key: 'status', label: 'Statut', value: (i) => i.status, render: (i) => <Status value={i.status} /> },
    { key: 'date', label: 'Contrôlé le', value: (i) => formatDate(i.inspected_at?.slice(0, 10)) },
  ]
  return (
    <EntityPage<Inspection>
      title="Inspections" singular="inspection" icon={ClipboardCheck} description="Contrôle à la réception, en cours de production et final : accepter, rejeter ou mettre en quarantaine." hooks={inspectionHooks} permission="quality.inspect" columns={columns}
      filter={{ label: 'Statut', options: ['pending', 'in_progress', 'passed', 'failed', 'accepted_with_deviation', 'cancelled'].map((v) => ({ value: v, label: v })), getValue: (i) => i.status }}
      intro={<StatStrip period="Maintenant" stats={[{ label: 'À réaliser', value: String(open) }, { label: 'Non conformes', value: String(failed) }, { label: 'Total', value: String((list.data ?? []).length) }]} />}
      fields={[
        { key: 'kind', label: 'Type', type: 'select', options: INSPECTION_KINDS, required: true, default: 'in_process' },
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true },
        { key: 'quantity', label: 'Quantité à contrôler', type: 'number', min: 0.0001, required: true },
        { key: 'lot_id', label: 'Lot', type: 'picker', picker: lotPicker },
        { key: 'warehouse_id', label: 'Entrepôt', type: 'relation', useOptions: useWarehouseOptions },
      ]}
      createFn={async (p) => ({ id: await qualityApi.createInspection({ kind: String(p.kind), item: String(p.item_id), qty: Number(p.quantity), lot: p.lot_id ? String(p.lot_id) : undefined, warehouse: p.warehouse_id ? String(p.warehouse_id) : undefined }) }) as Inspection}
      detailPath={(i) => `qualite/inspections/${i.id}`} afterCreatePath={(i) => `qualite/inspections/${i.id}`} exportName="inspections"
    />
  )
}

function ResultRow({ r, point, editable }: { r: InspectionResult; point?: InspectionPoint; editable: boolean }) {
  const update = resultHooks.useUpdate()
  const [value, setValue] = useState(r.measured_value === null ? '' : String(r.measured_value))
  const defects = useDefectReasons()
  const preview = point?.kind === 'measurement' && value !== '' ? judgeMeasurement(Number(value), { min: point.min_value, max: point.max_value }) : r.result
  return (
    <tr className="border-t align-middle">
      <td className="py-2 pr-3">{r.point_name ?? point?.name}{point?.required && ' *'}</td>
      <td className="px-3 text-muted-foreground">{point?.kind === 'measurement' ? `${point.min_value ?? '−∞'} … ${point.max_value ?? '+∞'} ${point.unit ?? ''}` : (point?.kind === 'visual' ? 'Visuel' : 'Conforme ?')}</td>
      <td className="px-3">
        {point?.kind === 'measurement' ? (
          <div className="w-28"><NumberField label="Mesure" labelAccessibilityVisibility="exclusive" value={value} disabled={!editable} onChange={setValue} onBlur={() => value !== '' && Number(value) !== r.measured_value && update.mutate({ id: r.id, patch: { measured_value: Number(value) } })} /></div>
        ) : editable ? (
          <div className="flex gap-1">
            {(['pass', 'fail', 'na'] as const).map((res) => (
              <Button key={res} variant={r.result === res ? 'primary' : 'secondary'} tone={res === 'fail' && r.result === 'fail' ? 'critical' : undefined} onClick={() => update.mutate({ id: r.id, patch: { result: res } })}>{res === 'pass' ? 'OK' : res === 'fail' ? 'KO' : 'N/A'}</Button>
            ))}
          </div>
        ) : (
          r.result
        )}
      </td>
      <td className="px-3"><Status value={preview === 'pass' ? 'passed' : preview === 'fail' ? 'failed' : 'pending'} /></td>
      <td className="px-3">{editable && preview === 'fail' && <Select label="Défaut" labelAccessibilityVisibility="exclusive" value={r.defect_code ?? ''} options={[{ value: '', label: 'Défaut…' }, ...defects.map((d) => ({ value: d.hint ?? d.value, label: d.label }))]} onChange={(v) => update.mutate({ id: r.id, patch: { defect_code: v || null } })} />}</td>
    </tr>
  )
}

export function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const org = useOrganization()
  const client = useQueryClient()
  const can = useCan('quality.inspect')
  const one = inspectionHooks.useOne(id)
  const results = resultHooks.useListBy('inspection_id', id)
  const insp = one.data
  const points = pointHooks.useListBy('plan_id', insp?.plan_id ?? undefined)
  const items = useItemIndex()
  const [accepted, setAccepted] = useState<string | null>(null)
  const [rejected, setRejected] = useState('0')
  const [bucket, setBucket] = useState('damaged')
  const [comment, setComment] = useState('')
  const [deviation, setDeviation] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const open = !!insp && ['pending', 'in_progress'].includes(insp.status) && can
  const acc = accepted ?? String(Math.max((insp?.quantity ?? 0) - Number(rejected), 0))
  const decide = async () => {
    if (!insp) return
    setBusy(true)
    setError(null)
    try {
      const status = await qualityApi.decide(insp.id, Number(acc), Number(rejected), bucket, comment || undefined, deviation)
      setDone(status)
      await client.invalidateQueries({ queryKey: ['org', org.id] })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <PageShell title={insp ? `Inspection ${insp.number ?? ''}` : 'Inspection'} icon={ClipboardCheck} error={one.error?.message} actions={<Link href={href('qualite/inspections')}><Button variant="secondary">Inspections</Button></Link>}>
      {insp && (
        <>
          {error && <Banner tone="critical">{error}</Banner>}
          {done && <Banner tone={done === 'passed' ? 'success' : 'warning'}>Décision enregistrée : {done}.</Banner>}
          <Panel title="Contexte">
            <dl className="grid gap-3 text-[13px] sm:grid-cols-4">
              <div><dt className="text-muted-foreground">Article</dt><dd className="font-medium">{items.get(insp.item_id)?.sku ?? insp.item_id}</dd></div>
              <div><dt className="text-muted-foreground">Quantité / échantillon</dt><dd className="font-medium">{formatQty(insp.quantity)} / {formatQty(insp.sample_qty ?? insp.quantity)}</dd></div>
              <div><dt className="text-muted-foreground">Source</dt><dd className="font-medium">{insp.source_type ?? 'manuelle'}</dd></div>
              <div><dt className="text-muted-foreground">Statut</dt><dd><Status value={insp.status} /></dd></div>
            </dl>
          </Panel>
          <Panel title="Points de contrôle">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3 font-medium">Point</th><th className="px-3 font-medium">Attendu</th><th className="px-3 font-medium">Résultat</th><th className="px-3 font-medium">Verdict</th><th /></tr></thead>
                <tbody>{(results.data ?? []).map((r) => <ResultRow key={r.id} r={r} point={(points.data ?? []).find((p) => p.id === r.point_id)} editable={open} />)}</tbody>
              </table>
            </div>
            {(results.data ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Aucun point de contrôle : aucun plan actif ne correspond à cet article. Vous pouvez décider directement.</p>}
          </Panel>
          {open && (
            <Panel title="Décision">
              <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-4">
                  <QuantityInput label="Quantité acceptée" value={acc} onChange={setAccepted} max={insp.quantity} />
                  <QuantityInput label="Quantité rejetée" value={rejected} onChange={(v) => { setRejected(v); setAccepted(null) }} max={insp.quantity} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Stock des unités rejetées" value={bucket} options={bucketOptions.filter((b) => b.value !== 'available')} onChange={setBucket} />
                  <TextField label="Commentaire" value={comment} onChange={setComment} />
                </div>
                <Checkbox label="Accepté avec dérogation" checked={deviation} onChange={setDeviation} />
                <Button variant="primary" loading={busy} onClick={() => void decide()}>Valider la décision</Button>
              </div>
            </Panel>
          )}
          <AttachmentsPanel entityType="inspections" entityId={insp.id} kind="photo" title="Photos et pièces" />
          <EntityHistory entity="inspections" entityId={insp.id} />
        </>
      )}
    </PageShell>
  )
}

/* ───────── non-conformances ───────── */
const NCR_FIELDS = [
  { key: 'item_id', label: 'Article', type: 'picker' as const, picker: itemPicker },
  { key: 'lot_id', label: 'Lot', type: 'picker' as const, picker: lotPicker },
  { key: 'supplier_id', label: 'Fournisseur', type: 'picker' as const, picker: partnerPicker },
  { key: 'severity', label: 'Gravité', type: 'select' as const, options: SEVERITIES, required: true, default: 'minor' },
  { key: 'quantity_affected', label: 'Quantité concernée', type: 'number' as const, min: 0, default: 0 },
  { key: 'description', label: 'Description de la non-conformité', type: 'textarea' as const, required: true },
  { key: 'root_cause', label: 'Cause racine', type: 'textarea' as const },
  { key: 'containment', label: 'Action de confinement', type: 'textarea' as const },
  { key: 'quarantine', label: 'Stock mis en quarantaine', type: 'checkbox' as const },
  { key: 'status', label: 'Statut', type: 'select' as const, options: NCR_STATUS, required: true, default: 'open' },
]

export function NonConformancesPage() {
  const items = useItemIndex()
  const columns: DataTableColumn<NonConformance>[] = [
    { key: 'number', label: 'N°', value: (n) => n.number ?? '—' },
    { key: 'desc', label: 'Description', value: (n) => n.description },
    { key: 'item', label: 'Article', value: (n) => (n.item_id ? (items.get(n.item_id)?.sku ?? '—') : '—') },
    { key: 'sev', label: 'Gravité', value: (n) => n.severity, render: (n) => <Pill tone={SEV_TONE[n.severity]}>{SEVERITIES.find((s) => s.value === n.severity)?.label}</Pill> },
    { key: 'qty', label: 'Qté', align: 'right', value: (n) => formatQty(n.quantity_affected) },
    { key: 'status', label: 'Statut', value: (n) => n.status, render: (n) => <Status value={n.status} /> },
    { key: 'date', label: 'Ouverte le', value: (n) => formatDate(n.created_at.slice(0, 10)) },
  ]
  return (
    <EntityPage<NonConformance>
      title="Non-conformités" singular="non-conformité" icon={AlertOctagon} description="Écarts qualité détectés à la réception, en production ou chez le client : confinement, cause racine, actions CAPA." hooks={ncrHooks} permission="quality.inspect" columns={columns}
      filter={{ label: 'Statut', options: NCR_STATUS, getValue: (n) => n.status }} fields={NCR_FIELDS} detailPath={(n) => `qualite/non-conformites/${n.id}`} afterCreatePath={(n) => `qualite/non-conformites/${n.id}`} exportName="non-conformites"
    />
  )
}

export function NcrDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const can = useCan('quality.manage')
  const one = ncrHooks.useOne(id)
  const ncr = one.data
  const columns: DataTableColumn<CapaAction>[] = [
    { key: 'number', label: 'N°', value: (c) => c.number ?? '—' },
    { key: 'kind', label: 'Type', value: (c) => (c.kind === 'corrective' ? 'Corrective' : 'Préventive') },
    { key: 'title', label: 'Action', value: (c) => c.title },
    { key: 'owner', label: 'Responsable', value: (c) => c.owner_name ?? '—' },
    { key: 'due', label: 'Échéance', value: (c) => formatDate(c.due_date) },
    { key: 'status', label: 'Statut', value: (c) => c.status, render: (c) => <Status value={c.status} /> },
  ]
  return (
    <PageShell title={ncr ? `NC ${ncr.number ?? ''}` : 'Non-conformité'} icon={AlertOctagon} error={one.error?.message} actions={<Link href={href('qualite/non-conformites')}><Button variant="secondary">Non-conformités</Button></Link>}>
      {ncr && (
        <>
          <RecordEditor<NonConformance> title="Non-conformité" hooks={ncrHooks} row={ncr} permission="quality.inspect" fields={NCR_FIELDS} />
          <ChildTable<CapaAction>
            title="Actions correctives et préventives (CAPA)" singular="action" hooks={capaHooks} fk="ncr_id" parentId={ncr.id} canEdit={can} columns={columns}
            fields={[
              { key: 'kind', label: 'Type', type: 'select', options: [{ value: 'corrective', label: 'Corrective' }, { value: 'preventive', label: 'Préventive' }], required: true, default: 'corrective' },
              { key: 'title', label: 'Action', required: true },
              { key: 'description', label: 'Description', type: 'textarea' },
              { key: 'owner_name', label: 'Responsable' },
              { key: 'due_date', label: 'Échéance', type: 'date' },
              { key: 'status', label: 'Statut', type: 'select', options: CAPA_STATUS, required: true, default: 'open' },
              { key: 'effectiveness', label: 'Vérification d’efficacité', type: 'textarea' },
            ]}
          />
          <AttachmentsPanel entityType="non_conformances" entityId={ncr.id} kind="photo" title="Preuves et photos" />
          <EntityHistory entity="non_conformances" entityId={ncr.id} />
        </>
      )}
    </PageShell>
  )
}

export function CapaPage() {
  const list = capaHooks.useList()
  const today = new Date().toISOString().slice(0, 10)
  const aging = capaAging((list.data ?? []).map((c) => ({ status: c.status, createdAt: c.created_at, dueDate: c.due_date })), today)
  const columns: DataTableColumn<CapaAction>[] = [
    { key: 'number', label: 'N°', value: (c) => c.number ?? '—' },
    { key: 'kind', label: 'Type', value: (c) => (c.kind === 'corrective' ? 'Corrective' : 'Préventive') },
    { key: 'title', label: 'Action', value: (c) => c.title },
    { key: 'owner', label: 'Responsable', value: (c) => c.owner_name ?? '—' },
    { key: 'due', label: 'Échéance', value: (c) => formatDate(c.due_date), render: (c) => <span className={c.due_date && c.due_date < today && ['open', 'in_progress'].includes(c.status) ? 'font-medium text-red-700' : ''}>{formatDate(c.due_date)}</span> },
    { key: 'status', label: 'Statut', value: (c) => c.status, render: (c) => <Status value={c.status} /> },
  ]
  return (
    <EntityPage<CapaAction>
      title="Actions CAPA" singular="action CAPA" icon={ShieldAlert} description="Suivi des actions correctives et préventives avec échéances et vérification d’efficacité." hooks={capaHooks} permission="quality.manage" columns={columns}
      filter={{ label: 'Statut', options: CAPA_STATUS, getValue: (c) => c.status }}
      intro={<StatStrip period="Maintenant" stats={[{ label: 'Ouvertes', value: String(aging.open) }, { label: 'En retard', value: String(aging.overdue) }, { label: 'Ancienneté moyenne', value: `${aging.averageAgeDays} j` }]} />}
      fields={[
        { key: 'ncr_id', label: 'Non-conformité (id)', help: 'Optionnel : rattache l’action à une NC.' },
        { key: 'kind', label: 'Type', type: 'select', options: [{ value: 'corrective', label: 'Corrective' }, { value: 'preventive', label: 'Préventive' }], required: true, default: 'corrective' },
        { key: 'title', label: 'Action', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'owner_name', label: 'Responsable' },
        { key: 'due_date', label: 'Échéance', type: 'date' },
        { key: 'status', label: 'Statut', type: 'select', options: CAPA_STATUS, required: true, default: 'open' },
        { key: 'effectiveness', label: 'Vérification d’efficacité', type: 'textarea' },
      ]}
      exportName="capa"
    />
  )
}

/* ───────── certificates ───────── */
export function CertificatesPage() {
  const items = useItemIndex()
  const columns: DataTableColumn<QualityCertificate>[] = [
    { key: 'number', label: 'N°', value: (c) => c.number },
    { key: 'title', label: 'Titre', value: (c) => c.title },
    { key: 'item', label: 'Article', value: (c) => (c.item_id ? (items.get(c.item_id)?.sku ?? '—') : '—') },
    { key: 'issuer', label: 'Émetteur', value: (c) => c.issuer ?? '—' },
    { key: 'issued', label: 'Émis le', value: (c) => formatDate(c.issued_on) },
    { key: 'expires', label: 'Expire le', value: (c) => formatDate(c.expires_on), render: (c) => <span className={c.expires_on && c.expires_on < new Date().toISOString().slice(0, 10) ? 'font-medium text-red-700' : ''}>{formatDate(c.expires_on)}</span> },
  ]
  return (
    <EntityPage<QualityCertificate>
      title="Certificats" singular="certificat" icon={FileBadge} description="Certificats de conformité fournisseurs, analyses et certificats produits, avec dates d’expiration." hooks={certificateHooks} permission="quality.manage" columns={columns}
      fields={[
        { key: 'number', label: 'Numéro', required: true },
        { key: 'title', label: 'Titre', required: true },
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker },
        { key: 'lot_id', label: 'Lot', type: 'picker', picker: lotPicker },
        { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker },
        { key: 'issuer', label: 'Organisme émetteur' },
        { key: 'issued_on', label: 'Émis le', type: 'date' },
        { key: 'expires_on', label: 'Expire le', type: 'date' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      modalExtra={(row) => (row ? <AttachmentsPanel entityType="quality_certificates" entityId={row.id} kind="certificate" title="Fichier du certificat" /> : <p className="text-xs text-muted-foreground">Enregistrez le certificat pour y joindre le fichier.</p>)}
      exportName="certificats"
    />
  )
}

/* ───────── recalls ───────── */
export function RecallsPage() {
  const columns: DataTableColumn<Recall>[] = [
    { key: 'number', label: 'N°', value: (r) => r.number ?? '—' },
    { key: 'reason', label: 'Motif', value: (r) => r.reason },
    { key: 'sev', label: 'Gravité', value: (r) => r.severity, render: (r) => <Pill tone={SEV_TONE[r.severity]}>{SEVERITIES.find((s) => s.value === r.severity)?.label}</Pill> },
    { key: 'status', label: 'Statut', value: (r) => r.status, render: (r) => <Status value={r.status} /> },
    { key: 'date', label: 'Ouvert le', value: (r) => formatDateTime(r.created_at) },
  ]
  return (
    <EntityPage<Recall>
      title="Rappels de lots" singular="rappel" icon={ShieldAlert} description="Ouvre un rappel depuis un lot : traçabilité aval (clients livrés), blocage de tous les lots concernés et notification qualité." hooks={recallHooks} permission="quality.manage" columns={columns}
      fields={[
        { key: 'lot_id', label: 'Lot à rappeler', type: 'picker', picker: lotPicker, required: true },
        { key: 'reason', label: 'Motif du rappel', type: 'textarea', required: true },
        { key: 'severity', label: 'Gravité', type: 'select', options: SEVERITIES, required: true, default: 'major' },
      ]}
      createFn={async (p) => ({ id: await qualityApi.openRecall(String(p.lot_id), String(p.reason), String(p.severity ?? 'major')) }) as Recall}
      detailPath={(r) => `qualite/rappels/${r.id}`} afterCreatePath={(r) => `qualite/rappels/${r.id}`}
    />
  )
}

export function RecallDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const can = useCan('quality.manage')
  const one = recallHooks.useOne(id)
  const update = recallHooks.useUpdate()
  const partners = usePartnerIndex()
  const recall = one.data
  const columns: DataTableColumn<RecallItem>[] = [
    { key: 'type', label: 'Type', value: (i) => (i.node_type === 'delivery' ? 'Livraison' : 'Lot') },
    { key: 'label', label: 'Référence', value: (i) => i.label ?? i.node_id },
    { key: 'partner', label: 'Client', value: (i) => (i.partner_id ? (partners.get(i.partner_id)?.name ?? '—') : '—') },
    { key: 'qty', label: 'Quantité', align: 'right', value: (i) => (i.quantity === null ? '—' : formatQty(i.quantity)) },
    { key: 'notified', label: 'Notifié', value: (i) => (i.notified ? 'Oui' : 'Non') },
  ]
  return (
    <PageShell title={recall ? `Rappel ${recall.number ?? ''}` : 'Rappel'} icon={ShieldAlert} error={one.error?.message}
      actions={<><Link href={href('qualite/rappels')}><Button variant="secondary">Rappels</Button></Link>{recall && can && recall.status !== 'closed' && <Button variant="primary" onClick={() => update.mutate({ id: recall.id, patch: { status: recall.status === 'open' ? 'notified' : 'closed', ...(recall.status === 'notified' ? { closed_at: new Date().toISOString() } : {}) } })}>{recall.status === 'open' ? 'Marquer comme notifié' : 'Clôturer le rappel'}</Button>}</>}>
      {recall && (
        <>
          <Panel title="Rappel"><p className="text-[13px]"><Status value={recall.status} /> <span className="ml-2">{recall.reason}</span></p></Panel>
          <ChildTable<RecallItem> title="Périmètre (traçabilité aval)" singular="élément" hooks={recallItemHooks} fk="recall_id" parentId={recall.id} canEdit={false} fields={[]} columns={columns} extraRowActions={(i) => can && !i.notified ? <RecallNotify item={i} /> : null} />
        </>
      )}
    </PageShell>
  )
}

function RecallNotify({ item }: { item: RecallItem }) {
  const update = recallItemHooks.useUpdate()
  return <Button variant="tertiary" loading={update.isPending} onClick={() => update.mutate({ id: item.id, patch: { notified: true } })}>Marquer notifié</Button>
}

