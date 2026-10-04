'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Hand, ScanLine, WifiOff } from 'lucide-react'
import { Card, EASE, Reveal, Section, SectionHeader } from './ui'

const FEATURES = [
  {
    icon: ScanLine,
    title: 'Scan anything',
    body: 'Works with phone cameras and hardware scanners for receiving, picking, counts and production.',
  },
  {
    icon: WifiOff,
    title: 'Keeps working offline',
    body: 'Installs as an app. Actions queue on the device and sync when the connection is back.',
  },
  {
    icon: Hand,
    title: 'Made for gloves',
    body: 'Large targets, one task per screen, and only the controls an operator actually uses.',
  },
]

export function MobileOperations() {
  const reduce = useReducedMotion()
  return (
    <Section tone="dark" className="border-t border-white/6">
      <SectionHeader
        label="On the shop floor"
        title="Work where the work happens."
        description="Give teams a focused mobile experience for scanning, receiving, production reporting, quality checks and stock counts."
      />

      <div className="mt-16 grid gap-3 lg:mt-20 lg:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <Card className="flex h-full items-end justify-center overflow-hidden px-6 pt-12">
            {/* phone */}
            <motion.div
              initial={{ y: 60 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, ease: EASE }}
              className="w-[290px] rounded-t-[44px] border border-b-0 border-white/12 bg-ink-3 p-2.5 pb-0"
            >
              <div className="overflow-hidden rounded-t-[36px] bg-paper pb-8 text-ink">
                <div className="flex items-center justify-between px-6 pb-2 pt-3.5 text-[11px] font-semibold">
                  <span>09:41</span>
                  <span className="h-[18px] w-[72px] rounded-full bg-ink" />
                  <span>5G</span>
                </div>
                <div className="px-4 pt-3">
                  <div className="text-[11px] font-medium text-slate">My work · Line 2</div>
                  <div className="mt-3 rounded-2xl border border-line bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[13px] font-semibold">OF-00942</span>
                      <span className="pill pill-info text-[10px]">In progress</span>
                    </div>
                    <div className="mt-1 text-[12px] text-slate">Assembly · Table T-420</div>
                    <div className="mt-4 flex items-center justify-between text-[11px]">
                      <span className="text-slate">Progress</span>
                      <span className="font-medium">64%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/7">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: '64%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.5 }}
                        className="h-full rounded-full bg-flow-teal"
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-paper p-3">
                        <div className="text-[10px] text-slate">Produced</div>
                        <div className="mt-0.5 text-[15px] font-semibold">320</div>
                      </div>
                      <div className="rounded-xl bg-paper p-3">
                        <div className="text-[10px] text-slate">Scrap</div>
                        <div className="mt-0.5 text-[15px] font-semibold">4</div>
                      </div>
                    </div>
                  </div>

                  {/* scanner viewfinder */}
                  <div className="relative mt-3 h-28 overflow-hidden rounded-2xl bg-ink">
                    <div className="absolute inset-5 rounded-lg border border-white/25" />
                    <div className="absolute inset-x-10 top-1/2 flex h-10 -translate-y-1/2 items-end gap-[3px]">
                      {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1].map((w, i) => (
                        <span key={i} className="h-full bg-white/80" style={{ width: w }} />
                      ))}
                    </div>
                    {!reduce && (
                      <motion.div
                        animate={{ top: ['22%', '78%', '22%'] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute inset-x-5 h-px bg-red-500"
                      />
                    )}
                    <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/60">RM-20482 · A-03-12</div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <div className="rounded-xl bg-ink py-3 text-center text-[12px] font-semibold text-white">Continue production</div>
                    <div className="rounded-xl border border-line bg-white py-3 text-center text-[12px] font-semibold">Report issue</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </Card>
        </Reveal>

        <div className="grid gap-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={0.06 * (i + 1)}>
              <Card className="h-full p-6 sm:p-8">
                <f.icon className="size-4 text-flow-blue" />
                <h3 className="mt-6 text-[15px] font-medium">{f.title}</h3>
                <p className="mt-1.5 max-w-sm text-[13px] leading-[1.6] text-fog">{f.body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}
