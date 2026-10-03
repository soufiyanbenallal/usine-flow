import { Pill } from '@/features/_core/pill'
import { stockStatus, type StockRules } from '@/features/inventory/calculations'

const LABELS = { out: 'Rupture', low: 'Stock bas', ok: 'OK', over: 'Surstock' } as const
const TONES = { out: 'critical', low: 'warning', ok: 'success', over: 'info' } as const

/** Stock level pill: out of stock / low / ok / overstock according to the item's min, reorder and max levels. */
export function StockBadge({ onHand, rules }: { onHand: number; rules: StockRules }) {
  const s = stockStatus(onHand, rules)
  return <Pill tone={TONES[s]}>{LABELS[s]}</Pill>
}
