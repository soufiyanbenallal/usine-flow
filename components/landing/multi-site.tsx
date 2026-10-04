'use client'

import {
  Building2,
  Factory,
  Warehouse,
  Wrench,
  CheckCircle2,
  MapPin
} from 'lucide-react'

export function MultiSite() {
  const sites = [
    {
      city: 'Casablanca',
      name: 'Casablanca Factory',
      type: 'Fabrication Lourde & Montage',
      lines: '14 Lignes',
      oee: '89.2% OEE',
      icon: Factory,
    },
    {
      city: 'Fès',
      name: 'Fès Workshop',
      type: 'Usinage Fin & Soudure',
      lines: '4 Postes',
      oee: '92.4% OEE',
      icon: Wrench,
    },
    {
      city: 'Meknès',
      name: 'Meknès Warehouse',
      type: 'Plateforme Logistique',
      lines: '3 200 Bacs',
      oee: '99.4% Exact.',
      icon: Warehouse,
    },
    {
      city: 'Tanger',
      name: 'Tangier Distribution',
      type: 'Hub Export & Automotive',
      lines: 'Zone Franche',
      oee: '100% ISO',
      icon: Building2,
    },
  ]

  const pillars = [
    'All inventory',
    'All production',
    'All warehouses',
    'All teams',
    'All operations',
  ]

  return (
    <section id="multisite" className="scroll-mt-14 py-24 sm:py-36 bg-white border-b border-zinc-150/70">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
            Multi-Sites Maroc
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-medium tracking-tight text-zinc-950">
            One business. Every site.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-500 font-normal leading-relaxed">
            De l&apos;atelier unique jusqu&apos;au groupe industriel multi-sites et multi-dépôts. Évoluez sans changer d&apos;outil.
          </p>
        </div>

        {/* Progression Pill */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50 px-3.5 py-1 text-xs text-zinc-600">
            <span className="text-[#008060] font-medium">One workshop</span>
            <span className="text-zinc-300">→</span>
            <span>Multiple factories</span>
            <span className="text-zinc-300">→</span>
            <span className="text-zinc-900 font-medium">Multiple warehouses</span>
          </div>
        </div>

        {/* 4 Compact Sites Grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sites.map((site) => {
            const Icon = site.icon
            return (
              <div
                key={site.name}
                className="rounded-xl border border-zinc-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:border-zinc-300 transition-all text-xs"
              >
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="font-mono text-zinc-400 flex items-center gap-1">
                    <MapPin className="size-3" />
                    {site.city}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#008060] font-medium">
                    <span className="size-1 rounded-full bg-[#008060]" /> Online
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <div className="flex size-6 items-center justify-center rounded bg-zinc-100 text-zinc-700 shrink-0">
                    <Icon className="size-3.5" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 text-xs truncate">{site.name}</h3>
                </div>

                <div className="mt-2 text-[11px] text-zinc-500 truncate">{site.type}</div>

                <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>{site.lines}</span>
                  <span className="font-semibold text-zinc-900">{site.oee}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Compact Pillars Row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {pillars.map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200/60 bg-zinc-50/50 px-2.5 py-1 text-xs text-zinc-700"
            >
              <CheckCircle2 className="size-3 text-[#008060]" />
              <span className="font-medium">{p}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
