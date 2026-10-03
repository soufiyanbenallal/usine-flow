export type UomCategory = 'weight' | 'volume' | 'length' | 'area' | 'count' | 'time' | 'packaging'
export type Uom = { id: string; organization_id: string; code: string; name: string; category: UomCategory; decimals: number; active: boolean; created_at: string }
export type UomConversion = { id: string; organization_id: string; from_uom_id: string; to_uom_id: string; factor: number; created_at: string }

export const UOM_CATEGORY_LABELS: Record<UomCategory, string> = {
  weight: 'Poids', volume: 'Volume', length: 'Longueur', area: 'Surface', count: 'Comptage', time: 'Temps', packaging: 'Conditionnement',
}
export const uomCategoryOptions = (Object.keys(UOM_CATEGORY_LABELS) as UomCategory[]).map((value) => ({ value, label: UOM_CATEGORY_LABELS[value] }))
