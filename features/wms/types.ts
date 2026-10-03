export type TaskType = 'receive' | 'putaway' | 'pick' | 'pack' | 'dispatch' | 'count' | 'replenish' | 'move'
export type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled'
export type WarehouseTask = {
  id: string; organization_id: string; warehouse_id: string; task_type: TaskType; status: TaskStatus; priority: number; assignee_id: string | null; item_id: string | null; lot_id: string | null
  from_location_id: string | null; to_location_id: string | null; quantity: number | null; source_type: string | null; source_id: string | null; source_line_id: string | null
  due_at: string | null; started_at: string | null; completed_at: string | null; notes: string | null
}
export type PickWave = { id: string; organization_id: string; number: string | null; warehouse_id: string; status: 'open' | 'picking' | 'done' | 'cancelled'; notes: string | null }
export type PickListStatus = 'open' | 'picking' | 'picked' | 'packed' | 'cancelled'
export type PickList = {
  id: string; organization_id: string; number: string | null; warehouse_id: string; wave_id: string | null; so_id: string | null; delivery_id: string | null; assignee_id: string | null
  status: PickListStatus; priority: number; notes: string | null
}
export type PickListLine = { id: string; organization_id: string; pick_list_id: string; so_line_id: string | null; item_id: string; location_id: string | null; lot_id: string | null; qty_required: number; qty_picked: number; status: 'open' | 'picked' | 'short' }
export type PackageKind = 'carton' | 'pallet' | 'crate' | 'bag' | 'other'
export type Package = {
  id: string; organization_id: string; delivery_id: string | null; pick_list_id: string | null; package_no: string; kind: PackageKind; weight: number | null
  length: number | null; width: number | null; height: number | null; status: 'open' | 'closed' | 'loaded'
}
export type PackageLine = { id: string; organization_id: string; package_id: string; item_id: string; lot_id: string | null; quantity: number }

export const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'receive', label: 'Réception' }, { value: 'putaway', label: 'Rangement' }, { value: 'pick', label: 'Préparation' }, { value: 'pack', label: 'Colisage' },
  { value: 'dispatch', label: 'Expédition' }, { value: 'count', label: 'Comptage' }, { value: 'replenish', label: 'Réapprovisionnement' }, { value: 'move', label: 'Déplacement' },
]
export const TASK_STATUS: { value: TaskStatus; label: string }[] = [
  { value: 'open', label: 'À faire' }, { value: 'in_progress', label: 'En cours' }, { value: 'done', label: 'Terminée' }, { value: 'cancelled', label: 'Annulée' },
]
export const PICK_STATUS: { value: PickListStatus; label: string }[] = [
  { value: 'open', label: 'À préparer' }, { value: 'picking', label: 'En préparation' }, { value: 'picked', label: 'Préparée' }, { value: 'packed', label: 'Colisée' }, { value: 'cancelled', label: 'Annulée' },
]
export const PACKAGE_KINDS: { value: PackageKind; label: string }[] = [
  { value: 'carton', label: 'Carton' }, { value: 'pallet', label: 'Palette' }, { value: 'crate', label: 'Caisse' }, { value: 'bag', label: 'Sac' }, { value: 'other', label: 'Autre' },
]
export const PRIORITIES = [1, 2, 3, 4, 5].map((p) => ({ value: String(p), label: p === 1 ? '1 — Urgent' : p === 5 ? '5 — Faible' : String(p) }))
