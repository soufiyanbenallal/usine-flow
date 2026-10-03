export type Department = { id: string; organization_id: string; site_id: string | null; code: string; name: string; manager_name: string | null; active: boolean; created_at: string }
export type Team = { id: string; organization_id: string; department_id: string | null; name: string; lead_name: string | null; active: boolean; created_at: string }
export type Shift = { id: string; organization_id: string; name: string; start_time: string; end_time: string; break_minutes: number; days: number[]; active: boolean; created_at: string }
export type Employee = {
  id: string; organization_id: string; code: string; full_name: string; department_id: string | null; team_id: string | null; shift_id: string | null; user_id: string | null; position: string | null; hire_date: string | null
  phone: string | null; email: string | null; cnss_number: string | null; cin: string | null; hourly_cost: number; status: 'active' | 'on_leave' | 'inactive'; is_operator: boolean; notes: string | null; created_at: string
}
export type Skill = { id: string; organization_id: string; name: string; description: string | null; created_at: string }
export type EmployeeSkill = { id: string; employee_id: string; skill_id: string; level: number }
export type EmployeeCertification = { id: string; employee_id: string; name: string; issuer: string | null; issued_on: string | null; expires_on: string | null; file_path: string | null }
export type ShiftAssignment = { id: string; employee_id: string; shift_id: string; work_date: string }
export type Attendance = {
  id: string; employee_id: string; work_date: string; check_in: string | null; check_out: string | null; status: 'present' | 'absent' | 'late' | 'leave' | 'holiday'; worked_minutes: number; overtime_minutes: number; approved: boolean; notes: string | null
}
export type Absence = { id: string; employee_id: string; kind: 'leave' | 'sick' | 'unpaid' | 'training' | 'other'; from_date: string; to_date: string; status: 'requested' | 'approved' | 'rejected' | 'cancelled'; reason: string | null }
export type TimeLog = {
  id: string; employee_id: string; production_order_id: string | null; operation_id: string | null; work_order_id: string | null; started_at: string; ended_at: string | null; minutes: number; hourly_cost: number; cost: number; approved: boolean; notes: string | null
}

export const EMPLOYEE_STATUS = [{ value: 'active', label: 'Actif' }, { value: 'on_leave', label: 'En congé' }, { value: 'inactive', label: 'Inactif' }]
export const ATTENDANCE_STATUS = [{ value: 'present', label: 'Présent' }, { value: 'late', label: 'En retard' }, { value: 'absent', label: 'Absent' }, { value: 'leave', label: 'Congé' }, { value: 'holiday', label: 'Jour férié' }]
export const ABSENCE_KINDS = [{ value: 'leave', label: 'Congé payé' }, { value: 'sick', label: 'Maladie' }, { value: 'unpaid', label: 'Sans solde' }, { value: 'training', label: 'Formation' }, { value: 'other', label: 'Autre' }]
export const ABSENCE_STATUS = [{ value: 'requested', label: 'Demandée' }, { value: 'approved', label: 'Approuvée' }, { value: 'rejected', label: 'Refusée' }, { value: 'cancelled', label: 'Annulée' }]
export const WEEK_DAYS = [{ value: 1, label: 'Lun' }, { value: 2, label: 'Mar' }, { value: 3, label: 'Mer' }, { value: 4, label: 'Jeu' }, { value: 5, label: 'Ven' }, { value: 6, label: 'Sam' }, { value: 0, label: 'Dim' }]
