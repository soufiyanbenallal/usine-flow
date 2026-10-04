'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Factory, Menu, X } from 'lucide-react'

interface HeaderProps {
  onOpenDemo: () => void
}

export function Header({ onOpenDemo }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      id="site-header"
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'border-neutral-200 bg-[#f7f7f5]/85 backdrop-blur-xl shadow-sm'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link
          href="#top"
          className="flex items-center gap-2.5"
          aria-label="Industrial OS home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#008060] text-white shadow-sm">
            <Factory className="h-[17px] w-[17px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-.02em] text-neutral-950">
            Industrial OS
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13px] font-medium text-neutral-600 md:flex">
          <a className="transition hover:text-neutral-950" href="#platform">
            Platform
          </a>
          <a className="transition hover:text-neutral-950" href="#solutions">
            Solutions
          </a>
          <a className="transition hover:text-neutral-950" href="#operations">
            Operations
          </a>
          <a className="transition hover:text-neutral-950" href="#pricing">
            Pricing
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onOpenDemo}
            className="rounded-lg border border-neutral-200 bg-white px-4 py-2 text-[13px] font-semibold text-neutral-800 shadow-sm transition hover:-translate-y-px hover:border-neutral-300 cursor-pointer"
          >
            Book a demo
          </button>
          <Link
            href="/login"
            className="rounded-lg bg-[#111513] px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-black"
          >
            Start free
          </Link>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="grid h-10 w-10 place-items-center rounded-lg border border-neutral-200 bg-white md:hidden"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-neutral-200 bg-[#f7f7f5]/95 px-5 py-4 backdrop-blur-xl md:hidden">
          <div className="grid gap-2 text-sm font-medium">
            <a
              href="#platform"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white"
            >
              Platform
            </a>
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white"
            >
              Solutions
            </a>
            <a
              href="#operations"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white"
            >
              Operations
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 hover:bg-white"
            >
              Pricing
            </a>
            <div className="pt-2 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenDemo()
                }}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-neutral-800"
              >
                Book a demo
              </button>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg bg-[#111513] px-3 py-2.5 text-center text-white text-sm font-semibold"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
