'use client'

import { CloudOff, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useT } from '@/lib/i18n'
import { useOrgPath } from '../organization/context'
import { useAutoSync } from './hooks'

/** Small status chip: shown only when offline or when operations are waiting; runs the background sync. */
export function OfflineIndicator() {
  const { online, pending, syncing } = useAutoSync()
  const href = useOrgPath()
  const t = useT()
  if (online && pending === 0) return null
  return (
    <Link href={href('hors-ligne')} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs shadow-xs" aria-live="polite">
      {online ? <RefreshCw className={`size-3.5 ${syncing ? 'animate-spin' : ''}`} /> : <CloudOff className="size-3.5 text-amber-700" />}
      {online ? `${pending} ${t('en attente de synchronisation')}` : `${t('Hors ligne')}${pending ? ` · ${pending}` : ''}`}
    </Link>
  )
}
