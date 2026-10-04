export function MoroccoSection() {
  return (
    <section className="border-y border-neutral-200 bg-[#111513] py-24 text-white sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1fr_.9fr] lg:items-center lg:px-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.14em] text-emerald-300">
            Made for the local operation
          </div>
          <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-.045em] text-white sm:text-5xl">
            Built for the way Moroccan industrial businesses operate.
          </h2>
          <p className="mt-5 max-w-lg text-[16px] leading-7 text-white/55">
            A modern operations layer that speaks your team&apos;s language and
            works across offices, warehouses and production floors.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] text-white/70">
              MAD
            </span>
            <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] text-white/70">
              Français
            </span>
            <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] text-white/70">
              العربية
            </span>
            <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] text-white/70">
              Multi-site
            </span>
            <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] text-white/70">
              Excel import
            </span>
            <span className="rounded-full border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] text-white/70">
              PWA
            </span>
          </div>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/[.04] p-5 sm:p-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-semibold text-white">Atlas Manufacturing</div>
              <div className="mt-0.5 text-[10px] text-white/40">
                Morocco · 4 active sites
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
              All systems operational
            </div>
          </div>
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white/[.04] p-3">
              <span className="text-xs text-white/70">Casablanca Factory</span>
              <span className="text-[10px] text-emerald-300 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/[.04] p-3">
              <span className="text-xs text-white/70">Fès Workshop</span>
              <span className="text-[10px] text-emerald-300 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/[.04] p-3">
              <span className="text-xs text-white/70">Meknès Warehouse</span>
              <span className="text-[10px] text-emerald-300 font-medium">Online</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/[.04] p-3">
              <span className="text-xs text-white/70">Tangier Distribution</span>
              <span className="text-[10px] text-emerald-300 font-medium">Online</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/[.04] p-3">
              <div className="text-lg font-semibold text-white">4</div>
              <div className="text-[9px] text-white/40">Sites</div>
            </div>
            <div className="rounded-xl bg-white/[.04] p-3">
              <div className="text-lg font-semibold text-white">8</div>
              <div className="text-[9px] text-white/40">Warehouses</div>
            </div>
            <div className="rounded-xl bg-white/[.04] p-3">
              <div className="text-lg font-semibold text-white">184</div>
              <div className="text-[9px] text-white/40">Users</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
