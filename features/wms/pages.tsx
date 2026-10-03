'use client'

import { Banner, Button, Checkbox, Modal, Select, TextField } from '@xco-agency/corex-ui'
import { ClipboardCheck, ClipboardList, Layers, PackageCheck, PackageOpen, Printer, RotateCcw, ScanLine, Smartphone, Truck, Waves } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { BarcodeScanner } from '@/components/barcode-scanner'
import type { DataTableColumn } from '@/components/data-table'
import { LabelSheet, type LabelData } from '@/components/label-sheet'
import { PageShell, Panel } from '@/components/page-shell'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { StatStrip } from '@/components/stat-strip'
import { formatDate, formatQty } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { ChildTable } from '../_core/child-table'
import { useInvalidateFeatures } from '../_core/crud-hooks'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { RecordEditor } from '../_core/record-editor'
import { Status } from '../_core/status'
import { EntityHistory } from '../audit/entity-history'
import { itemPicker, useItemIndex } from '../items/hooks'
import { lotHooks } from '../inventory/hooks'
import { useOrgPath, useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { usePartnerIndex } from '../partners/hooks'
import { orderHooks as purchaseOrderHooks } from '../procurement/hooks'
import { deliveryHooks, orderHooks as salesOrderHooks } from '../sales/hooks'
import { DELIVERY_STAGES } from '../sales/types'
import { salesApi } from '../sales/service'
import { locationHooks, useLocationIndex, useLocationOptions, useWarehouseOptions, warehouseHooks } from '../warehouses/hooks'
import {
  packageHooks, packageLineHooks, pickLineHooks, pickListHooks, taskHooks, useCompleteTask, useCreateDeliveryFromPick, useCreatePickList, useCreateWave, useStartTask, waveHooks,
} from './hooks'
import { useRunOrQueue } from '../offline/hooks'
import { wmsApi, type ScanHit } from './service'
import {
  PACKAGE_KINDS, PICK_STATUS, PRIORITIES, TASK_STATUS, TASK_TYPES,
  type Package, type PackageLine, type PickListLine, type PickWave, type WarehouseTask,
} from './types'

const typeLabel = (v: string) => TASK_TYPES.find((t) => t.value === v)?.label ?? v
const priorityTone = (p: number) => (p <= 1 ? 'critical' : p === 2 ? 'warning' : 'neutral') as 'critical' | 'warning' | 'neutral'

/* ───────── tasks ───────── */
function TaskActions({ task }: { task: WarehouseTask; compact?: boolean }) {
  const can = useCan('warehouse.pick')
  const start = useStartTask()
  const done = useCompleteTask()
  const locations = useLocationOptions(task.warehouse_id)
  const [open, setOpen] = useState(false)
  const [dest, setDest] = useState(task.to_location_id ?? '')
  const needsDest = ['putaway', 'move', 'replenish'].includes(task.task_type)
  if (!can || task.status === 'done' || task.status === 'cancelled') return null
  const finish = () => (needsDest ? setOpen(true) : done.mutate({ id: task.id }))
  return (
    <span className="inline-flex gap-1.5" onClick={(e) => e.stopPropagation()}>
      {task.status === 'open' && <Button variant="secondary" loading={start.isPending} onClick={() => start.mutate(task.id)}>Démarrer</Button>}
      <Button variant="primary" loading={done.isPending} onClick={finish}>Terminer</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Emplacement de destination" primaryAction={{ content: 'Valider', loading: done.isPending, disabled: !dest, onAction: () => done.mutate({ id: task.id, to: dest }, { onSuccess: () => setOpen(false) }) }} secondaryActions={[{ content: 'Annuler', onAction: () => setOpen(false) }]}>
        <div className="space-y-3 p-4">
          {done.error && <Banner tone="critical">{done.error.message}</Banner>}
          <Select label="Destination" value={dest} options={[{ value: '', label: 'Choisir…' }, ...locations]} onChange={setDest} />
        </div>
      </Modal>
    </span>
  )
}

export function TasksPage() {
  const items = useItemIndex()
  const locations = useLocationIndex()
  const columns: DataTableColumn<WarehouseTask>[] = [
    { key: 'type', label: 'Type', value: (t) => typeLabel(t.task_type) },
    { key: 'prio', label: 'Priorité', value: (t) => t.priority, render: (t) => <Pill tone={priorityTone(t.priority)}>{t.priority}</Pill> },
    { key: 'item', label: 'Article', value: (t) => (t.item_id ? (items.get(t.item_id)?.name ?? t.item_id) : '—') },
    { key: 'qty', label: 'Quantité', align: 'right', value: (t) => (t.quantity ? formatQty(t.quantity) : '—') },
    { key: 'from', label: 'De', value: (t) => (t.from_location_id ? (locations.get(t.from_location_id)?.code ?? '—') : '—') },
    { key: 'to', label: 'Vers', value: (t) => (t.to_location_id ? (locations.get(t.to_location_id)?.code ?? '—') : '—') },
    { key: 'due', label: 'Échéance', value: (t) => formatDate(t.due_at) },
    { key: 'status', label: 'Statut', value: (t) => t.status, render: (t) => <Status value={t.status} /> },
    { key: 'actions', label: '', value: () => '', render: (t) => <TaskActions task={t} /> },
  ]
  return (
    <EntityPage<WarehouseTask>
      title="Tâches d’entrepôt" singular="tâche" icon={ClipboardCheck} description="Rangement, préparation, réapprovisionnement et mouvements internes. Terminer une tâche de rangement transfère le stock vers l’emplacement choisi." hooks={taskHooks} permission="warehouse.manage" columns={columns}
      filter={{ label: 'Statut', options: TASK_STATUS, getValue: (t) => t.status }} exportName="taches-entrepot"
      fields={[
        { key: 'warehouse_id', label: 'Entrepôt', type: 'relation', useOptions: useWarehouseOptions, required: true },
        { key: 'task_type', label: 'Type', type: 'select', options: TASK_TYPES, required: true, default: 'putaway' },
        { key: 'priority', label: 'Priorité', type: 'select', options: PRIORITIES, default: '3' },
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker },
        { key: 'quantity', label: 'Quantité', type: 'number', min: 0 },
        { key: 'from_location_id', label: 'Emplacement source', type: 'relation', useOptions: () => useLocationOptions(), clearable: true },
        { key: 'to_location_id', label: 'Emplacement destination', type: 'relation', useOptions: () => useLocationOptions(), clearable: true },
        { key: 'due_at', label: 'Échéance', type: 'datetime' },
        { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
      ]} />
  )
}

/* ───────── operator workspace (mobile-first) ───────── */
export function OperatorPage() {
  const href = useOrgPath()
  const t = useT()
  const tasks = taskHooks.useList()
  const picks = pickListHooks.useList()
  const items = useItemIndex()
  const locations = useLocationIndex()
  const open = (tasks.data ?? []).filter((x) => x.status === 'open' || x.status === 'in_progress').sort((a, b) => a.priority - b.priority)
  const toPick = (picks.data ?? []).filter((p) => p.status === 'open' || p.status === 'picking')
  const tiles = [
    { path: 'entrepot/scanner', label: 'Scanner', icon: ScanLine }, { path: 'entrepot/preparation', label: 'Préparation', icon: PackageCheck },
    { path: 'entrepot/reception', label: 'Réception', icon: PackageOpen }, { path: 'entrepot/taches', label: 'Tâches', icon: ClipboardCheck },
  ]
  return (
    <PageShell title="Espace opérateur" icon={Smartphone} description="Vue simplifiée pour terminal mobile : mes tâches et mes préparations en cours.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((x) => (
          <Link key={x.path} href={href(x.path)} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-card p-4 text-center shadow-xs active:bg-secondary">
            <x.icon className="size-7" /><span className="text-sm font-medium">{t(x.label)}</span>
          </Link>
        ))}
      </div>
      <Panel title={`${t('Tâches à faire')} (${open.length})`}>
        <ul className="space-y-2">
          {open.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <Pill tone={priorityTone(x.priority)}>P{x.priority}</Pill>
              <div className="min-w-0 flex-1 text-[13px]">
                <div className="font-medium">{typeLabel(x.task_type)}{x.item_id ? ` — ${items.get(x.item_id)?.name ?? ''}` : ''}</div>
                <div className="text-muted-foreground">{x.quantity ? `${formatQty(x.quantity)} · ` : ''}{x.from_location_id ? locations.get(x.from_location_id)?.code : ''}{x.to_location_id ? ` → ${locations.get(x.to_location_id)?.code}` : ''}</div>
              </div>
              <TaskActions task={x} compact />
            </li>
          ))}
        </ul>
        {open.length === 0 && <p className="text-[13px] text-muted-foreground">{t('Aucune tâche en attente.')}</p>}
      </Panel>
      <Panel title={`${t('Préparations en cours')} (${toPick.length})`}>
        <ul className="divide-y text-[13px]">
          {toPick.map((p) => (
            <li key={p.id} className="flex items-center gap-3 py-2"><Link className="font-medium underline" href={href(`entrepot/preparation/${p.id}`)}>{p.number}</Link><Status value={p.status} /></li>
          ))}
        </ul>
      </Panel>
    </PageShell>
  )
}

