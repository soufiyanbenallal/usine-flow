'use client'

import { ListChecks } from 'lucide-react'
import { StatusPill } from '../_core/pill'
import { EntityPage } from '../_core/entity-page'
import type { DataTableColumn } from '@/components/data-table'
import { formatMoney } from '@/lib/format'
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '../organization/types'
import { policyHooks } from './hooks'
import { ENTITY_TYPES, entityTypeLabel, type ApprovalPolicy } from './types'

const columns: DataTableColumn<ApprovalPolicy>[] = [
  { key: 'name', label: 'Politique', value: (p) => p.name },
  { key: 'type', label: 'Document', value: (p) => entityTypeLabel(p.entity_type) },
  { key: 'min', label: 'À partir de', value: (p) => p.min_amount, align: 'right', render: (p) => formatMoney(p.min_amount) },
  { key: 'steps', label: 'Étapes', value: (p) => p.steps.map((s) => ROLE_LABELS[s.role]).join(' → ') },
  { key: 'active', label: 'Statut', value: (p) => (p.active ? 'Active' : 'Inactive'), render: (p) => <StatusPill map={{ active: { label: 'Active', tone: 'success' }, inactive: { label: 'Inactive', tone: 'neutral' } }} value={p.active ? 'active' : 'inactive'} /> },
]

const roleOptions = ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))

/** Approval policies: document type, amount threshold and up to three approval steps (roles). */
export function ApprovalPoliciesPage() {
  return (
    <EntityPage<ApprovalPolicy>
      title="Politiques d’approbation"
      singular="politique"
      icon={ListChecks}
      description="Exemple : achats > 50 000 DH → Responsable achats → Finance. Une politique inactive n’impose aucune approbation."
      hooks={policyHooks}
      permission="platform.manage"
      columns={columns}
      fields={[
        { key: 'name', label: 'Nom', required: true },
        { key: 'entity_type', label: 'Type de document', type: 'select', required: true, options: ENTITY_TYPES.map((e) => ({ value: e.value, label: e.label })) },
        { key: 'min_amount', label: 'Montant minimum (MAD)', type: 'money', min: 0, default: 0, required: true },
        { key: 'step1', label: 'Étape 1 — rôle', type: 'select', options: roleOptions, required: true },
        { key: 'step2', label: 'Étape 2 — rôle (optionnel)', type: 'select', options: roleOptions },
        { key: 'step3', label: 'Étape 3 — rôle (optionnel)', type: 'select', options: roleOptions },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ]}
      beforeSave={(payload) => {
        const steps = ['step1', 'step2', 'step3'].map((k) => payload[k]).filter(Boolean).map((role) => ({ role, label: ROLE_LABELS[role as keyof typeof ROLE_LABELS] }))
        const { step1: _1, step2: _2, step3: _3, ...rest } = payload
        void _1; void _2; void _3
        return { ...rest, steps }
      }}
      toValues={(row, base) => ({ ...base, step1: row.steps[0]?.role ?? '', step2: row.steps[1]?.role ?? '', step3: row.steps[2]?.role ?? '' })}
      modalTitle={(row) => (row ? `Modifier — ${row.name}` : 'Nouvelle politique')}
    />
  )
}
