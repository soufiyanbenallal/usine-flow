'use client'

import { Button } from '@xco-agency/corex-ui'
import { Award, CalendarOff, Clock, Network, Timer, UserCheck, Users } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { addDays, format, startOfWeek } from 'date-fns'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { formatDate, formatDateTime, formatMoney } from '@/lib/format'
import { ChildTable } from '../_core/child-table'
import { EntityPage } from '../_core/entity-page'
import { useListOptions } from '../_core/options'
import { Pill } from '../_core/pill'
import { RecordEditor } from '../_core/record-editor'
import { EntityHistory } from '../audit/entity-history'
import { AttachmentsPanel } from '../documents/attachments-panel'
import { useOrgPath } from '../organization/context'
import { useCan } from '../organization/permissions'
import {
  absenceHooks, assignmentHooks, attendanceHooks, certificationHooks, departmentHooks, employeeHooks, employeeSkillHooks, shiftHooks, skillHooks, teamHooks, timeLogHooks,
  useCheckInOut, useEmployeeIndex, useEmployeeOptions, useMyEmployee,
} from './hooks'
import {
  ABSENCE_KINDS, ABSENCE_STATUS, ATTENDANCE_STATUS, EMPLOYEE_STATUS, WEEK_DAYS,
  type Absence, type Attendance, type Department, type Employee, type EmployeeCertification, type EmployeeSkill, type Shift, type Skill, type Team, type TimeLog,
} from './types'

