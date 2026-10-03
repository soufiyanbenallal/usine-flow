'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '../organization/context'
import { featureKey } from '../_core/crud-hooks'
import { featuresForEvent, orgTopic } from './mapping'

/**
 * Subscribes to the organization's private Broadcast channel and invalidates the affected queries,
 * so shop-floor boards, warehouse dashboards and approvals update live (Broadcast scales better than raw Postgres Changes).
 * Silently does nothing when Realtime is not enabled on the project.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const org = useOrganization()
  const client = useQueryClient()
  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    const pending = new Set<string>()
    let timer: ReturnType<typeof setTimeout> | null = null
    const flush = () => {
      timer = null
      for (const f of pending) void client.invalidateQueries({ queryKey: featureKey(org.id, f) })
      pending.clear()
    }
    const channel = supabase.channel(orgTopic(org.id), { config: { private: true } })
    channel.on('broadcast', { event: '*' }, (msg) => {
      for (const f of featuresForEvent(String(msg.event))) pending.add(f)
      // coalesce bursts (a posting touches many rows) into one refresh
      if (!timer) timer = setTimeout(flush, 400)
    })
    void (async () => {
      try {
        await supabase!.realtime.setAuth()
        if (!cancelled) channel.subscribe()
      } catch {
        /* realtime unavailable: pages still refresh on focus / navigation */
      }
    })()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      void supabase!.removeChannel(channel)
    }
  }, [org.id, client])
  return <>{children}</>
}
