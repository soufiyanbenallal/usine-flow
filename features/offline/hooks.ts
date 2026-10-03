'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { useOrganization } from '../organization/context'
import { QUEUE_EVENT, enqueue, listQueue, syncQueue, type EnqueueInput } from './queue'
import type { QueuedOp } from './db'

const subscribeOnline = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb) }
}
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)

/** Operations waiting on this device for the current organization (refreshes on every queue change). */
export function useQueue() {
  const org = useOrganization()
  const [ops, setOps] = useState<QueuedOp[]>([])
  useEffect(() => {
    let live = true
    const load = () => { void listQueue(org.id).then((o) => live && setOps(o)).catch(() => undefined) }
    load()
    window.addEventListener(QUEUE_EVENT, load)
    return () => { live = false; window.removeEventListener(QUEUE_EVENT, load) }
  }, [org.id])
  return ops
}

/** Syncs when the connection comes back and every minute while online with pending operations. */
export function useAutoSync() {
  const org = useOrganization()
  const online = useOnline()
  const ops = useQueue()
  const pending = ops.filter((o) => o.status === 'pending').length
  const [syncing, setSyncing] = useState(false)
  const sync = useCallback(async () => {
    setSyncing(true)
    try { return await syncQueue(org.id) } finally { setSyncing(false) }
  }, [org.id])
  useEffect(() => {
    if (!online || pending === 0) return
    const first = setTimeout(() => void sync(), 0)
    const t = setInterval(() => void sync(), 60_000)
    return () => { clearTimeout(first); clearInterval(t) }
  }, [online, pending, sync])
  return { online, pending, syncing, sync, ops }
}

/** Runs `run` when online; falls back to the local queue when offline or when the network call fails. */
export function useRunOrQueue() {
  const org = useOrganization()
  return useCallback(async (input: Omit<EnqueueInput, 'organizationId'>, run: () => Promise<unknown>): Promise<'done' | 'queued'> => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try { await run(); return 'done' } catch (e) {
        if (!(e instanceof TypeError) && !/fetch|network/i.test(e instanceof Error ? e.message : '')) throw e
      }
    }
    await enqueue({ ...input, organizationId: org.id })
    return 'queued'
  }, [org.id])
}
