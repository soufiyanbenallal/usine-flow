export type ReasonKind = 'downtime' | 'scrap' | 'failure' | 'defect' | 'return' | 'adjustment'
export type ReasonCode = { id: string; organization_id: string; kind: ReasonKind; code: string; label: string; active: boolean; created_at: string }
export type InspectionKind = 'incoming' | 'in_process' | 'final'
export type InspectionPlan = {
  id: string; organization_id: string; code: string; name: string; kind: InspectionKind; item_id: string | null; category_id: string | null; sampling_method: 'all' | 'percent' | 'fixed' | 'aql'
  sample_percent: number | null; sample_size: number | null; aql: number | null; active: boolean; created_at: string
}
export type InspectionPoint = { id: string; plan_id: string; seq: number; name: string; kind: 'pass_fail' | 'measurement' | 'visual'; unit: string | null; target: number | null; min_value: number | null; max_value: number | null; required: boolean; instructions: string | null }
export type InspectionStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'accepted_with_deviation' | 'cancelled'
export type Inspection = {
  id: string; organization_id: string; number: string | null; kind: InspectionKind; plan_id: string | null; source_type: string | null; source_id: string | null; item_id: string; lot_id: string | null; warehouse_id: string | null
  location_id: string | null; supplier_id: string | null; quantity: number; sample_qty: number | null; accepted_qty: number; rejected_qty: number; status: InspectionStatus; decision: string | null
  inspector_id: string | null; inspected_at: string | null; comment: string | null; notes: string | null; created_at: string
}
export type InspectionResult = { id: string; inspection_id: string; point_id: string | null; point_name: string | null; measured_value: number | null; result: 'pending' | 'pass' | 'fail' | 'na'; defect_code: string | null; comment: string | null; photo_path: string | null }
export type NonConformance = {
  id: string; organization_id: string; number: string | null; inspection_id: string | null; item_id: string | null; lot_id: string | null; supplier_id: string | null; production_order_id: string | null; source_type: string | null; source_id: string | null
  defect_code: string | null; severity: 'minor' | 'major' | 'critical'; quantity_affected: number; description: string; root_cause: string | null; containment: string | null; quarantine: boolean
  status: 'open' | 'investigating' | 'contained' | 'closed' | 'cancelled'; closed_at: string | null; created_at: string
}
export type CapaAction = {
  id: string; organization_id: string; number: string | null; ncr_id: string | null; kind: 'corrective' | 'preventive'; title: string; description: string | null; owner_name: string | null; due_date: string | null
  status: 'open' | 'in_progress' | 'done' | 'verified' | 'cancelled'; completed_at: string | null; verified_at: string | null; effectiveness: string | null; created_at: string
}
export type QualityCertificate = { id: string; organization_id: string; number: string; title: string; item_id: string | null; lot_id: string | null; supplier_id: string | null; issuer: string | null; issued_on: string | null; expires_on: string | null; file_path: string | null; notes: string | null; created_at: string }
export type Recall = { id: string; organization_id: string; number: string | null; lot_id: string; reason: string; severity: 'minor' | 'major' | 'critical'; status: 'open' | 'notified' | 'closed'; closed_at: string | null; notes: string | null; created_at: string }
export type RecallItem = { id: string; recall_id: string; node_type: string; node_id: string; label: string | null; lot_id: string | null; partner_id: string | null; quantity: number | null; notified: boolean }
export type TraceRow = { level: number; node_type: 'lot' | 'production_order' | 'delivery' | 'receipt'; node_id: string; label: string; lot_id: string | null; partner_id: string | null; quantity: number | null; ref_date: string | null }

export const REASON_KINDS: { value: ReasonKind; label: string }[] = [
  { value: 'downtime', label: 'Arrêt de production' }, { value: 'scrap', label: 'Rebut' }, { value: 'failure', label: 'Cause de panne' }, { value: 'defect', label: 'Défaut qualité' }, { value: 'return', label: 'Retour' }, { value: 'adjustment', label: 'Ajustement de stock' },
]
export const INSPECTION_KINDS = [{ value: 'incoming', label: 'Réception' }, { value: 'in_process', label: 'En cours de production' }, { value: 'final', label: 'Finale' }]
export const SAMPLING_METHODS = [{ value: 'all', label: '100 % des unités' }, { value: 'percent', label: 'Pourcentage' }, { value: 'fixed', label: 'Taille fixe' }, { value: 'aql', label: 'AQL' }]
export const POINT_KINDS = [{ value: 'pass_fail', label: 'Conforme / non conforme' }, { value: 'measurement', label: 'Mesure (tolérance)' }, { value: 'visual', label: 'Contrôle visuel' }]
export const SEVERITIES = [{ value: 'minor', label: 'Mineure' }, { value: 'major', label: 'Majeure' }, { value: 'critical', label: 'Critique' }]
export const NCR_STATUS = [{ value: 'open', label: 'Ouverte' }, { value: 'investigating', label: 'Analyse' }, { value: 'contained', label: 'Contenue' }, { value: 'closed', label: 'Clôturée' }, { value: 'cancelled', label: 'Annulée' }]
export const CAPA_STATUS = [{ value: 'open', label: 'Ouverte' }, { value: 'in_progress', label: 'En cours' }, { value: 'done', label: 'Réalisée' }, { value: 'verified', label: 'Vérifiée' }, { value: 'cancelled', label: 'Annulée' }]
