import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" aria-label="UsineFlow — accueil">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-[#1a1a1a] p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div aria-hidden className="absolute inset-0 opacity-40 [background:radial-gradient(60%_50%_at_70%_20%,#3b82f633,transparent),repeating-linear-gradient(135deg,#ffffff08_0_1px,transparent_1px_22px)]" />
        <blockquote className="relative max-w-md space-y-4">
          <p className="text-2xl leading-snug font-medium tracking-tight">« La visibilité en temps réel sur nos ordres de fabrication, nos stocks et nos expéditions a transformé nos ateliers. »</p>
          <footer className="text-sm text-white/60">Responsable des opérations industrielles, Casablanca</footer>
        </blockquote>
      </aside>
    </div>
  )
}
