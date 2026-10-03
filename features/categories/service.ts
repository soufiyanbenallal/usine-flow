import { createCrudService } from '../_core/crud-service'
import type { ItemCategory } from './types'

export const categoriesService = createCrudService<ItemCategory, Record<string, unknown>, Record<string, unknown>>('item_categories', { order: { column: 'code', ascending: true } })
