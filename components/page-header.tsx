'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { SidebarTrigger } from '@/components/ui/sidebar'

/** Top bar of the inset canvas: icon + title on the left, actions on the right. */
export function PageHeader({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4 sm:px-5">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <Icon className="size-[18px]" aria-hidden />
      <h1 className="text-[15px] font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  )
}
