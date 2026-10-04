'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import {
  BadgeCheck,
  BarChart3,
  Bell,
  Boxes,
  CalendarDays,
  CheckSquare,
  ChevronsUpDown,
  Factory,
  Home,
  Package,
  PackageSearch,
  Search,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  CheckCheck,
} from 'lucide-react'
import { LogoMark } from '@/components/logo'
import { cn } from '@/lib/utils'
import { CountUp, EASE, SAMPLE_NOTE } from './ui'

const NAV: { group?: string; items: { icon: typeof Home; label: string; active?: boolean }[] }[] = [
  { items: [{ icon: Home, label: 'Overview', active: true }] },
  {
    group: 'Operations',
    items: [
      { icon: Package, label: 'Catalog' },
      { icon: Boxes, label: 'Inventory' },
      { icon: Warehouse, label: 'Warehouse' },
      { icon: ShoppingCart, label: 'Purchasing' },
      { icon: Truck, label: 'Sales' },
    ],
  },
  {
    group: 'Industrial',
    items: [
      { icon: Factory, label: 'Production' },
      { icon: BadgeCheck, label: 'Quality' },
      { icon: Wrench, label: 'Maintenance' },
      { icon: Users, label: 'Team' },
    ],
  },
  {
    group: 'Platform',
    items: [
      { icon: Wallet, label: 'Finance' },
      { icon: BarChart3, label: 'Analytics' },
      { icon: CheckSquare, label: 'Approvals' },
      { icon: Sparkles, label: 'AI assistant' },
    ],
  },
]

const OUTPUT = [52, 61, 48, 70, 66, 84, 77, 58, 72, 80, 69, 88]

const ORDERS = [
  { id: 'OF-2026-00942', item: 'Table T-420', line: 'Assembly', qty: '412 / 500', status: ['In progress', 'pill-info'] },
  { id: 'OF-2026-00941', item: 'Chair C-118', line: 'Cutting', qty: '1,200 / 1,200', status: ['Completed', 'pill-success'] },
  { id: 'OF-2026-00943', item: 'Cabinet K-07', line: 'Finishing', qty: '0 / 260', status: ['Waiting QC', 'pill-warning'] },
  { id: 'OF-2026-00944', item: 'Desk D-310', line: 'Painting', qty: '96 / 300', status: ['Blocked', 'pill-critical'] },
]

