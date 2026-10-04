'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import {
  BadgeCheck,
  Boxes,
  ChartNoAxesCombined,
  Check,
  Factory,
  GitBranch,
  ShoppingCart,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EASE, Reveal, SAMPLE_NOTE, Section, SectionHeader } from './ui'

type Status = 'success' | 'warning' | 'critical' | 'info' | 'neutral'
type Row = { cells: string[]; status: [string, Status] }

interface Module {
  icon: LucideIcon
  name: string
  description: string
  bullets: string[]
  stats: { label: string; value: string; hint?: string }[]
  table: { title: string; columns: string[]; rows: Row[] }
}

const MODULES: Module[] = [
  {
    icon: Boxes,
    name: 'Inventory',
    description: "Know what's on hand, reserved, incoming and consumed.",
    bullets: ['Multi-unit items & lots', 'Reservations and reorder points', 'Weighted average valuation'],
    stats: [
      { label: 'Stock value', value: '1.84M', hint: 'MAD' },
      { label: 'Accuracy', value: '92.1%' },
      { label: 'Below min.', value: '3', hint: 'items' },
    ],
    table: {
      title: 'Stock',
      columns: ['Item', 'SKU', 'On hand', 'Reserved'],
      rows: [
        { cells: ['Steel sheet 2mm', 'RM-20482', '218 pcs', '120'], status: ['In stock', 'success'] },
        { cells: ['Packaging box L', 'PK-00931', '2,400', '0'], status: ['Low', 'warning'] },
        { cells: ['M8 fasteners', 'CP-11204', '14,600', '2,000'], status: ['In stock', 'success'] },
        { cells: ['Paint RAL 9010', 'CH-00412', '38 L', '30 L'], status: ['Reorder', 'critical'] },
      ],
    },
  },
  {
    icon: Warehouse,
    name: 'Warehouse',
    description: 'Locations, receiving, picking, transfers and barcode workflows.',
    bullets: ['Zones, aisles, racks and bins', 'Waves, picking and packing', 'Scan-driven put-away'],
    stats: [
      { label: 'Receiving', value: '12' },
      { label: 'Picking', value: '24' },
      { label: 'Dispatch', value: '8', hint: 'today' },
    ],
    table: {
      title: 'Tasks',
      columns: ['Task', 'Location', 'Item', 'Assignee'],
      rows: [
        { cells: ['PICK-2210', 'A-03-12', 'Steel sheet × 40', 'Hamza'], status: ['In progress', 'info'] },
        { cells: ['PUT-1182', 'B-01-04', 'Packaging × 600', 'Salma'], status: ['Done', 'success'] },
        { cells: ['CNT-0098', 'C-02', 'Cycle count', 'Omar'], status: ['Planned', 'neutral'] },
        { cells: ['TRF-0310', 'Dock 2', 'To Fès workshop', 'Nadia'], status: ['In transit', 'info'] },
      ],
    },
  },
  {
    icon: Factory,
    name: 'Production',
    description: 'BOMs, routing, work orders, material consumption and output.',
    bullets: ['Multi-level BOMs & routings', 'Work centers and capacity', 'Consumption and scrap reporting'],
    stats: [
      { label: 'OEE', value: '84.6%' },
      { label: 'Output', value: '412', hint: '/ 500' },
      { label: 'Scrap', value: '0.8%' },
    ],
    table: {
      title: 'Production orders',
      columns: ['Order', 'Product', 'Work center', 'Qty'],
      rows: [
        { cells: ['OF-00942', 'Table T-420', 'Assembly', '412 / 500'], status: ['In progress', 'info'] },
        { cells: ['OF-00941', 'Chair C-118', 'Cutting', '1,200'], status: ['Completed', 'success'] },
        { cells: ['OF-00943', 'Cabinet K-07', 'Finishing', '0 / 260'], status: ['Waiting QC', 'warning'] },
        { cells: ['OF-00944', 'Desk D-310', 'Painting', '96 / 300'], status: ['Blocked', 'critical'] },
      ],
    },
  },
  {
    icon: ShoppingCart,
    name: 'Purchasing',
    description: 'Suppliers, POs, receipts, lead times and cost visibility.',
    bullets: ['Requests, tenders and POs', 'Approval workflows', 'Three-way match on invoices'],
    stats: [
      { label: 'Open POs', value: '18' },
      { label: 'Spend', value: '642k', hint: 'MAD' },
      { label: 'Lead time', value: '9 d', hint: 'avg.' },
    ],
    table: {
      title: 'Purchase orders',
      columns: ['PO', 'Supplier', 'Amount', 'ETA'],
      rows: [
        { cells: ['PO-2026-118', 'Atlas Steel', '84,200 MAD', '06 Oct'], status: ['Approved', 'success'] },
        { cells: ['PO-2026-119', 'Maghreb Pack', '22,750 MAD', '09 Oct'], status: ['In transit', 'info'] },
        { cells: ['PO-2026-120', 'Sefrou Chimie', '9,480 MAD', '—'], status: ['Awaiting approval', 'warning'] },
        { cells: ['PO-2026-121', 'Rif Fixations', '4,120 MAD', '—'], status: ['Draft', 'neutral'] },
      ],
    },
  },
  {
    icon: BadgeCheck,
    name: 'Quality',
    description: 'Inspections, defects, quarantine, traceability and CAPA.',
    bullets: ['Inspection plans per item', 'Quarantine and release', 'NCR and CAPA follow-up'],
    stats: [
      { label: 'First-pass yield', value: '97.4%' },
      { label: 'Open NCRs', value: '3' },
      { label: 'Quarantine', value: '2', hint: 'lots' },
    ],
    table: {
      title: 'Inspections',
      columns: ['Inspection', 'Lot', 'Stage', 'Inspector'],
      rows: [
        { cells: ['QC-1043', 'LOT-T420-82', 'Final', 'Imane'], status: ['Passed', 'success'] },
        { cells: ['QC-1044', 'LOT-SS-2048', 'Receiving', 'Imane'], status: ['Passed', 'success'] },
        { cells: ['QC-1045', 'LOT-PK-0931', 'Receiving', 'Karim'], status: ['Pending', 'warning'] },
        { cells: ['QC-1046', 'LOT-K07-12', 'In-process', 'Karim'], status: ['Failed · NCR', 'critical'] },
      ],
    },
  },
  {
    icon: Wrench,
    name: 'Maintenance',
    description: 'Preventive plans, breakdowns, parts, downtime and assets.',
    bullets: ['Preventive plans and calendars', 'Breakdown work orders', 'Spare parts and downtime'],
    stats: [
      { label: 'Uptime', value: '96.2%' },
      { label: 'MTTR', value: '42', hint: 'min' },
      { label: 'PM due', value: '5', hint: 'this week' },
    ],
    table: {
      title: 'Work orders',
      columns: ['Order', 'Asset', 'Type', 'Due'],
      rows: [
        { cells: ['MT-0571', 'Press M-04', 'Breakdown', 'Now'], status: ['Open', 'critical'] },
        { cells: ['MT-0569', 'CNC router R-2', 'Preventive', '07 Oct'], status: ['Scheduled', 'info'] },
        { cells: ['MT-0566', 'Compressor C-1', 'Preventive', '04 Oct'], status: ['Done', 'success'] },
        { cells: ['MT-0565', 'Forklift F-3', 'Inspection', '10 Oct'], status: ['Planned', 'neutral'] },
      ],
    },
  },
  {
    icon: GitBranch,
    name: 'Traceability',
    description: 'Trace a batch from raw material to finished product and back.',
    bullets: ['Lot and serial genealogy', 'Forward and backward trace', 'Recall scope in one view'],
    stats: [
      { label: 'Lots tracked', value: '1,284' },
      { label: 'Serials', value: '9,410' },
      { label: 'Depth', value: '4', hint: 'levels' },
    ],
    table: {
      title: 'Genealogy · LOT-SS-2048',
      columns: ['Lot', 'Origin', 'Used in', 'Shipped to'],
      rows: [
        { cells: ['LOT-SS-2048', 'Atlas Steel', 'OF-00942', '—'], status: ['Consumed', 'neutral'] },
        { cells: ['LOT-T420-82', 'OF-00942', '—', 'DN-4418'], status: ['Delivered', 'success'] },
        { cells: ['LOT-T420-83', 'OF-00942', '—', 'DN-4421'], status: ['In transit', 'info'] },
        { cells: ['LOT-T420-84', 'OF-00942', '—', '—'], status: ['In stock', 'success'] },
      ],
    },
  },
  {
    icon: ChartNoAxesCombined,
    name: 'Analytics',
    description: 'Turn operational data into clear decisions and action.',
    bullets: ['Actual vs standard cost', 'Product and order margin', 'Downtime and variance reports'],
    stats: [
      { label: 'Margin', value: '31.4%' },
      { label: 'Material var.', value: '+3.2%' },
      { label: 'Downtime', value: '2.8%' },
    ],
    table: {
      title: 'Product cost',
      columns: ['Product', 'Standard', 'Actual', 'Variance'],
      rows: [
        { cells: ['Table T-420', '118.40', '114.82', '−3.0%'], status: ['Favourable', 'success'] },
        { cells: ['Chair C-118', '64.10', '65.02', '+1.4%'], status: ['Watch', 'warning'] },
        { cells: ['Cabinet K-07', '402.00', '431.60', '+7.4%'], status: ['Over', 'critical'] },
        { cells: ['Desk D-310', '236.50', '235.90', '−0.3%'], status: ['On target', 'success'] },
      ],
    },
  },
]

