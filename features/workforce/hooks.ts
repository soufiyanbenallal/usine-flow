'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { createCrudHooks, featureKey } from '../_core/crud-hooks'
import type { Option } from '../_core/form-values'
import { useOrganization } from '../organization/context'
import {
  absencesService, assignmentsService, attendanceService, certificationsService, departmentsService, employeeSkillsService, employeesService, shiftsService, skillsService, teamsService, timeLogsService, workforceApi,
} from './service'

export const departmentHooks = createCrudHooks('departments', departmentsService, ['options'])
export const teamHooks = createCrudHooks('teams', teamsService, ['options'])
export const shiftHooks = createCrudHooks('shifts', shiftsService, ['options'])
export const employeeHooks = createCrudHooks('employees', employeesService, ['options'])
export const skillHooks = createCrudHooks('skills', skillsService, ['options'])
export const employeeSkillHooks = createCrudHooks('employee_skills', employeeSkillsService)
export const certificationHooks = createCrudHooks('employee_certifications', certificationsService)
export const assignmentHooks = createCrudHooks('shift_assignments', assignmentsService)
export const attendanceHooks = createCrudHooks('attendance', attendanceService)
export const absenceHooks = createCrudHooks('absences', absencesService)
export const timeLogHooks = createCrudHooks('time_logs', timeLogsService)

export function useEmployeeOptions(): Option[] {
  const { data } = employeeHooks.useList()
  return useMemo(() => (data ?? []).filter((e) => e.status !== 'inactive').map((e) => ({ value: e.id, label: e.full_name, hint: e.code })), [data])
}
export function useEmployeeIndex() {
  const { data } = employeeHooks.useList()
  return useMemo(() => new Map((data ?? []).map((e) => [e.id, e])), [data])
}

/** The employee linked to the signed-in user (shop-floor operator identity). */
export function useMyEmployee() {
  const org = useOrganization()
  const { auth } = useAuth()
  return useQuery({ queryKey: [...featureKey(org.id, 'employees'), 'me', auth?.user.id], queryFn: () => workforceApi.employeeOfUser(org.id, auth!.user.id), enabled: !!auth })
}

export function useCheckInOut() {
  const org = useOrganization()
  const client = useQueryClient()
  const done = () => client.invalidateQueries({ queryKey: featureKey(org.id, 'attendance') })
  return {
    checkIn: useMutation<void, Error, string>({ mutationFn: (employeeId) => workforceApi.checkIn(org.id, employeeId), onSuccess: done }),
    checkOut: useMutation<void, Error, string>({ mutationFn: (employeeId) => workforceApi.checkOut(employeeId), onSuccess: done }),
  }
}
