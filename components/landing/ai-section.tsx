'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { ArrowUp, PackageSearch, Sparkles, TrendingUp, Wrench, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, Dim, EASE, Reveal, Section, SectionHeader } from './ui'

const QUESTION = 'Why is steel consumption up this week?'
const ANSWER =
  'Steel sheet consumption is 12% above the 4-week average. Most of the gap comes from production order OF-2026-00942 on Line 2, where scrap on the cutting step rose after the blade change on Tuesday.'
const SOURCES = ['OF-2026-00942', 'RM-20482', 'MT-0566']

const INSIGHTS: { icon: LucideIcon; kind: string; title: string; body: string; action: string; tone: string }[] = [
  {
    icon: TrendingUp,
    kind: 'AI insight',
    title: 'Steel consumption is 12% above normal.',
    body: 'Possible cause: production order OF-2026-00942.',
    action: 'Investigate',
    tone: 'text-flow-teal',
  },
  {
    icon: PackageSearch,
    kind: 'Reorder recommendation',
    title: 'Packaging may reach critical level in 6 days.',
    body: 'Recommended order: 2,400 units.',
    action: 'Review purchase',
    tone: 'text-amber-600',
  },
  {
    icon: Wrench,
    kind: 'Production anomaly',
    title: 'Machine M-04 has 3× normal downtime.',
    body: 'Detected 4 unplanned stops in the last 8 hours.',
    action: 'Open maintenance',
    tone: 'text-red-600',
  },
]

export function AISection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-160px' })
  const reduce = useReducedMotion()
  const words = ANSWER.split(' ')
  const [typedRaw, setTyped] = useState(0)
  const [streamedRaw, setStreamed] = useState(0)
  const typed = reduce ? QUESTION.length : typedRaw
  const streamed = reduce ? words.length : streamedRaw

  useEffect(() => {
    if (!inView || reduce) return
    if (typed < QUESTION.length) {
      const id = setTimeout(() => setTyped((t) => t + 1), typed === 0 ? 400 : 32)
      return () => clearTimeout(id)
    }
    if (streamed < words.length) {
      const id = setTimeout(() => setStreamed((s) => s + 1), streamed === 0 ? 700 : 45)
      return () => clearTimeout(id)
    }
  }, [inView, reduce, typed, streamed, words.length])

  const asked = typed >= QUESTION.length
  const done = streamed >= words.length

  return (
    <Section tone="light">
      <SectionHeader
        label="Intelligence"
        title={
          <>
            Your operations, <Dim>with intelligence built in.</Dim>
          </>
        }
        description="Use AI to find anomalies, surface recommendations and explain what's changing — grounded in your own orders, stock and machines, without giving up control."
      />

      <div ref={ref} className="mt-16 grid gap-3 lg:mt-20 lg:grid-cols-[1.35fr_1fr]">
        {/* assistant */}
        <Reveal>
          <Card className="flex h-full min-h-[440px] flex-col overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 text-[13px] font-medium">
              <Sparkles className="size-3.5 text-flow-teal" /> AI assistant
              <span className="ml-auto text-[11px] font-normal text-ink/35">Sample conversation</span>
            </div>

            <div className="flex-1 space-y-5 p-5">
              {typed > 0 && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-[13px] text-white">
                    {QUESTION.slice(0, typed)}
                    {!asked && <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-white" />}
                  </div>
                </div>
              )}

              {asked && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="flex gap-3"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-paper">
                    <Sparkles className="size-3.5 text-flow-teal" />
                  </span>
                  <div className="min-w-0 pt-1">
                    {streamed === 0 ? (
                      <div className="flex gap-1 pt-1.5">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ opacity: [0.25, 1, 0.25] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                            className="size-1.5 rounded-full bg-ink/40"
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-[14px] leading-[1.65]">{words.slice(0, streamed).join(' ')}</p>
                    )}
                    {done && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className="mt-4 flex flex-wrap items-center gap-1.5"
                      >
                        <span className="text-[11px] text-slate">Sources</span>
                        {SOURCES.map((s) => (
                          <span key={s} className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px]">
                            {s}
                          </span>
                        ))}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="border-t border-line p-3">
              <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[13px] text-ink/35">
                Ask about stock, orders, machines…
                <span className="ml-auto grid size-6 place-items-center rounded-md bg-ink text-white">
                  <ArrowUp className="size-3.5" />
                </span>
              </div>
            </div>
          </Card>
        </Reveal>

        {/* proactive insights */}
        <div className="grid gap-3">
          {INSIGHTS.map((it, i) => (
            <Reveal key={it.kind} delay={0.06 * (i + 1)}>
              <Card className="h-full p-5">
                <div className="flex items-center gap-2 text-[12px] text-slate">
                  <it.icon className={cn('size-3.5', it.tone)} />
                  {it.kind}
                </div>
                <div className="mt-3 text-[14px] font-medium leading-snug">{it.title}</div>
                <div className="mt-1 text-[13px] text-slate">{it.body}</div>
                <div className="mt-4 text-[13px] font-medium">{it.action} →</div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-[13px] text-slate">AI recommends. You decide.</p>
    </Section>
  )
}
