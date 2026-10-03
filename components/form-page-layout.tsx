'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { ArrowLeft, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/page-header'
import { Skeleton } from '@/components/ui/skeleton'

export type FormPageLayoutProps = {
  title: string
  icon: LucideIcon
  backHref: string
  backLabel: string
  error?: string | null
  saving?: boolean
  deleting?: boolean
  canDelete?: boolean
  saveLabel?: string
  children: ReactNode
  onSave: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

/** Layout wrapper for full-page entity forms (card sections + sticky action bar). */
export function FormPageLayout({
  title,
  icon,
  backHref,
  backLabel,
  error,
  saving = false,
  deleting = false,
  canDelete = false,
  saveLabel = 'Enregistrer',
  children,
  onSave,
  onDelete,
}: FormPageLayoutProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const busy = saving || deleting

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete?.()
  }

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
      </PageHeader>

      <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-5">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {error && <Banner tone="critical">{error}</Banner>}
          {children}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          {canDelete && onDelete && (
            <Button
              variant="secondary"
              tone="critical"
              loading={deleting}
              disabled={busy}
              onClick={handleDelete}
            >
              {confirmDelete ? 'Confirmer la suppression' : 'Supprimer'}
            </Button>
          )}
          <span className="ml-auto" />
          <div className="flex items-center gap-2">
            <Link href={backHref}>
              <Button variant="secondary" disabled={busy}>
                Annuler
              </Button>
            </Link>
            <Button variant="primary" loading={saving} disabled={busy} onClick={onSave}>
              {saveLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5 shadow-xs">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

/** Placeholder shown while the entity being edited is still loading. */
export function FormPageSkeleton() {
  return (
    <div className="space-y-4 px-4 py-6 sm:px-5" aria-busy>
      <Skeleton className="mx-auto h-40 w-full max-w-3xl rounded-xl" />
      <Skeleton className="mx-auto h-40 w-full max-w-3xl rounded-xl" />
    </div>
  )
}
