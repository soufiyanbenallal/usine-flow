import { D, add, pct, round } from '@/lib/decimal'

export type CostParts = { material: number; labor: number; machine: number; overhead: number; subcontract: number }
export const totalCost = (c: CostParts) => round(add(c.material, c.labor, c.machine, c.overhead, c.subcontract), 2).toNumber()

export type VarianceAnalysis = {
  standardUnit: number
  actualUnit: number
  /** actual − standard per unit (positive = over budget). */
  variance: number
  variancePct: number
  material: number
  labor: number
  machine: number
  other: number
}

/**
 * Standard vs actual cost analysis per unit (guide §20):
 * Standard 118.40 / Actual 126.75 → variance +8.35 DH (+7.1 %), split into material, labor, machine and other.
 */
export function varianceAnalysis(standard: CostParts, actual: CostParts, producedQty: number): VarianceAnalysis {
  const q = D(producedQty)
  const per = (v: number) => (q.gt(0) ? D(v).div(q) : D(0))
  const stdUnit = per(totalCost(standard))
  const actUnit = per(totalCost(actual))
  const material = per(actual.material).minus(per(standard.material))
  const labor = per(actual.labor).minus(per(standard.labor))
  const machine = per(actual.machine).minus(per(standard.machine))
  const variance = actUnit.minus(stdUnit)
  const r = (v: ReturnType<typeof D>) => round(v, 2).toNumber()
  return {
    standardUnit: r(stdUnit), actualUnit: r(actUnit), variance: r(variance), variancePct: pct(variance, stdUnit).toNumber(),
    material: r(material), labor: r(labor), machine: r(machine), other: r(variance.minus(material).minus(labor).minus(machine)),
  }
}

/** Purchase price variance: (actual price − standard price) × quantity. */
export const purchasePriceVariance = (actualPrice: number, standardPrice: number, quantity: number) => round(D(actualPrice).minus(standardPrice).times(quantity), 2).toNumber()

/** Machine cost of an operation from run minutes and hourly rates. */
export function operationCost(minutes: number, rates: { machinePerHour: number; laborPerHour: number; laborCount: number; overheadPct: number }): { labor: number; machine: number; overhead: number } {
  const hours = D(minutes).div(60)
  const labor = hours.times(rates.laborPerHour).times(rates.laborCount)
  const machine = hours.times(rates.machinePerHour)
  const overhead = labor.plus(machine).times(rates.overheadPct).div(100)
  return { labor: round(labor, 2).toNumber(), machine: round(machine, 2).toNumber(), overhead: round(overhead, 2).toNumber() }
}

/** Cost per unit when co-products share the production cost by value (allocation key = sales/standard value). */
export function allocateJointCost(total: number, products: { id: string; value: number }[]): Map<string, number> {
  const sum = products.reduce((a, p) => a.plus(p.value), D(0))
  const out = new Map<string, number>()
  if (sum.lte(0)) {
    products.forEach((p, i) => out.set(p.id, i === 0 ? total : 0))
    return out
  }
  let allocated = D(0)
  products.forEach((p, i) => {
    const share = i === products.length - 1 ? D(total).minus(allocated) : round(D(total).times(p.value).div(sum), 2)
    allocated = allocated.plus(share)
    out.set(p.id, round(share, 2).toNumber())
  })
  return out
}
