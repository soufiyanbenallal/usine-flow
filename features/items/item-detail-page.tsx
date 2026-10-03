'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { Package, Printer, QrCode } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { formatMoney, formatQty } from '@/lib/format'
import { ChildTable } from '../_core/child-table'
import { FieldGrid, defaultValues, rowToValues, validateValues, valuesToPayload, type FormValues } from '../_core/fields'
import { useView } from '../_core/view-hooks'
import { EntityHistory } from '../audit/entity-history'
import { AttachmentsPanel } from '../documents/attachments-panel'
import { useOrgPath } from '../organization/context'
import { useCan } from '../organization/permissions'
import { partnerPicker } from '../partners/hooks'
import { useUomOptions } from '../uoms/hooks'
import { ITEM_SECTIONS } from './fields'
import { barcodeHooks, itemHooks, itemPriceHooks, itemSupplierHooks, itemUomHooks } from './hooks'
import { BARCODE_KINDS, type ItemBarcode, type ItemPrice, type ItemSupplier, type ItemUom } from './types'
import { useListOptions } from '../_core/options'

type StockRow = { item_id: string; warehouse_id: string; on_hand: number; quarantine: number; damaged: number; reserved: number }

function StockByWarehouse({ itemId }: { itemId: string }) {
  const { data } = useView<StockRow>('stock', 'inventory_stock_view', { eq: { item_id: itemId } })
  const warehouses = useListOptions('warehouses')
  return (
    <Panel title="Stock par entrepôt">
      {data?.length === 0 && <p className="text-[13px] text-muted-foreground">Aucun stock.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((s) => (
          <div key={s.warehouse_id} className="rounded-lg border p-3 text-[13px]">
            <p className="font-semibold">{warehouses.find((w) => w.value === s.warehouse_id)?.label ?? s.warehouse_id}</p>
            <p>Disponible : {formatQty(s.on_hand - s.reserved)}</p>
            <p className="text-muted-foreground">En stock {formatQty(s.on_hand)} · réservé {formatQty(s.reserved)}</p>
            {(s.quarantine > 0 || s.damaged > 0) && <p className="text-amber-700">Quarantaine {formatQty(s.quarantine)} · endommagé {formatQty(s.damaged)}</p>}
          </div>
        ))}
      </div>
    </Panel>
  )
}

