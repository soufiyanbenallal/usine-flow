export type WarehouseKind = 'standard' | 'raw_materials' | 'finished_goods' | 'quarantine' | 'scrap' | 'transit' | 'spare_parts'
export type Warehouse = { id: string; organization_id: string; site_id: string | null; facility_id: string | null; code: string; name: string; kind: WarehouseKind; address: string | null; allow_negative: boolean; active: boolean; created_at: string }
export type ZoneKind = 'receiving' | 'quality' | 'bulk' | 'picking' | 'packing' | 'dispatch' | 'quarantine' | 'scrap'
export type Zone = { id: string; organization_id: string; warehouse_id: string; code: string; name: string; kind: ZoneKind; active: boolean }
export type LocationKind = 'bin' | 'rack' | 'floor' | 'dock' | 'shelf'
export type Location = { id: string; organization_id: string; warehouse_id: string; zone_id: string | null; code: string; barcode: string | null; kind: LocationKind; capacity: number | null; active: boolean }

export const WAREHOUSE_KINDS: { value: WarehouseKind; label: string }[] = [
  { value: 'standard', label: 'Standard' }, { value: 'raw_materials', label: 'Matières premières' }, { value: 'finished_goods', label: 'Produits finis' },
  { value: 'quarantine', label: 'Quarantaine' }, { value: 'scrap', label: 'Rebuts' }, { value: 'transit', label: 'Transit' }, { value: 'spare_parts', label: 'Pièces de rechange' },
]
export const ZONE_KINDS: { value: ZoneKind; label: string }[] = [
  { value: 'receiving', label: 'Réception' }, { value: 'quality', label: 'Contrôle qualité' }, { value: 'bulk', label: 'Stockage en vrac' }, { value: 'picking', label: 'Préparation' },
  { value: 'packing', label: 'Colisage' }, { value: 'dispatch', label: 'Expédition' }, { value: 'quarantine', label: 'Quarantaine' }, { value: 'scrap', label: 'Rebuts' },
]
export const LOCATION_KINDS: { value: LocationKind; label: string }[] = [
  { value: 'bin', label: 'Bac' }, { value: 'rack', label: 'Rack' }, { value: 'shelf', label: 'Étagère' }, { value: 'floor', label: 'Sol' }, { value: 'dock', label: 'Quai' },
]
/** Location code convention A-03-12 = aisle-rack-level. */
export const LOCATION_CODE = /^[A-Z0-9]+(-[A-Z0-9]+)*$/i
