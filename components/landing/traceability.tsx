import { ArrowDown } from 'lucide-react'

export function Traceability() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[.14em] text-[#008060]">
              Traceability
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-neutral-950 sm:text-5xl">
              Every batch. Every component. Every result.
            </h2>
            <p className="mt-5 max-w-lg text-[16px] leading-7 text-neutral-600">
              Follow material genealogy forward to the customer or backward to
              the supplier in a few clicks.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-600">
                Lots
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-600">
                Serials
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-600">
                QC
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-600">
                Quarantine
              </span>
              <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-medium text-neutral-600">
                CAPA
              </span>
            </div>
          </div>
          <div className="relative rounded-[28px] border border-neutral-200 bg-white p-6 shadow-card sm:p-9">
            <div className="absolute left-1/2 top-10 bottom-10 w-px -translate-x-1/2 bg-neutral-200"></div>
            <div className="relative space-y-4">
              <div className="mx-auto max-w-xs rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-[10px] uppercase tracking-[.12em] text-neutral-400">
                  Supplier lot
                </div>
                <div className="mt-1 text-sm font-semibold text-neutral-900">LOT-SS-2048</div>
                <div className="mt-1 text-[10px] text-neutral-500">
                  Atlas Steel · 218 pcs
                </div>
              </div>
              <div className="mx-auto grid h-7 w-7 place-items-center rounded-full border border-neutral-200 bg-white shadow-xs">
                <ArrowDown className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <div className="mx-auto max-w-xs rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="text-[10px] uppercase tracking-[.12em] text-emerald-700">
                  Production order
                </div>
                <div className="mt-1 text-sm font-semibold text-emerald-950">OF-2026-00942</div>
                <div className="mt-1 text-[10px] text-neutral-600">
                  Table T-420 · 500 units
                </div>
              </div>
              <div className="mx-auto grid h-7 w-7 place-items-center rounded-full border border-neutral-200 bg-white shadow-xs">
                <ArrowDown className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <div className="mx-auto max-w-xs rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="text-[10px] uppercase tracking-[.12em] text-neutral-400">
                  Finished batch
                </div>
                <div className="mt-1 text-sm font-semibold text-neutral-900">LOT-T420-82</div>
                <div className="mt-1 text-[10px] text-neutral-500">
                  QC passed · 496 released
                </div>
              </div>
              <div className="mx-auto grid h-7 w-7 place-items-center rounded-full border border-neutral-200 bg-white shadow-xs">
                <ArrowDown className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <div className="mx-auto max-w-xs rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[.12em] text-neutral-400">
                      Customer delivery
                    </div>
                    <div className="mt-1 text-sm font-semibold text-neutral-900">DN-2026-4418</div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                    Delivered
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
