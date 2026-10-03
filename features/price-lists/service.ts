import { createCrudService } from '../_core/crud-service'
import type { PriceList } from './types'

export const priceListsService = createCrudService<PriceList, Record<string, unknown>, Record<string, unknown>>('price_lists', { order: { column: 'name', ascending: true } })
