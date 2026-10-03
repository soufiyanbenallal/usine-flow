'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { Paperclip, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { Panel } from '@/components/page-shell'
import { formatDate } from '@/lib/format'
import { useCan } from '../organization/permissions'
import { useEntityAttachments, useRemoveAttachment, useUploadAttachment } from './hooks'
import { attachmentsService } from './service'
import { KIND_LABELS, formatBytes, type AttachmentKind } from './types'

/** Files attached to any record (documents, certificates, photos…) in the private bucket; opened through short-lived signed URLs. */
export function AttachmentsPanel({ entityType, entityId, kind = 'document', title = 'Pièces jointes' }: { entityType: string; entityId: string; kind?: AttachmentKind; title?: string }) {
  const can = useCan('documents.write')
  const { data, error } = useEntityAttachments(entityType, entityId)
  const upload = useUploadAttachment()
  const remove = useRemoveAttachment()
  const input = useRef<HTMLInputElement>(null)
  const [fail, setFail] = useState<string | null>(null)

  const open = async (path: string) => {
    try {
      window.open(await attachmentsService.open(path), '_blank', 'noopener')
    } catch (e) {
      setFail((e as Error).message)
    }
  }

  return (
    <Panel
      title={title}
      action={
        can && (
          <>
            <input
              ref={input}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) upload.mutate({ file, entityType, entityId, kind }, { onError: (err) => setFail(err.message) })
              }}
            />
            <Button variant="secondary" loading={upload.isPending} onClick={() => input.current?.click()}>
              <span className="inline-flex items-center gap-1.5">
                <Paperclip className="size-3.5" /> Ajouter un fichier
              </span>
            </Button>
          </>
        )
      }
    >
      {(fail || error) && <Banner tone="critical">{fail ?? error?.message}</Banner>}
      {data && data.length === 0 && <p className="text-[13px] text-muted-foreground">Aucun fichier.</p>}
      <ul className="divide-y">
        {data?.map((a) => (
          <li key={a.id} className="flex items-center gap-3 py-2 text-[13px]">
            <button type="button" className="min-w-0 flex-1 truncate text-left font-medium hover:underline" onClick={() => void open(a.path)}>
              {a.name}
            </button>
            <span className="text-muted-foreground">{KIND_LABELS[a.kind]}</span>
            <span className="text-muted-foreground">{formatBytes(a.size_bytes)}</span>
            <span className="text-muted-foreground">{formatDate(a.created_at.slice(0, 10))}</span>
            {can && (
              <button type="button" aria-label="Supprimer" className="text-muted-foreground hover:text-red-600" onClick={() => remove.mutate(a)}>
                <Trash2 className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
