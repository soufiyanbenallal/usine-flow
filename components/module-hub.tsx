'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { PageShell } from '@/components/page-shell'
import { useOrgPath } from '@/features/organization/context'
import { useT } from '@/lib/i18n'
import { mainNav } from '@/lib/nav'

/** Landing page of a module: cards linking to its pages (built from the navigation registry). */
export function ModuleHub({ path }: { path: string }) {
  const item = mainNav.find((n) => n.path === path)
  const href = useOrgPath()
  const t = useT()
  if (!item) return null
  return (
    <PageShell title={item.title} icon={item.icon} description={item.description}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(item.children ?? []).map((c) => (
          <Link key={c.path} href={href(c.path)} className="group flex items-center justify-between rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-foreground/30">
            <span className="text-sm font-medium">{t(c.title)}</span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
          </Link>
        ))}
      </div>
    </PageShell>
  )
}
