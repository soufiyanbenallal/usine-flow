import { createCrudService } from '../_core/crud-service'
import type { Uom, UomConversion } from './types'

type Payload = Record<string, unknown>
export const uomsService = createCrudService<Uom, Payload, Payload>('uoms', { order: { column: 'code', ascending: true } })
export const conversionsService = createCrudService<UomConversion, Payload, Payload>('uom_conversions')
