'use client'

import { FileCheck } from 'lucide-react'

export function QualityMaintenance() {
  return (
    <section id="quality" className="scroll-mt-14 py-24 sm:py-36 bg-zinc-50/30 border-b border-zinc-150/70">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400">
            Qualité & Fiabilité
          </span>
          <h2 className="mt-3 text-3xl sm:text-5xl font-medium tracking-tight text-zinc-950">
            Industrial rigor on both sides of the floor.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-zinc-500 font-normal leading-relaxed">
            La conformité des pièces fabriquées et la disponibilité opérationnelle du parc machines réunies dans le même socle.
          </p>
        </div>

        {/* Dual Complementary Panels */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Quality Management */}
          <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-950">Inspection #QC-1024</span>
                  <span className="text-zinc-300">/</span>
                  <span className="text-xs text-zinc-500">Métrologie</span>
                </div>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-[#008060]/20">
                  APPROVED
                </span>
              </div>

              <div className="mt-3 rounded border border-zinc-150 bg-zinc-50/50 p-2.5 text-xs flex justify-between">
                <div>
                  <span className="text-zinc-400 text-[10px]">Article :</span>
                  <div className="font-semibold text-zinc-900">Steel Sheet 2.0mm</div>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 text-[10px]">Lot :</span>
                  <div className="font-mono text-zinc-800">#LOT-2048</div>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between rounded border border-zinc-150 p-2">
                  <span className="text-zinc-600">Épaisseur mesurée (Tolérance ±0.05)</span>
                  <span className="font-mono font-semibold text-[#008060]">2.01 mm ✓</span>
                </div>
                <div className="flex items-center justify-between rounded border border-zinc-150 p-2">
                  <span className="text-zinc-600">État de surface & Rayures (Ra 0.8 µm)</span>
                  <span className="font-semibold text-[#008060]">Passed ✓</span>
                </div>
                <div className="flex items-center justify-between rounded border border-zinc-150 p-2">
                  <span className="text-zinc-600">Résistance traction Rm (EN 10025)</span>
                  <span className="font-mono font-semibold text-[#008060]">410 MPa ✓</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Inspecté : Fatima E. • 10:14 GMT</span>
              <span className="text-[#008060] font-medium flex items-center gap-1">
                <FileCheck className="size-3" /> Certificat CoC Validé
              </span>
            </div>
          </div>

          {/* Panel 2: Maintenance GMAO */}
          <div id="maintenance" className="scroll-mt-14 rounded-xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-150 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-950">Machine M-04</span>
                  <span className="text-zinc-300">/</span>
                  <span className="text-xs text-zinc-500">CNC 5-Axes</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#008060] bg-emerald-50 border border-[#008060]/20">
                  <span className="size-1.5 rounded-full bg-[#008060]" /> Running
                </span>
              </div>

              {/* 3 Metric Tiles */}
              <div className="mt-3 grid grid-cols-3 divide-x border rounded border-zinc-150 bg-zinc-50/50 text-center text-xs">
                <div className="p-2">
                  <span className="text-[10px] text-zinc-400 font-mono">Maintenance</span>
                  <div className="font-mono text-xs font-bold text-[#008060] mt-0.5">Due in 42h</div>
                </div>
                <div className="p-2">
                  <span className="text-[10px] text-zinc-400 font-mono">Last downtime</span>
                  <div className="font-mono text-xs font-bold text-zinc-900 mt-0.5">18 min</div>
                </div>
                <div className="p-2">
                  <span className="text-[10px] text-zinc-400 font-mono">MTBF</span>
                  <div className="font-mono text-xs font-bold text-zinc-900 mt-0.5">142h</div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between rounded border border-zinc-150 p-2 text-zinc-600">
                  <span>Pression hydraulique (140 bar)</span>
                  <span className="font-mono text-emerald-700 font-semibold">✓ Normal</span>
                </div>
                <div className="flex justify-between rounded border border-zinc-150 p-2 text-zinc-600">
                  <span>Niveau lubrifiant glissière</span>
                  <span className="font-mono text-emerald-700 font-semibold">✓ 92%</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Ordre préventif : WO-MNT-0381</span>
              <span className="text-zinc-600 font-medium">99.1% Disponibilité</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
