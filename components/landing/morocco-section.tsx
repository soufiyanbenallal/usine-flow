'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { Card, CardHead, EASE, Reveal, Section, SectionHeader } from './ui'

type Lang = 'fr' | 'ar' | 'en'

const LANGS: { id: Lang; label: string }[] = [
  { id: 'fr', label: 'Français' },
  { id: 'ar', label: 'العربية' },
  { id: 'en', label: 'English' },
]

const COPY: Record<Lang, { title: string; item: string; rows: [string, string][] }> = {
  fr: {
    title: 'Stock disponible',
    item: 'Tôle d’acier 2 mm',
    rows: [
      ['Quantité', '218 pcs'],
      ['Emplacement', 'A-03-12'],
      ['Valeur', '25 174,00 MAD'],
    ],
  },
  ar: {
    title: 'المخزون المتاح',
    item: 'صفيحة فولاذية 2 مم',
    rows: [
      ['الكمية', '218 قطعة'],
      ['الموقع', 'A-03-12'],
      ['القيمة', '25 174,00 MAD'],
    ],
  },
  en: {
    title: 'Available stock',
    item: 'Steel sheet 2 mm',
    rows: [
      ['Quantity', '218 pcs'],
      ['Location', 'A-03-12'],
      ['Value', 'MAD 25,174.00'],
    ],
  },
}

const SITES = [
  { name: 'Casablanca', kind: 'Factory', users: 92 },
  { name: 'Fès', kind: 'Workshop', users: 38 },
  { name: 'Meknès', kind: 'Warehouse', users: 31 },
  { name: 'Tangier', kind: 'Distribution', users: 23 },
]

const CHIPS = ['MAD', 'ICE · IF · RC', 'Multi-site', 'Excel import', 'Installable app']

export function MoroccoSection() {
  const [lang, setLang] = useState<Lang>('fr')
  const c = COPY[lang]

  return (
    <Section id="morocco" tone="light" className="border-t border-line">
      <SectionHeader
        label="Made for the local operation"
        title="Built for the way Moroccan industrial businesses operate."
        description="A modern operations layer that speaks your team's language and works across offices, warehouses and production floors."
      />

      <div className="mt-16 grid gap-3 lg:mt-20 lg:grid-cols-2">
        <Reveal>
          <Card className="h-full p-6 sm:p-8">
            <CardHead title="Your team's language" caption="Switch per user — Arabic renders right-to-left" />
            <div className="mt-6 inline-flex rounded-full border border-line bg-paper p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className={cn(
                    'relative h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors',
                    lang === l.id ? 'text-ink' : 'text-slate hover:text-ink',
                  )}
                >
                  {lang === l.id && (
                    <motion.span
                      layoutId="lang-pill"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.08)]"
                    />
                  )}
                  <span className="relative">{l.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={lang}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  lang={lang}
                  initial={{ opacity: 0, x: lang === 'ar' ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className="flex items-center justify-between border-b border-line bg-paper/60 px-4 py-2.5">
                    <span className="text-[13px] font-semibold">{c.title}</span>
                    <span className="font-mono text-[11px] text-slate">RM-20482</span>
                  </div>
                  <div className="px-4 pt-3 text-[14px] font-medium">{c.item}</div>
                  <dl className="divide-y divide-line px-4 pb-1">
                    {c.rows.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between py-2.5 text-[13px]">
                        <dt className="text-slate">{k}</dt>
                        <dd className="font-medium tabular-nums" dir="ltr">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex flex-wrap gap-1.5">
              {CHIPS.map((chip) => (
                <span key={chip} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-slate">
                  {chip}
                </span>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card className="h-full p-6 sm:p-8">
            <CardHead title="Atlas Manufacturing" caption="Morocco · 4 active sites · sample data" />
            <div className="mt-6 divide-y divide-line rounded-xl border border-line">
              {SITES.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: EASE }}
                  className="flex items-center gap-3 px-4 py-3 text-[13px]"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-slate">{s.kind}</span>
                  <span className="ml-auto tabular-nums text-slate">{s.users} users</span>
                </motion.div>
              ))}
            </div>
            <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl border border-line">
              {[
                ['Sites', '4'],
                ['Warehouses', '8'],
                ['Users', '184'],
              ].map(([k, v]) => (
                <div key={k} className="px-4 py-3">
                  <dt className="text-[11px] text-slate">{k}</dt>
                  <dd className="mt-1 text-lg font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </Reveal>
      </div>
    </Section>
  )
}
