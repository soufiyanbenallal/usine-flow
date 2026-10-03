'use client'

import { Banner, Button, Modal, Select, TextField } from '@xco-agency/corex-ui'
import { FileText, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { DataTable, type DataTableColumn } from '@/components/data-table'
import { PageShell } from '@/components/page-shell'
import { formatDate } from '@/lib/format'
import { useCan } from '../organization/permissions'
import { attachmentHooks, useRemoveAttachment, useUploadAttachment } from './hooks'
import { attachmentsService } from './service'
import { KIND_LABELS, formatBytes, kindOptions, type Attachment, type AttachmentKind } from './types'

const columns: DataTableColumn<Attachment>[] = [
  { key: 'name', label: 'Nom', value: (a) => a.name },
  { key: 'kind', label: 'Type', value: (a) => KIND_LABELS[a.kind] },
  { key: 'entity', label: 'Lié à', value: (a) => a.entity_type },
  { key: 'size', label: 'Taille', value: (a) => formatBytes(a.size_bytes), align: 'right' },
  { key: 'expires', label: 'Expire le', value: (a) => formatDate(a.expires_on) },
  { key: 'created', label: 'Ajouté le', value: (a) => formatDate(a.created_at.slice(0, 10)) },
]

/** Organization-wide document library (company documents, certificates, technical sheets…). */
export function DocumentsPage() {
  const list = attachmentHooks.useList()
  const upload = useUploadAttachment()
  const remove = useRemoveAttachment()
  const can = useCan('documents.write')
  const input = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<Attachment | null>(null)
  const [kind, setKind] = useState<AttachmentKind>('document')
  const [entityType, setEntityType] = useState('company')
  const [error, setError] = useState<string | null>(null)

  return (
    <PageShell
      title="Documents"
      icon={FileText}
      description="Bibliothèque centrale : documents de l’entreprise, certificats, fiches techniques. Les fichiers sont privés et ouverts via des liens temporaires."
      error={list.error?.message ?? error}
      actions={
        can && (
          <>
            <input ref={input} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) upload.mutate({ file, entityType, kind }, { onError: (err) => setError(err.message) }) }} />
            <Button variant="primary" loading={upload.isPending} onClick={() => input.current?.click()}>
              <span className="inline-flex items-center gap-1.5"><Upload className="size-3.5" /> Téléverser</span>
            </Button>
          </>
        )
      }
    >
      {can && (
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <Select label="Type du prochain fichier" value={kind} options={kindOptions} onChange={(v) => setKind(v as AttachmentKind)} />
          <TextField label="Rattaché à (ex. company, supplier)" value={entityType} onChange={setEntityType} />
        </div>
      )}
      <DataTable<Attachment> title="Documents" singular="document" columns={columns} rows={list.data ?? []} loading={list.isPending} onOpen={setSelected} />
      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected?.name ?? ''}
        primaryAction={{ content: 'Ouvrir', onAction: async () => { if (selected) window.open(await attachmentsService.open(selected.path), '_blank', 'noopener') } }}
        secondaryActions={can ? [{ content: 'Supprimer', destructive: true, onAction: () => { if (selected) remove.mutate(selected, { onSuccess: () => setSelected(null) }) } }] : []}>
        <div className="space-y-2 p-4 text-[13px]">
          {remove.error && <Banner tone="critical">{remove.error.message}</Banner>}
          <p>Type : {selected && KIND_LABELS[selected.kind]}</p>
          <p>Taille : {formatBytes(selected?.size_bytes)}</p>
          <p>Expire le : {formatDate(selected?.expires_on)}</p>
        </div>
      </Modal>
    </PageShell>
  )
}
