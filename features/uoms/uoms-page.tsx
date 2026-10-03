'use client'

import { Ruler } from 'lucide-react'
import type { DataTableColumn } from '@/components/data-table'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { conversionHooks, uomHooks, useUomOptions } from './hooks'
import { UOM_CATEGORY_LABELS, uomCategoryOptions, type Uom, type UomConversion } from './types'

const columns: DataTableColumn<Uom>[] = [
  { key: 'code', label: 'Code', value: (u) => u.code },
  { key: 'name', label: 'Nom', value: (u) => u.name },
  { key: 'category', label: 'Catégorie', value: (u) => UOM_CATEGORY_LABELS[u.category] },
  { key: 'decimals', label: 'Décimales', value: (u) => u.decimals, align: 'right' },
  { key: 'active', label: 'Statut', value: (u) => (u.active ? 'Actif' : 'Inactif'), render: (u) => <Pill tone={u.active ? 'success' : 'neutral'}>{u.active ? 'Actif' : 'Inactif'}</Pill> },
]

function ConversionsSection() {
  const options = useUomOptions()
  const label = (id: string) => options.find((o) => o.value === id)?.label ?? id
  const conversionColumns: DataTableColumn<UomConversion>[] = [
    { key: 'from', label: 'De', value: (c) => `1 ${label(c.from_uom_id)}` },
    { key: 'to', label: 'Équivaut à', value: (c) => `${c.factor} ${label(c.to_uom_id)}` },
  ]
  return (
    <EntityPage<UomConversion>
      embedded
      title="Conversions d’unités"
      singular="conversion"
      icon={Ruler}
      hooks={conversionHooks}
      permission="catalog.write"
      columns={conversionColumns}
      fields={[
        { key: 'from_uom_id', label: 'Unité source', type: 'relation', useOptions: useUomOptions, required: true, lockedOnEdit: true },
        { key: 'to_uom_id', label: 'Unité cible', type: 'relation', useOptions: useUomOptions, required: true, lockedOnEdit: true },
        { key: 'factor', label: '1 source = … cible', type: 'number', min: 0.0000001, required: true, help: 'Ex. 1 carton = 24 pièces → 24.' },
      ]}
    />
  )
}

/** Units of measure with exact conversion rules (stored as `numeric`, never floating point). */
export function UomsPage() {
  return (
    <EntityPage<Uom>
      title="Unités de mesure"
      singular="unité"
      icon={Ruler}
      description="Les conversions (1 carton = 24 pièces, 1 tonne = 1 000 kg) sont appliquées exactement par la base de données."
      hooks={uomHooks}
      permission="catalog.write"
      columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'category', label: 'Catégorie', type: 'select', options: uomCategoryOptions, required: true, default: 'count' },
        { key: 'decimals', label: 'Décimales affichées', type: 'number', min: 0, default: 3 },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      importConfig={{
        fields: [
          { key: 'code', label: 'Code', required: true },
          { key: 'name', label: 'Nom', required: true },
          { key: 'category', label: 'Catégorie', fallback: 'count' },
          { key: 'decimals', label: 'Décimales', kind: 'number', fallback: 3, min: 0 },
        ],
        example: { code: 'kg', name: 'Kilogramme', category: 'weight', decimals: 3 },
        templateName: 'modele-unites.csv',
      }}
      exportName="unites"
      below={<ConversionsSection />}
    />
  )
}
