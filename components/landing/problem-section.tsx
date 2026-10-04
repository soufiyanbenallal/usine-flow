import { FileSpreadsheet, MessageCircle, FileText, Orbit } from 'lucide-react'

export function ProblemSection() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:px-8">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.14em] text-[#008060]">
            The old way
          </div>
          <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-.045em] text-neutral-950 sm:text-5xl">
            Your factory shouldn&apos;t run on disconnected spreadsheets.
          </h2>
          <p className="mt-5 max-w-lg text-[16px] leading-7 text-neutral-600">
            When inventory, purchasing, production and quality live in
            different places, every decision gets slower. Industrial OS turns
            those disconnected steps into one traceable flow.
          </p>
        </div>
        <div className="rounded-[26px] border border-neutral-200 bg-white p-5 shadow-card sm:p-7">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-red-800">
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </div>
              <div className="mt-3 text-[11px] leading-5 text-red-900/60">
                Manual stock files, duplicate versions, no clear ownership.
              </div>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </div>
              <div className="mt-3 text-[11px] leading-5 text-amber-900/60">
                Approvals and production updates buried in conversations.
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-800">
                <FileText className="h-4 w-4" /> Paper forms
              </div>
              <div className="mt-3 text-[11px] leading-5 text-neutral-500">
                Receiving, maintenance and QC checks are hard to reconcile.
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <Orbit className="h-4 w-4" /> One connected system
              </div>
              <div className="mt-3 text-[11px] leading-5 text-emerald-900/70">
                Every operational event updates the right people, stock and
                history.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
