import Link from 'next/link'
import { Factory, ArrowUpRight } from 'lucide-react'

interface FinalCTAProps {
  onOpenDemo: () => void
}

export function FinalCTA({ onOpenDemo }: FinalCTAProps) {
  return (
    <section id="cta" className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-x-0 top-0 h-full mesh opacity-50"></div>
      <div className="relative mx-auto max-w-4xl px-5 text-center lg:px-8">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-[#008060] shadow-xs">
          <Factory className="h-5 w-5" />
        </div>
        <h2 className="mt-7 text-balance text-4xl font-semibold tracking-[-.05em] text-neutral-950 sm:text-6xl">
          Bring your entire operation into one system.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-7 text-neutral-600">
          Start with inventory and warehouse management. Add production,
          quality, maintenance and analytics as your business grows.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111513] px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-neutral-900/10 transition hover:-translate-y-0.5 hover:bg-black"
          >
            Start free <ArrowUpRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={onOpenDemo}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 cursor-pointer"
          >
            Book a demo
          </button>
        </div>
        <div className="mt-5 text-[11px] font-medium text-neutral-400">
          Secure workspace · Multi-site ready · French + Arabic
        </div>
      </div>
    </section>
  )
}
