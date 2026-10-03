'use client'

import { Button } from '@xco-agency/corex-ui'
import { ArrowLeft, Printer } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { useOrganizationDetails } from '@/features/organization/hooks'
import type { LucideIcon } from 'lucide-react'

/** Screen chrome around a printable document: back link + « Imprimer / PDF » (browser print → Save as PDF). */
export function PrintPage({ title, icon, backHref, backLabel, children }: { title: string; icon: LucideIcon; backHref: string; backLabel: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} icon={icon}>
        <Link href={backHref}>
          <Button variant="secondary">
            <span className="inline-flex items-center gap-1">
              <ArrowLeft className="size-3.5" /> {backLabel}
            </span>
          </Button>
        </Link>
        <Button variant="primary" onClick={() => window.print()}>
          <span className="inline-flex items-center gap-1.5">
            <Printer className="size-3.5" /> Imprimer / PDF
          </span>
        </Button>
      </PageHeader>
      <div className="flex-1 overflow-y-auto bg-muted/40 px-4 py-6 sm:px-5">{children}</div>
    </>
  )
}

/** A4-like sheet; only this element is printed (see @media print in globals.css). */
export function PrintSheet({ children }: { children: ReactNode }) {
  return (
    <article className="print-sheet mx-auto w-full max-w-[210mm] space-y-6 rounded-lg border bg-white p-[12mm] text-[13px] leading-relaxed text-black shadow-sm">
      {children}
    </article>
  )
}

/** Company letterhead built from the organization's legal information. */
export function PrintLetterhead() {
  const { data: org } = useOrganizationDetails()
  if (!org) return <div className="h-16" />
  const ids = [
    org.ice && `ICE : ${org.ice}`,
    org.if_number && `IF : ${org.if_number}`,
    org.rc && `RC : ${org.rc}`,
    org.patente && `Patente : ${org.patente}`,
    org.cnss && `CNSS : ${org.cnss}`,
  ].filter(Boolean)
  return (
    <header className="flex items-start justify-between gap-6 border-b border-black/20 pb-4">
      <div>
        <p className="text-lg font-bold">
          {org.name}
          {org.legal_form ? ` ${org.legal_form}` : ''}
        </p>
        <p className="text-black/70">{[org.address, org.city].filter(Boolean).join(', ')}</p>
        <p className="text-black/70">{[org.phone && `Tél : ${org.phone}`, org.email].filter(Boolean).join(' · ')}</p>
      </div>
      <p className="max-w-[48%] text-right text-[11px] leading-5 text-black/70">{ids.join(' · ')}</p>
    </header>
  )
}

export function PrintTable({ head, rows, align }: { head: string[]; rows: ReactNode[][]; align?: ('left' | 'right')[] }) {
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="bg-black/5">
          {head.map((h, i) => (
            <th key={h} className={`border border-black/20 px-2 py-1.5 font-semibold ${align?.[i] === 'right' ? 'text-right' : 'text-left'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={head.length} className="border border-black/20 px-2 py-3 text-center text-black/60">
              Aucune ligne.
            </td>
          </tr>
        )}
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={`border border-black/20 px-2 py-1.5 ${align?.[j] === 'right' ? 'text-right tabular-nums' : ''}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const PrintField = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="text-[11px] uppercase tracking-wide text-black/50">{label}</p>
    <p className="font-medium">{children || '—'}</p>
  </div>
)
