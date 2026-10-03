'use client'

import { Banner, Button, TextField } from '@xco-agency/corex-ui'
import { CheckSquare } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { PageShell, Panel } from '@/components/page-shell'
import { useAuth } from '@/lib/auth'
import { formatDateTime, formatMoney } from '@/lib/format'
import { Status } from '../_core/status'
import { useOrgPath } from '../organization/context'
import { useCan } from '../organization/permissions'
import { ROLE_LABELS } from '../organization/types'
import { useApprovalSteps, useCancelApproval, useDecideApproval, requestHooks } from './hooks'
import { entityTypeLabel, entityTypePath, type ApprovalRequest } from './types'

function RequestCard({ request, steps, canDecide }: { request: ApprovalRequest; steps: ReturnType<typeof useApprovalSteps>['data']; canDecide: boolean }) {
  const href = useOrgPath()
  const { auth } = useAuth()
  const decide = useDecideApproval()
  const cancel = useCancelApproval()
  const [comment, setComment] = useState('')
  const mine = steps?.filter((s) => s.request_id === request.id) ?? []
  const link = entityTypePath(request.entity_type, request.entity_id)
  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {entityTypeLabel(request.entity_type)} — {request.summary ?? request.entity_id}
          </p>
          <p className="text-xs text-muted-foreground">
            Montant {formatMoney(request.amount)} · demandé le {formatDateTime(request.created_at)}
          </p>
        </div>
        <Status value={request.status} />
      </div>
      <ol className="mt-3 flex flex-wrap gap-2 text-xs">
        {mine.map((s) => (
          <li key={s.id} className="flex items-center gap-1 rounded-full border px-2 py-1">
            <span className="font-medium">{s.step_no}.</span> {s.label ?? ROLE_LABELS[s.role]} <Status value={s.status} />
          </li>
        ))}
      </ol>
      {request.status === 'pending' && (
        <div className="mt-3 space-y-2">
          {decide.error && <Banner tone="critical">{decide.error.message}</Banner>}
          {canDecide && (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <TextField label="Commentaire" value={comment} onChange={setComment} />
              <Button variant="primary" loading={decide.isPending} onClick={() => decide.mutate({ requestId: request.id, approve: true, comment })}>
                Approuver
              </Button>
              <Button tone="critical" variant="secondary" loading={decide.isPending} onClick={() => decide.mutate({ requestId: request.id, approve: false, comment })}>
                Rejeter
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            {link && (
              <Link href={href(link)}>
                <Button variant="tertiary">Ouvrir le document</Button>
              </Link>
            )}
            {request.requested_by === auth?.user.id && (
              <Button variant="tertiary" tone="critical" onClick={() => cancel.mutate(request.id)}>
                Annuler la demande
              </Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  )
}

/** Approval inbox: pending requests with step progress, approve / reject with comment, history below. */
export function ApprovalsPage() {
  const list = requestHooks.useList()
  const canDecide = useCan('approvals.decide')
  const rows = list.data ?? []
  const steps = useApprovalSteps(rows.slice(0, 100))
  const pending = rows.filter((r) => r.status === 'pending')
  const history = rows.filter((r) => r.status !== 'pending').slice(0, 30)
  return (
    <PageShell title="Approbations" icon={CheckSquare} description="Demandes en attente de décision selon les politiques d’approbation (montants, rôles, étapes)." error={list.error?.message}>
      <h2 className="text-sm font-semibold">En attente ({pending.length})</h2>
      {pending.length === 0 && <p className="text-[13px] text-muted-foreground">Aucune demande en attente.</p>}
      {pending.map((r) => (
        <RequestCard key={r.id} request={r} steps={steps.data} canDecide={canDecide} />
      ))}
      {history.length > 0 && <h2 className="pt-2 text-sm font-semibold">Historique</h2>}
      {history.map((r) => (
        <RequestCard key={r.id} request={r} steps={steps.data} canDecide={false} />
      ))}
    </PageShell>
  )
}
