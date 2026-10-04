import {
  Boxes,
  Warehouse,
  Factory,
  ShoppingCart,
  BadgeCheck,
  Wrench,
  GitBranch,
  ChartNoAxesCombined,
} from 'lucide-react'

export function PlatformOverview() {
  const modules = [
    {
      icon: Boxes,
      title: 'Inventory',
      description: "Know what's on hand, reserved, incoming and consumed.",
    },
    {
      icon: Warehouse,
      title: 'Warehouse',
      description: 'Locations, receiving, picking, transfers and barcode workflows.',
    },
    {
      icon: Factory,
      title: 'Production',
      description: 'BOMs, routing, work orders, material consumption and output.',
    },
    {
      icon: ShoppingCart,
      title: 'Purchasing',
      description: 'Suppliers, POs, receipts, lead times and cost visibility.',
    },
    {
      icon: BadgeCheck,
      title: 'Quality',
      description: 'Inspections, defects, quarantine, traceability and CAPA.',
    },
    {
      icon: Wrench,
      title: 'Maintenance',
      description: 'Preventive plans, breakdowns, parts, downtime and assets.',
    },
    {
      icon: GitBranch,
      title: 'Traceability',
      description: 'Trace a batch from raw material to finished product and back.',
    },
    {
      icon: ChartNoAxesCombined,
      title: 'Analytics',
      description: 'Turn operational data into clear decisions and action.',
    },
  ]

  return (
    <section id="platform" className="bg-[#111513] py-24 text-white sm:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">
            The platform
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
            One system for the entire operation.
          </h2>
          <p className="mt-5 text-[16px] leading-7 text-white/60">
            Start with inventory and warehouse control. Add production,
            quality, maintenance and analytics as your operation grows.
          </p>
        </div>
        <div
          id="solutions"
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {modules.map((m) => {
            const Icon = m.icon
            return (
              <div
                key={m.title}
                className="rounded-2xl border border-white/10 bg-white/[.04] p-5 transition hover:-translate-y-1 hover:bg-white/[.06]"
              >
                <Icon className="h-5 w-5 text-emerald-300" />
                <h3 className="mt-5 font-semibold text-white">{m.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  {m.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
