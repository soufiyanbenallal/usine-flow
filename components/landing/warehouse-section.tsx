'use client'

import {
  ScanLine,
  Smartphone
} from 'lucide-react'

export function WarehouseSection() {
  const zones = [
    { name: 'Zone A (Racks Lourds)', occupancy: '84%', bins: '142 bacs' },
    { name: 'Zone B (Matières Premières)', occupancy: '92%', bins: '88 bacs' },
    { name: 'Zone C (Allée Picking)', occupancy: '68%', bins: '210 bacs' },
    { name: 'Zone D (Expéditions & Quai)', occupancy: '45%', bins: '32 empl.' },
  ]

  return (
    <section id="warehouse" className="scroll-mt-14 py-24 sm:py-36 bg-white border-b border-zinc-150/70">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
            WMS & Emplacements
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-medium tracking-tight text-zinc-950">
            Know where everything is.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-500 font-normal leading-relaxed">
            Cartographie précise par allée, travée et bac avec lecture optique pour zéro erreur de préparation.
          </p>
        </div>

        {/* 2-Column Split: Desktop WMS + Mobile Floor Scanner */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Desktop WMS Console (Col 8) */}
          <div className="lg:col-span-8 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-zinc-950">WAREHOUSE A</span>
                <span className="text-zinc-300">/</span>
                <span className="text-xs text-zinc-500">Casablanca Central</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-[#008060]/20">
                Inventaire Permanent
              </span>
            </div>

            {/* 4 Operations Counters */}
            <div className="mt-4 grid grid-cols-4 divide-x border rounded-lg border-zinc-200/60 bg-zinc-50/50 text-center text-xs">
              <div className="p-2.5">
                <span className="text-[10px] text-zinc-400 font-mono">Receiving</span>
                <div className="font-mono text-base font-bold text-zinc-950 mt-0.5">12</div>
              </div>
              <div className="p-2.5">
                <span className="text-[10px] text-zinc-400 font-mono">Put-away</span>
                <div className="font-mono text-base font-bold text-zinc-950 mt-0.5">18</div>
              </div>
              <div className="p-2.5">
                <span className="text-[10px] text-zinc-400 font-mono">Picking</span>
                <div className="font-mono text-base font-bold text-zinc-950 mt-0.5">24</div>
              </div>
              <div className="p-2.5">
                <span className="text-[10px] text-[#008060] font-mono">Dispatch</span>
                <div className="font-mono text-base font-bold text-[#008060] mt-0.5">8</div>
              </div>
            </div>

            {/* Bin Search Focus */}
            <div className="mt-4 rounded-lg border border-zinc-200/70 bg-zinc-50/30 p-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/50">
                <span className="font-mono text-[11px] font-bold text-[#008060] bg-emerald-50 px-1.5 py-0.5 rounded border border-[#008060]/20">
                  A-03-12
                </span>
                <span className="text-zinc-400 text-[10px] font-mono">Allée A • Travée 03 • Niveau 12</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <div className="font-medium text-zinc-900">Steel Sheet 2.0mm Hot-Rolled</div>
                  <div className="text-[11px] text-zinc-400 font-mono">Lot #LOT-2048 • ArcelorMittal</div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-bold text-zinc-950">218 pcs</span>
                  <div className="text-[10px] text-emerald-700 font-medium">Validé</div>
                </div>
              </div>
            </div>

            {/* Zones Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {zones.map((z) => (
                <div key={z.name} className="rounded-lg border border-zinc-200/60 p-2.5 bg-white">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-medium text-zinc-700 truncate">{z.name}</span>
                    <span className="font-mono font-bold text-zinc-900">{z.occupancy}</span>
                  </div>
                  <div className="mt-1.5 h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#008060] rounded-full" style={{ width: z.occupancy }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Compact Floor Mobile Scanner (Col 4) */}
          <div className="lg:col-span-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white shadow-md">
            <div className="flex items-center justify-between text-xs pb-2.5 border-b border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Smartphone className="size-3.5 text-[#008060]" />
                <span className="font-semibold text-white">Scanner Floor</span>
              </div>
              <span className="font-mono text-[9px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">
                PWA Mobile
              </span>
            </div>

            {/* Mini Viewfinder */}
            <div className="mt-3 rounded-lg bg-zinc-950 p-3 border border-zinc-800 text-center">
              <div className="relative mx-auto my-2 flex size-24 items-center justify-center rounded border border-dashed border-[#008060]/80 bg-zinc-900/40">
                <ScanLine className="size-7 text-[#008060]" />
              </div>
              <div className="font-mono text-[10px] text-emerald-400 font-bold">
                ✓ SCAN: LOT-2026-9941
              </div>
            </div>

            {/* Scan detail & action */}
            <div className="mt-3 rounded border border-zinc-800 bg-zinc-800/60 p-2.5 text-xs">
              <div className="text-[10px] text-zinc-400">Article identifié :</div>
              <div className="font-bold text-white text-xs mt-0.5">Bobine Cuivre 16mm²</div>
              <div className="text-[10px] text-zinc-300 font-mono mt-1">Cible : <strong>B-04-02</strong></div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-medium">
              <button className="rounded bg-[#008060] py-1.5 text-white hover:bg-[#006e52] transition-colors text-center">
                Valider Ranger
              </button>
              <button className="rounded bg-zinc-800 py-1.5 text-zinc-300 hover:bg-zinc-700 transition-colors text-center">
                Transférer Bac
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
