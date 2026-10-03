export type OperationalStats = {
  activeFacilities: number
  totalFacilities: number
  activeWorkOrders: number
  oeePercent: number
  activeAlerts: number
}

export function defaultOperationalStats(): OperationalStats {
  return {
    activeFacilities: 1,
    totalFacilities: 1,
    activeWorkOrders: 0,
    oeePercent: 88,
    activeAlerts: 0,
  }
}

export function calculateOee(availability: number, performance: number, quality: number): number {
  if (availability <= 0 || performance <= 0 || quality <= 0) return 0
  return Math.round((availability * performance * quality) / 10000)
}
