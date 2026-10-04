'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BadgeCheck, BriefcaseBusiness, CalendarClock, ScanLine, Warehouse, Wrench, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, Dim, EASE, Reveal, Section, SectionHeader } from './ui'

interface Role {
  icon: LucideIcon
  name: string
  focus: string
  home: string
  widgets: { label: string; value: string }[]
  actions: string[]
}

const ROLES: Role[] = [
  {
    icon: BriefcaseBusiness,
    name: 'Owner',
    focus: 'Profitability, inventory, production, KPIs.',
    home: 'Company overview',
    widgets: [
      { label: 'Margin this month', value: '31.4%' },
      { label: 'Stock value', value: '1.84M MAD' },
      { label: 'On-time delivery', value: '94%' },
    ],
    actions: ['Approve PO-2026-120', 'Review cost variance K-07'],
  },
  {
    icon: CalendarClock,
    name: 'Production manager',
    focus: 'Planning, work centers, delays, output.',
    home: 'Production plan',
    widgets: [
      { label: 'Orders in progress', value: '7' },
      { label: 'OEE', value: '84.6%' },
      { label: 'Late orders', value: '1' },
    ],
    actions: ['Reschedule OF-00944', 'Assign line 2 shift B'],
  },
  {
    icon: Warehouse,
    name: 'Warehouse manager',
    focus: 'Receiving, picking, transfers, counts.',
    home: 'Warehouse tasks',
    widgets: [
      { label: 'Open tasks', value: '62' },
      { label: 'Stock accuracy', value: '92.1%' },
      { label: 'Dock appointments', value: '4' },
    ],
    actions: ['Release wave W-118', 'Start cycle count C-02'],
  },
  {
    icon: BadgeCheck,
    name: 'Quality manager',
    focus: 'Inspections, defects, CAPA, traceability.',
    home: 'Quality queue',
    widgets: [
      { label: 'Pending inspections', value: '5' },
      { label: 'First-pass yield', value: '97.4%' },
      { label: 'Open CAPA', value: '2' },
    ],
    actions: ['Inspect LOT-PK-0931', 'Close NCR-0218'],
  },
  {
    icon: Wrench,
    name: 'Maintenance',
    focus: 'Machines, downtime, maintenance plans.',
    home: 'Asset health',
    widgets: [
      { label: 'Machines up', value: '18 / 20' },
      { label: 'MTTR', value: '42 min' },
      { label: 'PM due', value: '5' },
    ],
    actions: ['Respond to MT-0571 · Press M-04', 'Order spare part BR-220'],
  },
  {
    icon: ScanLine,
    name: 'Operator',
    focus: 'Scan, start, report, complete. Nothing extra.',
    home: 'My work',
    widgets: [
      { label: 'Current order', value: 'OF-00942' },
      { label: 'Produced', value: '320' },
      { label: 'Scrap', value: '4' },
    ],
    actions: ['Continue production', 'Report an issue'],
  },
]

export function RoleExperience() {
  const [active, setActive] = useState(0)
  const r = ROLES[active]

  return (
    <Section id="roles" tone="dark">
      <SectionHeader
        label="Built around the work"
        title={
          <>
            Simple for operators. <Dim>Powerful for management.</Dim>
          </>
        }
        description="Every role lands on the screen it needs — with the right permissions, on the right site, and nothing extra."
      />

      <div className="mt-16 grid gap-3 lg:mt-20 lg:grid-cols-[360px_1fr]">
        <Reveal>
          <Card className="p-1.5">
            {ROLES.map((role, i) => {
              const on = i === active
              return (
                <button
                  key={role.name}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  className="relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3.5 py-3 text-left"
                >
                  {on && (
                    <motion.span
                      layoutId="role-active"
                      transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                      className="absolute inset-0 rounded-xl bg-white/6"
                    />
                  )}
                  <role.icon className={cn('relative size-4 shrink-0 transition-colors', on ? 'text-white' : 'text-fog')} />
                  <span className="relative min-w-0">
                    <span className={cn('block text-[14px] font-medium transition-colors', on ? 'text-white' : 'text-white/60')}>
                      {role.name}
                    </span>
                    <span className="block truncate text-[12px] text-fog">{role.focus}</span>
                  </span>
                </button>
              )
            })}
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full min-h-[380px] overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={r.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="flex h-full flex-col p-6 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] text-fog">{r.name} · home</div>
                    <div className="mt-1 text-xl font-medium tracking-[-0.02em]">{r.home}</div>
                  </div>
                  <span className="grid size-9 place-items-center rounded-lg border border-white/8">
                    <r.icon className="size-4" />
                  </span>
                </div>

                <div className="mt-8 grid gap-2 sm:grid-cols-3">
                  {r.widgets.map((w) => (
                    <div key={w.label} className="rounded-xl border border-white/8 bg-ink p-4">
                      <div className="text-[11px] text-fog">{w.label}</div>
                      <div className="mt-2 text-lg font-medium tabular-nums">{w.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-8">
                  <div className="text-[11px] font-medium uppercase tracking-[.08em] text-white/30">Up next</div>
                  <div className="mt-2 divide-y divide-white/8 rounded-xl border border-white/8">
                    {r.actions.map((a) => (
                      <div key={a} className="flex items-center justify-between px-4 py-3 text-[13px]">
                        <span>{a}</span>
                        <span className="text-fog">→</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </Card>
        </Reveal>
      </div>
    </Section>
  )
}