/* ───────── reception ───────── */
export function ReceptionPage() {
  const href = useOrgPath()
  const suppliers = usePartnerIndex()
  const orders = purchaseOrderHooks.useList()
  const pending = (orders.data ?? []).filter((o) => ['ordered', 'partially_received', 'approved'].includes(o.status))
  const putaway = (taskHooks.useList().data ?? []).filter((x) => x.task_type === 'putaway' && x.status !== 'done' && x.status !== 'cancelled')
  return (
    <PageShell title="Réception" icon={PackageOpen} description="Commandes fournisseurs à recevoir, rangement en attente. La réception crée les lots, la quarantaine et l’inspection qualité si nécessaire."
      actions={<Link href={href('achats/receptions')}><Button variant="primary">Bons de réception</Button></Link>}>
      <StatStrip period="Aujourd’hui" stats={[{ label: 'Commandes à recevoir', value: String(pending.length) }, { label: 'Rangements en attente', value: String(putaway.length) }]} />
      <Panel title="Commandes fournisseurs attendues">
        <ul className="divide-y text-[13px]">
          {pending.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
              <Link className="font-medium underline" href={href(`achats/commandes/${o.id}`)}>{o.number}</Link><span>{suppliers.get(o.supplier_id)?.name}</span><Status value={o.status} />
              <span className="ml-auto text-muted-foreground">Attendue le {formatDate(o.expected_date)}</span>
            </li>
          ))}
        </ul>
        {pending.length === 0 && <p className="text-[13px] text-muted-foreground">Aucune commande en attente de réception.</p>}
      </Panel>
      <Panel title="Rangement en attente">
        <ul className="space-y-2">{putaway.map((x) => <li key={x.id} className="flex items-center gap-3 text-[13px]"><span>{typeLabel(x.task_type)}</span><span className="text-muted-foreground">{x.quantity ? formatQty(x.quantity) : ''}</span><span className="ml-auto"><TaskActions task={x} /></span></li>)}</ul>
        {putaway.length === 0 && <p className="text-[13px] text-muted-foreground">Rien à ranger.</p>}
      </Panel>
    </PageShell>
  )
}

