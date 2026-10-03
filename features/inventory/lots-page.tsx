'use client'

import { Layers } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DataTableColumn } from '@/components/data-table'
import { Button } from '@xco-agency/corex-ui'
import { formatDate } from '@/lib/format'
import { EntityPage } from '../_core/entity-page'
import { Status } from '../_core/status'
import { itemPicker } from '../items/hooks'
import { useOrgPath } from '../organization/context'
import { partnerPicker } from '../partners/hooks'
import { lotHooks } from './hooks'
import { LOT_STATUS_OPTIONS, SERIAL_STATUS_OPTIONS, type Lot, type Serial } from './types'
import { serialHooks } from './hooks'

const daysTo = (iso: string | null) => (iso ? Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000) : null)

/** Lots / batches with expiry dates, status (available, quarantine, blocked) and links to traceability and the ledger. */
export function LotsPage() {
  const href = useOrgPath()
  const router = useRouter()
  const columns: DataTableColumn<Lot>[] = [
    { key: 'lot', label: 'Lot', value: (l) => l.lot_number },
    { key: 'item', label: 'Article', value: (l) => (l.items ? `${l.items.sku} — ${l.items.name}` : l.item_id) },
    { key: 'received', label: 'Reçu le', value: (l) => formatDate(l.received_on) },
    {
      key: 'expires', label: 'Péremption', value: (l) => l.expires_on ?? '—',
      render: (l) => {
        const d = daysTo(l.expires_on)
        return <span className={d !== null && d < 0 ? 'font-medium text-red-700' : d !== null && d <= 30 ? 'font-medium text-amber-700' : ''}>{formatDate(l.expires_on)}{d !== null && d >= 0 && d <= 30 ? ` (${d} j)` : ''}</span>
      },
    },
    { key: 'status', label: 'Statut', value: (l) => l.status, render: (l) => <Status value={l.status} /> },
    {
      key: 'actions', label: '', value: () => '',
      render: (l) => (
        <span onClick={(e) => e.stopPropagation()} className="flex gap-1">
          <Button variant="tertiary" onClick={() => router.push(`${href('qualite/tracabilite')}?lot=${l.id}`)}>Traçabilité</Button>
          <Link href={`${href('inventaire/mouvements')}?lot=${l.id}`}><Button variant="tertiary">Mouvements</Button></Link>
        </span>
      ),
    },
  ]
  return (
    <EntityPage<Lot>
      title="Lots"
      singular="lot"
      icon={Layers}
      description="Les lots sont créés à la réception et à la production. Un lot bloqué ne peut plus être expédié ni consommé."
      hooks={lotHooks}
      permission="warehouse.receive"
      columns={columns}
      filter={{ label: 'Statut', options: LOT_STATUS_OPTIONS, getValue: (l) => l.status }}
      fields={[
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'lot_number', label: 'Numéro de lot', required: true, lockedOnEdit: true },
        { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker },
        { key: 'supplier_lot', label: 'Lot du fournisseur' },
        { key: 'manufactured_on', label: 'Date de fabrication', type: 'date' },
        { key: 'expires_on', label: 'Date de péremption', type: 'date' },
        { key: 'status', label: 'Statut', type: 'select', options: LOT_STATUS_OPTIONS, required: true, default: 'available' },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      exportName="lots"
    />
  )
}

/** Serial numbers: one row per unit, with status and location. */
export function SerialsPage() {
  const columns: DataTableColumn<Serial>[] = [
    { key: 'serial', label: 'N° de série', value: (s) => s.serial_number },
    { key: 'item', label: 'Article', value: (s) => (s.items ? `${s.items.sku} — ${s.items.name}` : s.item_id) },
    { key: 'status', label: 'Statut', value: (s) => s.status, render: (s) => <Status value={s.status} /> },
    { key: 'source', label: 'Origine', value: (s) => s.source_type ?? '—' },
  ]
  return (
    <EntityPage<Serial>
      title="Numéros de série"
      singular="numéro de série"
      icon={Layers}
      description="Chaque unité sérialisée est suivie de la réception à la livraison (statut, entrepôt, emplacement)."
      hooks={serialHooks}
      permission="warehouse.receive"
      columns={columns}
      filter={{ label: 'Statut', options: SERIAL_STATUS_OPTIONS, getValue: (s) => s.status }}
      fields={[
        { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'serial_number', label: 'Numéro de série', required: true, lockedOnEdit: true },
        { key: 'status', label: 'Statut', type: 'select', options: SERIAL_STATUS_OPTIONS, required: true, default: 'in_stock' },
      ]}
      exportName="series"
    />
  )
}
