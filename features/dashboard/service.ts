export type CadencePoint = {
  day: string
  production: number
  target: number
}

export const dashboardService = {
  async getWeeklyCadence(_organizationId: string): Promise<CadencePoint[]> {
    return [
      { day: 'Lun', production: 120, target: 130 },
      { day: 'Mar', production: 145, target: 130 },
      { day: 'Mer', production: 138, target: 130 },
      { day: 'Jeu', production: 152, target: 130 },
      { day: 'Ven', production: 140, target: 130 },
      { day: 'Sam', production: 95, target: 100 },
    ]
  },
}
