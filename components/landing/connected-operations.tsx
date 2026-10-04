'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { BadgeCheck, Bell, ClipboardList, Coins, Factory, History, Lock, PackageCheck, Boxes, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, EASE, LiveDot, Section, SectionHeader } from './ui'

const STAGES: { icon: LucideIcon; title: string; detail: string }[] = [
  { icon: ClipboardList, title: 'Purchase', detail: 'PO approved' },
  { icon: PackageCheck, title: 'Receiving', detail: '218 units received' },
  { icon: BadgeCheck, title: 'Quality', detail: 'Lot approved' },
  { icon: Factory, title: 'Production', detail: 'OF-00942 started' },
]

/** The activity log the chain writes, in order. `stage` = which stage emitted it. */
const EVENTS: { stage: number; icon: LucideIcon; time: string; who: string; text: string; ref: string }[] = [
  { stage: 0, icon: ClipboardList, time: '08:12', who: 'Karim B.', text: 'approved purchase order', ref: 'PO-2026-118' },
  { stage: 1, icon: PackageCheck, time: '10:02', who: 'Dock 2', text: 'received 218 pcs of steel sheet', ref: 'RM-20482' },
  { stage: 1, icon: Boxes, time: '10:02', who: 'System', text: 'stock updated in quarantine', ref: 'A-03-12' },
  { stage: 2, icon: BadgeCheck, time: '10:41', who: 'Imane T.', text: 'released lot after inspection', ref: 'LOT-SS-2048' },
  { stage: 3, icon: Lock, time: '10:41', who: 'System', text: 'reserved material for order', ref: 'OF-00942' },
  { stage: 3, icon: Factory, time: '11:05', who: 'Line 2', text: 'started production order', ref: 'OF-00942' },
  { stage: 3, icon: Coins, time: '11:05', who: 'System', text: 'recorded material cost', ref: '25,174 MAD' },
  { stage: 3, icon: Bell, time: '11:05', who: 'System', text: 'notified production manager', ref: 'Youssef B.' },
]

export function ConnectedOperations() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-160px' })
  const reduce = useReducedMotion()
  const [tick, setCount] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    // play the chain, hold on the full log, then replay
    const id = setTimeout(
      () => setCount((c) => (c >= EVENTS.length + 3 ? 0 : c + 1)),
      tick === 0 ? 400 : 1100,
    )
    return () => clearTimeout(id)
  }, [inView, reduce, tick])

  const count = reduce ? EVENTS.length : tick

  const shown = EVENTS.slice(0, Math.min(count, EVENTS.length))
  const stage = shown.length ? shown[shown.length - 1].stage : -1

  return (
    <Section id="operations" tone="dark">
      <SectionHeader
        label="Connected operations"
        title="Everything is connected."
        description="A purchase receipt can trigger quality, update stock, unlock production and show up in a manager's dashboard — without copying the same information five times."
      />

      <div ref={ref} className="mt-16 grid gap-3 lg:mt-20 lg:grid-cols-[1fr_1.35fr]">
        {/* stages */}
        <Card className="p-2">
          {STAGES.map((s, i) => {
            const done = stage >= i
            const current = stage === i
            return (
              <div key={s.title} className="relative flex items-center gap-4 rounded-xl px-4 py-4">
                {current && (
                  <motion.span
                    layoutId="stage-highlight"
                    transition={{ type: 'spring', stiffness: 300, damping: 32 }}
                    className="absolute inset-0 rounded-xl bg-white/4"
                  />
                )}
                <span
                  className={cn(
                    'relative grid size-9 place-items-center rounded-lg border transition-colors duration-500',
                    done ? 'border-flow-blue/40 bg-flow-blue/10 text-flow-blue' : 'border-white/8 text-white/30',
                  )}
                >
                  <s.icon className="size-4" />
                </span>
                <div className="relative min-w-0 flex-1">
                  <div className={cn('text-[14px] font-medium transition-colors', done ? 'text-white' : 'text-white/40')}>
                    {s.title}
                  </div>
                  <div className="text-[12px] text-fog">{s.detail}</div>
                </div>
                <span
                  className={cn(
                    'relative text-[11px] font-medium transition-colors duration-500',
                    done ? 'text-emerald-400' : 'text-white/25',
                  )}
                >
                  {done ? 'Done' : 'Waiting'}
                </span>
                {i < STAGES.length - 1 && (
                  <span className="absolute bottom-[-6px] left-[34px] h-3 w-px bg-white/10" aria-hidden />
                )}
              </div>
            )
          })}
        </Card>

        {/* activity log */}
        <Card className="flex min-h-[420px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-3.5">
            <div className="flex items-center gap-2 text-[13px] font-medium">
              <History className="size-3.5 text-fog" /> Activity
            </div>
            <LiveDot />
          </div>
          <ol className="flex-1 space-y-0.5 p-2">
            <AnimatePresence initial={false}>
              {shown.map((e, i) => (
                <motion.li
                  key={i}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px]"
                >
                  <e.icon className="size-3.5 shrink-0 text-fog" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-white">{e.who}</span> <span className="text-fog">{e.text}</span>
                  </span>
                  <span className="hidden shrink-0 rounded-md border border-white/8 px-1.5 py-0.5 font-mono text-[11px] text-white/70 sm:inline">
                    {e.ref}
                  </span>
                  <span className="w-10 shrink-0 text-right font-mono text-[11px] text-white/30">{e.time}</span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ol>
        </Card>
      </div>
    </Section>
  )
}