/* ───────── pick lists ───────── */
function NewPickListDialog({ open, onClose, wave }: { open: boolean; onClose: () => void; wave?: string }) {
  const router = useRouter()
  const href = useOrgPath()
  const orders = salesOrderHooks.useList()
  const customers = usePartnerIndex()
  const create = useCreatePickList()
  const [so, setSo] = useState('')
  const eligible = (orders.data ?? []).filter((o) => o.status === 'confirmed' || o.status === 'partially_delivered')
  return (
    <Modal open={open} onClose={onClose} title="Créer une liste de préparation" primaryAction={{ content: 'Créer', disabled: !so, loading: create.isPending, onAction: () => create.mutate({ so, wave }, { onSuccess: (id) => { onClose(); router.push(href(`entrepot/preparation/${id}`)) } }) }} secondaryActions={[{ content: 'Annuler', onAction: onClose }]}>
      <div className="space-y-3 p-4">
        {create.error && <Banner tone="critical">{create.error.message}</Banner>}
        <Banner tone="info">Le stock disponible est alloué automatiquement (FEFO / emplacement) pour chaque ligne de la commande.</Banner>
        <Select label="Commande client confirmée" value={so} options={[{ value: '', label: 'Choisir…' }, ...eligible.map((o) => ({ value: o.id, label: `${o.number} — ${customers.get(o.customer_id)?.name ?? ''}` }))]} onChange={setSo} />
      </div>
    </Modal>
  )
}

