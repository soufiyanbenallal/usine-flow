'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { Tags } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell } from '@/components/page-shell'
import { formatMoney } from '@/lib/format'
import { ChildTable } from '../_core/child-table'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { itemPicker, itemPriceHooks } from '../items/hooks'
import type { ItemPrice } from '../items/types'
import { useCan } from '../organization/permissions'
import { useOrgPath } from '../organization/context'
import { priceListHooks } from './hooks'
import { PRICE_LIST_KINDS, type PriceList } from './types'

const columns: DataTableColumn<PriceList>[] = [
  { key: 'name', label: 'Nom', value: (l) => l.name },
  { key: 'kind', label: 'Type', value: (l) => PRICE_LIST_KINDS.find((k) => k.value === l.kind)?.label ?? l.kind },
  { key: 'currency', label: 'Devise', value: (l) => l.currency },
  { key: 'active', label: 'Statut', value: (l) => (l.active ? 'Actif' : 'Inactif'), render: (l) => <Pill tone={l.active ? 'success' : 'neutral'}>{l.active ? 'Actif' : 'Inactif'}</Pill> },
]

export function PriceListsPage() {
  return (
    <EntityPage<PriceList>
      title="Listes de prix"
      singular="liste de prix"
      icon={Tags}
      description="Prix de vente par client ou prix d’achat par fournisseur, avec paliers de quantité et remises."
      hooks={priceListHooks}
      permission="catalog.write"
      columns={columns}
      detailPath={(l) => `catalogue/listes-de-prix/${l.id}`}
      fields={[
        { key: 'name', label: 'Nom', required: true },
        { key: 'kind', label: 'Type', type: 'select', options: PRICE_LIST_KINDS, required: true, default: 'sales' },
        { key: 'currency', label: 'Devise', default: 'MAD', required: true },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
    />
  )
}

export function PriceListDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const canWrite = useCan('catalog.write')
  const one = priceListHooks.useOne(id)
  const list = one.data
  const columns: DataTableColumn<ItemPrice>[] = [
    { key: 'item', label: 'Article', value: (p) => p.item_id, render: (p) => <ItemName id={p.item_id} /> },
    { key: 'price', label: 'Prix', align: 'right', value: (p) => p.price, render: (p) => formatMoney(p.price) },
    { key: 'min', label: 'À partir de', align: 'right', value: (p) => p.min_qty },
    { key: 'disc', label: 'Remise %', align: 'right', value: (p) => p.discount_pct },
    { key: 'valid', label: 'Validité', value: (p) => [p.valid_from, p.valid_to].filter(Boolean).join(' → ') || '—' },
  ]
  return (
    <PageShell
      title={list ? list.name : 'Liste de prix'}
      icon={Tags}
      error={one.error?.message}
      actions={<Link href={href('catalogue/listes-de-prix')}><Button variant="secondary">Listes de prix</Button></Link>}
    >
      {!one.isPending && !list && <Banner tone="warning">Liste introuvable.</Banner>}
      {list && (
        <ChildTable<ItemPrice>
          title="Prix des articles"
          singular="prix"
          hooks={itemPriceHooks}
          fk="price_list_id"
          parentId={list.id}
          canEdit={canWrite}
          columns={columns}
          fields={[
            { key: 'item_id', label: 'Article', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
            { key: 'price', label: 'Prix (MAD)', type: 'money', min: 0, required: true },
            { key: 'min_qty', label: 'À partir de la quantité', type: 'number', min: 0, default: 0 },
            { key: 'discount_pct', label: 'Remise (%)', type: 'number', min: 0, default: 0 },
            { key: 'valid_from', label: 'Valable du', type: 'date' },
            { key: 'valid_to', label: 'Au', type: 'date' },
          ]}
        />
      )}
    </PageShell>
  )
}

function ItemName({ id }: { id: string }) {
  const sel = itemPicker.useById(id)
  return <>{sel ? `${sel.label} — ${sel.hint}` : id}</>
}
