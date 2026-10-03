'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Simple tab strip (state owned by the caller). */
export function SegmentedTabs<T extends string>({ tabs, value, onChange, right }: { tabs: { id: T; label: string; badge?: ReactNode }[]; value: T; onChange: (id: T) => void; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b pb-2" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn('rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors', value === t.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/60')}
        >
          {t.label}
          {t.badge !== undefined && <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{t.badge}</span>}
        </button>
      ))}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  )
}
