'use client'

import Link from 'next/link'
import {
  ArrowUpRight,
  Play,
  ShieldCheck,
  Layers,
  RadioTower,
  Languages,
  Factory,
  Download,
  MoreHorizontal,
  PackageSearch,
  Wrench,
  CheckCheck,
  ScanLine
} from 'lucide-react'

interface HeroProps {
  onOpenDemo: () => void
}

export function Hero({ onOpenDemo }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[680px] opacity-60 mesh"></div>
      <div className="pointer-events-none absolute left-1/2 top-20 h-[520px] w-[850px] -translate-x-1/2 rounded-full bg-emerald-100/50 blur-3xl"></div>
      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="fade-up inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold tracking-[.14em] text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-[#008060] pulse-soft"></span>
            INDUSTRIAL OPERATIONS PLATFORM
          </div>
          <h1 className="fade-up delay-1 mt-7 text-balance text-5xl font-semibold tracking-[-.055em] text-neutral-950 sm:text-6xl lg:text-[78px] lg:leading-[.98]">
            Run your factory with{' '}
            <span className="text-[#008060]">complete visibility.</span>
          </h1>
          <p className="fade-up delay-2 mx-auto mt-6 max-w-2xl text-balance text-[17px] leading-7 text-neutral-600 sm:text-lg">
            Manage inventory, production, purchasing, quality, maintenance and
            warehouse operations from one calm, connected system.
          </p>
          <div className="fade-up delay-3 mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111513] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/10 transition hover:-translate-y-0.5 hover:bg-black"
            >
              Start free <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={onOpenDemo}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 cursor-pointer"
            >
              See how it works <Play className="h-4 w-4" />
            </button>
          </div>
          <div className="fade-up delay-4 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
              Role-based
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-700" />
              Multi-site
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RadioTower className="h-3.5 w-3.5 text-emerald-700" />
              Real-time
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5 text-emerald-700" /> FR · AR
            </span>
          </div>
        </div>

        {/* Hero dashboard */}
        <div className="relative mx-auto mt-14 max-w-6xl pb-24 sm:mt-16">
          <div className="relative overflow-hidden rounded-[28px] border border-neutral-200/90 bg-[#fcfcfb] shadow-soft">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-200"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-200"></span>
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-200"></span>
                </div>
                <div className="hidden h-7 w-px bg-neutral-200 sm:block"></div>
                <div className="hidden text-xs font-medium text-neutral-500 sm:block">
                  Overview / Factory A
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </div>
            </div>
            <div className="grid gap-0 lg:grid-cols-[210px_1fr]">
              <aside className="hidden border-r border-neutral-200 bg-[#f6f7f5] p-4 lg:block">
                <div className="rounded-xl bg-white p-3 shadow-card">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Factory className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-neutral-900">
                        Atlas Manufacturing
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        Casablanca · Factory 01
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-1 text-xs text-neutral-600 font-medium">
                  <div className="rounded-lg bg-[#111513] px-3 py-2 font-semibold text-white">
                    Overview
                  </div>
                  <div className="px-3 py-2 hover:text-neutral-950 transition cursor-pointer">Inventory</div>
                  <div className="px-3 py-2 hover:text-neutral-950 transition cursor-pointer">Warehouse</div>
                  <div className="px-3 py-2 hover:text-neutral-950 transition cursor-pointer">Production</div>
                  <div className="px-3 py-2 hover:text-neutral-950 transition cursor-pointer">Purchasing</div>
                  <div className="px-3 py-2 hover:text-neutral-950 transition cursor-pointer">Quality</div>
                  <div className="px-3 py-2 hover:text-neutral-950 transition cursor-pointer">Maintenance</div>
                </div>
              </aside>
              <div className="p-4 sm:p-6 lg:p-7">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-neutral-400">
                      Monday, 04 October
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                      Good afternoon, Youssef
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenDemo}
                    className="inline-flex w-fit items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 shadow-xs hover:bg-neutral-50 transition cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Daily report
                  </button>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Production</span>
                      <span className="text-emerald-700 font-medium">+8.4%</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                      84.6%
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-neutral-100">
                      <div
                        className="h-full w-[84.6%] rounded-full bg-[#008060]"
                      ></div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Inventory</span>
                      <span className="text-amber-700 font-medium">3 alerts</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                      1.84M{' '}
                      <span className="text-sm font-medium text-neutral-400">
                        MAD
                      </span>
                    </div>
                    <div className="mt-3 text-[11px] text-neutral-500">
                      92.1% stock accuracy
                    </div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Orders</span>
                      <span className="text-neutral-400">Today</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                      124
                    </div>
                    <div className="mt-3 text-[11px] text-neutral-500">
                      42 open · 82 fulfilled
                    </div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Machines</span>
                      <span className="text-emerald-700 font-medium">90%</span>
                    </div>
                    <div className="mt-2 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                      18 / 20
                    </div>
                    <div className="mt-3 text-[11px] text-neutral-500">
                      2 need attention
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-neutral-950">
                          Production output
                        </div>
                        <div className="mt-0.5 text-[11px] text-neutral-500">
                          Last 7 days
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-50 transition"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-7 flex h-40 items-end gap-2 sm:gap-3">
                      <div
                        className="flex-1 rounded-t-md bg-neutral-100 transition-all hover:opacity-80"
                        style={{ height: '44%' }}
                        title="Monday: 44%"
                      ></div>
                      <div
                        className="flex-1 rounded-t-md bg-neutral-100 transition-all hover:opacity-80"
                        style={{ height: '59%' }}
                        title="Tuesday: 59%"
                      ></div>
                      <div
                        className="flex-1 rounded-t-md bg-neutral-100 transition-all hover:opacity-80"
                        style={{ height: '52%' }}
                        title="Wednesday: 52%"
                      ></div>
                      <div
                        className="flex-1 rounded-t-md bg-emerald-200 transition-all hover:opacity-80"
                        style={{ height: '73%' }}
                        title="Thursday: 73%"
                      ></div>
                      <div
                        className="flex-1 rounded-t-md bg-emerald-300 transition-all hover:opacity-80"
                        style={{ height: '67%' }}
                        title="Friday: 67%"
                      ></div>
                      <div
                        className="flex-1 rounded-t-md bg-[#008060] transition-all hover:opacity-80"
                        style={{ height: '88%' }}
                        title="Saturday: 88%"
                      ></div>
                      <div
                        className="flex-1 rounded-t-md bg-[#111513] transition-all hover:opacity-80"
                        style={{ height: '78%' }}
                        title="Sunday: 78%"
                      ></div>
                    </div>
                    <div className="mt-3 grid grid-cols-7 text-center text-[10px] text-neutral-400">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                    <div className="text-sm font-semibold text-neutral-950">Needs attention</div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">
                      Operational alerts
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-amber-700 shadow-xs">
                          <PackageSearch className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-neutral-900">
                            Packaging is low
                          </div>
                          <div className="mt-0.5 text-[10px] text-neutral-500">
                            Critical in 6 days · 2,400 units
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-red-100 bg-red-50 p-3">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-red-700 shadow-xs">
                          <Wrench className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-900">
                            Machine M-04 stopped
                          </div>
                          <div className="mt-0.5 text-[10px] text-neutral-500">
                            18 min downtime · maintenance open
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-emerald-700 shadow-xs">
                          <CheckCheck className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-900">
                            QC batch approved
                          </div>
                          <div className="mt-0.5 text-[10px] text-neutral-500">
                            LOT-2026-00482 · released to stock
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating cards */}
          <div className="float-a absolute -left-2 top-20 hidden w-52 rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft xl:block">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-neutral-400">
                Production order
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                In production
              </span>
            </div>
            <div className="mt-3 text-sm font-semibold text-neutral-950">OF-2026-00942</div>
            <div className="mt-1 text-[11px] text-neutral-500">
              Table T-420 · 412 / 500 units
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-neutral-100">
              <div className="h-full w-[82%] rounded-full bg-[#008060]"></div>
            </div>
          </div>
          <div className="float-b absolute -right-2 top-44 hidden w-52 rounded-2xl border border-neutral-200 bg-white p-4 shadow-soft xl:block">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-100 text-neutral-700">
                <ScanLine className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-900">Warehouse A</div>
                <div className="text-[10px] text-neutral-500">
                  Live location scan
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-[10px] text-neutral-400">Steel Sheet</div>
                <div className="text-lg font-semibold text-neutral-950">
                  218{' '}
                  <span className="text-xs font-medium text-neutral-400">
                    pcs
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700">
                A-03-12
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