export function PickListsPage() {
  const href = useOrgPath()
  const router = useRouter()
  const can = useCan('warehouse.pick')
  const orders = salesOrderHooks.useList()
  const list = pickListHooks.useList()
  const [dialog, setDialog] = useState(false)
  const [tab, setTab] = useState<'todo' | 'all'>('todo')
  const soIndex = useMemo(() => new Map((orders.data ?? []).map((o) => [o.id, o])), [orders.data])
  const rows = (list.data ?? []).filter((p) => tab === 'all' || p.status === 'open' || p.status === 'picking' || p.status === 'picked')
  return (
    <PageShell title="Préparation de commandes" icon={ClipboardList} description="Listes de picking générées depuis les commandes confirmées, avec allocation FEFO."
      actions={can && <Button variant="primary" onClick={() => setDialog(true)}>Nouvelle liste</Button>}>
      <SegmentedTabs tabs={[{ id: 'todo', label: 'À traiter' }, { id: 'all', label: 'Toutes' }]} value={tab} onChange={setTab} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((p) => (
          <button key={p.id} type="button" onClick={() => router.push(href(`entrepot/preparation/${p.id}`))} className="rounded-xl border bg-card p-4 text-left shadow-xs hover:border-foreground/30">
            <div className="flex items-center justify-between"><span className="font-semibold">{p.number}</span><Status value={p.status} /></div>
            <div className="mt-1 text-[13px] text-muted-foreground">{p.so_id ? `Commande ${soIndex.get(p.so_id)?.number ?? ''}` : 'Sans commande'}</div>
          </button>
        ))}
      </div>
      {rows.length === 0 && <p className="text-[13px] text-muted-foreground">Aucune liste de préparation.</p>}
      <NewPickListDialog open={dialog} onClose={() => setDialog(false)} />
    </PageShell>
  )
}

function PickLineRow({ line, editable }: { line: PickListLine; editable: boolean }) {
  const items = useItemIndex()
  const locations = useLocationIndex()
  const runOrQueue = useRunOrQueue()
  const invalidate = useInvalidateFeatures()
  const [qty, setQty] = useState(String(line.qty_picked || line.qty_required))
  const [queued, setQueued] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const submit = async () => {
    const q = Number(qty)
    const outcome = await runOrQueue({ type: 'pick_confirm', payload: { line: line.id, qty: q }, label: `${items.get(line.item_id)?.name ?? ''} × ${q}` }, () => wmsApi.confirmPick(line.id, q))
    setError(null)
    setQueued(outcome === 'queued')
    if (outcome === 'done') await invalidate('pick_list_lines', 'pick_lists', 'warehouse_tasks')
  }
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-[13px]">
      <div className="min-w-0 flex-1">
        <div className="font-medium">{items.get(line.item_id)?.name ?? line.item_id}</div>
        <div className="text-muted-foreground">{line.location_id ? locations.get(line.location_id)?.code : 'Sans emplacement'} · à préparer {formatQty(line.qty_required)}</div>
        {error && <div className="text-red-700">{error}</div>}
        {queued && <div className="text-amber-700">Enregistré hors ligne — synchronisation automatique.</div>}
      </div>
      <Status value={line.status} />
      {editable && (
        <div className="flex items-end gap-2">
          <div className="w-28"><TextField label="Préparé" value={qty} onChange={setQty} /></div>
          <Button variant="primary" onClick={() => void submit().catch((e: Error) => setError(e.message))}>Confirmer</Button>
        </div>
      )}
    </li>
  )
}