/** Product shot that mirrors the real admin: dark rail, inset light canvas. */
export function HeroVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 20%'] })
  const rotateX = useTransform(scrollYProgress, [0, 1], [14, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1])

  return (
    <div ref={ref} className="relative mt-16 perspective-[2000px] sm:mt-20">
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: EASE, delay: 0.5 }}
        style={{ rotateX, scale }}
        className="origin-top"
      >
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] p-1.5 shadow-[0_40px_120px_-30px_rgba(0,0,0,.9)] sm:rounded-2xl sm:p-2">
          <div className="flex">
            <Rail />
            <Canvas />
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function Rail() {
  return (
    <aside className="hidden w-[208px] shrink-0 flex-col px-2 py-2 text-[12px] lg:flex">
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
        <LogoMark className="h-5 w-6" size={24} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-white">Atlas Manufacturing</div>
        </div>
        <ChevronsUpDown className="size-3.5 text-white/40" />
      </div>
      <div className="mx-1 mt-2 flex items-center gap-2 rounded-md border border-white/8 bg-white/4 px-2 py-1.5 text-white/40">
        <Search className="size-3.5" />
        <span className="flex-1">Search</span>
        <kbd className="rounded bg-white/8 px-1 text-[10px] text-white/50">⌘K</kbd>
      </div>
      <nav className="mt-3 space-y-3">
        {NAV.map((g, gi) => (
          <div key={gi}>
            {g.group && <div className="px-2 pb-1 text-[11px] font-medium text-white/30">{g.group}</div>}
            {g.items.map((it) => (
              <div
                key={it.label}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-[5px]',
                  it.active ? 'bg-white/10 text-white' : 'text-white/55',
                )}
              >
                <it.icon className="size-3.5" />
                {it.label}
              </div>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

function Canvas() {
  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-lg bg-[#f7f7f8] text-ink sm:rounded-xl">
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-line bg-white px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2 text-[12px] text-slate">
          <span>Atlas Manufacturing</span>
          <span className="text-ink/25">/</span>
          <span className="font-medium text-ink">Overview</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] text-ink/35 sm:inline">{SAMPLE_NOTE}</span>
          <div className="relative grid size-7 place-items-center rounded-md border border-line text-slate">
            <Bell className="size-3.5" />
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-flow-amber" />
          </div>
          <div className="grid size-7 place-items-center rounded-full bg-flow-teal text-[10px] font-semibold text-white">YB</div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-semibold tracking-tight">Good afternoon, Youssef</h3>
            <p className="mt-0.5 text-[12px] text-slate">Casablanca · Factory 01 · Shift B</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-md border border-line bg-white px-2.5 py-1 text-[12px] font-medium shadow-[0_1px_0_rgba(0,0,0,.04)]">
              Export
            </span>
            <span className="rounded-md bg-ink px-2.5 py-1 text-[12px] font-medium text-white">New order</span>
          </div>
        </div>

        {/* stat strip — same layout as the product's StatStrip */}
        <div className="grid overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-[auto_1fr]">
          <div className="hidden items-center gap-2 border-r border-line px-4 text-[12px] sm:flex">
            <CalendarDays className="size-3.5" /> 30 days
          </div>
          <dl className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
            {[
              { l: 'OEE', v: <CountUp to={84.6} decimals={1} suffix="%" />, h: '+8.4%' },
              { l: 'Stock value', v: <CountUp to={1.84} decimals={2} suffix="M" />, h: 'MAD' },
              { l: 'Orders', v: <CountUp to={124} />, h: '42 open' },
              { l: 'Machines up', v: <CountUp to={18} suffix=" / 20" />, h: '2 alerts' },
            ].map((s) => (
              <div key={s.l} className="px-4 py-3">
                <dt className="text-[12px] font-semibold underline decoration-ink/25 decoration-dotted underline-offset-4">{s.l}</dt>
                <dd className="mt-1 flex items-baseline gap-1.5 text-[12px]">
                  <span className="text-[15px] font-medium">{s.v}</span>
                  <span className="text-slate">{s.h}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          {/* chart */}
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold">Production output</div>
              <div className="text-[11px] text-slate">Units / day · last 12 days</div>
            </div>
            <div className="mt-4 flex h-32 items-end gap-1.5">
              {OUTPUT.map((h, i) => (
                <div key={i} className="flex h-full flex-1 items-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 1 + i * 0.04, duration: 0.9, ease: EASE }}
                    className={cn('w-full rounded-[3px]', i === OUTPUT.length - 1 ? 'bg-flow-blue' : 'bg-ink/8')}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* alerts */}
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="text-[13px] font-semibold">Needs attention</div>
            <div className="mt-3 divide-y divide-line">
              {[
                { i: PackageSearch, t: 'Packaging is low', m: 'Critical in 6 days', c: 'text-amber-600' },
                { i: Wrench, t: 'Machine M-04 stopped', m: '18 min downtime', c: 'text-red-600' },
                { i: CheckCheck, t: 'LOT-2026-00482 released', m: 'QC approved', c: 'text-emerald-600' },
              ].map((a, idx) => (
                <motion.div
                  key={a.t}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.3 + idx * 0.15, duration: 0.6, ease: EASE }}
                  className="flex items-center gap-2.5 py-2"
                >
                  <a.i className={cn('size-3.5 shrink-0', a.c)} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{a.t}</span>
                  <span className="shrink-0 text-[11px] text-slate">{a.m}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* table */}
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-[13px] font-semibold">Production orders</div>
            <div className="flex gap-1 text-[11px]">
              <span className="rounded-md bg-paper px-2 py-0.5 font-medium">All</span>
              <span className="px-2 py-0.5 text-slate">In progress</span>
              <span className="hidden px-2 py-0.5 text-slate sm:inline">Blocked</span>
            </div>
          </div>
          <table className="w-full text-left text-[12px]">
            <thead className="border-y border-line bg-paper/60 text-[11px] text-slate">
              <tr>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Line</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Quantity</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ORDERS.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 font-mono text-[11px] font-medium">{o.id}</td>
                  <td className="px-4 py-2.5">{o.item}</td>
                  <td className="hidden px-4 py-2.5 text-slate md:table-cell">{o.line}</td>
                  <td className="hidden px-4 py-2.5 tabular-nums text-slate sm:table-cell">{o.qty}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn('pill text-[11px]', o.status[1])}>{o.status[0]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
