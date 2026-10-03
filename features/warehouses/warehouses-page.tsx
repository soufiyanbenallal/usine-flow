'use client'

import { Warehouse as WarehouseIcon } from 'lucide-react'
import type { DataTableColumn } from '@/components/data-table'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { useListOptions } from '../_core/options'
import { LOCATION_KINDS, WAREHOUSE_KINDS, ZONE_KINDS, type Location, type Warehouse, type Zone } from './types'
import { locationHooks, useWarehouseOptions, useZoneOptions, warehouseHooks, zoneHooks } from './hooks'

const active = (a: boolean) => <Pill tone={a ? 'success' : 'neutral'}>{a ? 'Actif' : 'Inactif'}</Pill>
const useSiteOptions = () => useListOptions('sites')

export function WarehousesPage() {
  const sites = useSiteOptions()
  const columns: DataTableColumn<Warehouse>[] = [
    { key: 'code', label: 'Code', value: (w) => w.code },
    { key: 'name', label: 'Nom', value: (w) => w.name },
    { key: 'kind', label: 'Type', value: (w) => WAREHOUSE_KINDS.find((k) => k.value === w.kind)?.label ?? w.kind },
    { key: 'site', label: 'Site', value: (w) => sites.find((s) => s.value === w.site_id)?.label ?? '—' },
    { key: 'neg', label: 'Stock négatif', value: (w) => (w.allow_negative ? 'Autorisé' : 'Interdit') },
    { key: 'active', label: 'Statut', value: (w) => (w.active ? 'Actif' : 'Inactif'), render: (w) => active(w.active) },
  ]
  return (
    <EntityPage<Warehouse>
      title="Entrepôts"
      singular="entrepôt"
      icon={WarehouseIcon}
      description="Un entrepôt contient des zones (réception, stockage, préparation, expédition, quarantaine, rebuts) et des emplacements."
      hooks={warehouseHooks}
      permission="warehouse.manage"
      columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'kind', label: 'Type', type: 'select', options: WAREHOUSE_KINDS, required: true, default: 'standard' },
        { key: 'site_id', label: 'Site', type: 'relation', useOptions: useSiteOptions },
        { key: 'address', label: 'Adresse' },
        { key: 'allow_negative', label: 'Autoriser le stock négatif', type: 'checkbox', help: 'Déconseillé : le stock ne devrait pas pouvoir devenir négatif.' },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      exportName="entrepots"
    />
  )
}

export function ZonesPage() {
  const warehouses = useWarehouseOptions()
  const columns: DataTableColumn<Zone>[] = [
    { key: 'code', label: 'Code', value: (z) => z.code },
    { key: 'name', label: 'Nom', value: (z) => z.name },
    { key: 'warehouse', label: 'Entrepôt', value: (z) => warehouses.find((w) => w.value === z.warehouse_id)?.label ?? '—' },
    { key: 'kind', label: 'Rôle', value: (z) => ZONE_KINDS.find((k) => k.value === z.kind)?.label ?? z.kind },
    { key: 'active', label: 'Statut', value: (z) => (z.active ? 'Actif' : 'Inactif'), render: (z) => active(z.active) },
  ]
  return (
    <EntityPage<Zone>
      title="Zones"
      singular="zone"
      icon={WarehouseIcon}
      hooks={zoneHooks}
      permission="warehouse.manage"
      columns={columns}
      filter={{ label: 'Rôle', options: ZONE_KINDS, getValue: (z) => z.kind }}
      fields={[
        { key: 'warehouse_id', label: 'Entrepôt', type: 'relation', useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
        { key: 'code', label: 'Code', required: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'kind', label: 'Rôle', type: 'select', options: ZONE_KINDS, required: true, default: 'bulk' },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ]}
      exportName="zones"
    />
  )
}

export function LocationsPage() {
  const warehouses = useWarehouseOptions()
  const zones = useZoneOptions()
  const columns: DataTableColumn<Location>[] = [
    { key: 'code', label: 'Code', value: (l) => l.code },
    { key: 'warehouse', label: 'Entrepôt', value: (l) => warehouses.find((w) => w.value === l.warehouse_id)?.label ?? '—' },
    { key: 'zone', label: 'Zone', value: (l) => zones.find((z) => z.value === l.zone_id)?.label ?? '—' },
    { key: 'kind', label: 'Type', value: (l) => LOCATION_KINDS.find((k) => k.value === l.kind)?.label ?? l.kind },
    { key: 'barcode', label: 'Code-barres', value: (l) => l.barcode ?? l.code },
    { key: 'capacity', label: 'Capacité', align: 'right', value: (l) => l.capacity ?? '—' },
    { key: 'active', label: 'Statut', value: (l) => (l.active ? 'Actif' : 'Inactif'), render: (l) => active(l.active) },
  ]
  return (
    <EntityPage<Location>
      title="Emplacements"
      singular="emplacement"
      icon={WarehouseIcon}
      description="Convention conseillée : A-03-12 (allée – rack – niveau). Le code est aussi utilisable en scan."
      hooks={locationHooks}
      permission="warehouse.manage"
      columns={columns}
      filter={{ label: 'Type', options: LOCATION_KINDS, getValue: (l) => l.kind }}
      fields={[
        { key: 'warehouse_id', label: 'Entrepôt', type: 'relation', useOptions: useWarehouseOptions, required: true, lockedOnEdit: true },
        { key: 'zone_id', label: 'Zone', type: 'relation', useOptions: () => useZoneOptions() },
        { key: 'code', label: 'Code', required: true, placeholder: 'A-03-12' },
        { key: 'barcode', label: 'Code-barres (si différent)' },
        { key: 'kind', label: 'Type', type: 'select', options: LOCATION_KINDS, required: true, default: 'bin' },
        { key: 'capacity', label: 'Capacité', type: 'number', min: 0 },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      exportName="emplacements"
    />
  )
}
