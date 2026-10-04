import Link from 'next/link'
import { Factory } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Link href="#top" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#008060] text-white">
              <Factory className="h-[17px] w-[17px]" />
            </span>
            <span className="text-[15px] font-semibold text-neutral-950">Industrial OS</span>
          </Link>
          <p className="mt-4 max-w-xs text-xs leading-5 text-neutral-500">
            A modern operations platform for factories, workshops and
            warehouses.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-neutral-900">Product</div>
          <div className="mt-4 grid gap-2 text-xs text-neutral-500">
            <a href="#platform" className="hover:text-neutral-900 transition">
              Inventory
            </a>
            <a href="#platform" className="hover:text-neutral-900 transition">
              Warehouse
            </a>
            <a href="#platform" className="hover:text-neutral-900 transition">
              Production
            </a>
            <a href="#platform" className="hover:text-neutral-900 transition">
              Quality
            </a>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-neutral-900">Solutions</div>
          <div className="mt-4 grid gap-2 text-xs text-neutral-500">
            <a href="#solutions" className="hover:text-neutral-900 transition">
              Factory
            </a>
            <a href="#solutions" className="hover:text-neutral-900 transition">
              Workshop
            </a>
            <a href="#solutions" className="hover:text-neutral-900 transition">
              Warehouse
            </a>
            <a href="#solutions" className="hover:text-neutral-900 transition">
              Manufacturing
            </a>
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-neutral-900">Company</div>
          <div className="mt-4 grid gap-2 text-xs text-neutral-500">
            <a href="#cta" className="hover:text-neutral-900 transition">
              Book a demo
            </a>
            <a href="#cta" className="hover:text-neutral-900 transition">
              Contact
            </a>
            <a href="#cta" className="hover:text-neutral-900 transition">
              Security
            </a>
            <a href="#cta" className="hover:text-neutral-900 transition">
              Privacy
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-[11px] text-neutral-400 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© 2026 Industrial OS</span>
          <span>Operations, without the operational noise.</span>
        </div>
      </div>
    </footer>
  )
}
