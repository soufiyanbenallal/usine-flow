import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
export type Tone = 'success' | 'warning' | 'critical' | 'info' | 'neutral'

/** Status pill using the Polaris-style palette defined in globals.css. */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn('pill', `pill-${tone}`)}>{children}</span>
}

export type LabelMap<K extends string> = Record<K, { label: string; tone: Tone }>

export function StatusPill<K extends string>({ map, value }: { map: LabelMap<K>; value: K }) {
  const entry = map[value]
  return <Pill tone={entry?.tone ?? 'neutral'}>{entry?.label ?? value}</Pill>
}
