'use client'

import { useState } from 'react'
import {
  Clock,
  Cpu,
  Factory,
  Layers,
  Package
} from 'lucide-react'

export function HeroVisual() {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'machines' | 'warehouse'>('orders')

  return (
    <div className="relative mx-auto mt-14 w-full max-w-4xl">
      {/* Subtle hairline outer glow & border */}
      <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] text-left">
        {/* Compact Console Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-150/70 bg-zinc-50/60 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-2 rounded-full bg-[#008060] animate-pulse" />
            <div className="flex items-center gap-1.5 font-medium text-zinc-900">
              <span>Casablanca Plant 01</span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-500 font-normal">Shift A (Live)</span>
            </div>
            <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-mono font-medium text-[#008060] border border-[#008060]/20">
              OPERATIONAL
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
            <span className="flex items-center gap-1">
              <Clock className="size-3 text-zinc-400" />
              11:42:08
            </span>
            <span className="text-zinc-300">|</span>
            <span className="text-emerald-700 font-medium">99.9% Sync</span>
          </div>
        </div>

        {/* 4 Compact Metric Tiles */}
        <div className="grid grid-cols-2 divide-x divide-y sm:divide-y-0 sm:grid-cols-4 border-b border-zinc-150/70 bg-white">
          <div className="p-3.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Factory className="size-3 text-zinc-400" /> Production
              </span>
              <span className="font-mono text-[10px] text-[#008060] font-medium">+2.4%</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold tracking-tight text-zinc-950">84.6%</span>
              <span className="text-[10px] text-zinc-400 font-mono">1,240 pcs/j</span>
            </div>
            <div className="mt-2 h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#008060] rounded-full" style={{ width: '84.6%' }} />
            </div>
          </div>

          <div className="p-3.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Package className="size-3 text-zinc-400" /> Inventory
              </span>
              <span className="font-mono text-[10px] text-zinc-500">1.84M MAD</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold tracking-tight text-zinc-950">92.1%</span>
              <span className="text-[10px] text-zinc-400">disponible</span>
            </div>
            <div className="mt-2 h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-800 rounded-full" style={{ width: '92.1%' }} />
            </div>
          </div>

          <div className="p-3.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Layers className="size-3 text-zinc-400" /> Orders
              </span>
              <span className="font-mono text-[10px] text-blue-600 font-medium">42 active</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold tracking-tight text-zinc-950">124</span>
              <span className="text-[10px] text-zinc-400 font-mono">82 planifiés</span>
            </div>
            <div className="mt-2 h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '68%' }} />
            </div>
          </div>

          <div className="p-3.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <Cpu className="size-3 text-zinc-400" /> Machines
              </span>
              <span className="font-mono text-[10px] text-amber-600 font-medium">2 prév.</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-bold tracking-tight text-zinc-950">18 / 20</span>
              <span className="text-[10px] text-emerald-600">online</span>
            </div>
            <div className="mt-2 h-1 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#008060] rounded-full" style={{ width: '90%' }} />
            </div>
          </div>
        </div>

        {/* Compact Segmented View Switcher */}
        <div className="flex items-center justify-between border-b border-zinc-150/70 bg-zinc-50/40 px-4 py-2 text-xs">
          <div className="inline-flex rounded-md bg-zinc-200/60 p-0.5 font-medium">
            <button
              onClick={() => setActiveTab('orders')}
              className={`rounded px-2.5 py-1 text-[11px] transition-all ${
                activeTab === 'orders'
                  ? 'bg-white font-semibold text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Production Orders (OF)
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`rounded px-2.5 py-1 text-[11px] transition-all ${
                activeTab === 'inventory'
                  ? 'bg-white font-semibold text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Raw Materials Buffer
            </button>
            <button
              onClick={() => setActiveTab('machines')}
              className={`rounded px-2.5 py-1 text-[11px] transition-all ${
                activeTab === 'machines'
                  ? 'bg-white font-semibold text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Machine Telemetry
            </button>
            <button
              onClick={() => setActiveTab('warehouse')}
              className={`rounded px-2.5 py-1 text-[11px] transition-all ${
                activeTab === 'warehouse'
                  ? 'bg-white font-semibold text-zinc-950 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              Warehouse A (WMS)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
            <span>Filter: Active Line</span>
          </div>
        </div>

        {/* Tab 1: Orders (Compact Table Rows) */}
        {activeTab === 'orders' && (
          <div className="divide-y divide-zinc-100 text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[11px] font-semibold text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded">
                  OF-2026-00942
                </span>
                <span className="font-medium text-zinc-900 truncate">Table T-420 Ergonomique</span>
                <span className="hidden sm:inline-block text-[11px] text-zinc-400">Line A-02</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 font-mono">
                <span className="text-zinc-500">412 / 500 pcs</span>
                <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden hidden sm:block">
                  <div className="h-full bg-[#008060] rounded-full" style={{ width: '82%' }} />
                </div>
                <span className="font-bold text-[#008060] w-9 text-right">82%</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-[#008060] border border-[#008060]/20">
                  En cours
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[11px] font-semibold text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded">
                  OF-2026-00943
                </span>
                <span className="font-medium text-zinc-900 truncate">Châssis Mécano-Soudé Tubulaire</span>
                <span className="hidden sm:inline-block text-[11px] text-zinc-400">Poste WC-03</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 font-mono">
                <span className="text-zinc-500">64 / 120 pcs</span>
                <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden hidden sm:block">
                  <div className="h-full bg-[#008060] rounded-full" style={{ width: '53%' }} />
                </div>
                <span className="font-bold text-zinc-800 w-9 text-right">53%</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-[#008060] border border-[#008060]/20">
                  En cours
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-[11px] font-semibold text-zinc-800 bg-zinc-100 px-1.5 py-0.5 rounded">
                  OF-2026-00944
                </span>
                <span className="font-medium text-zinc-900 truncate">Profilé Aluminium Anodisé B-12</span>
                <span className="hidden sm:inline-block text-[11px] text-zinc-400">Atelier Découpe</span>
              </div>
              <div className="flex items-center gap-4 shrink-0 font-mono">
                <span className="text-zinc-500">18 / 250 pcs</span>
                <div className="w-16 h-1.5 bg-zinc-100 rounded-full overflow-hidden hidden sm:block">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '7%' }} />
                </div>
                <span className="font-bold text-amber-700 w-9 text-right">7%</span>
                <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-800 border border-amber-200">
                  Attente matière
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Inventory */}
        {activeTab === 'inventory' && (
          <div className="divide-y divide-zinc-100 text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-zinc-500">RM-042</span>
                <span className="font-medium text-zinc-900">Tôle Acier Laminé à Chaud 2.0mm</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">Empl. A-03-12</span>
                <span className="font-bold text-zinc-900">218 pcs dispo</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] text-[#008060] font-medium border border-[#008060]/20">
                  Stock nominal
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-zinc-500">RM-089</span>
                <span className="font-medium text-zinc-900">Peinture Epoxy Poudreuse Ral 7016</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">Zone B-01</span>
                <span className="font-bold text-zinc-900">62 L dispo</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] text-[#008060] font-medium border border-[#008060]/20">
                  Stock nominal
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50/30 hover:bg-amber-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-amber-700">RM-114</span>
                <span className="font-medium text-zinc-900">Cartons Conditionnement Export</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">Quai D</span>
                <span className="font-bold text-amber-700">18 pcs (Seuil 50)</span>
                <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] text-amber-800 font-medium border border-amber-200">
                  Low stock
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Machines */}
        {activeTab === 'machines' && (
          <div className="divide-y divide-zinc-100 text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="flex size-1.5 rounded-full bg-[#008060]" />
                <span className="font-bold text-zinc-900">Machine M-04</span>
                <span className="text-zinc-500">Fraiseuse CNC 5-Axes</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">Runtime: 07h 42m</span>
                <span className="text-zinc-500">Temp: 44°C</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] text-[#008060] font-medium border border-[#008060]/20">
                  Next Maint: 48h
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="flex size-1.5 rounded-full bg-[#008060]" />
                <span className="font-bold text-zinc-900">Laser L-01</span>
                <span className="text-zinc-500">Découpe Fibre 4kW</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">Runtime: 08h 10m</span>
                <span className="text-zinc-500">Temp: 38°C</span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] text-[#008060] font-medium border border-[#008060]/20">
                  Next Maint: 110h
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="flex size-1.5 rounded-full bg-amber-500" />
                <span className="font-bold text-zinc-900">Presse P-02</span>
                <span className="text-zinc-500">Plieuse CNC 160T</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">Arrêt 18 min (Outillage)</span>
                <span className="text-zinc-500">MTBF: 142h</span>
                <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[10px] text-amber-800 font-medium border border-amber-200">
                  Entretien J-2
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Warehouse */}
        {activeTab === 'warehouse' && (
          <div className="divide-y divide-zinc-100 text-xs">
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-zinc-800 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded">
                  ZONE A
                </span>
                <span className="font-medium text-zinc-900">Racks Lourds Palettes (Niveaux 1 à 4)</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">142 bacs</span>
                <span className="font-bold text-zinc-900">84% plein</span>
                <span className="text-emerald-700 font-medium">Picking: 24</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-zinc-800 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded">
                  ZONE B
                </span>
                <span className="font-medium text-zinc-900">Matières Premières & Châssis Bruts</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">88 bacs</span>
                <span className="font-bold text-zinc-900">92% plein</span>
                <span className="text-emerald-700 font-medium">Receiving: 12</span>
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-zinc-800 font-semibold bg-zinc-100 px-1.5 py-0.5 rounded">
                  ZONE D
                </span>
                <span className="font-medium text-zinc-900">Quai d&apos;Expédition & Préparation</span>
              </div>
              <div className="flex items-center gap-4 font-mono">
                <span className="text-zinc-500">32 emplacements</span>
                <span className="font-bold text-[#008060]">8 expéditions prêtes</span>
                <span className="text-blue-600 font-medium">Dispatch: 8</span>
              </div>
            </div>
          </div>
        )}

        {/* Console footer strip */}
        <div className="flex items-center justify-between border-t border-zinc-150/70 bg-zinc-50/50 px-4 py-2 text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            <span>Capteurs IoT & Scanners floor synchronisés</span>
          </div>
          <span className="font-mono text-[10px] text-zinc-400">Industrial OS Kernel 2026.4</span>
        </div>
      </div>
    </div>
  )
}
