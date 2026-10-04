'use client'

import { LogoMark } from '@/components/logo'
import { Button, Reveal, Section } from './ui'

interface FinalCTAProps {
  onOpenDemo: () => void
}

export function FinalCTA({ onOpenDemo }: FinalCTAProps) {
  return (
    <Section id="cta" tone="dark" className="py-32 sm:py-44 lg:py-52">
      <Reveal className="mx-auto max-w-3xl text-center">
        <LogoMark className="mx-auto h-10 w-12" size={48} />
        <h2 className="mt-10 text-balance text-[2.5rem] font-medium leading-[1.04] tracking-[-0.04em] sm:text-6xl">
          Bring your entire operation into one system.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-[1.65] text-fog">
          Start with inventory and warehouse management. Add production, quality, maintenance and analytics as your
          business grows.
        </p>
        <div className="mt-10 flex items-center justify-center gap-2">
          <Button href="/signup" arrow>
            Start free
          </Button>
          <Button variant="secondary" onClick={onOpenDemo}>
            Book a demo
          </Button>
        </div>
        <p className="mt-8 text-[12px] text-white/35">Secure workspace · Multi-site ready · Français, العربية, English</p>
      </Reveal>
    </Section>
  )
}
