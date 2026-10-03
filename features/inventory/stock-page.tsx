'use client'

import { Boxes } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useRef } from 'react'
import { Button } from '@xco-agency/corex-ui'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/data-table'
import { PageShell } from '@/components/page-shell'
import { StatStrip } from '@/components/stat-strip'
import { StockBadge } from '@/components/business/stock-badge'
import { downloadCsv } from '@/lib/csv'
import { formatMoney, formatQty } from '@/lib/format'
import { sumOf } from '@/lib/decimal'
import { useOrgPath } from '../organization/context'
import { useItemStock } from '../items/hooks'
import { ITEM_TYPE_LABELS, itemTypeOptions, type ItemStock } from '../items/types'

type StockRow = ItemStock & { id: string }
const filter: DataTableFilter<StockRow> = { label: 'Type', options: itemTypeOptions, getValue: (s) => s.item_type }

/** Current stock per article: on hand, reserved, available-to-promise, incoming, quarantine and value. */
export function StockPage() {
  const { data, isPending, error } = useItemStock()
  const href = useOrgPath()
  const router = useRouter()
  const visible = useRef<StockRow[]>([])
  const rows = useMemo<StockRow[]>(() => (data ?? []).map((r) => ({ ...r, id: r.item_id })), [data])
  const totals = useMemo(
    () => ({
      value: sumOf(rows.map((r) => r.stock_value)).toNumber(),
      low: rows.filter((r) => r.low_stock).length,
      out: rows.filter((r) => r.on_hand <= 0 && r.active).length,
      quarantine: sumOf(rows.map((r) => r.quarantine)).toNumber(),
    }),
    [rows],
  )
  const columns: DataTableColumn<StockRow>[] = [
    { key: 'sku', label: 'Référence', value: (s) => s.sku },
    { key: 'name', label: 'Désignation', value: (s) => s.name },
    { key: 'type', label: 'Type', value: (s) => ITEM_TYPE_LABELS[s.item_type] },
    { key: 'onhand', label: 'En stock', align: 'right', value: (s) => s.on_hand, render: (s) => formatQty(s.on_hand) },
    { key: 'reserved', label: 'Réservé', align: 'right', value: (s) => s.reserved, render: (s) => formatQty(s.reserved) },
    { key: 'available', label: 'Disponible', align: 'right', value: (s) => s.available, render: (s) => <strong>{formatQty(s.available)}</strong> },
    { key: 'incoming', label: 'Attendu', align: 'right', value: (s) => s.incoming, render: (s) => formatQty(s.incoming) },
    { key: 'quarantine', label: 'Quarantaine', align: 'right', value: (s) => s.quarantine, render: (s) => formatQty(s.quarantine) },
    { key: 'value', label: 'Valeur', align: 'right', value: (s) => s.stock_value, render: (s) => formatMoney(s.stock_value) },
    { key: 'status', label: 'Niveau', value: (s) => (s.low_stock ? 'bas' : 'ok'), render: (s) => <StockBadge onHand={s.on_hand} rules={{ minStock: s.min_stock, maxStock: s.max_stock, reorderPoint: s.reorder_point }} /> },
  ]
  return (
    <PageShell
      title="Stock"
      icon={Boxes}
      description="Soldes calculés à partir du grand livre des mouvements (jamais modifiés directement)."
      error={error?.message}
      actions={
        <>
          <Link href={href('inventaire/reapprovisionnement')}>
            <Button variant="secondary">Réapprovisionnement</Button>
          </Link>
          <Button variant="secondary" icon="export" onClick={() => downloadCsv('stock.csv', columns.map((c) => ({ label: c.label, value: c.value })), visible.current)}>
            Exporter
          </Button>
        </>
      }
    >
      <StatStrip
        period="Maintenant"
        stats={[
          { label: 'Valeur du stock', value: formatMoney(totals.value) },
          { label: 'Articles en stock bas', value: String(totals.low), hint: totals.low > 0 ? 'À réapprovisionner' : 'RAS' },
          { label: 'Ruptures', value: String(totals.out) },
          { label: 'En quarantaine', value: formatQty(totals.quarantine) },
        ]}
      />
      <DataTable<StockRow>
        title="Stock"
        singular="article en stock"
        columns={columns}
        rows={rows}
        loading={isPending}
        filter={filter}
        onOpen={(s) => router.push(href(`catalogue/articles/${s.item_id}`))}
        onVisibleChange={(v) => {
          visible.current = v
        }}
      />
    </PageShell>
  )
}
