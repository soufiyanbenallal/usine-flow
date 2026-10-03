import { createCrudService } from '../_core/crud-service'
import type { Location, Warehouse, Zone } from './types'

type Payload = Record<string, unknown>
export const warehousesService = createCrudService<Warehouse, Payload, Payload>('warehouses', { order: { column: 'code', ascending: true } })
export const zonesService = createCrudService<Zone, Payload, Payload>('warehouse_zones', { order: { column: 'code', ascending: true } })
export const locationsService = createCrudService<Location, Payload, Payload>('locations', { order: { column: 'code', ascending: true } })