const pill: Record<Status, string> = {
  success: 'pill-success',
  warning: 'pill-warning',
  critical: 'pill-critical',
  info: 'pill-info',
  neutral: 'pill-neutral',
}

const AUTOPLAY_MS = 6000

export function PlatformOverview() {
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-200px' })
  const reduce = useReducedMotion()
  const playing = auto && inView && !reduce

  useEffect(() => {
    if (!playing) return
    const id = setTimeout(() => setActive((a) => (a + 1) % MODULES.length), AUTOPLAY_MS)
    return () => clearTimeout(id)
  }, [playing, active])

  const m = MODULES[active]

  return (
    <Section id="platform" tone="light" className="border-t border-line">
      <SectionHeader
        label="Platform"
        title="One system for the entire operation."
        description="Start with inventory and warehouse control. Add production, quality, maintenance and analytics as your operation grows."
      />

      <div ref={ref} className="mt-16 lg:mt-20">
        {/* tabs */}
        <div
          role="tablist"
          aria-label="Modules"
          className="-mx-6 flex gap-1 overflow-x-auto px-6 pb-1 scrollbar-none lg:mx-0 lg:px-0"
        >
          {MODULES.map((mod, i) => {
            const on = i === active
            return (
              <button
                key={mod.name}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setActive(i)
                  setAuto(false)
                }}
                className={cn(
                  'relative flex h-9 shrink-0 cursor-pointer items-center gap-2 overflow-hidden rounded-full px-3.5 text-[13px] font-medium transition-colors',
                  on ? 'text-ink' : 'text-slate hover:text-ink',
                )}
              >
                {on && (
                  <motion.span
                    layoutId="platform-tab"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    className="absolute inset-0 rounded-full border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,.05)]"
                  />
                )}
                <mod.icon className="relative size-3.5" />
                <span className="relative">{mod.name}</span>
                {on && playing && (
                  <motion.span
                    key={`p-${active}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: AUTOPLAY_MS / 1000, ease: 'linear' }}
                    className="absolute inset-x-3 bottom-1 h-px origin-left bg-flow-teal/60"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* panel */}
        <Reveal className="mt-4">
          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_1px_2px_rgba(0,0,0,.03)]">
            <div className="grid lg:grid-cols-[340px_1fr]">
              <div className="relative border-b border-line p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={m.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <span className="grid size-9 place-items-center rounded-lg border border-line bg-paper">
                      <m.icon className="size-4" />
                    </span>
                    <h3 className="mt-6 text-xl font-medium tracking-[-0.02em]">{m.name}</h3>
                    <p className="mt-2 text-[14px] leading-6 text-slate">{m.description}</p>
                    <ul className="mt-6 space-y-2.5">
                      {m.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2.5 text-[13px]">
                          <Check className="size-3.5 text-flow-teal" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="min-w-0 bg-paper/60 p-4 sm:p-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={m.name}
                    initial={{ opacity: 0, y: 12, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="space-y-3"
                  >
                    <ModuleScreen module={m} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}

function ModuleScreen({ module: m }: { module: Module }) {
  return (
    <>
      <dl className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-white">
        {m.stats.map((s) => (
          <div key={s.label} className="px-4 py-3">
            <dt className="truncate text-[12px] font-semibold underline decoration-ink/25 decoration-dotted underline-offset-4">
              {s.label}
            </dt>
            <dd className="mt-1 flex items-baseline gap-1 text-[12px]">
              <span className="text-[16px] font-medium tabular-nums">{s.value}</span>
              {s.hint && <span className="text-slate">{s.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[13px] font-semibold">{m.table.title}</span>
          <span className="text-[11px] text-ink/35">{SAMPLE_NOTE}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-[12px]">
            <thead className="border-y border-line bg-paper/60 text-[11px] text-slate">
              <tr>
                {m.table.columns.map((c) => (
                  <th key={c} className="px-4 py-2 font-medium">
                    {c}
                  </th>
                ))}
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {m.table.rows.map((r, i) => (
                <motion.tr
                  key={r.cells[0]}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.12 + i * 0.06, duration: 0.3 }}
                >
                  {r.cells.map((c, ci) => (
                    <td
                      key={ci}
                      className={cn(
                        'whitespace-nowrap px-4 py-2.5',
                        ci === 0 ? 'font-medium' : 'text-slate',
                        /^[A-Z]{2,}-/.test(c) && 'font-mono text-[11px]',
                      )}
                    >
                      {c}
                    </td>
                  ))}
                  <td className="px-4 py-2.5">
                    <span className={cn('pill whitespace-nowrap text-[11px]', pill[r.status[1]])}>{r.status[0]}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
