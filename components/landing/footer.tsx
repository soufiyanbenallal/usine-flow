import Link from 'next/link'
import { BrandLogo } from './brand'
import { Container } from './ui'

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Platform', href: '#platform' },
      { label: 'Connected operations', href: '#operations' },
      { label: 'Traceability', href: '#traceability' },
      { label: 'Teams', href: '#roles' },
    ],
  },
  {
    title: 'Modules',
    links: [
      { label: 'Inventory', href: '#platform' },
      { label: 'Warehouse', href: '#platform' },
      { label: 'Production', href: '#platform' },
      { label: 'Quality & maintenance', href: '#platform' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Create an account', href: '/signup' },
      { label: 'Sign in', href: '/login' },
      { label: 'Made for Morocco', href: '#morocco' },
    ],
  },
]

export function Footer() {
  return (
    <footer data-tone="dark" className="border-t border-white/6 bg-ink py-16 text-white">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <BrandLogo tone="dark" className="h-7" />
            <p className="mt-5 max-w-xs text-[13px] leading-5 text-fog">
              The operations platform for factories, workshops and warehouses.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-[13px] font-medium">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] text-fog transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col justify-between gap-2 border-t border-white/6 pt-6 text-[12px] text-white/35 sm:flex-row">
          <span>© {new Date().getFullYear()} UsineFlow</span>
          <span>Operations, without the operational noise.</span>
        </div>
      </Container>
    </footer>
  )
}