const TONE = { active: 'success', on_leave: 'warning', inactive: 'neutral', present: 'success', late: 'warning', absent: 'critical', leave: 'info', holiday: 'neutral', requested: 'warning', approved: 'success', rejected: 'critical', cancelled: 'neutral' } as const
const label = (list: { value: string | number; label: string }[], v: string | number) => list.find((o) => o.value === v)?.label ?? String(v)
const statusPill = (list: { value: string; label: string }[], v: keyof typeof TONE) => <Pill tone={TONE[v] ?? 'neutral'}>{label(list, v)}</Pill>
const useDepartmentOptions = () => useListOptions('departments', 'name', 'code')
const useTeamOptions = () => useListOptions('teams')
const useShiftOptions = () => useListOptions('shifts')
const useSkillOptions = () => useListOptions('skills')
const hhmm = (t: string) => t.slice(0, 5)
const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`

const EMPLOYEE_FIELDS = [
  { key: 'code', label: 'Matricule', required: true, lockedOnEdit: true },
  { key: 'full_name', label: 'Nom complet', required: true },
  { key: 'position', label: 'Poste / fonction' },
  { key: 'department_id', label: 'Département', type: 'relation' as const, useOptions: useDepartmentOptions, clearable: true },
  { key: 'team_id', label: 'Équipe', type: 'relation' as const, useOptions: useTeamOptions, clearable: true },
  { key: 'shift_id', label: 'Horaire par défaut', type: 'relation' as const, useOptions: useShiftOptions, clearable: true },
  { key: 'hire_date', label: 'Date d’embauche', type: 'date' as const },
  { key: 'status', label: 'Statut', type: 'select' as const, options: EMPLOYEE_STATUS, required: true, default: 'active' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'email', label: 'Email' },
  { key: 'cnss_number', label: 'N° CNSS' },
  { key: 'cin', label: 'CIN' },
  { key: 'hourly_cost', label: 'Coût horaire (MAD)', type: 'money' as const, min: 0, default: 0, help: 'Utilisé pour la main-d’œuvre dans le coût de revient.' },
  { key: 'is_operator', label: 'Opérateur de production', type: 'checkbox' as const, default: true },
  { key: 'notes', label: 'Notes', type: 'textarea' as const, wide: true },
]

/* ───────── employees ───────── */
export function EmployeesPage() {
  const depts = useListOptions('departments', 'name', 'code')
  const columns: DataTableColumn<Employee>[] = [
    { key: 'code', label: 'Matricule', value: (e) => e.code },
    { key: 'name', label: 'Nom', value: (e) => e.full_name },
    { key: 'position', label: 'Poste', value: (e) => e.position ?? '—' },
    { key: 'dept', label: 'Département', value: (e) => depts.find((d) => d.value === e.department_id)?.label ?? '—' },
    { key: 'status', label: 'Statut', value: (e) => e.status, render: (e) => statusPill(EMPLOYEE_STATUS, e.status) },
    { key: 'cost', label: 'Coût horaire', align: 'right', value: (e) => formatMoney(e.hourly_cost) },
  ]
  return (
    <EntityPage<Employee>
      title="Employés" singular="employé" icon={Users} description="Opérateurs et personnel : département, équipe, horaire, coût horaire, CNSS." hooks={employeeHooks} permission="workforce.write" columns={columns} fields={EMPLOYEE_FIELDS}
      filter={{ label: 'Statut', options: EMPLOYEE_STATUS, getValue: (e) => e.status }} detailPath={(e) => `equipe/employes/${e.id}`} exportName="employes"
      importConfig={{
        templateName: 'employes',
        example: { code: 'EMP-001', full_name: 'Karim Alaoui', position: 'Opérateur', hourly_cost: 35 },
        fields: [
          { key: 'code', label: 'Matricule', aliases: ['code'], required: true }, { key: 'full_name', label: 'Nom complet', aliases: ['full_name', 'nom'], required: true }, { key: 'position', label: 'Poste', aliases: ['position'] },
          { key: 'hourly_cost', label: 'Coût horaire', aliases: ['hourly_cost'], kind: 'number', fallback: 0 },
        ],
      }}
    />
  )
}

const SKILL_LINK_FIELDS = [
  { key: 'skill_id', label: 'Compétence', type: 'relation' as const, useOptions: useSkillOptions, required: true },
  { key: 'level', label: 'Niveau (1–5)', type: 'number' as const, min: 1, default: 1, required: true },
]
const CERT_FIELDS = [
  { key: 'name', label: 'Habilitation / certificat', required: true },
  { key: 'issuer', label: 'Organisme' },
  { key: 'issued_on', label: 'Délivré le', type: 'date' as const },
  { key: 'expires_on', label: 'Expire le', type: 'date' as const },
]

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const can = useCan('workforce.write')
  const one = employeeHooks.useOne(id)
  const skills = useListOptions('skills')
  const e = one.data
  return (
    <PageShell title={e ? `${e.code} — ${e.full_name}` : 'Employé'} icon={Users} error={one.error?.message} actions={<Link href={href('equipe/employes')}><Button variant="secondary">Employés</Button></Link>}>
      {e && (
        <>
          <RecordEditor<Employee> title="Fiche employé" hooks={employeeHooks} row={e} fields={EMPLOYEE_FIELDS} permission="workforce.write" />
          <ChildTable<EmployeeSkill>
            title="Compétences" singular="compétence" hooks={employeeSkillHooks} fk="employee_id" parentId={e.id} canEdit={can} fields={SKILL_LINK_FIELDS}
            columns={[
              { key: 'skill', label: 'Compétence', value: (s) => skills.find((o) => o.value === s.skill_id)?.label ?? s.skill_id },
              { key: 'level', label: 'Niveau', value: (s) => '●'.repeat(s.level) + '○'.repeat(Math.max(0, 5 - s.level)) },
            ]}
          />
          <ChildTable<EmployeeCertification>
            title="Habilitations et certificats" singular="habilitation" hooks={certificationHooks} fk="employee_id" parentId={e.id} canEdit={can} fields={CERT_FIELDS}
            columns={[
              { key: 'name', label: 'Habilitation', value: (c) => c.name },
              { key: 'issuer', label: 'Organisme', value: (c) => c.issuer ?? '—' },
              { key: 'expires', label: 'Expiration', value: (c) => formatDate(c.expires_on), render: (c) => <ExpiryPill date={c.expires_on} /> },
            ]}
          />
          <AttachmentsPanel entityType="employees" entityId={e.id} kind="certificate" title="Documents (contrat, certificats)" />
          <EntityHistory entity="employees" entityId={e.id} />
        </>
      )}
    </PageShell>
  )
}

const TODAY = () => new Date().toISOString().slice(0, 10)
function ExpiryPill({ date }: { date: string | null }) {
  if (!date) return <Pill tone="neutral">Sans expiration</Pill>
  const days = Math.ceil((new Date(date).getTime() - new Date(TODAY()).getTime()) / 86_400_000)
  if (days < 0) return <Pill tone="critical">Expirée</Pill>
  if (days <= 30) return <Pill tone="warning">Dans {days} j</Pill>
  return <Pill tone="success">{formatDate(date)}</Pill>
}

/* ───────── departments / teams / skills ───────── */
export function DepartmentsPage() {
  const columns: DataTableColumn<Department>[] = [
    { key: 'code', label: 'Code', value: (d) => d.code }, { key: 'name', label: 'Nom', value: (d) => d.name }, { key: 'mgr', label: 'Responsable', value: (d) => d.manager_name ?? '—' },
    { key: 'active', label: 'Statut', value: (d) => (d.active ? 'Actif' : 'Inactif'), render: (d) => <Pill tone={d.active ? 'success' : 'neutral'}>{d.active ? 'Actif' : 'Inactif'}</Pill> },
  ]
  return (
    <EntityPage<Department> title="Départements" singular="département" icon={Network} hooks={departmentHooks} permission="workforce.write" columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true }, { key: 'name', label: 'Nom', required: true }, { key: 'manager_name', label: 'Responsable' },
        { key: 'site_id', label: 'Site', type: 'relation', useOptions: () => useListOptions('sites'), clearable: true }, { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]} />
  )
}

export function TeamsPage() {
  const depts = useDepartmentOptions()
  const columns: DataTableColumn<Team>[] = [
    { key: 'name', label: 'Équipe', value: (t) => t.name }, { key: 'dept', label: 'Département', value: (t) => depts.find((d) => d.value === t.department_id)?.label ?? '—' }, { key: 'lead', label: 'Chef d’équipe', value: (t) => t.lead_name ?? '—' },
    { key: 'active', label: 'Statut', value: (t) => (t.active ? 'Actif' : 'Inactif'), render: (t) => <Pill tone={t.active ? 'success' : 'neutral'}>{t.active ? 'Actif' : 'Inactif'}</Pill> },
  ]
  return (
    <EntityPage<Team> title="Équipes" singular="équipe" icon={Users} hooks={teamHooks} permission="workforce.write" columns={columns}
      fields={[
        { key: 'name', label: 'Nom', required: true }, { key: 'department_id', label: 'Département', type: 'relation', useOptions: useDepartmentOptions, clearable: true },
        { key: 'lead_name', label: 'Chef d’équipe' }, { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]} />
  )
}

export function SkillsPage() {
  const columns: DataTableColumn<Skill>[] = [{ key: 'name', label: 'Compétence', value: (s) => s.name }, { key: 'desc', label: 'Description', value: (s) => s.description ?? '—' }]
  return (
    <EntityPage<Skill> title="Compétences" singular="compétence" icon={Award} description="Catalogue des compétences ; les niveaux sont saisis sur la fiche employé." hooks={skillHooks} permission="workforce.write" columns={columns}
      fields={[{ key: 'name', label: 'Nom', required: true }, { key: 'description', label: 'Description', type: 'textarea', wide: true }]} />
  )
}

/* ───────── certifications (all employees, expiring first) ───────── */
export function CertificationsPage() {
  const employees = useEmployeeIndex()
  const columns: DataTableColumn<EmployeeCertification>[] = [
    { key: 'emp', label: 'Employé', value: (c) => employees.get(c.employee_id)?.full_name ?? c.employee_id },
    { key: 'name', label: 'Habilitation', value: (c) => c.name }, { key: 'issuer', label: 'Organisme', value: (c) => c.issuer ?? '—' },
    { key: 'exp', label: 'Expiration', value: (c) => c.expires_on ?? '', render: (c) => <ExpiryPill date={c.expires_on} /> },
  ]
  return (
    <EntityPage<EmployeeCertification> title="Habilitations" singular="habilitation" icon={Award} description="Certificats et habilitations (CACES, électrique, sécurité…), avec alerte avant expiration." hooks={certificationHooks} permission="workforce.write" columns={columns}
      fields={[{ key: 'employee_id', label: 'Employé', type: 'relation', useOptions: useEmployeeOptions, required: true }, ...CERT_FIELDS]} />
  )
}

/* ───────── shifts ───────── */
export function ShiftsPage() {
  const columns: DataTableColumn<Shift>[] = [
    { key: 'name', label: 'Horaire', value: (s) => s.name }, { key: 'time', label: 'Plage', value: (s) => `${hhmm(s.start_time)} – ${hhmm(s.end_time)}` },
    { key: 'break', label: 'Pause', align: 'right', value: (s) => `${s.break_minutes} min` },
    { key: 'days', label: 'Jours', value: (s) => WEEK_DAYS.filter((d) => s.days.includes(d.value)).map((d) => d.label).join(' ') },
  ]
  return (
    <EntityPage<Shift> title="Horaires (shifts)" singular="horaire" icon={Clock} description="Équipes du matin, de l’après-midi et de nuit." hooks={shiftHooks} permission="workforce.write" columns={columns}
      fields={[
        { key: 'name', label: 'Nom', required: true }, { key: 'start_time', label: 'Début', placeholder: 'HH:MM', required: true, default: '08:00' }, { key: 'end_time', label: 'Fin', placeholder: 'HH:MM', required: true, default: '17:00' },
        { key: 'break_minutes', label: 'Pause (min)', type: 'number', min: 0, default: 60 }, { key: 'days', label: 'Jours travaillés', type: 'tags', help: '1 = lundi … 6 = samedi, 0 = dimanche', default: '1, 2, 3, 4, 5' },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      beforeSave={(p) => ({ ...p, days: (Array.isArray(p.days) ? p.days : String(p.days ?? '').split(',')).filter(Boolean).map(Number) })}
      toValues={(row, base) => ({ ...base, days: row.days.join(',') })} />
  )
}

/* ───────── weekly planning ───────── */
export function PlanningPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const can = useCan('workforce.write')
  const employees = employeeHooks.useList()
  const shifts = shiftHooks.useList()
  const assignments = assignmentHooks.useList()
  const create = assignmentHooks.useCreate()
  const remove = assignmentHooks.useRemove()
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const byKey = useMemo(() => new Map((assignments.data ?? []).map((a) => [`${a.employee_id}|${a.work_date}`, a])), [assignments.data])
  const shiftName = (id: string) => (shifts.data ?? []).find((s) => s.id === id)?.name ?? '?'
  const cycle = async (employeeId: string, date: string) => {
    const list = shifts.data ?? []
    if (!can || list.length === 0) return
    const cur = byKey.get(`${employeeId}|${date}`)
    const idx = cur ? list.findIndex((s) => s.id === cur.shift_id) : -1
    if (cur) await remove.mutateAsync(cur.id)
    if (idx + 1 < list.length) await create.mutateAsync({ employee_id: employeeId, shift_id: list[idx + 1].id, work_date: date })
  }
  const active = (employees.data ?? []).filter((e) => e.status !== 'inactive')
  return (
    <PageShell title="Planning" icon={CalendarOff} description="Cliquez une case pour parcourir les horaires de la journée (vide → matin → après-midi → nuit → vide)."
      actions={<><Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, -7))}>Semaine précédente</Button><Button variant="secondary" onClick={() => setWeekStart(addDays(weekStart, 7))}>Semaine suivante</Button></>}>
      <Panel title={`Semaine du ${format(weekStart, 'dd/MM/yyyy')}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr><th className="p-2 text-left">Employé</th>{days.map((d) => <th key={d.toISOString()} className="p-2 text-center font-medium">{format(d, 'EEE dd/MM')}</th>)}</tr></thead>
            <tbody>
              {active.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2 font-medium">{e.full_name}</td>
                  {days.map((d) => {
                    const date = format(d, 'yyyy-MM-dd')
                    const a = byKey.get(`${e.id}|${date}`)
                    return (
                      <td key={date} className="p-1 text-center">
                        <button type="button" disabled={!can || create.isPending || remove.isPending} onClick={() => cycle(e.id, date)} className="min-h-8 w-full rounded-md border px-2 py-1 text-xs hover:bg-secondary disabled:opacity-60">
                          {a ? shiftName(a.shift_id) : '·'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {active.length === 0 && <p className="text-[13px] text-muted-foreground">Aucun employé actif.</p>}
      </Panel>
    </PageShell>
  )
}

/* ───────── attendance ───────── */
export function AttendancePage() {
  const employees = useEmployeeIndex()
  const me = useMyEmployee()
  const { checkIn, checkOut } = useCheckInOut()
  const today = new Date().toISOString().slice(0, 10)
  const todays = attendanceHooks.useListBy('work_date', today)
  const mine = (todays.data ?? []).find((a) => a.employee_id === me.data?.id)
  const columns: DataTableColumn<Attendance>[] = [
    { key: 'date', label: 'Date', value: (a) => a.work_date, render: (a) => formatDate(a.work_date) },
    { key: 'emp', label: 'Employé', value: (a) => employees.get(a.employee_id)?.full_name ?? a.employee_id },
    { key: 'in', label: 'Arrivée', value: (a) => (a.check_in ? formatDateTime(a.check_in) : '—') },
    { key: 'out', label: 'Départ', value: (a) => (a.check_out ? formatDateTime(a.check_out) : '—') },
    { key: 'worked', label: 'Travaillé', align: 'right', value: (a) => hours(a.worked_minutes) },
    { key: 'ot', label: 'Heures sup.', align: 'right', value: (a) => (a.overtime_minutes ? hours(a.overtime_minutes) : '—') },
    { key: 'status', label: 'Statut', value: (a) => a.status, render: (a) => statusPill(ATTENDANCE_STATUS, a.status) },
  ]
  return (
    <EntityPage<Attendance>
      title="Présence" singular="pointage" icon={UserCheck} description="Pointage arrivée / départ, retards et heures supplémentaires." hooks={attendanceHooks} permission="workforce.write" columns={columns}
      filter={{ label: 'Statut', options: ATTENDANCE_STATUS, getValue: (a) => a.status }} exportName="presence"
      actions={me.data && (
        <>
          <Button variant="primary" loading={checkIn.isPending} disabled={!!mine?.check_in} onClick={() => checkIn.mutate(me.data!.id)}>Pointer l’arrivée</Button>
          <Button variant="secondary" loading={checkOut.isPending} disabled={!mine?.check_in || !!mine?.check_out} onClick={() => checkOut.mutate(me.data!.id)}>Pointer le départ</Button>
        </>
      )}
      fields={[
        { key: 'employee_id', label: 'Employé', type: 'relation', useOptions: useEmployeeOptions, required: true, lockedOnEdit: true }, { key: 'work_date', label: 'Date', type: 'date', required: true, lockedOnEdit: true },
        { key: 'status', label: 'Statut', type: 'select', options: ATTENDANCE_STATUS, required: true, default: 'present' },
        { key: 'check_in', label: 'Arrivée', type: 'datetime' }, { key: 'check_out', label: 'Départ', type: 'datetime' },
        { key: 'overtime_minutes', label: 'Heures sup. (min)', type: 'number', min: 0, default: 0 }, { key: 'approved', label: 'Approuvé', type: 'checkbox', default: false },
        { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
      ]} />
  )
}

/* ───────── absences ───────── */
export function AbsencesPage() {
  const employees = useEmployeeIndex()
  const columns: DataTableColumn<Absence>[] = [
    { key: 'emp', label: 'Employé', value: (a) => employees.get(a.employee_id)?.full_name ?? a.employee_id },
    { key: 'kind', label: 'Type', value: (a) => label(ABSENCE_KINDS, a.kind) },
    { key: 'from', label: 'Du', value: (a) => a.from_date, render: (a) => formatDate(a.from_date) },
    { key: 'to', label: 'Au', value: (a) => a.to_date, render: (a) => formatDate(a.to_date) },
    { key: 'status', label: 'Statut', value: (a) => a.status, render: (a) => statusPill(ABSENCE_STATUS, a.status) },
  ]
  return (
    <EntityPage<Absence> title="Absences et congés" singular="absence" icon={CalendarOff} hooks={absenceHooks} permission="workforce.write" columns={columns}
      filter={{ label: 'Statut', options: ABSENCE_STATUS, getValue: (a) => a.status }} exportName="absences"
      fields={[
        { key: 'employee_id', label: 'Employé', type: 'relation', useOptions: useEmployeeOptions, required: true }, { key: 'kind', label: 'Type', type: 'select', options: ABSENCE_KINDS, required: true, default: 'leave' },
        { key: 'from_date', label: 'Du', type: 'date', required: true }, { key: 'to_date', label: 'Au', type: 'date', required: true },
        { key: 'status', label: 'Statut', type: 'select', options: ABSENCE_STATUS, required: true, default: 'requested' }, { key: 'reason', label: 'Motif', type: 'textarea', wide: true },
      ]} />
  )
}

/* ───────── time logs (labour cost) ───────── */
export function TimeLogsPage() {
  const employees = useEmployeeIndex()
  const orders = useListOptions('production_orders', 'number', 'status')
  const columns: DataTableColumn<TimeLog>[] = [
    { key: 'emp', label: 'Employé', value: (l) => employees.get(l.employee_id)?.full_name ?? l.employee_id },
    { key: 'start', label: 'Début', value: (l) => l.started_at, render: (l) => formatDateTime(l.started_at) },
    { key: 'po', label: 'Ordre de fabrication', value: (l) => orders.find((o) => o.value === l.production_order_id)?.label ?? '—' },
    { key: 'min', label: 'Durée', align: 'right', value: (l) => hours(l.minutes) },
    { key: 'cost', label: 'Coût', align: 'right', value: (l) => formatMoney(l.cost) },
    { key: 'ok', label: 'Approuvé', value: (l) => (l.approved ? 'Oui' : 'Non'), render: (l) => <Pill tone={l.approved ? 'success' : 'warning'}>{l.approved ? 'Oui' : 'Non'}</Pill> },
  ]
  return (
    <EntityPage<TimeLog> title="Temps de travail" singular="temps" icon={Timer} description="Temps passé par ordre de fabrication ou intervention ; alimente le coût de main-d’œuvre." hooks={timeLogHooks} permission="workforce.write" columns={columns} exportName="temps"
      fields={[
        { key: 'employee_id', label: 'Employé', type: 'relation', useOptions: useEmployeeOptions, required: true }, { key: 'production_order_id', label: 'Ordre de fabrication', type: 'relation', useOptions: () => useListOptions('production_orders', 'number', 'status'), clearable: true },
        { key: 'started_at', label: 'Début', type: 'datetime', required: true }, { key: 'ended_at', label: 'Fin', type: 'datetime' },
        { key: 'minutes', label: 'Durée (min)', type: 'number', min: 0, default: 0 }, { key: 'approved', label: 'Approuvé', type: 'checkbox', default: false },
        { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
      ]}
      beforeSave={(p) => {
        const s = p.started_at ? new Date(String(p.started_at)).getTime() : 0
        const e = p.ended_at ? new Date(String(p.ended_at)).getTime() : 0
        return e > s ? { ...p, minutes: Math.round((e - s) / 60000) } : p
      }} />
  )
}

