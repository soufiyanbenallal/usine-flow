'use client'

import { motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { Button, EASE, Section } from './ui'
import { HeroVisual } from './hero-visual'

interface HeroProps {
  onOpenDemo: () => void
}

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease: EASE, delay },
})

export function Hero({ onOpenDemo }: HeroProps) {
  return (
    <Section id="top" tone="dark" className="pb-0 pt-32 sm:pb-0 sm:pt-44 lg:pb-0 lg:pt-48">
      <motion.a
        {...fade(0)}
        href="#platform"
        className="group inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/3 py-1 pl-1 pr-3 text-[13px] text-fog transition-colors hover:text-white"
      >
        <span className="whitespace-nowrap rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-medium text-white">
          Industrial OS
        </span>
        <span className="whitespace-nowrap sm:hidden">Factory · Workshop · Warehouse</span>
        <span className="hidden sm:inline">For factories, workshops and warehouses</span>
        <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </motion.a>

      <motion.h1
        {...fade(0.08)}
        className="mt-8 max-w-[15ch] text-balance text-[2.75rem] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[4rem] lg:text-[4.75rem]"
      >
        Run your factory <span className="text-fog">with complete visibility.</span>
      </motion.h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <motion.p {...fade(0.16)} className="max-w-[34rem] text-pretty text-base leading-[1.65] text-fog sm:text-[17px]">
          Manage inventory, production, purchasing, quality, maintenance and warehouse operations from one calm,
          connected system.
        </motion.p>
        <motion.div {...fade(0.24)} className="flex shrink-0 items-center gap-2">
          <Button href="/signup" arrow>
            Start free
          </Button>
          <Button variant="secondary" onClick={onOpenDemo}>
            Book a demo
          </Button>
        </motion.div>
      </div>

      <HeroVisual />
    </Section>
  )
}
