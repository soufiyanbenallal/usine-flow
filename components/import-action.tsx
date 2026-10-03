'use client'

import { Button } from '@xco-agency/corex-ui'
import { useState } from 'react'
import type { ImportField } from '@/lib/csv-import'
import { CsvImportModal } from './csv-import-modal'

/** « Importer » button + CSV import modal for a list page. */
export function ImportAction<T extends object>({ title, fields, example, templateName, onImport }: {
  title: string
  fields: ImportField<T>[]
  example: Partial<Record<Extract<keyof T, string>, string | number>>
  templateName: string
  onImport: (rows: T[]) => Promise<unknown>
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span className="hidden md:block">
        <Button variant="secondary" icon="download" onClick={() => setOpen(true)}>
          Importer
        </Button>
      </span>
      <CsvImportModal open={open} onClose={() => setOpen(false)} title={title} fields={fields} example={example} templateName={templateName} onImport={onImport} />
    </>
  )
}