export function PickListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const href = useOrgPath()
  const can = useCan('warehouse.pick')
  const canDispatch = useCan('warehouse.dispatch')
  const one = pickListHooks.useOne(id)
  const lines = pickLineHooks.useListBy('pick_list_id', id)
  const toDelivery = useCreateDeliveryFromPick()
  const p = one.data
  const total = (lines.data ?? []).reduce((s, l) => s + l.qty_required, 0)
  const picked = (lines.data ?? []).reduce((s, l) => s + l.qty_picked, 0)
  return (
    <PageShell title={p ? `Préparation ${p.number}` : 'Préparation'} icon={ClipboardList} error={one.error?.message}
      actions={<>
        <Link href={href('entrepot/preparation')}><Button variant="secondary">Retour</Button></Link>
        {p && canDispatch && (p.status === 'picked' || p.status === 'packed') && (
          p.delivery_id
            ? <Link href={href(`ventes/livraisons/${p.delivery_id}`)}><Button variant="primary">Voir la livraison</Button></Link>
            : <Button variant="primary" loading={toDelivery.isPending} onClick={() => toDelivery.mutate(p.id, { onSuccess: (did) => router.push(href(`ventes/livraisons/${did}`)) })}>Créer la livraison</Button>
        )}
      </>}>
      {p && (
        <>
          {toDelivery.error && <Banner tone="critical">{toDelivery.error.message}</Banner>}
          <StatStrip period="Préparation" stats={[{ label: 'Statut', value: PICK_STATUS.find((s) => s.value === p.status)?.label ?? p.status }, { label: 'Quantité préparée', value: `${formatQty(picked)} / ${formatQty(total)}` }, { label: 'Lignes', value: String((lines.data ?? []).length) }]} />
          <ul className="space-y-2">{(lines.data ?? []).map((l) => <PickLineRow key={l.id} line={l} editable={can && (p.status === 'open' || p.status === 'picking')} />)}</ul>
          <EntityHistory entity="pick_lists" entityId={p.id} />
        </>
      )}
    </PageShell>
  )
}

/* ───────── waves ───────── */
export function WavesPage() {
  const warehouses = useWarehouseOptions()
  const lists = pickListHooks.useList()
  const createWave = useCreateWave()
  const can = useCan('warehouse.manage')
  const [open, setOpen] = useState(false)
  const [warehouse, setWarehouse] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const candidates = (lists.data ?? []).filter((p) => p.status === 'open' && !p.wave_id && (!warehouse || p.warehouse_id === warehouse))
  const columns: DataTableColumn<PickWave>[] = [
    { key: 'number', label: 'N°', value: (w) => w.number ?? '—' },
    { key: 'wh', label: 'Entrepôt', value: (w) => warehouses.find((x) => x.value === w.warehouse_id)?.label ?? '—' },
    { key: 'count', label: 'Listes', align: 'right', value: (w) => (lists.data ?? []).filter((p) => p.wave_id === w.id).length },
    { key: 'status', label: 'Statut', value: (w) => w.status, render: (w) => <Status value={w.status} /> },
  ]
  return (
    <>
      <EntityPage<PickWave> title="Vagues de préparation" singular="vague" icon={Waves} description="Regroupez plusieurs listes de picking pour les préparer en une seule tournée." hooks={waveHooks} permission="warehouse.manage" columns={columns}
        actions={can && <Button variant="primary" onClick={() => setOpen(true)}>Créer une vague</Button>}
        fields={[{ key: 'status', label: 'Statut', type: 'select', options: [{ value: 'open', label: 'Ouverte' }, { value: 'picking', label: 'En préparation' }, { value: 'done', label: 'Terminée' }, { value: 'cancelled', label: 'Annulée' }], default: 'open' }, { key: 'notes', label: 'Notes', type: 'textarea', wide: true }]}
        canDelete={false} />
      <Modal open={open} onClose={() => setOpen(false)} title="Nouvelle vague" primaryAction={{ content: 'Créer', loading: createWave.isPending, disabled: !warehouse || selected.length === 0, onAction: () => createWave.mutate({ warehouse, lists: selected }, { onSuccess: () => { setOpen(false); setSelected([]) } }) }} secondaryActions={[{ content: 'Annuler', onAction: () => setOpen(false) }]}>
        <div className="space-y-3 p-4">
          {createWave.error && <Banner tone="critical">{createWave.error.message}</Banner>}
          <Select label="Entrepôt" value={warehouse} options={[{ value: '', label: 'Choisir…' }, ...warehouses]} onChange={(v) => { setWarehouse(v); setSelected([]) }} />
          <div className="space-y-1.5">
            {candidates.map((p) => <Checkbox key={p.id} label={`${p.number}`} checked={selected.includes(p.id)} onChange={(c) => setSelected(c ? [...selected, p.id] : selected.filter((x) => x !== p.id))} />)}
            {warehouse && candidates.length === 0 && <p className="text-[13px] text-muted-foreground">Aucune liste ouverte sans vague pour cet entrepôt.</p>}
          </div>
        </div>
      </Modal>
    </>
  )
}

