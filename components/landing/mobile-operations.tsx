import { ScanLine } from 'lucide-react'

export function MobileOperations() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#008060]">
            On the shop floor
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-neutral-950 sm:text-5xl">
            Work where the work happens.
          </h2>
          <p className="mt-5 max-w-lg text-[16px] leading-7 text-neutral-600">
            Give teams a focused mobile experience for scanning, receiving,
            production reporting, quality checks and stock counts.
          </p>
        </div>
        <div className="flex items-center justify-center gap-5">
          {/* Phone Mockup */}
          <div className="w-[250px] rounded-[34px] border-[7px] border-neutral-900 bg-neutral-950 p-1 shadow-soft">
            <div className="overflow-hidden rounded-[26px] bg-white">
              <div className="flex items-center justify-between bg-white px-4 py-3 text-[9px] font-semibold text-neutral-900">
                <span>Industrial OS</span>
                <span className="text-neutral-400">09:41</span>
              </div>
              <div className="bg-[#f6f7f5] p-4">
                <div className="text-[9px] font-bold uppercase tracking-[.12em] text-neutral-400">
                  My work
                </div>
                <div className="mt-2 text-xl font-semibold text-neutral-950">OF-00942</div>
                <div className="text-[10px] text-neutral-500">
                  Assembly · Table T-420
                </div>
                <div className="mt-4 rounded-2xl border border-neutral-200 bg-white p-3">
                  <div className="flex justify-between">
                    <span className="text-[9px] text-neutral-400">Progress</span>
                    <span className="text-[9px] font-semibold text-emerald-700">
                      64%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-neutral-100">
                    <div
                      className="h-full w-[64%] rounded-full bg-[#008060]"
                    ></div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-[8px] text-neutral-400">Produced</div>
                      <div className="mt-1 text-sm font-semibold text-neutral-950">320</div>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-3">
                      <div className="text-[8px] text-neutral-400">Scrap</div>
                      <div className="mt-1 text-sm font-semibold text-neutral-950">4</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      className="rounded-xl bg-[#111513] py-2.5 text-[10px] font-semibold text-white shadow-xs hover:bg-black transition cursor-pointer"
                    >
                      Continue production
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-neutral-200 bg-white py-2.5 text-[10px] font-semibold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer"
                    >
                      Report issue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Barcode scan card */}
          <div className="hidden w-64 rounded-2xl border border-neutral-200 bg-[#f7f7f5] p-4 shadow-card sm:block">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <ScanLine className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-900">Barcode scan</div>
                <div className="text-[10px] text-neutral-400">
                  Fast stock updates
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3">
              <div className="text-[9px] uppercase tracking-[.12em] text-neutral-400">
                RM-20482
              </div>
              <div className="mt-1 text-sm font-semibold text-neutral-950">Steel Sheet</div>
              <div className="mt-3 flex items-center justify-between text-[10px]">
                <span className="text-neutral-400">A-03-12</span>
                <span className="font-semibold text-emerald-700">218 pcs</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] leading-4 text-neutral-500">
              Works with phone cameras and hardware scanners.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
