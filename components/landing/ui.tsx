'use client'

import Link from 'next/link'
import { animate, motion, useInView, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type Tone = 'dark' | 'light'

export const EASE = [0.16, 1, 0.3, 1] as const

/* ------------------------------------------------------------------ */
/* Tone — every primitive reads the band it sits in                     */
/* ------------------------------------------------------------------ */

const ToneContext = createContext<Tone>('dark')
export const useTone = () => useContext(ToneContext)

export function ToneProvider({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <ToneContext.Provider value={tone}>{children}</ToneContext.Provider>
}

/** Token map so both themes share one component vocabulary. */
export function tokens(tone: Tone) {
  return tone === 'dark'
    ? {
        bg: 'bg-ink',
        surface: 'bg-ink-2',
        raised: 'bg-ink-3',
        border: 'border-white/8',
        divide: 'divide-white/8',
        text: 'text-[#f7f8f8]',
        muted: 'text-fog',
        subtle: 'text-white/35',
        hover: 'hover:bg-white/4',
        track: 'bg-white/8',
      }
    : {
        bg: 'bg-paper',
        surface: 'bg-white',
        raised: 'bg-paper',
        border: 'border-line',
        divide: 'divide-line',
        text: 'text-ink',
        muted: 'text-slate',
        subtle: 'text-ink/40',
        hover: 'hover:bg-paper',
        track: 'bg-ink/7',
      }
}

/* ------------------------------------------------------------------ */
/* Layout                                                               */
/* ------------------------------------------------------------------ */

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-6', className)}>{children}</div>
}

interface SectionProps {
  id?: string
  tone: Tone
  children: ReactNode
  className?: string
}

/** Flat full-bleed band. Generous vertical rhythm; content sits in the shared container. */
export function Section({ id, tone, children, className }: SectionProps) {
  const t = tokens(tone)
  return (
    <ToneProvider tone={tone}>
      <section
        id={id}
        data-tone={tone}
        className={cn('relative scroll-mt-14 py-28 sm:py-36 lg:py-40', t.bg, t.text, className)}
      >
        <Container>{children}</Container>
      </section>
    </ToneProvider>
  )
}

/** Thin rule between two sections that share a tone. */
export function Rule() {
  const t = tokens(useTone())
  return <div className={cn('h-px w-full border-t', t.border)} />
}

/* ------------------------------------------------------------------ */
/* Typography                                                           */
/* ------------------------------------------------------------------ */

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  const tone = useTone()
  return (
    <p className={cn('flex items-center gap-2 text-[13px] font-medium', tokens(tone).muted, className)}>
      <span className={cn('size-1.5 rounded-[2px]', tone === 'dark' ? 'bg-flow-blue' : 'bg-flow-teal')} />
      {children}
    </p>
  )
}

interface HeaderProps {
  label: string
  title: ReactNode
  description?: ReactNode
  className?: string
}

/** Section header: label, headline left, supporting copy right (stacked on mobile). */
export function SectionHeader({ label, title, description, className }: HeaderProps) {
  const t = tokens(useTone())
  return (
    <Reveal className={cn('grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-16', className)}>
      <div>
        <Label>{label}</Label>
        <h2 className="mt-5 max-w-[16ch] text-balance text-[2.25rem] font-medium leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[3.25rem]">
          {title}
        </h2>
      </div>
      {description && (
        <p className={cn('max-w-md text-pretty text-[15px] leading-[1.65] sm:text-base lg:pb-1.5', t.muted)}>{description}</p>
      )}
    </Reveal>
  )
}

/** Second clause of a headline, set in the muted ink (Linear-style two-tone). */
export function Dim({ children }: { children: ReactNode }) {
  return <span className={tokens(useTone()).muted}>{children}</span>
}

/* ------------------------------------------------------------------ */
/* Motion                                                               */
/* ------------------------------------------------------------------ */

interface RevealProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  delay?: number
}

export function Reveal({ children, delay = 0, className, ...rest }: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  to: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(0, to, { duration: 1.4, ease: EASE, onUpdate: setValue })
    return () => controls.stop()
  }, [inView, reduce, to])

  const formatted = (reduce ? to : value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return (
    <span ref={ref} className={cn('tabular-nums', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

/** Progress bar fill that grows once in view. */
export function Meter({ value, className, delay = 0 }: { value: number; className?: string; delay?: number }) {
  const t = tokens(useTone())
  return (
    <div className={cn('h-1 overflow-hidden rounded-full', t.track)}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: EASE, delay }}
        className={cn('h-full rounded-full', className ?? 'bg-flow-blue')}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Controls                                                             */
/* ------------------------------------------------------------------ */

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'link'
  children: ReactNode
  href?: string
  onClick?: () => void
  arrow?: boolean
  className?: string
}

export function Button({ variant = 'primary', children, href, onClick, arrow, className }: ButtonProps) {
  const tone = useTone()
  const styles = {
    primary: tone === 'dark' ? 'bg-[#f7f8f8] text-ink hover:bg-white' : 'bg-ink text-white hover:bg-ink-3',
    secondary:
      tone === 'dark'
        ? 'border border-white/10 bg-white/4 text-[#f7f8f8] hover:bg-white/8'
        : 'border border-line bg-white text-ink shadow-[0_1px_1px_rgba(0,0,0,.04)] hover:bg-paper',
    link: cn('px-0', tone === 'dark' ? 'text-[#f7f8f8] hover:text-white' : 'text-ink'),
  }[variant]

  const cls = cn(
    'group/btn inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors duration-150',
    styles,
    className,
  )
  const inner = (
    <>
      {children}
      {arrow && <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />}
    </>
  )
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Surfaces                                                             */
/* ------------------------------------------------------------------ */

/** The one card used everywhere: hairline border, flat surface. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  const tone = useTone()
  const t = tokens(tone)
  return (
    <div
      className={cn(
        'rounded-2xl border',
        t.border,
        t.surface,
        tone === 'light' && 'shadow-[0_1px_2px_rgba(0,0,0,.03)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Small title + caption row used at the top of cards. */
export function CardHead({ title, caption, right }: { title: string; caption?: string; right?: ReactNode }) {
  const t = tokens(useTone())
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium">{title}</div>
        {caption && <div className={cn('mt-0.5 truncate text-xs', t.muted)}>{caption}</div>}
      </div>
      {right}
    </div>
  )
}

/** Polaris-style status badge, matching the product's pills. */
export function Badge({
  status,
  children,
}: {
  status: 'success' | 'warning' | 'critical' | 'info' | 'neutral'
  children: ReactNode
}) {
  const tone = useTone()
  const dark = {
    success: 'bg-emerald-400/10 text-emerald-300',
    warning: 'bg-amber-400/10 text-amber-300',
    critical: 'bg-red-400/10 text-red-300',
    info: 'bg-sky-400/10 text-sky-300',
    neutral: 'bg-white/6 text-white/60',
  }[status]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        tone === 'dark' ? dark : `pill-${status}`,
      )}
    >
      {children}
    </span>
  )
}

export function LiveDot({ label = 'Live' }: { label?: string }) {
  const tone = useTone()
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium', tokens(tone).muted)}>
      <motion.span
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="size-1.5 rounded-full bg-emerald-500"
      />
      {label}
    </span>
  )
}

export const SAMPLE_NOTE = 'Sample data'
