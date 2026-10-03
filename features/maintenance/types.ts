export type AssetStatus = 'running' | 'stopped' | 'maintenance' | 'standby' | 'retired'
export type Asset = {
  id: string; organization_id: string; code: string; name: string; kind: 'line' | 'machine' | 'equipment' | 'component' | 'vehicle' | 'building'; parent_id: string | null; site_id: string | null; facility_id: string | null
  work_center_id: string | null; manufacturer: string | null; model: string | null; serial_number: string | null; installed_on: string | null; status: AssetStatus; criticality: 'low' | 'medium' | 'high' | 'critical'
  meter_unit: 'hours' | 'cycles' | 'km' | 'units'; meter_reading: number; hourly_cost: number; notes: string | null; active: boolean; created_at: string
}
export type MaintenancePlan = {
  id: string; organization_id: string; asset_id: string; name: string; kind: 'preventive' | 'predictive' | 'inspection'; trigger_type: 'time' | 'meter'; interval_days: number | null; interval_meter: number | null
  lead_days: number; last_done_at: string | null; last_meter: number; next_due_date: string | null; estimated_minutes: number; checklist: string[]; active: boolean; created_at: string
}
export type MaintenanceWorkOrder = {
  id: string; organization_id: string; number: string | null; asset_id: string; plan_id: string | null; kind: 'preventive' | 'corrective' | 'inspection' | 'improvement'; priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'draft' | 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'; breakdown: boolean; title: string; description: string | null; failure_reason_id: string | null; reported_by: string | null
  assigned_to: string | null; scheduled_for: string | null; started_at: string | null; completed_at: string | null; downtime_minutes: number; labor_minutes: number; labor_cost: number; parts_cost: number
  total_cost: number; resolution: string | null; notes: string | null; created_at: string
}
export type MaintenancePart = { id: string; work_order_id: string; item_id: string; warehouse_id: string; quantity: number; unit_cost: number; consumed: boolean }
export type MaintenanceReading = { id: string; asset_id: string; kind: 'hours' | 'cycles' | 'km' | 'temperature' | 'vibration' | 'pressure' | 'other'; value: number; read_at: string; read_by: string | null; notes: string | null }
export type ReliabilityRow = { asset_id: string; code: string; name: string; failures: number; downtime_minutes: number; mttr_minutes: number | null; mtbf_hours: number | null; maintenance_cost: number }

export const ASSET_KINDS = [{ value: 'line', label: 'Ligne de production' }, { value: 'machine', label: 'Machine' }, { value: 'equipment', label: 'Équipement' }, { value: 'component', label: 'Composant (moteur, pompe…)' }, { value: 'vehicle', label: 'Véhicule' }, { value: 'building', label: 'Bâtiment' }]
export const ASSET_STATUS = [{ value: 'running', label: 'En marche' }, { value: 'stopped', label: 'À l’arrêt' }, { value: 'maintenance', label: 'En maintenance' }, { value: 'standby', label: 'En attente' }, { value: 'retired', label: 'Retiré' }]
export const CRITICALITY = [{ value: 'low', label: 'Faible' }, { value: 'medium', label: 'Moyenne' }, { value: 'high', label: 'Élevée' }, { value: 'critical', label: 'Critique' }]
export const METER_UNITS = [{ value: 'hours', label: 'Heures' }, { value: 'cycles', label: 'Cycles' }, { value: 'km', label: 'Kilomètres' }, { value: 'units', label: 'Unités' }]
export const WO_KINDS = [{ value: 'corrective', label: 'Correctif' }, { value: 'preventive', label: 'Préventif' }, { value: 'inspection', label: 'Inspection' }, { value: 'improvement', label: 'Amélioration' }]
export const WO_PRIORITIES = [{ value: 'low', label: 'Basse' }, { value: 'medium', label: 'Moyenne' }, { value: 'high', label: 'Haute' }, { value: 'urgent', label: 'Urgente' }]
export const PLAN_KINDS = [{ value: 'preventive', label: 'Préventif' }, { value: 'predictive', label: 'Prédictif' }, { value: 'inspection', label: 'Inspection' }]
export const TRIGGER_TYPES = [{ value: 'time', label: 'Calendaire (jours)' }, { value: 'meter', label: 'Compteur (heures / cycles)' }]
export const READING_KINDS = ['hours', 'cycles', 'km', 'temperature', 'vibration', 'pressure', 'other'].map((v) => ({ value: v, label: v }))
