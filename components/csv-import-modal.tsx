'use client'

import { Banner, BlockStack, Button, DropZone, Modal, Text } from '@xco-agency/corex-ui'
import { useState } from 'react'
import { downloadText } from '@/lib/csv'
import { mapImport, parseCsv, templateCsv, type ImportField, type ImportResult } from '@/lib/csv-import'

type Props<T> = {
  open: boolean
  onClose: () => void
  title: string
  fields: ImportField<T>[]
  /** Example row of the downloadable template. */
  example: Partial<Record<Extract<keyof T, string>, string | number>>
  templateName: string
  onImport: (rows: T[]) => Promise<unknown>
}

const display = (v: unknown) => (typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : v === null || v === undefined || v === '' ? '—' : String(v))

const MAX_ROWS = 2000
const PREVIEW = 5

/** CSV import wizard: pick a file → validation preview (valid rows / line errors) → confirm. Excel: « Enregistrer sous → CSV ». */
export function CsvImportModal<T extends object>({ open, onClose, title, fields, example, templateName, onImport }: Props<T>) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult<T> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [wasOpen, setWasOpen] = useState(open)

  // reset every time the modal is (re)opened — derived state, no effect
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setFileName(null)
      setResult(null)
      setError(null)
      setDone(null)
    }
  }

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    setDone(null)
    setFileName(file.name)
    try {
      const table = parseCsv(await file.text())
      if (table.length < 2) {
        setResult(null)
        return setError('Le fichier est vide : il faut une ligne d’en-têtes et au moins une ligne de données.')
      }
      if (table.length - 1 > MAX_ROWS) {
        setResult(null)
        return setError(`Trop de lignes (${table.length - 1}). Importez ${MAX_ROWS} lignes maximum à la fois.`)
      }
      setResult(mapImport<T>(table, fields))
    } catch {
      setResult(null)
      setError('Impossible de lire ce fichier. Utilisez un fichier CSV (UTF-8).')
    }
  }

  const submit = async () => {
    if (!result || result.rows.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await onImport(result.rows)
      setDone(result.rows.length)
      setResult(null)
      setFileName(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const count = result?.rows.length ?? 0
  const keys = fields.filter((f) => result?.rows[0] && f.key in (result.rows[0] as object))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      primaryAction={done !== null ? { content: 'Terminé', onAction: onClose } : { content: count > 0 ? `Importer ${count} ligne(s)` : 'Importer', onAction: submit, loading: busy, disabled: count === 0 || busy }}
      secondaryActions={done !== null ? [] : [{ content: 'Annuler', onAction: onClose, disabled: busy }]}
    >
      <BlockStack gap="base" padding="base">
        {done !== null && <Banner tone="success">{done} ligne(s) importée(s).</Banner>}
        {error && <Banner tone="critical">{error}</Banner>}
        <Text>
          Fichier CSV avec une ligne d’en-têtes. Colonnes : {fields.map((f) => f.label + (f.required ? ' *' : '')).join(', ')}.
        </Text>
        <div>
          <Button variant="tertiary" icon="download" onClick={() => downloadText(templateName, templateCsv<T>(fields, example))}>
            Télécharger le modèle
          </Button>
        </div>
        <DropZone label="Fichier CSV" accept=".csv,text/csv,text/plain" onChange={(e) => void pick((e.currentTarget as unknown as { files?: File[] }).files?.[0])}>
          <BlockStack gap="small-200" padding="base">
            <Text>{fileName ?? 'Glissez votre fichier ici ou cliquez pour parcourir'}</Text>
          </BlockStack>
        </DropZone>

        {result && result.missingColumns.length > 0 && <Banner tone="critical">Colonne(s) obligatoire(s) introuvable(s) : {result.missingColumns.join(', ')}.</Banner>}
        {result && result.missingColumns.length === 0 && (
          <>
            <Banner tone={result.errors.length > 0 ? 'warning' : 'success'}>
              {count} ligne(s) valide(s){result.errors.length > 0 ? `, ${result.errors.length} ignorée(s) à cause d’erreurs` : ''}.
              {result.ignoredHeaders.length > 0 ? ` Colonnes ignorées : ${result.ignoredHeaders.join(', ')}.` : ''}
            </Banner>
            {result.errors.length > 0 && (
              <ul className="max-h-32 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm text-red-700">
                {result.errors.slice(0, 20).map((e) => (
                  <li key={e.line}>
                    Ligne {e.line} : {e.message}
                  </li>
                ))}
                {result.errors.length > 20 && <li>… et {result.errors.length - 20} autre(s)</li>}
              </ul>
            )}
            {count > 0 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      {keys.map((f) => (
                        <th key={f.key} className="px-2 py-1.5 text-left font-medium">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, PREVIEW).map((r, i) => (
                      <tr key={i} className="border-t">
                        {keys.map((f) => (
                          <td key={f.key} className="px-2 py-1.5">
                            {display((r as Record<string, unknown>)[f.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </BlockStack>
    </Modal>
  )
}
