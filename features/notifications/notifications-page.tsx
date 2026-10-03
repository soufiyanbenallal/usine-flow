'use client'

import { Banner, Button, Checkbox } from '@xco-agency/corex-ui'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { PageShell, Panel } from '@/components/page-shell'
import { useAuth } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { useOrganization, useOrgPath } from '../organization/context'
import { useDeleteNotification, useMarkRead, useNotificationPreferences, useNotifications, useSavePreference } from './hooks'
import { CHANNELS, EVENT_TYPES, type ChannelKey, type NotificationPreference } from './types'

const dot = { critical: 'bg-red-500', warning: 'bg-amber-400', info: 'bg-sky-400' } as const

/** Notification preferences matrix: per business event, which channels (in-app, e-mail, WhatsApp, push) are enabled. */
export function NotificationPreferences() {
  const org = useOrganization()
  const { auth } = useAuth()
  const prefs = useNotificationPreferences()
  const save = useSavePreference()
  const get = (event: string): NotificationPreference => prefs.data?.find((p) => p.event_type === event) ?? { organization_id: org.id, user_id: auth!.user.id, event_type: event, in_app: true, email: false, whatsapp: false, push: false }
  return (
    <Panel title="Canaux par événement">
      {save.error && <Banner tone="critical">{save.error.message}</Banner>}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Événement</th>
              {CHANNELS.map((c) => (
                <th key={c.key} className="px-3 py-2 text-center font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EVENT_TYPES.map((e) => {
              const p = get(e.value)
              return (
                <tr key={e.value} className="border-t">
                  <td className="py-2 pr-4">{e.label}</td>
                  {CHANNELS.map((c) => (
                    <td key={c.key} className="px-3 py-2 text-center">
                      <Checkbox label={`${e.label} — ${c.label}`} labelAccessibilityVisibility="exclusive" checked={p[c.key as ChannelKey]} onChange={(checked) => save.mutate({ ...p, [c.key]: checked })} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export function NotificationsPage() {
  const list = useNotifications()
  const markRead = useMarkRead()
  const del = useDeleteNotification()
  const href = useOrgPath()
  const unread = list.data?.filter((n) => !n.read_at) ?? []
  return (
    <PageShell
      title="Notifications"
      icon={Bell}
      error={list.error?.message}
      description="Alertes opérationnelles : stock bas, pannes, échecs qualité, approbations, retards de production."
      actions={
        unread.length > 0 && (
          <Button variant="secondary" loading={markRead.isPending} onClick={() => markRead.mutate(unread.map((n) => n.id))}>
            Tout marquer comme lu
          </Button>
        )
      }
    >
      <Panel>
        {list.data?.length === 0 && <p className="text-[13px] text-muted-foreground">Aucune notification.</p>}
        <ul className="divide-y">
          {list.data?.map((n) => (
            <li key={n.id} className="flex items-start gap-3 py-3 text-[13px]">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : dot[n.severity]}`} />
              <div className="min-w-0 flex-1">
                <p className={n.read_at ? '' : 'font-semibold'}>{n.title}</p>
                {n.body && <p className="text-muted-foreground">{n.body}</p>}
                <p className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
              </div>
              {n.link && (
                <Link href={href(n.link)} onClick={() => !n.read_at && markRead.mutate([n.id])} className="text-xs underline">
                  Ouvrir
                </Link>
              )}
              {!n.read_at && (
                <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => markRead.mutate([n.id])}>
                  Lu
                </button>
              )}
              <button type="button" className="text-xs text-muted-foreground hover:text-red-600" onClick={() => del.mutate(n.id)}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <NotificationPreferences />
    </PageShell>
  )
}
