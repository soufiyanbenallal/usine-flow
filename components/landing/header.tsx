'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrandLogo } from './brand'
import { Button, Container, EASE, ToneProvider, type Tone } from './ui'

const NAV = [
  { href: '#platform', label: 'Platform' },
  { href: '#operations', label: 'Operations' },
  { href: '#traceability', label: 'Traceability' },
  { href: '#roles', label: 'Teams' },
  { href: '#morocco', label: 'Morocco' },
]

interface HeaderProps {
  onOpenDemo: () => void
}

/** Sticky header that adopts the tone of whichever band is underneath it. */
export function Header({ onOpenDemo }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [tone, setTone] = useState<Tone>('dark')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 8)
      const probe = 28 // vertical centre of the 56px bar
      for (const band of document.querySelectorAll<HTMLElement>('[data-tone]')) {
        const r = band.getBoundingClientRect()
        if (r.top <= probe && r.bottom > probe) {
          setTone(band.dataset.tone === 'light' ? 'light' : 'dark')
          break
        }
      }
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  const dark = tone === 'dark'

  return (
    <ToneProvider tone={tone}>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,color] duration-300',
          scrolled || open
            ? dark
              ? 'border-white/6 bg-ink/80 text-white backdrop-blur-xl'
              : 'border-line bg-paper/80 text-ink backdrop-blur-xl'
            : 'border-transparent bg-transparent text-white',
        )}
      >
        <Container className="flex h-14 items-center justify-between">
          <Link href="#top" aria-label="UsineFlow home" className="relative h-6 w-[103px] shrink-0">
            <span className={cn('absolute inset-0 transition-opacity duration-300', dark ? 'opacity-100' : 'opacity-0')}>
              <BrandLogo tone="dark" priority />
            </span>
            <span className={cn('absolute inset-0 transition-opacity duration-300', dark ? 'opacity-0' : 'opacity-100')}>
              <BrandLogo tone="light" priority />
            </span>
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13px] transition-colors',
                  dark ? 'text-fog hover:text-white' : 'text-slate hover:text-ink',
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-1 md:flex">
            <Link
              href="/login"
              className={cn(
                'px-3 text-[13px] transition-colors',
                dark ? 'text-fog hover:text-white' : 'text-slate hover:text-ink',
              )}
            >
              Sign in
            </Link>
            <Button variant="secondary" onClick={onOpenDemo} className="h-8 px-3.5">
              Book a demo
            </Button>
            <Button href="/signup" className="ml-1 h-8 px-3.5">
              Start free
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 cursor-pointer place-items-center rounded-full md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </Container>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="overflow-hidden md:hidden"
            >
              <Container className="grid gap-1 pb-6 pt-2">
                {NAV.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn('rounded-lg px-2 py-2.5 text-[15px]', dark ? 'text-white/80' : 'text-ink/80')}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setOpen(false)
                      onOpenDemo()
                    }}
                  >
                    Book a demo
                  </Button>
                  <Button href="/signup">Start free</Button>
                </div>
                <Link href="/login" className={cn('mt-2 py-2 text-center text-[13px]', dark ? 'text-fog' : 'text-slate')}>
                  Sign in
                </Link>
              </Container>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </ToneProvider>
  )
}
