'use client'

import { History } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '@xco-agency/corex-ui'
import { PageShell } from '@/components/page-shell'
import { ServerTable, type ServerColumn, type ServerFilter } from '@/components/server-table'
import { formatDateTime } from '@/lib/format'
import { auditHooks } from './hooks'
import { ACTION_LABELS, ENTITY_LABELS, entityLabel, type AuditLog } from './types'

const columns: ServerColumn<AuditLog>[] = [
  { key: 'created_at', label: 'Date', sortKey: 'created_at', width: 170, render: (r) => formatDateTime(r.created_at) },
  { key: 'action', label: 'Action', sortKey: 'action', width: 150, render: (r) => ACTION_LABELS[r.action] },
  { key: 'entity', label: 'Objet', sortKey: 'entity', width: 180, render: (r) => entityLabel(r.entity) },
  { key: 'entity_id', label: 'Identifiant', width: 200, render: (r) => <code className="text-xs">{r.entity_id}</code> },
  { key: 'user', label: 'Utilisateur', width: 120, render: (r) => <code className="text-xs">{r.user_id?.slice(0, 8) ?? 'système'}</code> },
  { key: 'source', label: 'Source', width: 100, render: (r) => r.source },
  { key: 'ip', label: 'IP', width: 120, render: (r) => r.ip ?? '—' },
]

const filters: ServerFilter[] = [
  { key: 'entity', label: 'Tous les objets', options: Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })) },
  { key: 'action', label: 'Toutes les actions', options: Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })) },
]

export function AuditPage() {
  const [selected, setSelected] = useState<AuditLog | null>(null)
  return (
    <PageShell title="Journal d’audit" icon={History} description="Historique immuable : qui a changé quoi, quand, depuis où. Réservé aux rôles disposant du droit « audit ».">
      <ServerTable<AuditLog> hooks={auditHooks} columns={columns} filters={filters} searchColumns={['entity_id', 'entity']} defaultSort={{ key: 'created_at' }} onOpen={setSelected} />
      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected ? `${entityLabel(selected.entity)} — ${ACTION_LABELS[selected.action]}` : ''} primaryAction={{ content: 'Fermer', onAction: () => setSelected(null) }}>
        {selected && (
          <div className="grid gap-3 p-4 text-xs md:grid-cols-2">
            <div>
              <p className="mb-1 font-semibold">Avant</p>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-2">{JSON.stringify(selected.before, null, 2)}</pre>
            </div>
            <div>
              <p className="mb-1 font-semibold">Après</p>
              <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-2">{JSON.stringify(selected.after, null, 2)}</pre>
            </div>
            <p className="md:col-span-2 text-muted-foreground">
              Appareil : {selected.device ?? '—'} · Corrélation : {selected.correlation_id ?? '—'} · Motif : {selected.reason ?? '—'}
            </p>
          </div>
        )}
      </Modal>
    </PageShell>
  )
}
