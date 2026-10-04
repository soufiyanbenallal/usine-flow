export function ProductionSection() {
  return (
    <section className="border-y border-neutral-200 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Production floor */}
          <article className="overflow-hidden rounded-[28px] border border-neutral-200 bg-[#f6f7f5]">
            <div className="p-7 sm:p-9">
              <div className="text-xs font-bold uppercase tracking-[.14em] text-[#008060]">
                Production floor
              </div>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-neutral-950">
                From order to production floor.
              </h3>
              <p className="mt-4 max-w-md text-sm leading-6 text-neutral-600">
                Give planners the detail they need and operators only the
                controls they actually use.
              </p>
            </div>
            <div className="px-5 pb-5 sm:px-7 sm:pb-7">
              <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-neutral-950">Production board</div>
                    <div className="mt-0.5 text-[10px] text-neutral-400">
                      Today · Factory A
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700">
                    Live
                  </span>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800">Cutting</span>
                      <span className="text-neutral-500">92%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-neutral-100">
                      <div
                        className="h-full w-[92%] rounded-full bg-[#008060]"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800">Assembly</span>
                      <span className="text-neutral-500">68%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-neutral-100">
                      <div
                        className="h-full w-[68%] rounded-full bg-[#008060]"
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800">Painting</span>
                      <span className="text-red-600 font-medium">Stopped</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-neutral-100">
                      <div
                        className="h-full w-[31%] rounded-full bg-red-400"
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-[10px] text-neutral-400">Output</div>
                    <div className="mt-1 text-lg font-semibold text-neutral-950">412</div>
                  </div>
                  <div className="rounded-xl bg-neutral-50 p-3">
                    <div className="text-[10px] text-neutral-400">Scrap</div>
                    <div className="mt-1 text-lg font-semibold text-neutral-950">4</div>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* Warehouse */}
          <article className="overflow-hidden rounded-[28px] border border-neutral-200 bg-[#111513] text-white">
            <div className="p-7 sm:p-9">
              <div className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">
                Warehouse
              </div>
              <h3 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-white">
                Know where everything is.
              </h3>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/55">
                Make receiving, picking, counting and transfers fast enough
                for the floor—not just the office.
              </p>
            </div>
            <div className="px-5 pb-5 sm:px-7 sm:pb-7">
              <div className="rounded-2xl border border-white/10 bg-white/[.05] p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">Warehouse A</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    synced
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="rounded-xl bg-white/[.05] p-3">
                    <div className="text-white/40">Receiving</div>
                    <div className="mt-1 text-base font-semibold text-white">12</div>
                  </div>
                  <div className="rounded-xl bg-white/[.05] p-3">
                    <div className="text-white/40">Put-away</div>
                    <div className="mt-1 text-base font-semibold text-white">18</div>
                  </div>
                  <div className="rounded-xl bg-white/[.05] p-3">
                    <div className="text-white/40">Picking</div>
                    <div className="mt-1 text-base font-semibold text-white">24</div>
                  </div>
                  <div className="rounded-xl bg-white/[.05] p-3">
                    <div className="text-white/40">Dispatch</div>
                    <div className="mt-1 text-base font-semibold text-white">8</div>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-white/40">Last scan</div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        Steel Sheet · RM-20482
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/40">Location</div>
                      <div className="mt-1 text-sm font-semibold text-emerald-300">
                        A-03-12
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-white/45">
                    <span>218 pcs available</span>
                    <span>Just now</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
