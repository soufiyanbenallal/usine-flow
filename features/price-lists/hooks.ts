'use client'

import { createCrudHooks } from '../_core/crud-hooks'
import { priceListsService } from './service'

export const priceListHooks = createCrudHooks('price_lists', priceListsService, ['item_prices'])
