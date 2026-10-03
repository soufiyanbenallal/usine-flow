import { createCrudService } from '../_core/crud-service'
import { requireSupabase } from '@/lib/supabase'
import { toUserError } from '@/lib/errors'
import type { Absence, Attendance, Department, Employee, EmployeeCertification, EmployeeSkill, Shift, ShiftAssignment, Skill, Team, TimeLog } from './types'

type P = Record<string, unknown>
const crud = <R extends { id: string }>(table: string, order?: { column: string; ascending?: boolean }) => createCrudService<R, P, P>(table, order ? { order } : {})
export const departmentsService = crud<Department>('departments', { column: 'code', ascending: true })
export const teamsService = crud<Team>('teams', { column: 'name', ascending: true })
export const shiftsService = crud<Shift>('shifts', { column: 'start_time', ascending: true })
export const employeesService = crud<Employee>('employees', { column: 'code', ascending: true })
export const skillsService = crud<Skill>('skills', { column: 'name', ascending: true })
export const employeeSkillsService = crud<EmployeeSkill>('employee_skills')
export const certificationsService = crud<EmployeeCertification>('employee_certifications', { column: 'expires_on', ascending: true })
export const assignmentsService = crud<ShiftAssignment>('shift_assignments', { column: 'work_date', ascending: true })
export const attendanceService = crud<Attendance>('attendance', { column: 'work_date', ascending: false })
export const absencesService = crud<Absence>('absences', { column: 'from_date', ascending: false })
export const timeLogsService = crud<TimeLog>('time_logs', { column: 'started_at', ascending: false })

export const workforceApi = {
  /** The employee record linked to a user account (operators logging in on the shop floor). */
  async employeeOfUser(organizationId: string, userId: string): Promise<Employee | null> {
    const { data, error } = await requireSupabase().from('employees').select('*').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle()
    if (error) throw toUserError(error)
    return (data as Employee | null) ?? null
  },
  async checkIn(organizationId: string, employeeId: string): Promise<void> {
    const { error } = await requireSupabase().from('attendance').upsert({ organization_id: organizationId, employee_id: employeeId, work_date: new Date().toISOString().slice(0, 10), check_in: new Date().toISOString(), status: 'present' }, { onConflict: 'employee_id,work_date' })
    if (error) throw toUserError(error)
  },
  async checkOut(employeeId: string): Promise<void> {
    const { error } = await requireSupabase().from('attendance').update({ check_out: new Date().toISOString() }).eq('employee_id', employeeId).eq('work_date', new Date().toISOString().slice(0, 10))
    if (error) throw toUserError(error)
  },
}
