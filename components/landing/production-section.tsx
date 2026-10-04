'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ScanLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardHead, Dim, EASE, LiveDot, Meter, Reveal, Section, SectionHeader } from './ui'

const CENTERS = [
  { name: 'Cutting', value: 92, state: 'Running' },
  { name: 'Assembly', value: 68, state: 'Running' },
  { name: 'Painting', value: 31, state: 'Stopped' },
  { name: 'Packing', value: 54, state: 'Running' },
]

const SCANS = [
  { sku: 'RM-20482', name: 'Steel sheet 2mm', loc: 'A-03-12', qty: '+218', kind: 'Receive' },
  { sku: 'PK-00931', name: 'Packaging box L', loc: 'B-01-04', qty: '−600', kind: 'Pick' },
  { sku: 'CP-11204', name: 'M8 fasteners', loc: 'C-02-01', qty: '14,600', kind: 'Count' },
  { sku: 'FG-T420', name: 'Table T-420', loc: 'Dock 2', qty: '−48', kind: 'Ship' },
]

function useCycle(length: number, ms: number) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setI((x) => (x + 1) % length), ms)
    return () => clearInterval(id)
  }, [reduce, length, ms])
  return i
}

export function ProductionSection() {
  const reduce = useReducedMotion()
  const [output, setOutput] = useState(412)
  const scan = useCycle(SCANS.length, 2600)

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setOutput((o) => (o >= 500 ? 412 : o + 1)), 1500)
    return () => clearInterval(id)
  }, [reduce])

  const s = SCANS[scan]

  return (
    <Section tone="dark" className="border-t border-white/6">
      <SectionHeader
        label="Shop floor & warehouse"
        title={
          <>
            From order to production floor. <Dim>Know where everything is.</Dim>
          </>
        }
        description="Give planners the detail they need and operators only the controls they actually use. Make receiving, picking, counting and transfers fast enough for the floor — not just the office."
      />

      <div className="mt-16 grid gap-3 lg:mt-20 lg:grid-cols-2">
        {/* production board */}
        <Reveal>
          <Card className="h-full p-6 sm:p-8">
            <CardHead title="Production board" caption="Today · Factory A" right={<LiveDot />} />

            <div className="mt-8 space-y-5">
              {CENTERS.map((c, i) => (
                <div key={c.name}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium">{c.name}</span>
                    <span className={cn('text-[12px] tabular-nums', c.state === 'Stopped' ? 'text-red-400' : 'text-fog')}>
                      {c.state === 'Stopped' ? 'Stopped · 18 min' : `${c.value}%`}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Meter value={c.value} delay={i * 0.08} className={c.state === 'Stopped' ? 'bg-red-400' : 'bg-white'} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-3 divide-x divide-white/8 rounded-xl border border-white/8">
              <Stat label="Output" value={<span className="tabular-nums">{output}</span>} hint="/ 500" />
              <Stat label="Scrap" value="4" hint="pcs" />
              <Stat label="OEE" value="84.6%" />
            </div>
          </Card>
        </Reveal>

        {/* warehouse */}
        <Reveal delay={0.08}>
          <Card className="h-full p-6 sm:p-8">
            <CardHead title="Warehouse A" caption="Receiving → dispatch" right={<LiveDot label="Synced" />} />

            <div className="mt-8 grid grid-cols-4 gap-2">
              {[
                ['Receiving', 12],
                ['Put-away', 18],
                ['Picking', 24],
                ['Dispatch', 8],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-white/8 px-3 py-3">
                  <div className="truncate text-[11px] text-fog">{l}</div>
                  <div className="mt-1 text-lg font-medium tabular-nums">{v}</div>
                </div>
              ))}
            </div>

            {/* scanner */}
            <div className="mt-3 overflow-hidden rounded-xl border border-white/8 bg-ink">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5 text-[12px]">
                <span className="flex items-center gap-2 text-fog">
                  <ScanLine className="size-3.5" /> Last scan
                </span>
                <span className="text-white/30">Just now</span>
              </div>
              <div className="relative h-[92px] px-4">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={s.sku}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="absolute inset-x-4 top-4 flex items-start justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] text-fog">{s.kind}</div>
                      <div className="mt-0.5 truncate text-[15px] font-medium">{s.name}</div>
                      <div className="mt-1 font-mono text-[11px] text-white/40">{s.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-fog">Location</div>
                      <div className="mt-0.5 font-mono text-[15px] font-medium text-flow-blue">{s.loc}</div>
                      <div className="mt-1 text-[11px] tabular-nums text-white/40">{s.qty}</div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-3 flex gap-1">
              {SCANS.map((_, i) => (
                <span
                  key={i}
                  className={cn('h-0.5 flex-1 rounded-full transition-colors duration-500', i === scan ? 'bg-white' : 'bg-white/10')}
                />
              ))}
            </div>
          </Card>
        </Reveal>
      </div>
    </Section>
  )
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[11px] text-fog">{label}</div>
      <div className="mt-1 flex items-baseline gap-1 text-lg font-medium">
        {value}
        {hint && <span className="text-[12px] font-normal text-fog">{hint}</span>}
      </div>
    </div>
  )
}
