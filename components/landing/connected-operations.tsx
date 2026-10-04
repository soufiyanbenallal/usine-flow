import { ClipboardList, PackageCheck, BadgeCheck, Factory } from 'lucide-react'

export function ConnectedOperations() {
  return (
    <section id="operations" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#008060]">
            Connected operations
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-neutral-950 sm:text-5xl">
            Everything is connected.
          </h2>
          <p className="mt-5 text-[16px] leading-7 text-neutral-600">
            A purchase receipt can trigger quality, update stock, unlock
            production and show up in a manager&apos;s dashboard without copying
            the same information five times.
          </p>
        </div>
        <div className="mt-12 overflow-x-auto pb-2">
          <div className="min-w-[900px] rounded-[26px] border border-neutral-200 bg-white p-5 shadow-card sm:p-7">
            <div className="flex items-center justify-between gap-2">
              <div className="h-px flex-1 bg-neutral-200"></div>
              <div className="h-px w-4 bg-neutral-200"></div>
              <div className="h-px flex-1 bg-neutral-200"></div>
              <div className="h-px w-4 bg-neutral-200"></div>
              <div className="h-px flex-1 bg-neutral-200"></div>
              <div className="h-px w-4 bg-neutral-200"></div>
              <div className="h-px flex-1 bg-neutral-200"></div>
            </div>
            <div className="-mt-5 grid grid-cols-7 items-start gap-2">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-xs">
                  <ClipboardList className="h-4 w-4 text-neutral-700" />
                </div>
                <div className="mt-3 text-sm font-semibold text-neutral-900">Purchase</div>
                <div className="mt-1 text-[10px] text-neutral-500">
                  PO approved
                </div>
              </div>
              <div className="pt-14 text-center text-xs font-semibold text-neutral-300">
                →
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-xs">
                  <PackageCheck className="h-4 w-4 text-neutral-700" />
                </div>
                <div className="mt-3 text-sm font-semibold text-neutral-900">Receiving</div>
                <div className="mt-1 text-[10px] text-neutral-500">
                  218 units received
                </div>
              </div>
              <div className="pt-14 text-center text-xs font-semibold text-neutral-300">
                →
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-xs">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <div className="mt-3 text-sm font-semibold text-emerald-950">Quality</div>
                <div className="mt-1 text-[10px] text-neutral-600">
                  Lot approved
                </div>
              </div>
              <div className="pt-14 text-center text-xs font-semibold text-neutral-300">
                →
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-xs">
                  <Factory className="h-4 w-4 text-neutral-700" />
                </div>
                <div className="mt-3 text-sm font-semibold text-neutral-900">Production</div>
                <div className="mt-1 text-[10px] text-neutral-500">
                  OF-00942 started
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-5 gap-2">
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-center text-[10px] font-medium text-neutral-500">
                Stock updated
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-center text-[10px] font-medium text-neutral-500">
                Reservation created
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-center text-[10px] font-medium text-neutral-500">
                Cost recorded
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-center text-[10px] font-medium text-neutral-500">
                Audit trail
              </div>
              <div className="rounded-xl bg-neutral-50 px-3 py-2.5 text-center text-[10px] font-medium text-neutral-500">
                Manager notified
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
