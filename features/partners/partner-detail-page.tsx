'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { Users } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { formatMoney } from '@/lib/format'
import { ChildTable } from '../_core/child-table'
import { RecordEditor } from '../_core/record-editor'
import { ALL_PARTNER_FIELDS } from './fields'
import { EntityHistory } from '../audit/entity-history'
import { AttachmentsPanel } from '../documents/attachments-panel'
import { useOrgPath } from '../organization/context'
import { useCan } from '../organization/permissions'
import { addressHooks, contactHooks, partnerHooks, usePartnerBalances } from './hooks'
import { ADDRESS_KINDS, KIND_LABELS, type Partner, type PartnerAddress, type PartnerContact } from './types'

const contactColumns: DataTableColumn<PartnerContact>[] = [
  { key: 'name', label: 'Nom', value: (c) => c.name },
  { key: 'role', label: 'Fonction', value: (c) => c.role ?? '—' },
  { key: 'email', label: 'E-mail', value: (c) => c.email ?? '—' },
  { key: 'phone', label: 'Téléphone', value: (c) => c.phone ?? '—' },
  { key: 'primary', label: 'Principal', value: (c) => (c.is_primary ? 'Oui' : '') },
]
const addressColumns: DataTableColumn<PartnerAddress>[] = [
  { key: 'kind', label: 'Type', value: (a) => ADDRESS_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind },
  { key: 'line1', label: 'Adresse', value: (a) => [a.line1, a.line2].filter(Boolean).join(', ') },
  { key: 'city', label: 'Ville', value: (a) => [a.postal_code, a.city].filter(Boolean).join(' ') || '—' },
  { key: 'country', label: 'Pays', value: (a) => a.country },
  { key: 'default', label: 'Par défaut', value: (a) => (a.is_default ? 'Oui' : '') },
]

/** Partner sheet: legal identity, contacts, addresses, balances (receivable / payable), files and history. */
export function PartnerDetailPage({ backPath }: { backPath: string }) {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const canWrite = useCan('partners.write')
  const one = partnerHooks.useOne(id)
  const balances = usePartnerBalances()
  const p = one.data
  const bal = balances.data?.find((b) => b.partner_id === id)
  return (
    <PageShell
      title={p ? `${p.code} — ${p.name}` : 'Partenaire'}
      icon={Users}
      error={one.error?.message}
      actions={
        <Link href={href(backPath)}>
          <Button variant="secondary">Retour</Button>
        </Link>
      }
    >
      {p && (
        <>
          {bal && bal.receivable_overdue > 0 && <Banner tone="warning">Impayés clients : {formatMoney(bal.receivable_overdue)} en retard.</Banner>}
          {p.credit_limit > 0 && bal && bal.receivable > p.credit_limit && <Banner tone="critical">Plafond de crédit dépassé ({formatMoney(bal.receivable)} / {formatMoney(p.credit_limit)}).</Banner>}
          <Panel title="Synthèse">
            <dl className="grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-muted-foreground">Rôles</dt><dd className="font-medium">{p.kinds.map((k) => KIND_LABELS[k]).join(', ')}</dd></div>
              <div><dt className="text-muted-foreground">Encours client</dt><dd className="font-medium">{formatMoney(bal?.receivable ?? 0)}</dd></div>
              <div><dt className="text-muted-foreground">À payer fournisseur</dt><dd className="font-medium">{formatMoney(bal?.payable ?? 0)}</dd></div>
              <div><dt className="text-muted-foreground">Plafond de crédit</dt><dd className="font-medium">{p.credit_limit > 0 ? formatMoney(p.credit_limit) : 'Illimité'}</dd></div>
            </dl>
          </Panel>
          <RecordEditor<Partner> title="Informations légales et commerciales" hooks={partnerHooks} row={p} fields={ALL_PARTNER_FIELDS} permission="partners.write" />
          <ChildTable<PartnerContact>
            title="Contacts"
            singular="contact"
            hooks={contactHooks}
            fk="partner_id"
            parentId={p.id}
            canEdit={canWrite}
            columns={contactColumns}
            fields={[
              { key: 'name', label: 'Nom', required: true },
              { key: 'role', label: 'Fonction' },
              { key: 'email', label: 'E-mail', type: 'email' },
              { key: 'phone', label: 'Téléphone', type: 'phone' },
              { key: 'is_primary', label: 'Contact principal', type: 'checkbox' },
            ]}
          />
          <ChildTable<PartnerAddress>
            title="Adresses"
            singular="adresse"
            hooks={addressHooks}
            fk="partner_id"
            parentId={p.id}
            canEdit={canWrite}
            columns={addressColumns}
            fields={[
              { key: 'kind', label: 'Type', type: 'select', options: ADDRESS_KINDS, required: true, default: 'billing' },
              { key: 'line1', label: 'Adresse', required: true },
              { key: 'line2', label: 'Complément' },
              { key: 'city', label: 'Ville' },
              { key: 'postal_code', label: 'Code postal' },
              { key: 'country', label: 'Pays', default: 'MA' },
              { key: 'is_default', label: 'Adresse par défaut', type: 'checkbox' },
            ]}
          />
          <AttachmentsPanel entityType="partners" entityId={p.id} title="Documents du partenaire" />
          <EntityHistory entity="partners" entityId={p.id} />
        </>
      )}
    </PageShell>
  )
}
