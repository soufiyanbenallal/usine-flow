'use client'

import { Button, Popover, PopoverContent, PopoverTrigger } from '@xco-agency/corex-ui'
import Link from 'next/link'
import { useOrgPath } from '../organization/context'
import { useMarkRead, useNotifications } from '../notifications/hooks'
import { useT } from '@/lib/i18n'
import { formatDateTime } from '@/lib/format'

const dot = { critical: 'bg-red-500', warning: 'bg-amber-400', info: 'bg-sky-400' } as const

/** Bell + popover listing the user's in-app notifications (fan-out of domain events: low stock, delays, approvals…). */
export function NotificationsBell() {
  const { data = [], isPending } = useNotifications()
  const markRead = useMarkRead()
  const href = useOrgPath()
  const t = useT()
  const unread = data.filter((n) => !n.read_at)
  return (
    <div style={{ colorScheme: 'dark' }} className="relative group-data-[collapsible=icon]:hidden">
      <Popover>
        <PopoverTrigger>
          <Button variant="tertiary" icon="notification" accessibilityLabel={`${t('Notifications')} (${unread.length})`} />
        </PopoverTrigger>
        <PopoverContent>
          <div className="flex max-h-96 w-80 flex-col gap-1 overflow-y-auto p-3 text-[13px]">
            <div className="flex items-center justify-between px-1 pb-1">
              <strong className="text-sm">{t('Notifications')}</strong>
              {unread.length > 0 && <button type="button" className="text-xs underline" onClick={() => markRead.mutate(unread.map((n) => n.id))}>{t('Tout marquer comme lu')}</button>}
            </div>
            {isPending && <p className="px-1 text-muted-foreground">{t('Chargement…')}</p>}
            {!isPending && data.length === 0 && <p className="px-1 text-muted-foreground">{t('Tout est à jour')}</p>}
            {data.slice(0, 15).map((n) => (
              <Link key={n.id} href={n.link ? href(n.link) : href('notifications')} onClick={() => !n.read_at && markRead.mutate([n.id])} className="flex gap-2 rounded-md px-1 py-1.5 hover:bg-secondary">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : dot[n.severity]}`} />
                <span>
                  <span className="block font-medium">{n.title}</span>
                  {n.body && <span className="block text-muted-foreground">{n.body}</span>}
                  <span className="block text-xs text-muted-foreground">{formatDateTime(n.created_at)}</span>
                </span>
              </Link>
            ))}
            <Link href={href('notifications')} className="px-1 pt-1 text-xs underline">{t('Voir toutes les notifications')}</Link>
          </div>
        </PopoverContent>
      </Popover>
      {unread.length > 0 && <span className="pointer-events-none absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-semibold text-white">{unread.length}</span>}
    </div>
  )
}