/* ───────── packing ───────── */
const PACKAGE_FIELDS = [
  { key: 'package_no', label: 'N° de colis', required: true, lockedOnEdit: true },
  { key: 'kind', label: 'Type', type: 'select' as const, options: PACKAGE_KINDS, required: true, default: 'carton' },
  { key: 'delivery_id', label: 'Livraison', type: 'relation' as const, useOptions: () => useDeliveryOptions(), clearable: true },
  { key: 'weight', label: 'Poids (kg)', type: 'number' as const, min: 0 },
  { key: 'length', label: 'Longueur (cm)', type: 'number' as const, min: 0 },
  { key: 'width', label: 'Largeur (cm)', type: 'number' as const, min: 0 },
  { key: 'height', label: 'Hauteur (cm)', type: 'number' as const, min: 0 },
  { key: 'status', label: 'Statut', type: 'select' as const, options: [{ value: 'open', label: 'Ouvert' }, { value: 'closed', label: 'Fermé' }, { value: 'loaded', label: 'Chargé' }], required: true, default: 'open' },
]
function useDeliveryOptions() {
  const { data } = deliveryHooks.useList()
  return useMemo(() => (data ?? []).filter((d) => d.status === 'draft').map((d) => ({ value: d.id, label: d.number ?? d.id })), [data])
}

export function PackingPage() {
  const columns: DataTableColumn<Package>[] = [
    { key: 'no', label: 'Colis', value: (p) => p.package_no },
    { key: 'kind', label: 'Type', value: (p) => PACKAGE_KINDS.find((k) => k.value === p.kind)?.label ?? p.kind },
    { key: 'weight', label: 'Poids', align: 'right', value: (p) => (p.weight ? `${p.weight} kg` : '—') },
    { key: 'status', label: 'Statut', value: (p) => p.status, render: (p) => <Pill tone={p.status === 'loaded' ? 'success' : p.status === 'closed' ? 'info' : 'neutral'}>{p.status === 'loaded' ? 'Chargé' : p.status === 'closed' ? 'Fermé' : 'Ouvert'}</Pill> },
  ]
  return (
    <EntityPage<Package> title="Colisage" singular="colis" icon={Layers} description="Cartons et palettes d’une livraison : contenu, poids et dimensions." hooks={packageHooks} permission="warehouse.pick" columns={columns} fields={PACKAGE_FIELDS}
      detailPath={(p) => `entrepot/colisage/${p.id}`} afterCreatePath={(p) => `entrepot/colisage/${p.id}`} exportName="colis" />
  )
}

export function PackageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const can = useCan('warehouse.pick')
  const items = useItemIndex()
  const one = packageHooks.useOne(id)
  const p = one.data
  return (
    <PageShell title={p ? `Colis ${p.package_no}` : 'Colis'} icon={Layers} error={one.error?.message} actions={<Link href={href('entrepot/colisage')}><Button variant="secondary">Colisage</Button></Link>}>
      {p && (
        <>
          <RecordEditor<Package> title="Colis" hooks={packageHooks} row={p} fields={PACKAGE_FIELDS} permission="warehouse.pick" />
          <ChildTable<PackageLine>
            title="Contenu" singular="ligne" hooks={packageLineHooks} fk="package_id" parentId={p.id} canEdit={can}
            fields={[{ key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true }, { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, required: true }]}
            columns={[{ key: 'item', label: 'Article', value: (l) => items.get(l.item_id)?.name ?? l.item_id }, { key: 'qty', label: 'Quantité', align: 'right', value: (l) => formatQty(l.quantity) }]}
          />
        </>
      )}
    </PageShell>
  )
}