/** Full item sheet: identification, units, dimensions, stock rules, costs, barcodes, suppliers, prices, unit conversions, files, history. */
export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const canWrite = useCan('catalog.write')
  const one = itemHooks.useOne(id)
  const update = itemHooks.useUpdate()
  const uoms = useUomOptions()
  const item = one.data
  const allFields = ITEM_SECTIONS.flatMap((s) => s.fields)
  const [values, setValues] = useState<FormValues | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = values ?? (item ? rowToValues(allFields, item as unknown as Record<string, unknown>) : defaultValues(allFields))

  const save = async () => {
    if (!item) return
    const errs = validateValues(allFields, current)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    try {
      await update.mutateAsync({ id: item.id, patch: valuesToPayload(allFields.filter((f) => !f.lockedOnEdit), current) })
      setSaved(true)
      setValues(null)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const uomLabel = (id: string | null) => uoms.find((u) => u.value === id)?.label ?? '—'
  const barcodeColumns: DataTableColumn<ItemBarcode>[] = [
    { key: 'barcode', label: 'Code', value: (b) => b.barcode },
    { key: 'kind', label: 'Type', value: (b) => BARCODE_KINDS.find((k) => k.value === b.kind)?.label ?? b.kind },
    { key: 'uom', label: 'Unité', value: (b) => uomLabel(b.uom_id) },
    { key: 'primary', label: 'Principal', value: (b) => (b.is_primary ? 'Oui' : 'Non') },
  ]
  const supplierColumns: DataTableColumn<ItemSupplier>[] = [
    { key: 'supplier', label: 'Fournisseur', value: (s) => s.supplier_id, render: (s) => <SupplierName id={s.supplier_id} /> },
    { key: 'ref', label: 'Réf. fournisseur', value: (s) => s.supplier_ref ?? '—' },
    { key: 'price', label: 'Prix', align: 'right', value: (s) => s.price, render: (s) => formatMoney(s.price) },
    { key: 'lead', label: 'Délai (j)', align: 'right', value: (s) => s.lead_time_days },
    { key: 'moq', label: 'Qté min.', align: 'right', value: (s) => s.min_order_qty },
    { key: 'preferred', label: 'Préféré', value: (s) => (s.preferred ? 'Oui' : '') },
  ]
  const priceLists = useListOptions('price_lists')
  const priceColumns: DataTableColumn<ItemPrice>[] = [
    { key: 'list', label: 'Liste de prix', value: (p) => priceLists.find((l) => l.value === p.price_list_id)?.label ?? p.price_list_id },
    { key: 'price', label: 'Prix', align: 'right', value: (p) => p.price, render: (p) => formatMoney(p.price) },
    { key: 'min', label: 'À partir de', align: 'right', value: (p) => p.min_qty },
    { key: 'disc', label: 'Remise %', align: 'right', value: (p) => p.discount_pct },
  ]
  const uomColumns: DataTableColumn<ItemUom>[] = [
    { key: 'uom', label: 'Unité', value: (u) => uomLabel(u.uom_id) },
    { key: 'factor', label: 'Quantité de base', align: 'right', value: (u) => u.factor_to_base },
    { key: 'purpose', label: 'Usage', value: (u) => u.purpose },
  ]

  return (
    <PageShell
      title={item ? `${item.sku} — ${item.name}` : 'Article'}
      icon={Package}
      error={one.error?.message}
      actions={
        <>
          <Link href={href('catalogue/articles')}>
            <Button variant="secondary">Articles</Button>
          </Link>
          {item && (
            <Link href={`${href('entrepot/etiquettes')}?item=${item.id}`}>
              <Button variant="secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Printer className="size-3.5" /> Étiquette
                </span>
              </Button>
            </Link>
          )}
          {item && (
            <Link href={`${href('inventaire/mouvements')}?q=${encodeURIComponent(item.id)}`}>
              <Button variant="secondary">Mouvements</Button>
            </Link>
          )}
        </>
      }
    >
      {item && (
        <>
          {error && <Banner tone="critical">{error}</Banner>}
          {saved && <Banner tone="success">Article enregistré.</Banner>}
          {ITEM_SECTIONS.map((section) => (
            <Panel key={section.title} title={section.title}>
              <FieldGrid fields={section.fields} values={current} onChange={(k, v) => { setSaved(false); setValues({ ...current, [k]: v }) }} errors={errors} disabled={!canWrite} editing />
            </Panel>
          ))}
          {canWrite && (
            <div>
              <Button variant="primary" loading={update.isPending} onClick={() => void save()}>
                Enregistrer
              </Button>
            </div>
          )}
          <Panel title="Valorisation">
            <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
              <div><dt className="text-muted-foreground">Coût moyen pondéré</dt><dd className="font-semibold">{formatMoney(item.avg_cost)}</dd></div>
              <div><dt className="text-muted-foreground">Dernier coût d’achat</dt><dd className="font-semibold">{formatMoney(item.last_purchase_cost)}</dd></div>
              <div><dt className="text-muted-foreground">Coût standard</dt><dd className="font-semibold">{formatMoney(item.standard_cost)}</dd></div>
            </dl>
          </Panel>
          <StockByWarehouse itemId={item.id} />
          <ChildTable<ItemBarcode>
            title="Codes-barres et QR"
            singular="code"
            hooks={barcodeHooks}
            fk="item_id"
            parentId={item.id}
            canEdit={canWrite}
            columns={barcodeColumns}
            fields={[
              { key: 'barcode', label: 'Code', required: true },
              { key: 'kind', label: 'Type', type: 'select', options: BARCODE_KINDS, required: true, default: 'ean13' },
              { key: 'uom_id', label: 'Unité', type: 'relation', useOptions: useUomOptions },
              { key: 'is_primary', label: 'Code principal', type: 'checkbox' },
            ]}
            footer={
              canWrite && (
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <QrCode className="size-3.5" /> Les scanners matériels agissent comme un clavier : le champ de scan accepte ces codes, le SKU ou la référence interne.
                </p>
              )
            }
          />
          <ChildTable<ItemSupplier>
            title="Fournisseurs de l’article"
            singular="fournisseur"
            hooks={itemSupplierHooks}
            fk="item_id"
            parentId={item.id}
            canEdit={canWrite}
            columns={supplierColumns}
            fields={[
              { key: 'supplier_id', label: 'Fournisseur', type: 'picker', picker: partnerPicker, required: true, lockedOnEdit: true },
              { key: 'supplier_ref', label: 'Référence fournisseur' },
              { key: 'price', label: 'Prix d’achat (MAD)', type: 'money', min: 0, default: 0 },
              { key: 'lead_time_days', label: 'Délai (jours)', type: 'number', min: 0, default: 0 },
              { key: 'min_order_qty', label: 'Quantité minimale', type: 'number', min: 0, default: 0 },
              { key: 'preferred', label: 'Fournisseur préféré', type: 'checkbox' },
            ]}
          />
          <ChildTable<ItemPrice>
            title="Prix par liste"
            singular="prix"
            hooks={itemPriceHooks}
            fk="item_id"
            parentId={item.id}
            canEdit={canWrite}
            columns={priceColumns}
            fields={[
              { key: 'price_list_id', label: 'Liste de prix', type: 'relation', useOptions: () => useListOptions('price_lists'), required: true, lockedOnEdit: true },
              { key: 'price', label: 'Prix (MAD)', type: 'money', min: 0, required: true },
              { key: 'min_qty', label: 'À partir de la quantité', type: 'number', min: 0, default: 0 },
              { key: 'discount_pct', label: 'Remise (%)', type: 'number', min: 0, default: 0 },
              { key: 'valid_from', label: 'Valable du', type: 'date' },
              { key: 'valid_to', label: 'Au', type: 'date' },
            ]}
          />
          <ChildTable<ItemUom>
            title="Conversions d’unités de l’article"
            singular="conversion"
            hooks={itemUomHooks}
            fk="item_id"
            parentId={item.id}
            canEdit={canWrite}
            columns={uomColumns}
            fields={[
              { key: 'uom_id', label: 'Unité', type: 'relation', useOptions: useUomOptions, required: true, lockedOnEdit: true },
              { key: 'factor_to_base', label: 'Quantité de base pour 1 unité', type: 'number', min: 0.0000001, required: true, help: 'Ex. 1 carton = 24 pièces → 24.' },
              { key: 'purpose', label: 'Usage', type: 'select', options: [{ value: 'purchase', label: 'Achat' }, { value: 'sales', label: 'Vente' }, { value: 'production', label: 'Production' }, { value: 'storage', label: 'Stockage' }], required: true, default: 'purchase' },
            ]}
          />
          <AttachmentsPanel entityType="items" entityId={item.id} kind="technical" title="Documents techniques et certificats" />
          <EntityHistory entity="items" entityId={item.id} />
        </>
      )}
    </PageShell>
  )
}

function SupplierName({ id }: { id: string }) {
  const sel = partnerPicker.useById(id)
  return <>{sel?.label ?? id}</>
}
