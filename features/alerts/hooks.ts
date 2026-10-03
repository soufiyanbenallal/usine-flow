'use client'

import { useMemo } from 'react'
import { computeAlerts, type Alert } from './compute'

/** Live alerts for the current organization (starter returns empty array until modules are active). */
export function useAlerts(): { alerts: Alert[]; loading: boolean } {
  const alerts = useMemo(() => computeAlerts(), [])
  return { alerts, loading: false }
}
