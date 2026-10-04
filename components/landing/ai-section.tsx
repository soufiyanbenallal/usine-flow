export function AISection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#008060]">
            Intelligence
          </div>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] text-neutral-950 sm:text-5xl">
            Your operations, with intelligence built in.
          </h2>
          <p className="mt-5 text-[16px] leading-7 text-neutral-600">
            Use AI to find anomalies, surface recommendations and explain
            what&apos;s changing—without giving up control.
          </p>
        </div>
        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900">AI insight</span>
              <span className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] font-medium text-neutral-500">
                Explain
              </span>
            </div>
            <div className="mt-6 text-sm font-semibold text-neutral-950">
              Steel consumption is 12% above normal.
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Possible cause: production order OF-2026-00942.
            </p>
            <button
              type="button"
              className="mt-5 text-xs font-semibold text-[#008060] hover:underline cursor-pointer"
            >
              Investigate →
            </button>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900">Reorder recommendation</span>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-medium text-emerald-700">
                6 days
              </span>
            </div>
            <div className="mt-6 text-sm font-semibold text-neutral-950">
              Packaging may reach critical level.
            </div>
            <div className="mt-4 rounded-xl bg-neutral-50 p-3">
              <div className="text-[10px] text-neutral-400">
                Recommended order
              </div>
              <div className="mt-1 text-lg font-semibold text-neutral-950">
                2,400{' '}
                <span className="text-xs font-medium text-neutral-400">
                  units
                </span>
              </div>
            </div>
            <button
              type="button"
              className="mt-5 text-xs font-semibold text-[#008060] hover:underline cursor-pointer"
            >
              Review purchase →
            </button>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900">Production anomaly</span>
              <span className="rounded-full bg-red-50 px-2 py-1 text-[9px] font-medium text-red-700">
                Alert
              </span>
            </div>
            <div className="mt-6 text-sm font-semibold text-neutral-950">
              Machine M-04 has 3× normal downtime.
            </div>
            <p className="mt-2 text-xs leading-5 text-neutral-500">
              Detected 4 unplanned stops in the last 8 hours.
            </p>
            <button
              type="button"
              className="mt-5 text-xs font-semibold text-[#008060] hover:underline cursor-pointer"
            >
              Open maintenance →
            </button>
          </div>
        </div>
        <div className="mt-5 text-center text-[11px] font-medium text-neutral-400">
          AI recommends. You decide.
        </div>
      </div>
    </section>
  )
}
