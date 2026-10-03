'use client'

import { Settings, type LucideIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { cn } from 'cn'
import { SettingsMobileNav } from './settings-panel'

/** Common frame of every settings page: header, mobile nav, centered column. */
export function SettingsShell({
  title,
  description,
  icon = Settings,
  wide,
  actions,
  children,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  wide?: boolean
  actions?: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  return (
    <>
      <PageHeader title={title} icon={icon}>
        {actions}
      </PageHeader>
      <div className={cn('mx-auto w-full flex-1 space-y-4 overflow-y-auto px-4 pb-24 sm:px-5', wide ? 'max-w-5xl' : 'max-w-3xl')}>
        <SettingsMobileNav pathname={pathname} />
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
    </>
  )
}
