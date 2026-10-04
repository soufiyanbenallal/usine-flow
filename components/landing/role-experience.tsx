import {
  BriefcaseBusiness,
  CalendarClock,
  Warehouse,
  BadgeCheck,
  Wrench,
  ScanLine,
} from 'lucide-react'

export function RoleExperience() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#008060]">
            Built around the work
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-neutral-950 sm:text-5xl">
            Simple for operators. Powerful for management.
          </h2>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card lg:col-span-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
              <BriefcaseBusiness className="h-4 w-4" />
            </div>
            <div className="mt-5 text-sm font-semibold text-neutral-950">Owner</div>
            <div className="mt-2 text-xs leading-5 text-neutral-500">
              Profitability, inventory, production, KPIs.
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card lg:col-span-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
              <CalendarClock className="h-4 w-4" />
            </div>
            <div className="mt-5 text-sm font-semibold text-neutral-950">Production manager</div>
            <div className="mt-2 text-xs leading-5 text-neutral-500">
              Planning, work centers, delays, output.
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card lg:col-span-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
              <Warehouse className="h-4 w-4" />
            </div>
            <div className="mt-5 text-sm font-semibold text-neutral-950">Warehouse manager</div>
            <div className="mt-2 text-xs leading-5 text-neutral-500">
              Receiving, picking, transfers, counts.
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card lg:col-span-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
              <BadgeCheck className="h-4 w-4" />
            </div>
            <div className="mt-5 text-sm font-semibold text-neutral-950">Quality manager</div>
            <div className="mt-2 text-xs leading-5 text-neutral-500">
              Inspections, defects, CAPA, traceability.
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card lg:col-span-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
              <Wrench className="h-4 w-4" />
            </div>
            <div className="mt-5 text-sm font-semibold text-neutral-950">Maintenance</div>
            <div className="mt-2 text-xs leading-5 text-neutral-500">
              Machines, downtime, maintenance plans.
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-card lg:col-span-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-xs">
              <ScanLine className="h-4 w-4" />
            </div>
            <div className="mt-5 text-sm font-semibold text-emerald-950">Operator</div>
            <div className="mt-2 text-xs leading-5 text-neutral-600">
              Scan, start, report, complete. Nothing extra.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
