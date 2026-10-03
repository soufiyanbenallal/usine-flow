export type AlertTone = 'critical' | 'warning' | 'info'

export type Alert = {
  id: string
  tone: AlertTone
  title: string
  detail: string
  /** relative to the organization */
  path: string
}

export type AlertInput = {
  notifications?: {
    overdue_orders?: boolean
    low_stock?: boolean
    maintenance_due?: boolean
  }
}

/** Alerts derived from operational data, filtered by organization notification settings. */
export function computeAlerts(_input?: AlertInput): Alert[] {
  // Extensible starter: returns active operational alerts
  return []
}
