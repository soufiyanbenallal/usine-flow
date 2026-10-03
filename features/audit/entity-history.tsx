'use client'

import { formatDateTime } from '@/lib/format'
import { Panel } from '@/components/page-shell'
import { useEntityHistory } from './hooks'
import { ACTION_LABELS } from './types'
import { statusMeta } from '../_core/status'

const SKIP = new Set(['updated_at', 'updated_by', 'created_at', 'created_by', 'organization_id'])

/** Who changed what and when for a record (reads `audit_logs`, requires `audit.view`). */
export function EntityHistory({ entity, entityId }: { entity: string; entityId: string }) {
  const { data, isPending, error } = useEntityHistory(entity, entityId)
  if (error) return null
  return (
    <Panel title="Historique">
      {isPending && <p className="text-[13px] text-muted-foreground">Chargement…</p>}
      {data && data.length === 0 && <p className="text-[13px] text-muted-foreground">Aucun événement.</p>}
      <ol className="space-y-3">
        {data?.map((log) => (
          <li key={log.id} className="border-l-2 pl-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{ACTION_LABELS[log.action]}</strong>
              {log.action === 'status_change' && (
                <span className="text-muted-foreground">
                  {statusMeta(String(log.before?.status)).label} → {statusMeta(String(log.after?.status)).label}
                </span>
              )}
              <span className="text-muted-foreground">{formatDateTime(log.created_at)}</span>
              {log.ip && <span className="text-xs text-muted-foreground">IP {log.ip}</span>}
            </div>
            {log.action === 'update' && log.changed && log.changed.filter((k) => !SKIP.has(k)).length > 0 && (
              <ul className="mt-1 text-xs text-muted-foreground">
                {log.changed
                  .filter((k) => !SKIP.has(k))
                  .slice(0, 6)
                  .map((k) => (
                    <li key={k}>
                      <code>{k}</code> : {String(log.before?.[k] ?? '—')} → {String(log.after?.[k] ?? '—')}
                    </li>
                  ))}
              </ul>
            )}
            {log.reason && <p className="mt-1 text-xs">Motif : {log.reason}</p>}
          </li>
        ))}
      </ol>
    </Panel>
  )
}