/* ───────── dispatch ───────── */
export function DispatchPage() {
  const href = useOrgPath()
  const customers = usePartnerIndex()
  const can = useCan('warehouse.dispatch')
  const invalidate = useInvalidateFeatures()
  const list = deliveryHooks.useList()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const drafts = (list.data ?? []).filter((d) => d.status === 'draft')
  const NEXT: Record<string, string | undefined> = { pending: 'picking', picking: 'packed', packed: 'loaded' }
  const advance = async (id: string, stage: string) => {
    setBusy(id); setError(null)
    try { await salesApi.setStage(id, stage); await invalidate('deliveries') } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') } finally { setBusy(null) }
  }
  return (
    <PageShell title="Expédition" icon={Truck} description="Livraisons en cours par étape. Le chargement précède la comptabilisation (qui sort le stock).">
      {error && <Banner tone="critical">{error}</Banner>}
      <div className="grid gap-4 xl:grid-cols-4">
        {DELIVERY_STAGES.filter((s) => s.value !== 'dispatched').map((stage) => (
          <Panel key={stage.value} title={stage.label}>
            <ul className="space-y-2">
              {drafts.filter((d) => d.stage === stage.value).map((d) => (
                <li key={d.id} className="rounded-lg border p-3 text-[13px]">
                  <Link href={href(`ventes/livraisons/${d.id}`)} className="font-medium underline">{d.number}</Link>
                  <div className="text-muted-foreground">{customers.get(d.customer_id)?.name}</div>
                  {can && NEXT[d.stage] && <div className="mt-2"><Button variant="secondary" loading={busy === d.id} onClick={() => advance(d.id, NEXT[d.stage]!)}>→ {DELIVERY_STAGES.find((s) => s.value === NEXT[d.stage])?.label}</Button></div>}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </PageShell>
  )
}

/* ───────── returns ───────── */
export function WmsReturnsPage() {
  const href = useOrgPath()
  return (
    <PageShell title="Retours" icon={RotateCcw} description="Retours clients (réintégration en stock, quarantaine ou rebut) et retours fournisseurs.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href={href('ventes/retours')} className="rounded-xl border bg-card p-4 shadow-xs hover:border-foreground/30"><div className="font-semibold">Retours clients</div><p className="mt-1 text-[13px] text-muted-foreground">Réception de marchandise retournée, état du produit, remise en stock ou quarantaine.</p></Link>
        <Link href={href('achats/retours')} className="rounded-xl border bg-card p-4 shadow-xs hover:border-foreground/30"><div className="font-semibold">Retours fournisseurs</div><p className="mt-1 text-[13px] text-muted-foreground">Renvoi de marchandise non conforme au fournisseur.</p></Link>
      </div>
    </PageShell>
  )
}

/* ───────── scanner ───────── */
export function ScannerPage() {
  const org = useOrganization()
  const href = useOrgPath()
  const router = useRouter()
  const t = useT()
  const [hits, setHits] = useState<(ScanHit | { kind: 'unknown'; code: string })[]>([])
  const [error, setError] = useState<string | null>(null)
  const onScan = async (code: string) => {
    setError(null)
    try {
      const hit = await wmsApi.resolveCode(org.id, code)
      setHits((h) => [hit ?? { kind: 'unknown' as const, code }, ...h].slice(0, 20))
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
  }
  const open = (h: ScanHit) => router.push(href(h.kind === 'item' ? `catalogue/articles/${h.id}` : h.kind === 'lot' ? `inventaire/lots` : `entrepot/emplacements`))
  return (
    <PageShell title="Scanner" icon={ScanLine} description="Scannez un article, un emplacement ou un lot (caméra, douchette ou saisie manuelle).">
      {error && <Banner tone="critical">{error}</Banner>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Lecture"><BarcodeScanner onScan={onScan} /></Panel>
        <Panel title="Résultats">
          <ul className="space-y-2">
            {hits.map((h, i) => h.kind === 'unknown'
              ? <li key={i} className="rounded-lg border border-dashed p-3 text-[13px] text-muted-foreground">{t('Code inconnu')} : <span className="font-mono">{h.code}</span></li>
              : <li key={i} className="flex items-center gap-3 rounded-lg border p-3 text-[13px]"><Pill tone="info">{h.kind === 'item' ? 'Article' : h.kind === 'lot' ? 'Lot' : 'Emplacement'}</Pill><div className="min-w-0 flex-1"><div className="font-medium">{h.label}</div><div className="text-muted-foreground">{h.hint}</div></div><Button variant="secondary" onClick={() => open(h)}>Ouvrir</Button></li>)}
          </ul>
          {hits.length === 0 && <p className="text-[13px] text-muted-foreground">Aucun code lu.</p>}
        </Panel>
      </div>
    </PageShell>
  )
}

/* ───────── labels ───────── */
export function LabelsPage() {
  const t = useT()
  const items = useItemIndex()
  const locations = locationHooks.useList()
  const lots = lotHooks.useList()
  const warehouses = warehouseHooks.useList()
  const [kind, setKind] = useState<'items' | 'locations' | 'lots'>('locations')
  const [symbology, setSymbology] = useState<'code128' | 'qr'>('code128')
  const [copies, setCopies] = useState('1')
  const [picked, setPicked] = useState<string[]>([])
  const wh = useMemo(() => new Map((warehouses.data ?? []).map((w) => [w.id, w.name])), [warehouses.data])
  const candidates: (LabelData & { id: string })[] = useMemo(() => {
    if (kind === 'items') return [...items.values()].map((i) => ({ id: i.id, code: i.sku, title: i.name, subtitle: i.sku }))
    if (kind === 'lots') return (lots.data ?? []).map((l) => ({ id: l.id, code: l.lot_number, title: items.get(l.item_id)?.name ?? l.lot_number, subtitle: `Lot ${l.lot_number}`, extra: l.expires_on ? `DLC ${formatDate(l.expires_on)}` : undefined }))
    return (locations.data ?? []).map((l) => ({ id: l.id, code: l.barcode ?? l.code, title: l.code, subtitle: wh.get(l.warehouse_id) }))
  }, [kind, items, lots.data, locations.data, wh])
  const n = Math.max(1, Math.min(100, Number(copies) || 1))
  const labels = candidates.filter((c) => picked.includes(c.id)).flatMap((c) => Array.from({ length: n }, () => c))
  return (
    <PageShell title="Étiquettes" icon={Printer} description="Générez des étiquettes Code 128 ou QR pour articles, emplacements et lots, puis imprimez."
      actions={<Button variant="primary" disabled={labels.length === 0} onClick={() => window.print()}>Imprimer ({labels.length})</Button>}>
      <div className="grid gap-3 sm:grid-cols-3 print:hidden">
        <Select label="Type" value={kind} options={[{ value: 'locations', label: t('Emplacements') }, { value: 'items', label: t('Articles') }, { value: 'lots', label: t('Lots') }]} onChange={(v) => { setKind(v as typeof kind); setPicked([]) }} />
        <Select label="Symbologie" value={symbology} options={[{ value: 'code128', label: 'Code 128' }, { value: 'qr', label: 'QR code' }]} onChange={(v) => setSymbology(v as typeof symbology)} />
        <TextField label="Exemplaires" value={copies} onChange={setCopies} />
      </div>
      <Panel title={`${t('Sélection')} (${picked.length}/${candidates.length})`}>
        <div className="mb-2 flex gap-2 print:hidden"><Button variant="secondary" onClick={() => setPicked(candidates.map((c) => c.id))}>Tout sélectionner</Button><Button variant="secondary" onClick={() => setPicked([])}>Aucun</Button></div>
        <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3 print:hidden">
          {candidates.map((c) => <Checkbox key={c.id} label={`${c.title}${c.subtitle ? ` · ${c.subtitle}` : ''}`} checked={picked.includes(c.id)} onChange={(v) => setPicked(v ? [...picked, c.id] : picked.filter((x) => x !== c.id))} />)}
        </div>
      </Panel>
      {labels.length > 0 && <Panel title="Aperçu"><LabelSheet labels={labels} symbology={symbology} /></Panel>}
    </PageShell>
  )
}

