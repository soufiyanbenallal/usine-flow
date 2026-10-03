'use client'

import { Banner } from '@xco-agency/corex-ui'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { useT } from '@/lib/i18n'

/** Standard page frame: header (title, icon, actions) + scrolling content column. */
export function PageShell({
  title, icon, description, actions, error, children, wide = true,
}: {
  title: string
  icon: LucideIcon
  description?: string
  actions?: ReactNode
  error?: string | null
  children: ReactNode
  wide?: boolean
}) {
  const t = useT()
  return (
    <>
      <PageHeader title={t(title)} icon={icon}>
        {actions}
      </PageHeader>
      <div className={`mx-auto w-full flex-1 space-y-4 overflow-y-auto px-4 pb-24 sm:px-5 ${wide ? '' : 'max-w-3xl'}`}>
        {description && <p className="text-[13px] text-muted-foreground">{t(description)}</p>}
        {error && <Banner tone="critical">{error}</Banner>}
        {children}
      </div>
    </>
  )
}

/** Titled card section used inside pages. */
export function Panel({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-xs ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Muted({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-muted-foreground">{children}</p>
}
