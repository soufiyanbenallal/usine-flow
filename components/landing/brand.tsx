import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Tone } from './ui'

/** Official UsineFlow lockup, with the wordmark recoloured for the band it sits on. */
export function BrandLogo({ tone, className, priority }: { tone: Tone; className?: string; priority?: boolean }) {
  return (
    <Image
      src={tone === 'dark' ? '/brand/usineflow-on-dark.png' : '/brand/usineflow-on-light.png'}
      alt="UsineFlow"
      width={2156}
      height={504}
      priority={priority}
      className={cn('h-6 w-auto', className)}
    />
  )
}
