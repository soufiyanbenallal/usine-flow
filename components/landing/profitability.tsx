import { CircleDollarSign, TrendingUp, Timer } from 'lucide-react'

export function Profitability() {
  return (
    <section className="bg-[#f0f2ef] py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#008060]">
            Management visibility
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-neutral-950 sm:text-5xl">
            See where your money goes.
          </h2>
          <p className="mt-5 max-w-lg text-[16px] leading-7 text-neutral-600">
            Turn material, labor, machine and waste data into a clear view of
            product cost and operational performance.
          </p>
          <div className="mt-7 space-y-3 text-sm text-neutral-700">
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-xs">
                <CircleDollarSign className="h-3.5 w-3.5 text-neutral-700" />
              </span>
              Actual vs standard cost
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-xs">
                <TrendingUp className="h-3.5 w-3.5 text-neutral-700" />
              </span>
              Product and order margin
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white shadow-xs">
                <Timer className="h-3.5 w-3.5 text-neutral-700" />
              </span>
              Downtime and production variance
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-card sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-neutral-950">Operational health</div>
              <div className="mt-0.5 text-[10px] text-neutral-400">
                Current month
              </div>
            </div>
            <span className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] font-semibold text-neutral-600">
              Factory A
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-[10px] text-neutral-400">Inventory value</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                1.84M <span className="text-xs text-neutral-400">MAD</span>
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-[10px] text-neutral-400">
                Quality pass rate
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                97.4%
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-[10px] text-neutral-400">
                Material variance
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                +3.2%
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4">
              <div className="text-[10px] text-neutral-400">Downtime</div>
              <div className="mt-2 text-2xl font-semibold tracking-[-.03em] text-neutral-950">
                2.8%
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-[#111513] p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-white/40">
                  Production cost trend
                </div>
                <div className="mt-1 text-sm font-semibold">
                  118.40 → 114.82 DH
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-300">
                −3.0%
              </span>
            </div>
            <div className="mt-5 flex h-20 items-end gap-1.5">
              <span
                className="flex-1 rounded-t bg-white/10"
                style={{ height: '78%' }}
              ></span>
              <span
                className="flex-1 rounded-t bg-white/10"
                style={{ height: '68%' }}
              ></span>
              <span
                className="flex-1 rounded-t bg-white/15"
                style={{ height: '72%' }}
              ></span>
              <span
                className="flex-1 rounded-t bg-emerald-400"
                style={{ height: '59%' }}
              ></span>
              <span
                className="flex-1 rounded-t bg-emerald-300"
                style={{ height: '52%' }}
              ></span>
              <span
                className="flex-1 rounded-t bg-emerald-300"
                style={{ height: '45%' }}
              ></span>
              <span
                className="flex-1 rounded-t bg-emerald-200"
                style={{ height: '39%' }}
              ></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
