'use client'

import { Tags } from 'lucide-react'
import type { DataTableColumn } from '@/components/data-table'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { categoryHooks, useCategoryOptions } from './hooks'
import type { ItemCategory } from './types'

export function CategoriesPage() {
  const options = useCategoryOptions()
  const columns: DataTableColumn<ItemCategory>[] = [
    { key: 'code', label: 'Code', value: (c) => c.code },
    { key: 'name', label: 'Nom', value: (c) => c.name },
    { key: 'parent', label: 'Catégorie parente', value: (c) => options.find((o) => o.value === c.parent_id)?.label ?? '—' },
    { key: 'active', label: 'Statut', value: (c) => (c.active ? 'Actif' : 'Inactif'), render: (c) => <Pill tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Actif' : 'Inactif'}</Pill> },
  ]
  return (
    <EntityPage<ItemCategory>
      title="Catégories"
      singular="catégorie"
      icon={Tags}
      description="Matières premières, composants, emballages, produits finis, consommables, pièces de rechange, outillage, services."
      hooks={categoryHooks}
      permission="catalog.write"
      columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'parent_id', label: 'Catégorie parente', type: 'relation', useOptions: useCategoryOptions },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      importConfig={{ fields: [{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Nom', required: true }], example: { code: 'MP', name: 'Matières premières' }, templateName: 'modele-categories.csv' }}
      exportName="categories"
    />
  )
}
