'use client'

import { Button, Popover, PopoverContent, PopoverTrigger } from '@xco-agency/corex-ui'
import Link from 'next/link'
import { useOrgPath } from '../organization/context'
import { useAlerts } from './hooks'

const dot = { critical: 'bg-red-500', warning: 'bg-amber-400', info: 'bg-sky-400' } as const

/** Bell + popover listing live alerts (overdue payments, low stock, missing receipts, budget overruns). */
export function NotificationsBell() {
  const { alerts, loading } = useAlerts()
  const href = useOrgPath()
  return (
    <div style={{ colorScheme: 'dark' }} className="relative group-data-[collapsible=icon]:hidden">
      <Popover>
        <PopoverTrigger>
          <Button variant="tertiary" icon="notification" accessibilityLabel={`Notifications (${alerts.length})`} />
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex w-80 flex-col gap-1 p-3 text-[13px]">
            <strong className="px-1 pb-1 text-sm">Notifications</strong>
            {loading && <p className="px-1 text-muted-foreground">Chargement…</p>}
            {!loading && alerts.length === 0 && <p className="px-1 text-muted-foreground">Tout est à jour 🎉</p>}
            {alerts.map((a) => (
              <Link key={a.id} href={href(a.path)} className="flex gap-2 rounded-md px-1 py-1.5 hover:bg-secondary">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot[a.tone]}`} />
                <span>
                  <span className="block font-medium">{a.title}</span>
                  <span className="block text-muted-foreground">{a.detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {alerts.length > 0 && <span className="pointer-events-none absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-semibold text-white">{alerts.length}</span>}
    </div>
  )
}
