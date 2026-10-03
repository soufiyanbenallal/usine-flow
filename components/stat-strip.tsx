import { CalendarDays } from 'lucide-react'

type Stat = { label: string; value: string; hint?: string }

/** Rounded KPI strip — first cell is the period, then metrics (dotted label like the reference admin). */
export function StatStrip({ stats, period = '30 jours' }: { stats: Stat[]; period?: string }) {
  return (
    <section className="grid overflow-hidden rounded-xl border bg-card shadow-xs sm:grid-cols-[auto_1fr]" aria-label="Indicateurs">
      <div className="flex items-center gap-2 border-b px-5 py-4 text-sm sm:border-r sm:border-b-0">
        <CalendarDays className="size-4" aria-hidden />
        {period}
      </div>
      <dl className="grid divide-y sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4">
            <dt className="inline text-sm font-semibold underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">{s.label}</dt>
            <dd className="mt-1.5 flex items-baseline gap-1.5 text-sm">
              <span className="text-[15px]">{s.value}</span>
              {s.hint && <span className="text-muted-foreground">{s.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
