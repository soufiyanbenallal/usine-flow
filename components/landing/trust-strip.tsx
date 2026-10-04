import { Languages, Layers, ScanLine, ShieldCheck, WifiOff } from 'lucide-react'
import { Section } from './ui'

const SECTORS = [
  'Agri-food',
  'Textile & apparel',
  'Plastics & packaging',
  'Metalwork',
  'Automotive suppliers',
  'Furniture & wood',
  'Building materials',
  'Distribution & 3PL',
]

const FACTS = [
  { icon: Layers, label: 'Factory, workshop and warehouse modes' },
  { icon: ShieldCheck, label: 'Role-based access & audit log' },
  { icon: WifiOff, label: 'Works offline on the floor' },
  { icon: ScanLine, label: 'Camera & hardware scanners' },
  { icon: Languages, label: 'Français · العربية · English' },
]

/** Dark band under the hero: who it is built for + the platform's baseline guarantees. */
export function TrustStrip() {
  const row = [...SECTORS, ...SECTORS]
  return (
    <Section tone="dark" className="pb-28 pt-20 sm:pb-32 sm:pt-24 lg:pb-36 lg:pt-28">
      <p className="text-center text-[13px] text-fog">Built for Moroccan industrial operations</p>
      <div className="relative mt-8 overflow-hidden mask-[linear-gradient(to_right,transparent,#000_15%,#000_85%,transparent)]">
        <div className="lp-marquee flex w-max">
          {row.map((s, i) => (
            <span
              key={i}
              aria-hidden={i >= SECTORS.length}
              className="px-8 text-lg font-semibold tracking-[-0.02em] text-white/45 sm:px-10 sm:text-xl"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-20 grid gap-px overflow-hidden rounded-2xl border border-white/8 bg-white/8 sm:grid-cols-2 lg:grid-cols-5">
        {FACTS.map((f) => (
          <li key={f.label} className="flex items-center gap-3 bg-ink px-5 py-5 text-[13px] text-fog sm:last:col-span-2 lg:last:col-span-1">
            <f.icon className="size-4 shrink-0 text-white" />
            {f.label}
          </li>
        ))}
      </ul>
    </Section>
  )
}
