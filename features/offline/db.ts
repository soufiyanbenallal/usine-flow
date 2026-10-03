import Dexie, { type EntityTable } from 'dexie'

export type QueuedOp = {
  id: string // idempotency key
  organizationId: string
  type: 'count_line' | 'pick_confirm' | 'task_complete' | 'production_report' | 'breakdown'
  payload: Record<string, unknown>
  label: string
  createdAt: string
  status: 'pending' | 'rejected'
  attempts: number
  error?: string
}

class OfflineDb extends Dexie {
  queue!: EntityTable<QueuedOp, 'id'>
  constructor() {
    super('usineflow-offline')
    this.version(1).stores({ queue: 'id, organizationId, status, createdAt' })
  }
}

let instance: OfflineDb | null = null
/** Lazily opened (IndexedDB is unavailable during SSR and in some private modes). */
export function offlineDb(): OfflineDb | null {
  if (typeof indexedDB === 'undefined') return null
  instance ??= new OfflineDb()
  return instance
}
