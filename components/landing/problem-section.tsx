'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { FileSpreadsheet, FileText, MessageCircle, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label, Reveal, Section } from './ui'

const STATEMENT =
  "Your factory shouldn't run on disconnected spreadsheets. When inventory, purchasing, production and quality live in different places, every decision gets slower. UsineFlow turns those disconnected steps into one traceable flow."

const BEFORE = [
  { icon: FileSpreadsheet, name: 'Excel', pain: 'Manual stock files, duplicate versions, no clear ownership.' },
  { icon: MessageCircle, name: 'WhatsApp', pain: 'Approvals and production updates buried in conversations.' },
  { icon: FileText, name: 'Paper forms', pain: 'Receiving, maintenance and QC checks are hard to reconcile.' },
]

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1])
  return (
    <motion.span style={{ opacity }} className="inline">
      {children}{' '}
    </motion.span>
  )
}

export function ProblemSection() {
  const ref = useRef<HTMLParagraphElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 55%'] })
  const words = STATEMENT.split(' ')

  return (
    <Section tone="light">
      <Label>The old way</Label>
      <p
        ref={ref}
        className="mt-8 max-w-[24ch] text-[2rem] font-medium leading-[1.18] tracking-[-0.03em] sm:max-w-[30ch] sm:text-[2.75rem] lg:text-[3.25rem]"
      >
        {words.map((w, i) => (
          <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
            {w}
          </Word>
        ))}
      </p>

      <div className="mt-24 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BEFORE.map((b, i) => (
          <Reveal key={b.name} delay={i * 0.06}>
            <div className="h-full rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center justify-between">
                <b.icon className="size-4 text-slate" />
                <span className="text-[11px] font-medium text-ink/35">Before</span>
              </div>
              <div className="mt-8 text-[14px] font-medium">{b.name}</div>
              <p className="mt-1 text-[13px] leading-5 text-slate">{b.pain}</p>
            </div>
          </Reveal>
        ))}
        <Reveal delay={0.18}>
          <div className={cn('h-full rounded-2xl bg-ink p-5 text-white')}>
            <div className="flex items-center justify-between">
              <Workflow className="size-4 text-flow-blue" />
              <span className="text-[11px] font-medium text-fog">With UsineFlow</span>
            </div>
            <div className="mt-8 text-[14px] font-medium">One connected system</div>
            <p className="mt-1 text-[13px] leading-5 text-fog">
              Every operational event updates the right people, stock and history.
            </p>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}
