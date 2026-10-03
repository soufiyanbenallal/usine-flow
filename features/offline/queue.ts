import { newId } from '@/lib/ids'
import { rpc } from '@/lib/rpc'
import { offlineDb, type QueuedOp } from './db'

export const QUEUE_EVENT = 'usineflow:queue'
const notify = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event(QUEUE_EVENT)) }

const DEVICE_KEY = 'usineflow.device'
export function deviceId(): string {
  try {
    let d = window.localStorage.getItem(DEVICE_KEY)
    if (!d) { d = newId(); window.localStorage.setItem(DEVICE_KEY, d) }
    return d
  } catch { return 'unknown' }
}

export type EnqueueInput = Pick<QueuedOp, 'organizationId' | 'type' | 'payload' | 'label'>

export async function enqueue(input: EnqueueInput): Promise<QueuedOp> {
  const db = offlineDb()
  if (!db) throw new Error('Stockage local indisponible.')
  const op: QueuedOp = { ...input, id: newId(), createdAt: new Date().toISOString(), status: 'pending', attempts: 0 }
  await db.queue.add(op)
  notify()
  return op
}

export const listQueue = async (organizationId: string) => (await offlineDb()?.queue.where('organizationId').equals(organizationId).sortBy('createdAt')) ?? []
export const removeOp = async (id: string) => { await offlineDb()?.queue.delete(id); notify() }

type ApplyResult = { status: 'applied' | 'rejected'; duplicate?: boolean; error?: string }

/** Pushes pending operations in order; stops at the first network failure so ordering is preserved. */
export async function syncQueue(organizationId: string, apply: (op: QueuedOp) => Promise<ApplyResult> = defaultApply): Promise<{ applied: number; rejected: number; remaining: number }> {
  const db = offlineDb()
  if (!db) return { applied: 0, rejected: 0, remaining: 0 }
  let applied = 0
  let rejected = 0
  for (const op of (await listQueue(organizationId)).filter((o) => o.status === 'pending')) {
    try {
      const res = await apply(op)
      if (res.status === 'applied') { await db.queue.delete(op.id); applied++ }
      else { await db.queue.update(op.id, { status: 'rejected', error: res.error, attempts: op.attempts + 1 }); rejected++ }
    } catch (e) {
      await db.queue.update(op.id, { attempts: op.attempts + 1, error: e instanceof Error ? e.message : String(e) })
      break
    }
  }
  notify()
  const remaining = await db.queue.where('organizationId').equals(organizationId).filter((o) => o.status === 'pending').count()
  return { applied, rejected, remaining }
}

const defaultApply = (op: QueuedOp) =>
  rpc<ApplyResult>('apply_client_operation', { p_org: op.organizationId, p_key: op.id, p_type: op.type, p_payload: op.payload, p_device: deviceId(), p_created: op.createdAt })
