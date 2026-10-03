'use client'

import { Users } from 'lucide-react'
import { useMemo } from 'react'
import type { DataTableColumn, DataTableFilter } from '@/components/data-table'
import { formatMoney } from '@/lib/format'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { partnerFields } from './fields'
import { partnerHooks, usePartnerBalances } from './hooks'
import { KIND_LABELS, type Partner, type PartnerKind } from './types'

const KIND_CONFIG: Record<'customer' | 'supplier' | 'other', { title: string; singular: string; kinds: PartnerKind[]; description: string; path: string }> = {
  customer: { title: 'Clients', singular: 'client', kinds: ['customer'], description: 'Entreprises clientes : conditions de paiement, plafond de crédit, liste de prix, encours.', path: 'catalogue/clients' },
  supplier: { title: 'Fournisseurs', singular: 'fournisseur', kinds: ['supplier'], description: 'Fournisseurs : délais, conditions, catalogue, performance et historique d’achats.', path: 'catalogue/fournisseurs' },
  other: { title: 'Autres partenaires', singular: 'partenaire', kinds: ['subcontractor', 'transporter', 'other'], description: 'Sous-traitants, transporteurs et autres partenaires.', path: 'catalogue/partenaires' },
}

/** Business partners: customers, suppliers, subcontractors, transporters (one shared model, filtered per page). */
export function PartnersPage({ variant }: { variant: 'customer' | 'supplier' | 'other' }) {
  const cfg = KIND_CONFIG[variant]
  const balances = usePartnerBalances()
  const byPartner = useMemo(() => new Map((balances.data ?? []).map((b) => [b.partner_id, b])), [balances.data])
  const columns: DataTableColumn<Partner>[] = [
    { key: 'code', label: 'Code', value: (p) => p.code },
    { key: 'name', label: 'Raison sociale', value: (p) => p.name },
    { key: 'kinds', label: 'Rôle', value: (p) => p.kinds.map((k) => KIND_LABELS[k]).join(', ') },
    { key: 'contact', label: 'Contact', value: (p) => [p.email, p.phone].filter(Boolean).join(' · ') || '—' },
    { key: 'terms', label: 'Paiement (j)', align: 'right', value: (p) => p.payment_terms_days },
    ...(variant === 'customer'
      ? [
          { key: 'credit', label: 'Plafond crédit', align: 'right' as const, value: (p: Partner) => p.credit_limit, render: (p: Partner) => (p.credit_limit > 0 ? formatMoney(p.credit_limit) : 'Illimité') },
          { key: 'receivable', label: 'Encours', align: 'right' as const, value: (p: Partner) => byPartner.get(p.id)?.receivable ?? 0, render: (p: Partner) => formatMoney(byPartner.get(p.id)?.receivable ?? 0) },
        ]
      : []),
    ...(variant === 'supplier'
      ? [
          { key: 'lead', label: 'Délai (j)', align: 'right' as const, value: (p: Partner) => p.lead_time_days },
          { key: 'payable', label: 'À payer', align: 'right' as const, value: (p: Partner) => byPartner.get(p.id)?.payable ?? 0, render: (p: Partner) => formatMoney(byPartner.get(p.id)?.payable ?? 0) },
        ]
      : []),
    { key: 'active', label: 'Statut', value: (p) => (p.active ? 'Actif' : 'Inactif'), render: (p) => <Pill tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Actif' : 'Inactif'}</Pill> },
  ]
  const kindFilter: DataTableFilter<Partner> | undefined =
    variant === 'other'
      ? { label: 'Rôle', options: cfg.kinds.map((k) => ({ value: k, label: KIND_LABELS[k] })), getValue: (p) => p.kinds.find((k) => cfg.kinds.includes(k)) ?? '' }
      : undefined
  return (
    <EntityPage<Partner>
      title={cfg.title}
      singular={cfg.singular}
      icon={Users}
      description={cfg.description}
      hooks={partnerHooks}
      permission="partners.write"
      columns={columns}
      filter={kindFilter}
      select={(rows) => rows.filter((p) => p.kinds.some((k) => cfg.kinds.includes(k)))}
      detailPath={(p) => `${cfg.path}/${p.id}`}
      fields={partnerFields(variant)}
      createDefaults={variant === 'other' ? undefined : { kinds: cfg.kinds }}
      importConfig={
        variant === 'other'
          ? undefined
          : {
              fields: [
                { key: 'code', label: 'Code', required: true },
                { key: 'name', label: 'Raison sociale', required: true },
                { key: 'ice', label: 'ICE' },
                { key: 'email', label: 'E-mail' },
                { key: 'phone', label: 'Téléphone' },
                { key: 'payment_terms_days', label: 'Délai de paiement', kind: 'number', fallback: 30, min: 0 },
                ...(variant === 'customer' ? [{ key: 'credit_limit', label: 'Plafond de crédit', kind: 'number' as const, fallback: 0, min: 0 }] : []),
              ],
              example: { code: variant === 'customer' ? 'CLI-001' : 'FOU-001', name: variant === 'customer' ? 'Hôtel Atlas' : 'Atlas Steel', ice: '001234567000089', email: 'contact@exemple.ma', phone: '0522000000', payment_terms_days: 30 },
              templateName: `modele-${variant === 'customer' ? 'clients' : 'fournisseurs'}.csv`,
            }
      }
      exportName={variant === 'customer' ? 'clients' : variant === 'supplier' ? 'fournisseurs' : 'partenaires'}
    />
  )
}
