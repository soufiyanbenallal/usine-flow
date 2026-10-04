'use client'

import { motion } from 'motion/react'
import { CircleDollarSign, Timer, TrendingUp } from 'lucide-react'
import { Card, CardHead, CountUp, EASE, Reveal, Section, SectionHeader } from './ui'

const KPIS = [
  { label: 'Inventory value', value: 1.84, decimals: 2, suffix: 'M', hint: 'MAD' },
  { label: 'Quality pass rate', value: 97.4, decimals: 1, suffix: '%' },
  { label: 'Material variance', value: 3.2, decimals: 1, prefix: '+', suffix: '%' },
  { label: 'Downtime', value: 2.8, decimals: 1, suffix: '%' },
]

const FEATURES = [
  { icon: CircleDollarSign, title: 'Actual vs standard cost', body: 'Material, labour and machine time per order.' },
  { icon: TrendingUp, title: 'Product and order margin', body: 'Know which products and customers earn money.' },
  { icon: Timer, title: 'Downtime and variance', body: 'See where hours and material are lost.' },
]

// unit cost per week (DH), trending from 118.40 to 114.82
const COST = [118.4, 118.9, 117.6, 117.9, 116.8, 116.1, 116.4, 115.5, 115.1, 114.82]
const W = 560
const H = 160
const min = 114
const max = 119.5
const pts = COST.map((v, i) => [(i / (COST.length - 1)) * W, H - ((v - min) / (max - min)) * H] as const)
const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
const area = `${line} L${W} ${H} L0 ${H} Z`

export function Profitability() {
  const last = pts[pts.length - 1]
  return (
    <Section tone="light" className="border-t border-line">
      <SectionHeader
        label="Management visibility"
        title="See where your money goes."
        description="Turn material, labor, machine and waste data into a clear view of product cost and operational performance."
      />

      <Reveal className="mt-16 lg:mt-20">
        <Card className="overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_1.5fr]">
            <dl className="grid grid-cols-2 border-b border-line lg:border-b-0 lg:border-r">
              {KPIS.map((k, i) => (
                <div
                  key={k.label}
                  className={`p-6 ${i % 2 === 0 ? 'border-r border-line' : ''} ${i < 2 ? 'border-b border-line' : ''}`}
                >
                  <dt className="text-[12px] text-slate">{k.label}</dt>
                  <dd className="mt-3 flex items-baseline gap-1 text-[1.75rem] font-medium tracking-[-0.03em]">
                    <CountUp to={k.value} decimals={k.decimals} prefix={k.prefix} suffix={k.suffix} />
                    {k.hint && <span className="text-[13px] font-normal tracking-normal text-slate">{k.hint}</span>}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="p-6">
              <CardHead
                title="Unit production cost · Table T-420"
                caption="Last 10 weeks · DH"
                right={<span className="pill pill-success text-[11px]">−3.0%</span>}
              />
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-[1.75rem] font-medium tracking-[-0.03em]">114.82</span>
                <span className="text-[13px] text-slate">from 118.40</span>
              </div>
              <div className="relative mt-4 h-40">
              <svg viewBox={`0 -8 ${W} ${H + 16}`} className="size-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cost-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0f7a7c" stopOpacity=".14" />
                    <stop offset="1" stopColor="#0f7a7c" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 0.5, 1].map((t) => (
                  <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} stroke="#e6e6e9" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                ))}
                <motion.path
                  d={area}
                  fill="url(#cost-fill)"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                />
                <motion.path
                  d={line}
                  fill="none"
                  stroke="#0f7a7c"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.6, ease: EASE }}
                />
              </svg>
              <motion.span
                aria-hidden
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.5, type: 'spring', stiffness: 300, damping: 18 }}
                style={{ left: '100%', top: `${((last[1] + 8) / (H + 16)) * 100}%` }}
                className="absolute -ml-1.5 -mt-1.5 size-3 rounded-full border-2 border-flow-teal bg-white"
              />
              </div>
            </div>
          </div>
        </Card>
      </Reveal>

      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={i * 0.06}>
            <f.icon className="size-4 text-flow-teal" />
            <h3 className="mt-4 text-[14px] font-medium">{f.title}</h3>
            <p className="mt-1 text-[13px] leading-5 text-slate">{f.body}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
