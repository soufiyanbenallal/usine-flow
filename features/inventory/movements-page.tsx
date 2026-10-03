'use client'

import { History } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { PageShell } from '@/components/page-shell'
import { ServerTable, type ServerColumn, type ServerFilter } from '@/components/server-table'
import { formatDateTime, formatMoney, formatQty } from '@/lib/format'
import { Pill } from '../_core/pill'
import { MOVEMENT_LABELS } from './calculations'
import { movementHooks } from './hooks'
import { BUCKET_LABELS, bucketOptions, type Movement } from './types'

const columns: ServerColumn<Movement>[] = [
  { key: 'date', label: 'Date', sortKey: 'occurred_at', width: 160, render: (m) => formatDateTime(m.occurred_at) },
  { key: 'type', label: 'Type', sortKey: 'movement_type', width: 170, render: (m) => MOVEMENT_LABELS[m.movement_type] },
  { key: 'item', label: 'Article', width: 240, render: (m) => (m.items ? `${m.items.sku} — ${m.items.name}` : m.item_id) },
  { key: 'wh', label: 'Entrepôt', width: 100, render: (m) => m.warehouses?.code ?? '—' },
  { key: 'loc', label: 'Emplacement', width: 110, render: (m) => m.locations?.code ?? '—' },
  { key: 'lot', label: 'Lot', width: 120, render: (m) => m.lots?.lot_number ?? '—' },
  { key: 'bucket', label: 'État', width: 110, render: (m) => (m.bucket === 'available' ? BUCKET_LABELS.available : <Pill tone="warning">{BUCKET_LABELS[m.bucket]}</Pill>) },
  { key: 'qty', label: 'Quantité', align: 'right', sortKey: 'quantity', width: 110, render: (m) => <span className={m.quantity < 0 ? 'text-red-700' : 'text-emerald-700'}>{m.quantity > 0 ? '+' : ''}{formatQty(m.quantity)}</span> },
  { key: 'cost', label: 'Coût unit.', align: 'right', width: 110, render: (m) => formatMoney(m.unit_cost) },
  { key: 'value', label: 'Valeur', align: 'right', width: 120, render: (m) => formatMoney(m.value) },
  { key: 'source', label: 'Source', width: 180, render: (m) => `${m.source_type}${m.reverses_id ? ' (contre-passation)' : ''}` },
]

const filters: ServerFilter[] = [
  { key: 'movement_type', label: 'Tous les types', options: Object.entries(MOVEMENT_LABELS).map(([value, label]) => ({ value, label })) },
  { key: 'bucket', label: 'Tous les états', options: bucketOptions },
]

/**
 * Inventory ledger: immutable, append-only, server-paginated and virtualized.
 * Optional `?item=<id>` / `?lot=<id>` deep links filter by article or lot.
 */
export function MovementsPage() {
  const params = useSearchParams()
  const item = params.get('item') ?? undefined
  const lot = params.get('lot') ?? undefined
  return (
    <PageShell title="Mouvements" icon={History} description="Grand livre des stocks : chaque mouvement référence son document source. Rien n’est modifié ni supprimé : une erreur se corrige par contre-passation.">
      <ServerTable<Movement>
        hooks={movementHooks}
        columns={columns}
        filters={filters}
        searchColumns={['reason', 'source_type']}
        defaultSort={{ key: 'occurred_at' }}
        fixedFilters={{ item_id: item, lot_id: lot }}
        height={620}
      />
    </PageShell>
  )
}
