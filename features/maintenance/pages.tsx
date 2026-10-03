'use client'

import { Banner, Button, Modal, Select, TextField } from '@xco-agency/corex-ui'
import { Gauge, Wrench, CalendarDays, AlertTriangle, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { StatStrip } from '@/components/stat-strip'
import { formatDate, formatMoney, formatQty } from '@/lib/format'
import { ChildTable } from '../_core/child-table'
import { cancelAction } from '../_core/doc-actions'
import { DocumentDetail, type DocumentConfig } from '../_core/document-detail'
import { EntityPage } from '../_core/entity-page'
import { useListOptions } from '../_core/options'
import { Pill } from '../_core/pill'
import { RecordEditor } from '../_core/record-editor'
import { Status } from '../_core/status'
import { EntityHistory } from '../audit/entity-history'
import { AttachmentsPanel } from '../documents/attachments-panel'
import { itemPicker, useItemIndex } from '../items/hooks'
import { useWorkCenterOptions } from '../manufacturing/hooks'
import { useOrgPath, useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { useFailureReasons } from '../quality/hooks'
import { useWarehouseOptions } from '../warehouses/hooks'
import { useEmployeeOptions } from '../workforce/hooks'
import { inherentAvailability, preventiveCompliance } from './kpis'
import { assetHooks, partHooks, planHooks, readingHooks, useAssetIndex, useAssetOptions, useReliability, workOrderHooks } from './hooks'
import { maintenanceApi } from './service'
import {
  ASSET_KINDS, ASSET_STATUS, CRITICALITY, METER_UNITS, PLAN_KINDS, READING_KINDS, TRIGGER_TYPES, WO_KINDS, WO_PRIORITIES,
  type Asset, type MaintenancePart, type MaintenancePlan, type MaintenanceReading, type MaintenanceWorkOrder,
} from './types'

const active = (a: boolean) => <Pill tone={a ? 'success' : 'neutral'}>{a ? 'Actif' : 'Inactif'}</Pill>
const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'warning', urgent: 'critical' } as const
const useWcOptions = useWorkCenterOptions

const ASSET_FIELDS = [
  { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
  { key: 'name', label: 'Nom', required: true },
  { key: 'kind', label: 'Type', type: 'select' as const, options: ASSET_KINDS, required: true, default: 'machine' },
  { key: 'parent_id', label: 'Équipement parent', type: 'relation' as const, useOptions: useAssetOptions },
  { key: 'work_center_id', label: 'Poste de charge', type: 'relation' as const, useOptions: useWcOptions },
  { key: 'site_id', label: 'Site', type: 'relation' as const, useOptions: () => useListOptions('sites') },
  { key: 'manufacturer', label: 'Constructeur' },
  { key: 'model', label: 'Modèle' },
  { key: 'serial_number', label: 'N° de série' },
  { key: 'installed_on', label: 'Mise en service', type: 'date' as const },
  { key: 'status', label: 'État', type: 'select' as const, options: ASSET_STATUS, required: true, default: 'running' },
  { key: 'criticality', label: 'Criticité', type: 'select' as const, options: CRITICALITY, required: true, default: 'medium' },
  { key: 'meter_unit', label: 'Unité du compteur', type: 'select' as const, options: METER_UNITS, required: true, default: 'hours' },
  { key: 'hourly_cost', label: 'Coût horaire d’arrêt / d’exploitation (MAD)', type: 'money' as const, min: 0, default: 0 },
  { key: 'notes', label: 'Notes', type: 'textarea' as const },
  { key: 'active', label: 'Actif', type: 'checkbox' as const, default: true },
]

function AssetTree({ assets, onOpen }: { assets: Asset[]; onOpen: (a: Asset) => void }) {
  const byParent = useMemo(() => {
    const m = new Map<string | null, Asset[]>()
    for (const a of assets) m.set(a.parent_id, [...(m.get(a.parent_id) ?? []), a])
    return m
  }, [assets])
  const render = (parent: string | null, depth: number): React.ReactNode =>
    (byParent.get(parent) ?? []).map((a) => (
      <li key={a.id}>
        <button type="button" onClick={() => onOpen(a)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-secondary" style={{ paddingInlineStart: 8 + depth * 20 }}>
          <span className="text-muted-foreground">{depth > 0 ? '└' : '▪'}</span>
          <span className="font-medium">{a.name}</span>
          <span className="text-xs text-muted-foreground">{a.code}</span>
          <span className="ml-auto"><Status value={a.status} /></span>
        </button>
        {(byParent.get(a.id) ?? []).length > 0 && <ul>{render(a.id, depth + 1)}</ul>}
      </li>
    ))
  return <ul>{render(null, 0)}</ul>
}

export function BreakdownDialog({ open, onClose, assetId }: { open: boolean; onClose: () => void; assetId?: string }) {
  const org = useOrganization()
  const client = useQueryClient()
  const href = useOrgPath()
  const assets = useAssetOptions()
  const reasons = useFailureReasons()
  const [asset, setAsset] = useState(assetId ?? '')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reason, setReason] = useState('')
  const report = useMutation({ mutationFn: () => maintenanceApi.reportBreakdown(asset || assetId!, title, description || undefined, reason || undefined), onSuccess: async (id) => { await client.invalidateQueries({ queryKey: ['org', org.id] }); onClose(); window.location.href = href(`maintenance/ordres/${id}`) } })
  return (
    <Modal open={open} onClose={onClose} title="Déclarer une panne" primaryAction={{ content: 'Déclarer', onAction: () => report.mutate(), loading: report.isPending, disabled: !(asset || assetId) || title.trim().length < 3 }} secondaryActions={[{ content: 'Annuler', onAction: onClose }]}>
      <div className="space-y-3 p-4">
        {report.error && <Banner tone="critical">{report.error.message}</Banner>}
        <Banner tone="warning">La machine passe à l’arrêt, un ordre correctif et un arrêt de production sont créés, la maintenance et la production sont alertées.</Banner>
        {!assetId && <Select label="Équipement" value={asset} options={[{ value: '', label: 'Choisir…' }, ...assets.map((a) => ({ value: a.value, label: `${a.label} (${a.hint})` }))]} onChange={setAsset} />}
        <TextField label="Symptôme / titre" value={title} onChange={setTitle} />
        <TextField label="Description" value={description} onChange={setDescription} multiline={3} />
        <Select label="Cause probable" value={reason} options={[{ value: '', label: '—' }, ...reasons.map((r) => ({ value: r.value, label: r.label }))]} onChange={setReason} />
      </div>
    </Modal>
  )
}

/* ───────── assets ───────── */
export function AssetsPage() {
  const href = useOrgPath()
  const list = assetHooks.useList()
  const can = useCan('maintenance.report')
  const [dialog, setDialog] = useState(false)
  const wcs = useWcOptions()
  const columns: DataTableColumn<Asset>[] = [
    { key: 'code', label: 'Code', value: (a) => a.code },
    { key: 'name', label: 'Nom', value: (a) => a.name },
    { key: 'kind', label: 'Type', value: (a) => ASSET_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind },
    { key: 'wc', label: 'Poste', value: (a) => wcs.find((w) => w.value === a.work_center_id)?.label ?? '—' },
    { key: 'status', label: 'État', value: (a) => a.status, render: (a) => <Status value={a.status} /> },
    { key: 'crit', label: 'Criticité', value: (a) => CRITICALITY.find((c) => c.value === a.criticality)?.label ?? a.criticality },
    { key: 'meter', label: 'Compteur', align: 'right', value: (a) => `${a.meter_reading} ${a.meter_unit}` },
  ]
  return (
    <>
      <EntityPage<Asset>
        title="Équipements" singular="équipement" icon={Wrench} description="Hiérarchie : usine → ligne → machine → composants (moteur, pompe…). Compteurs d’heures et déclenchement du préventif." hooks={assetHooks} permission="maintenance.write" columns={columns}
        filter={{ label: 'État', options: ASSET_STATUS, getValue: (a) => a.status }} fields={ASSET_FIELDS} detailPath={(a) => `maintenance/equipements/${a.id}`} afterCreatePath={(a) => `maintenance/equipements/${a.id}`} exportName="equipements"
        actions={can && <Button variant="secondary" tone="critical" onClick={() => setDialog(true)}><span className="inline-flex items-center gap-1.5"><AlertTriangle className="size-3.5" /> Déclarer une panne</span></Button>}
        intro={(list.data ?? []).length > 0 ? <Panel title="Hiérarchie"><AssetTree assets={list.data ?? []} onOpen={(a) => { window.location.href = href(`maintenance/equipements/${a.id}`) }} /></Panel> : null}
      />
      <BreakdownDialog open={dialog} onClose={() => setDialog(false)} />
    </>
  )
}

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const org = useOrganization()
  const client = useQueryClient()
  const canWrite = useCan('maintenance.write')
  const canReport = useCan('maintenance.report')
  const one = assetHooks.useOne(id)
  const reliability = useReliability()
  const workOrders = workOrderHooks.useListBy('asset_id', id)
  const [dialog, setDialog] = useState(false)
  const [reading, setReading] = useState('')
  const record = useMutation({ mutationFn: () => maintenanceApi.recordReading(id, Number(reading)), onSuccess: () => { setReading(''); return client.invalidateQueries({ queryKey: ['org', org.id] }) } })
  const asset = one.data
  const rel = reliability.data?.find((r) => r.asset_id === id)
  const planColumns: DataTableColumn<MaintenancePlan>[] = [
    { key: 'name', label: 'Plan', value: (p) => p.name },
    { key: 'trigger', label: 'Déclencheur', value: (p) => (p.trigger_type === 'time' ? `Tous les ${p.interval_days} j` : `Tous les ${p.interval_meter} ${asset?.meter_unit ?? ''}`) },
    { key: 'last', label: 'Dernière fois', value: (p) => formatDate(p.last_done_at) },
    { key: 'next', label: 'Prochaine échéance', value: (p) => formatDate(p.next_due_date) },
    { key: 'active', label: 'Statut', value: (p) => (p.active ? 'Actif' : 'Inactif'), render: (p) => active(p.active) },
  ]
  return (
    <PageShell title={asset ? `${asset.code} — ${asset.name}` : 'Équipement'} icon={Wrench} error={one.error?.message}
      actions={<><Link href={href('maintenance/equipements')}><Button variant="secondary">Équipements</Button></Link>{canReport && <Button variant="secondary" tone="critical" onClick={() => setDialog(true)}>Déclarer une panne</Button>}</>}>
      {asset && (
        <>
          <StatStrip period="Fiabilité" stats={[
            { label: 'État', value: ASSET_STATUS.find((s) => s.value === asset.status)?.label ?? asset.status },
            { label: 'MTBF', value: rel?.mtbf_hours ? `${rel.mtbf_hours} h` : '—' },
            { label: 'MTTR', value: rel?.mttr_minutes ? `${rel.mttr_minutes} min` : '—' },
            { label: 'Pannes', value: String(rel?.failures ?? 0), hint: `${formatMoney(rel?.maintenance_cost ?? 0)} de maintenance` },
          ]} />
          <RecordEditor<Asset> title="Fiche équipement" hooks={assetHooks} row={asset} fields={ASSET_FIELDS} permission="maintenance.write" />
          {canReport && (
            <Panel title="Relevé de compteur">
              {record.error && <Banner tone="critical">{record.error.message}</Banner>}
              <div className="flex items-end gap-3">
                <div className="w-48"><TextField label={`Valeur actuelle (${asset.meter_unit}, dernier ${asset.meter_reading})`} value={reading} onChange={setReading} /></div>
                <Button variant="primary" loading={record.isPending} disabled={!Number(reading)} onClick={() => record.mutate()}>Enregistrer</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Un seuil atteint ouvre automatiquement un ordre de maintenance préventive.</p>
            </Panel>
          )}
          <ChildTable<MaintenancePlan>
            title="Plans de maintenance préventive" singular="plan" hooks={planHooks} fk="asset_id" parentId={asset.id} canEdit={canWrite} columns={planColumns} fields={PLAN_FIELDS}
          />
          <Panel title="Historique d’interventions">
            <ul className="divide-y text-[13px]">
              {(workOrders.data ?? []).map((w) => (
                <li key={w.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Link href={href(`maintenance/ordres/${w.id}`)} className="font-medium underline">{w.number}</Link><span>{w.title}</span><Status value={w.status} />
                  <span className="ml-auto text-muted-foreground">{w.total_cost > 0 ? formatMoney(w.total_cost) : ''} {w.downtime_minutes > 0 ? `· arrêt ${w.downtime_minutes} min` : ''}</span>
                </li>
              ))}
            </ul>
            {(workOrders.data ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Aucune intervention.</p>}
          </Panel>
          <AttachmentsPanel entityType="assets" entityId={asset.id} kind="technical" title="Manuels et documents techniques" />
          <EntityHistory entity="assets" entityId={asset.id} />
        </>
      )}
      <BreakdownDialog open={dialog} onClose={() => setDialog(false)} assetId={id} />
    </PageShell>
  )
}

const PLAN_FIELDS = [
  { key: 'name', label: 'Nom du plan', required: true },
  { key: 'kind', label: 'Type', type: 'select' as const, options: PLAN_KINDS, required: true, default: 'preventive' },
  { key: 'trigger_type', label: 'Déclencheur', type: 'select' as const, options: TRIGGER_TYPES, required: true, default: 'time' },
  { key: 'interval_days', label: 'Intervalle (jours)', type: 'number' as const, min: 1, hidden: (v: Record<string, string | boolean>) => v.trigger_type !== 'time' },
  { key: 'interval_meter', label: 'Intervalle (unités du compteur)', type: 'number' as const, min: 1, hidden: (v: Record<string, string | boolean>) => v.trigger_type !== 'meter' },
  { key: 'lead_days', label: 'Anticipation (jours)', type: 'number' as const, min: 0, default: 7 },
  { key: 'last_done_at', label: 'Dernière réalisation', type: 'date' as const },
  { key: 'estimated_minutes', label: 'Durée estimée (min)', type: 'number' as const, min: 0, default: 60 },
  { key: 'checklist', label: 'Check-list', type: 'tags' as const, placeholder: 'Graisser, Contrôler la tension, …' },
  { key: 'active', label: 'Actif', type: 'checkbox' as const, default: true },
]

/* ───────── plans ───────── */
export function PlansPage() {
  const assets = useAssetIndex()
  const org = useOrganization()
  const client = useQueryClient()
  const can = useCan('maintenance.write')
  const gen = useMutation({ mutationFn: () => maintenanceApi.generatePreventive(org.id), onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }) })
  const columns: DataTableColumn<MaintenancePlan>[] = [
    { key: 'asset', label: 'Équipement', value: (p) => assets.get(p.asset_id)?.name ?? p.asset_id },
    { key: 'name', label: 'Plan', value: (p) => p.name },
    { key: 'trigger', label: 'Déclencheur', value: (p) => (p.trigger_type === 'time' ? `Tous les ${p.interval_days} j` : `Tous les ${p.interval_meter} u`) },
    { key: 'next', label: 'Échéance', value: (p) => formatDate(p.next_due_date), render: (p) => <span className={p.next_due_date && p.next_due_date < new Date().toISOString().slice(0, 10) ? 'font-medium text-red-700' : ''}>{formatDate(p.next_due_date)}</span> },
    { key: 'active', label: 'Statut', value: (p) => (p.active ? 'Actif' : 'Inactif'), render: (p) => active(p.active) },
  ]
  return (
    <EntityPage<MaintenancePlan>
      title="Plans préventifs" singular="plan préventif" icon={ClipboardList} description="Maintenance préventive calendaire ou par compteur : les ordres de travail sont générés avant l’échéance." hooks={planHooks} permission="maintenance.write" columns={columns}
      actions={can && <Button variant="secondary" loading={gen.isPending} onClick={() => gen.mutate()}>{gen.data !== undefined ? `${gen.data} ordre(s) généré(s)` : 'Générer les ordres dus'}</Button>}
      fields={[{ key: 'asset_id', label: 'Équipement', type: 'relation', useOptions: useAssetOptions, required: true, lockedOnEdit: true }, ...PLAN_FIELDS]} exportName="plans-preventifs"
    />
  )
}

/* ───────── readings ───────── */
export function ReadingsPage() {
  const assets = useAssetIndex()
  const columns: DataTableColumn<MaintenanceReading>[] = [
    { key: 'date', label: 'Date', value: (r) => formatDate(r.read_at.slice(0, 10)) },
    { key: 'asset', label: 'Équipement', value: (r) => assets.get(r.asset_id)?.name ?? r.asset_id },
    { key: 'kind', label: 'Mesure', value: (r) => r.kind },
    { key: 'value', label: 'Valeur', align: 'right', value: (r) => r.value },
    { key: 'notes', label: 'Notes', value: (r) => r.notes ?? '' },
  ]
  return (
    <EntityPage<MaintenanceReading>
      title="Relevés compteurs" singular="relevé" icon={Gauge} description="Heures de marche, cycles, températures, vibrations. Les relevés d’heures/cycles pilotent la maintenance préventive." hooks={readingHooks} permission="maintenance.report" columns={columns}
      fields={[
        { key: 'asset_id', label: 'Équipement', type: 'relation', useOptions: useAssetOptions, required: true },
        { key: 'kind', label: 'Mesure', type: 'select', options: READING_KINDS, required: true, default: 'hours' },
        { key: 'value', label: 'Valeur', type: 'number', required: true },
        { key: 'notes', label: 'Notes' },
      ]}
      createFn={async (p) => { await maintenanceApi.recordReading(String(p.asset_id), Number(p.value), String(p.kind), p.notes ? String(p.notes) : undefined); return { id: '' } as MaintenanceReading }}
    />
  )
}

/* ───────── work orders ───────── */
const WO_HEADER = [
  { key: 'asset_id', label: 'Équipement', type: 'relation' as const, useOptions: useAssetOptions, required: true, lockedOnEdit: true },
  { key: 'kind', label: 'Type', type: 'select' as const, options: WO_KINDS, required: true, default: 'corrective' },
  { key: 'priority', label: 'Priorité', type: 'select' as const, options: WO_PRIORITIES, required: true, default: 'medium' },
  { key: 'title', label: 'Titre', required: true },
  { key: 'description', label: 'Description', type: 'textarea' as const },
  { key: 'failure_reason_id', label: 'Cause de panne', type: 'relation' as const, useOptions: useFailureReasons },
  { key: 'assigned_to', label: 'Technicien', type: 'relation' as const, useOptions: useEmployeeOptions },
  { key: 'scheduled_for', label: 'Planifié le', type: 'date' as const },
  { key: 'labor_minutes', label: 'Temps passé (minutes)', type: 'number' as const, min: 0, default: 0 },
  { key: 'resolution', label: 'Résolution', type: 'textarea' as const },
]

export function WorkOrdersPage() {
  const assets = useAssetIndex()
  const can = useCan('maintenance.report')
  const [dialog, setDialog] = useState(false)
  const columns: DataTableColumn<MaintenanceWorkOrder>[] = [
    { key: 'number', label: 'N°', value: (w) => w.number ?? '—' },
    { key: 'asset', label: 'Équipement', value: (w) => assets.get(w.asset_id)?.name ?? w.asset_id },
    { key: 'title', label: 'Titre', value: (w) => w.title },
    { key: 'kind', label: 'Type', value: (w) => (w.breakdown ? 'Panne' : (WO_KINDS.find((k) => k.value === w.kind)?.label ?? w.kind)), render: (w) => (w.breakdown ? <Pill tone="critical">Panne</Pill> : (WO_KINDS.find((k) => k.value === w.kind)?.label ?? w.kind)) },
    { key: 'prio', label: 'Priorité', value: (w) => w.priority, render: (w) => <Pill tone={PRIORITY_TONE[w.priority]}>{WO_PRIORITIES.find((p) => p.value === w.priority)?.label}</Pill> },
    { key: 'sched', label: 'Planifié', value: (w) => formatDate(w.scheduled_for) },
    { key: 'status', label: 'Statut', value: (w) => w.status, render: (w) => <Status value={w.status} /> },
    { key: 'cost', label: 'Coût', align: 'right', value: (w) => w.total_cost, render: (w) => (w.total_cost > 0 ? formatMoney(w.total_cost) : '—') },
  ]
  return (
    <>
      <EntityPage<MaintenanceWorkOrder>
        title="Ordres de travail" singular="ordre de travail" icon={Wrench} description="Correctif, préventif, inspections. Une panne déclarée arrête la machine, ouvre un arrêt de production et alerte la production." hooks={workOrderHooks} permission="maintenance.report" columns={columns}
        filter={{ label: 'Statut', options: ['open', 'assigned', 'in_progress', 'completed', 'cancelled'].map((v) => ({ value: v, label: v })), getValue: (w) => w.status }} fields={WO_HEADER}
        detailPath={(w) => `maintenance/ordres/${w.id}`} afterCreatePath={(w) => `maintenance/ordres/${w.id}`} exportName="ordres-maintenance"
        initialValues={{ kind: 'corrective', priority: 'medium' }}
        actions={can && <Button variant="secondary" tone="critical" onClick={() => setDialog(true)}><span className="inline-flex items-center gap-1.5"><AlertTriangle className="size-3.5" /> Déclarer une panne</span></Button>}
      />
      <BreakdownDialog open={dialog} onClose={() => setDialog(false)} />
    </>
  )
}

function PartsPanel({ wo }: { wo: MaintenanceWorkOrder }) {
  const items = useItemIndex()
  const can = useCan('maintenance.write')
  const columns: DataTableColumn<MaintenancePart>[] = [
    { key: 'item', label: 'Pièce', value: (p) => (items.get(p.item_id) ? `${items.get(p.item_id)!.sku} — ${items.get(p.item_id)!.name}` : p.item_id) },
    { key: 'qty', label: 'Quantité', align: 'right', value: (p) => formatQty(p.quantity) },
    { key: 'consumed', label: 'Consommée', value: (p) => (p.consumed ? 'Oui' : 'À la clôture') },
    { key: 'cost', label: 'Coût unit.', align: 'right', value: (p) => formatMoney(p.unit_cost) },
  ]
  return (
    <>
      <ChildTable<MaintenancePart>
        title="Pièces de rechange" singular="pièce" hooks={partHooks} fk="work_order_id" parentId={wo.id} canEdit={can && ['open', 'assigned', 'in_progress'].includes(wo.status)} columns={columns}
        fields={[
          { key: 'item_id', label: 'Pièce', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
          { key: 'warehouse_id', label: 'Entrepôt', type: 'relation', useOptions: useWarehouseOptions, required: true },
          { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, required: true },
        ]}
        footer={<p className="mt-2 text-xs text-muted-foreground">Le stock est sorti à la clôture de l’ordre et la valeur ajoutée au coût de maintenance.</p>}
      />
      <Panel title="Coûts"><dl className="grid gap-3 text-[13px] sm:grid-cols-4"><div><dt className="text-muted-foreground">Pièces</dt><dd className="font-semibold">{formatMoney(wo.parts_cost)}</dd></div><div><dt className="text-muted-foreground">Main-d’œuvre</dt><dd className="font-semibold">{formatMoney(wo.labor_cost)}</dd></div><div><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{formatMoney(wo.total_cost)}</dd></div><div><dt className="text-muted-foreground">Arrêt machine</dt><dd className="font-semibold">{wo.downtime_minutes} min</dd></div></dl></Panel>
    </>
  )
}

export function WorkOrderDetailPage() {
  const config: DocumentConfig<MaintenanceWorkOrder, { id: string }> = {
    title: 'Ordres de travail', singular: 'Ordre de maintenance', icon: Wrench, listPath: 'maintenance/ordres', entity: 'maintenance_work_orders',
    header: { hooks: workOrderHooks, fields: WO_HEADER, editPermission: 'maintenance.report', editable: (h) => ['draft', 'open', 'assigned', 'in_progress'].includes(h.status) },
    actions: [
      { key: 'start', label: 'Démarrer l’intervention', tone: 'primary', permission: 'maintenance.complete', visible: (h) => ['open', 'assigned'].includes(h.status), run: (h) => maintenanceApi.startWorkOrder(h.id) },
      { key: 'complete', label: 'Terminer l’intervention', tone: 'primary', permission: 'maintenance.complete', visible: (h) => ['open', 'assigned', 'in_progress'].includes(h.status), confirm: 'Les pièces sont sorties du stock, le coût calculé, la machine remise en marche et l’arrêt clôturé.', run: (h) => maintenanceApi.completeWorkOrder(h.id) },
      cancelAction('maintenance_work_order', 'maintenance.write'),
    ],
    top: (h) => (h.breakdown && h.status !== 'completed' ? <Banner tone="critical">Panne en cours : l’équipement est à l’arrêt et la production est impactée.</Banner> : null),
    extra: (h) => <PartsPanel wo={h} />,
  }
  return <DocumentDetail config={config} />
}

/* ───────── calendar ───────── */
export function MaintenanceCalendarPage() {
  const href = useOrgPath()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const wos = workOrderHooks.useList()
  const plans = planHooks.useList()
  const assets = useAssetIndex()
  const days = eachDayOfInterval({ start: startOfWeek(month, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) })
  const events = useMemo(() => {
    const m = new Map<string, { id: string; label: string; href: string; tone: 'critical' | 'info' | 'warning' }[]>()
    const add = (day: string, e: { id: string; label: string; href: string; tone: 'critical' | 'info' | 'warning' }) => m.set(day, [...(m.get(day) ?? []), e])
    for (const w of wos.data ?? []) if (w.scheduled_for && w.status !== 'cancelled') add(w.scheduled_for, { id: w.id, label: `${w.number ?? ''} ${assets.get(w.asset_id)?.name ?? ''}`, href: `maintenance/ordres/${w.id}`, tone: w.breakdown ? 'critical' : 'info' })
    for (const p of plans.data ?? []) if (p.next_due_date && p.active) add(p.next_due_date, { id: `p-${p.id}`, label: `Échéance : ${p.name}`, href: `maintenance/equipements/${p.asset_id}`, tone: 'warning' })
    return m
  }, [wos.data, plans.data, assets])
  const tone = { critical: 'bg-red-100 text-red-900', info: 'bg-sky-100 text-sky-900', warning: 'bg-amber-100 text-amber-900' } as const
  return (
    <PageShell title="Calendrier de maintenance" icon={CalendarDays} description="Interventions planifiées et échéances de plans préventifs."
      actions={<><Button variant="secondary" onClick={() => setMonth(addMonths(month, -1))}>‹</Button><span className="px-2 text-sm font-medium capitalize">{format(month, 'MMMM yyyy', { locale: fr })}</span><Button variant="secondary" onClick={() => setMonth(addMonths(month, 1))}>›</Button></>}>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border text-[12px]">
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => <div key={d} className="bg-muted px-2 py-1.5 font-medium">{d}</div>)}
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd')
          return (
            <div key={key} className={`min-h-24 bg-card p-1.5 ${isSameMonth(d, month) ? '' : 'opacity-40'}`}>
              <div className="mb-1 text-muted-foreground">{format(d, 'd')}</div>
              <div className="space-y-1">{(events.get(key) ?? []).slice(0, 4).map((e) => <Link key={e.id} href={href(e.href)} className={`block truncate rounded px-1 py-0.5 ${tone[e.tone]}`}>{e.label}</Link>)}</div>
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}

/* ───────── KPIs ───────── */
export function MaintenanceKpisPage() {
  const reliability = useReliability()
  const wos = workOrderHooks.useList()
  const today = new Date().toISOString().slice(0, 10)
  const preventive = (wos.data ?? []).filter((w) => w.kind === 'preventive' && w.scheduled_for && w.scheduled_for <= today && w.status !== 'cancelled')
  const compliance = preventiveCompliance(preventive.map((w) => ({ dueDate: w.scheduled_for!, completedOn: w.completed_at ? w.completed_at.slice(0, 10) : null })))
  const rows = reliability.data ?? []
  const cost = rows.reduce((a, r) => a + r.maintenance_cost, 0)
  const downtime = rows.reduce((a, r) => a + r.downtime_minutes, 0)
  const columns: DataTableColumn<(typeof rows)[number] & { id: string }>[] = [
    { key: 'asset', label: 'Équipement', value: (r) => `${r.code} — ${r.name}` },
    { key: 'fail', label: 'Pannes', align: 'right', value: (r) => r.failures },
    { key: 'down', label: 'Arrêt (min)', align: 'right', value: (r) => r.downtime_minutes },
    { key: 'mtbf', label: 'MTBF (h)', align: 'right', value: (r) => r.mtbf_hours ?? '—' },
    { key: 'mttr', label: 'MTTR (min)', align: 'right', value: (r) => r.mttr_minutes ?? '—' },
    { key: 'avail', label: 'Disponibilité', align: 'right', value: (r) => { const a = inherentAvailability(r.mtbf_hours, r.mttr_minutes === null ? null : r.mttr_minutes / 60); return a === null ? '—' : `${a} %` } },
    { key: 'cost', label: 'Coût maintenance', align: 'right', value: (r) => formatMoney(r.maintenance_cost) },
  ]
  return (
    <PageShell title="Indicateurs de maintenance" icon={Gauge} description="MTBF, MTTR, disponibilité, conformité du préventif, coûts et arrêts." error={reliability.error?.message}>
      <StatStrip period="Cumul" stats={[
        { label: 'Conformité préventif', value: `${compliance} %`, hint: `${preventive.length} ordres dus` },
        { label: 'Arrêts pour panne', value: `${Math.round(downtime / 60)} h` },
        { label: 'Coût de maintenance', value: formatMoney(cost) },
        { label: 'Ordres ouverts', value: String((wos.data ?? []).filter((w) => ['open', 'assigned', 'in_progress'].includes(w.status)).length) },
      ]} />
      <Panel title="Arrêts par équipement (minutes)">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.filter((r) => r.downtime_minutes > 0).map((r) => ({ name: r.code, minutes: r.downtime_minutes }))} margin={{ left: -8 }}>
              <CartesianGrid vertical={false} stroke="#ebebeb" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b6b6b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: '#6b6b6b' }} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="minutes" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-[13px]">
          <thead className="bg-muted"><tr>{columns.map((c) => <th key={c.key} className={`px-3 py-2 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.asset_id} className="border-t">{columns.map((c) => <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.value({ ...r, id: r.asset_id })}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </PageShell>
  )
}
