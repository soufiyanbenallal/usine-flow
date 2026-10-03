'use client'

import { Bookmark } from 'lucide-react'
import { Button } from '@xco-agency/corex-ui'
import type { DataTableColumn } from '@/components/data-table'
import { DataTable } from '@/components/data-table'
import { PageShell } from '@/components/page-shell'
import { formatDate, formatQty } from '@/lib/format'
import { Status } from '../_core/status'
import { useRpcMutation } from '../_core/crud-hooks'
import { useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { reservationHooks } from './hooks'
import { inventoryApi } from './service'
import type { Reservation } from './types'

const SOURCES: Record<string, string> = { sales_order: 'Commande client', production_order: 'Ordre de fabrication' }

/** Stock reservations (sales orders, production orders). Releasing frees the quantity immediately. */
export function ReservationsPage() {
  const list = reservationHooks.useList()
  const org = useOrganization()
  const can = useCan('warehouse.manage')
  const release = useRpcMutation((r: Reservation) => inventoryApi.release(org.id, r.source_type, r.source_id), ['reservations', 'stock'])
  const columns: DataTableColumn<Reservation>[] = [
    { key: 'item', label: 'Article', value: (r) => (r.items ? `${r.items.sku} — ${r.items.name}` : r.item_id) },
    { key: 'wh', label: 'Entrepôt', value: (r) => r.warehouses?.code ?? '—' },
    { key: 'qty', label: 'Quantité', align: 'right', value: (r) => r.quantity, render: (r) => formatQty(r.quantity) },
    { key: 'source', label: 'Pour', value: (r) => SOURCES[r.source_type] ?? r.source_type },
    { key: 'status', label: 'Statut', value: (r) => r.status, render: (r) => <Status value={r.status === 'active' ? 'open' : r.status === 'fulfilled' ? 'done' : 'cancelled'} /> },
    { key: 'created', label: 'Créée le', value: (r) => formatDate(r.created_at.slice(0, 10)) },
    {
      key: 'actions', label: '', value: () => '',
      render: (r) => (r.status === 'active' && can ? <Button variant="tertiary" tone="critical" loading={release.isPending} onClick={(e: unknown) => { (e as { stopPropagation?: () => void })?.stopPropagation?.(); release.mutate(r) }}>Libérer</Button> : null),
    },
  ]
  return (
    <PageShell title="Réservations" icon={Bookmark} description="Quantités réservées pour des commandes ou des ordres de fabrication." error={list.error?.message ?? release.error?.message}>
      <DataTable<Reservation> title="Réservations" singular="réservation" columns={columns} rows={list.data ?? []} loading={list.isPending} filter={{ label: 'Statut', options: [{ value: 'active', label: 'Actives' }, { value: 'fulfilled', label: 'Honorées' }, { value: 'released', label: 'Libérées' }], getValue: (r) => r.status }} />
    </PageShell>
  )
}
