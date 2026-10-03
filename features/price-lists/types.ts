export type PriceList = { id: string; organization_id: string; name: string; kind: 'sales' | 'purchase'; currency: string; active: boolean; created_at: string }
export const PRICE_LIST_KINDS = [{ value: 'sales', label: 'Vente' }, { value: 'purchase', label: 'Achat' }]
