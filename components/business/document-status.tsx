import { Status } from '@/features/_core/status'

/** Workflow position of a business document: Brouillon → Soumis → Approuvé → Comptabilisé → Terminé. */
const FLOW = ['draft', 'pending_approval', 'approved', 'posted', 'completed'] as const

export function DocumentStatus({ status, showFlow = false }: { status: string; showFlow?: boolean }) {
  if (!showFlow || !(FLOW as readonly string[]).includes(status)) return <Status value={status} />
  const idx = FLOW.indexOf(status as (typeof FLOW)[number])
  return (
    <ol className="flex items-center gap-1 text-[11px]">
      {FLOW.map((s, i) => (
        <li key={s} className={`rounded-full px-2 py-0.5 ${i <= idx ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
          <Status value={s} />
        </li>
      ))}
    </ol>
  )
}
