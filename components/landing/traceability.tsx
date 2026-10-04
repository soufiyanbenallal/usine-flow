'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, Dim, EASE, Reveal, Section, SectionHeader } from './ui'

const NODES = [
  { kind: 'Supplier lot', id: 'LOT-SS-2048', meta: 'Atlas Steel · 218 pcs' },
  { kind: 'Production order', id: 'OF-2026-00942', meta: 'Table T-420 · 500 units' },
  { kind: 'Finished batch', id: 'LOT-T420-82', meta: 'QC passed · 496 released' },
  { kind: 'Customer delivery', id: 'DN-2026-4418', meta: 'Delivered · 04 Oct' },
]

const TAGS = ['Lots', 'Serials', 'QC', 'Quarantine', 'Recalls', 'CAPA']

type Dir = 'backward' | 'forward'

export function Traceability() {
  const [dir, setDir] = useState<Dir>('backward')
  const [rawStep, setStep] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-120px' })
  const reduce = useReducedMotion()

  useEffect(() => {
    if (!inView || reduce || rawStep >= NODES.length) return
    const id = setTimeout(() => setStep((s) => s + 1), rawStep === 0 ? 300 : 650)
    return () => clearTimeout(id)
  }, [inView, reduce, rawStep])

  const step = reduce ? NODES.length : rawStep

  const order = dir === 'forward' ? [0, 1, 2, 3] : [3, 2, 1, 0]
  const lit = (i: number) => order.indexOf(i) < step

  const switchDir = (d: Dir) => {
    if (d === dir) return
    setDir(d)
    setStep(0)
  }

  return (
    <Section id="traceability" tone="light">
      <SectionHeader
        label="Traceability"
        title={
          <>
            Every batch. Every component. <Dim>Every result.</Dim>
          </>
        }
        description="Follow material genealogy forward to the customer or backward to the supplier in a few clicks."
      />

      <Reveal className="mt-16 lg:mt-20">
        <Card className="p-4 sm:p-6">
          <div ref={ref} className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-line bg-paper p-0.5">
              {(['backward', 'forward'] as Dir[]).map((d) => (
                <button
                  key={d}
                  onClick={() => switchDir(d)}
                  className={cn(
                    'relative flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                    dir === d ? 'text-ink' : 'text-slate hover:text-ink',
                  )}
                >
                  {dir === d && (
                    <motion.span
                      layoutId="trace-dir"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.08)]"
                    />
                  )}
                  {d === 'backward' ? <ArrowLeft className="relative size-3.5" /> : null}
                  <span className="relative">{d === 'backward' ? 'Trace to supplier' : 'Trace to customer'}</span>
                  {d === 'forward' ? <ArrowRight className="relative size-3.5" /> : null}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((t) => (
                <span key={t} className="rounded-md border border-line px-2 py-0.5 text-[11px] font-medium text-slate">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2 md:grid-cols-4 md:gap-0">
            {NODES.map((n, i) => {
              const on = lit(i)
              const isOrigin = order[0] === i
              return (
                <div key={n.id} className="flex items-center">
                  <motion.div
                    animate={{ opacity: on ? 1 : 0.45 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      'min-w-0 flex-1 rounded-xl border p-4 transition-colors duration-500',
                      on ? 'border-ink/15 bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]' : 'border-line bg-paper',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate">{n.kind}</span>
                      {isOrigin && (
                        <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium text-white">Start</span>
                      )}
                    </div>
                    <div className="mt-3 truncate font-mono text-[13px] font-medium">{n.id}</div>
                    <div className="mt-1 truncate text-[12px] text-slate">{n.meta}</div>
                  </motion.div>
                  {i < NODES.length - 1 && (
                    <div className="relative mx-2 hidden h-px w-6 shrink-0 bg-line md:block" aria-hidden>
                      <motion.div
                        animate={{ scaleX: lit(i) && lit(i + 1) ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className={cn('absolute inset-0 bg-flow-teal', dir === 'forward' ? 'origin-left' : 'origin-right')}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-paper px-4 py-3 text-[12px]">
            <span className="text-slate">
              {dir === 'forward' ? 'Recall scope' : 'Root cause'} ·{' '}
              <span className="font-medium text-ink">
                {dir === 'forward' ? '3 deliveries · 2 customers' : 'Supplier lot LOT-SS-2048 · received 02 Oct'}
              </span>
            </span>
            <span className="text-ink/35">Sample data</span>
          </div>
        </Card>
      </Reveal>
    </Section>
  )
}
