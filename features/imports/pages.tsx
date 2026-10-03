'use client'

import { Banner, BlockStack, Button, DropZone, Select, Text } from '@xco-agency/corex-ui'
import { Download, Upload } from 'lucide-react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { PageShell, Panel } from '@/components/page-shell'
import { downloadText } from '@/lib/csv'
import { mapImport, templateCsv, type ImportResult } from '@/lib/csv-import'
import { downloadXlsx, readSpreadsheet } from '@/lib/excel'
import { formatDateTime } from '@/lib/format'
import { Pill } from '../_core/pill'
import { useOrgPath, useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { useWarehouseOptions } from '../warehouses/hooks'
import { OPENING_EXAMPLE, OPENING_FIELDS, resolveOpening, type OpeningRow, type Resolution } from './opening-stock'
import { EXPORT_DATASETS, importsApi } from './service'

const ENTITY_IMPORTS = [
  { label: 'Articles', path: 'catalogue/articles', hint: 'SKU, nom, unité, catégorie, suivi par lot…' },
  { label: 'Partenaires (clients / fournisseurs)', path: 'catalogue/partenaires', hint: 'Code, nom, ICE, conditions de paiement' },
  { label: 'Unités de mesure', path: 'catalogue/unites', hint: 'Code, nom, famille' },
  { label: 'Catégories', path: 'catalogue/categories', hint: 'Code, nom' },
  { label: 'Employés', path: 'equipe/employes', hint: 'Matricule, nom, coût horaire' },
  { label: 'Postes de charge', path: 'production/postes', hint: 'Code, capacité, coûts horaires' },
  { label: 'Centres de coûts', path: 'finance/centres-de-couts', hint: 'Code, nom' },
]

function OpeningStockWizard() {
  const org = useOrganization()
  const href = useOrgPath()
  const client = useQueryClient()
  const can = useCan('inventory.adjust')
  const warehouses = useWarehouseOptions()
  const [warehouse, setWarehouse] = useState('')
  const [file, setFile] = useState<string | null>(null)
  const [mapped, setMapped] = useState<ImportResult<OpeningRow> | null>(null)
  const [resolution, setResolution] = useState<Resolution | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<string | null>(null)

  const load = async (f: File) => {
    setError(null); setCreated(null); setResolution(null); setFile(f.name)
    try {
      const table = await readSpreadsheet(f)
      const m = mapImport(table.slice(0, 5001), OPENING_FIELDS)
      setMapped(m)
      if (m.missingColumns.length === 0 && warehouse) await resolve(m)
    } catch (e) { setError(e instanceof Error ? e.message : 'Fichier illisible.') }
  }
  const resolve = async (m: ImportResult<OpeningRow>) => {
    const [items, locations] = await Promise.all([importsApi.items(org.id), importsApi.locations(warehouse)])
    setResolution(resolveOpening(m.rows, new Map(items.map((i) => [i.sku.toLowerCase(), i])), new Map(locations.map((l) => [l.code.toLowerCase(), l.id]))))
  }
  const create = async () => {
    if (!resolution || !file) return
    setBusy(true); setError(null)
    try {
      const id = await importsApi.createOpeningAdjustment(org.id, warehouse, resolution.lines, file)
      await importsApi.recordJob(org.id, { kind: 'opening_stock', filename: file, total: (mapped?.rows.length ?? 0) + (mapped?.errors.length ?? 0), valid: resolution.lines.length, errors: resolution.errors.length + (mapped?.errors.length ?? 0), report: { errors: [...(mapped?.errors ?? []), ...resolution.errors].slice(0, 200) } })
      await client.invalidateQueries({ queryKey: ['org', org.id] })
      setCreated(id)
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') } finally { setBusy(false) }
  }
  const errors = [...(mapped?.errors ?? []), ...(resolution?.errors ?? [])]
  return (
    <Panel title="Stock d’ouverture (import initial)">
      <p className="mb-3 text-[13px] text-muted-foreground">Chargez votre inventaire de départ : un ajustement « ouverture » en brouillon est créé, vérifiez-le puis comptabilisez-le (valorisation FIFO / coût moyen incluse).</p>
      {error && <Banner tone="critical">{error}</Banner>}
      {created && <Banner tone="success">Ajustement créé. <Link className="underline" href={href(`inventaire/ajustements/${created}`)}>Ouvrir pour vérifier et comptabiliser</Link></Banner>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Entrepôt de destination" value={warehouse} options={[{ value: '', label: 'Choisir…' }, ...warehouses]} onChange={(v) => { setWarehouse(v); setResolution(null) }} />
        <div className="flex items-end"><Button variant="secondary" onClick={() => downloadText('modele-stock-ouverture.csv', templateCsv(OPENING_FIELDS, OPENING_EXAMPLE))}><span className="inline-flex items-center gap-1.5"><Download className="size-3.5" /> Modèle CSV</span></Button></div>
      </div>
      <div className="mt-3"><DropZone label="Fichier CSV ou Excel" accept=".csv,.xlsx,.txt" onChange={(e) => { const f = (e.currentTarget as unknown as { files?: File[] }).files?.[0]; if (f) void load(f) }}><BlockStack gap="small-200" padding="base"><Text>{file ?? 'Glissez votre fichier ici ou cliquez pour parcourir'}</Text></BlockStack></DropZone></div>
      {mapped && mapped.missingColumns.length > 0 && <Banner tone="critical">Colonnes manquantes : {mapped.missingColumns.join(', ')}</Banner>}
      {mapped && warehouse && !resolution && mapped.missingColumns.length === 0 && <div className="mt-2"><Button variant="secondary" onClick={() => void resolve(mapped)}>Vérifier</Button></div>}
      {mapped && !warehouse && <p className="mt-2 text-[13px] text-amber-700">Choisissez l’entrepôt pour vérifier les emplacements.</p>}
      {resolution && (
        <div className="mt-3 space-y-2 text-[13px]">
          <div><Pill tone="success">{resolution.lines.length} ligne(s) valides</Pill> {errors.length > 0 && <Pill tone="critical">{errors.length} erreur(s)</Pill>}</div>
          {errors.length > 0 && <ul className="max-h-40 overflow-y-auto rounded-lg border p-2 text-red-800">{errors.slice(0, 50).map((e, i) => <li key={i}>Ligne {e.line} : {e.message}</li>)}</ul>}
          {can && <Button variant="primary" loading={busy} disabled={resolution.lines.length === 0} onClick={() => void create()}><span className="inline-flex items-center gap-1.5"><Upload className="size-3.5" /> Créer l’ajustement ({resolution.lines.length} lignes valides)</span></Button>}
        </div>
      )}
    </Panel>
  )
}

function Exports() {
  const org = useOrganization()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async (d: (typeof EXPORT_DATASETS)[number], format: 'csv' | 'xlsx') => {
    setBusy(`${d.id}${format}`); setError(null)
    try {
      const rows = await importsApi.dataset(org.id, d.table, d.order)
      if (rows.length === 0) { setError('Aucune donnée à exporter.'); return }
      const headers = Object.keys(rows[0]!).filter((h) => h !== 'organization_id')
      const cell = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : (v as string | number | boolean))
      if (format === 'xlsx') await downloadXlsx(`${d.id}.xlsx`, headers, rows.map((r) => headers.map((h) => { const c = cell(r[h]); return typeof c === 'boolean' ? (c ? 'oui' : 'non') : c })), d.label)
      else downloadText(`${d.id}.csv`, `﻿${[headers.join(';'), ...rows.map((r) => headers.map((h) => `"${String(cell(r[h])).replace(/"/g, '""')}"`).join(';'))].join('\r\n')}`)
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') } finally { setBusy(null) }
  }
  return (
    <Panel title="Exports">
      {error && <Banner tone="warning">{error}</Banner>}
      <ul className="divide-y text-[13px]">
        {EXPORT_DATASETS.map((d) => (
          <li key={d.id} className="flex items-center gap-3 py-2"><span className="font-medium">{d.label}</span>
            <span className="ms-auto flex gap-2"><Button variant="secondary" loading={busy === `${d.id}csv`} onClick={() => void run(d, 'csv')}>CSV</Button><Button variant="secondary" loading={busy === `${d.id}xlsx`} onClick={() => void run(d, 'xlsx')}>Excel</Button></span></li>
        ))}
      </ul>
    </Panel>
  )
}

export function ImportPage() {
  const org = useOrganization()
  const href = useOrgPath()
  const jobs = useQuery({ queryKey: ['org', org.id, 'import_jobs'], queryFn: () => importsApi.jobs(org.id) })
  return (
    <PageShell title="Import / Export" icon={Upload} description="Reprise de données et exports. Chaque import affiche un aperçu avec les erreurs ligne par ligne avant d’écrire quoi que ce soit.">
      <Panel title="Imports par entité">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {ENTITY_IMPORTS.map((e) => (
            <Link key={e.path} href={href(e.path)} className="rounded-xl border p-3 hover:border-foreground/30"><div className="text-sm font-medium">{e.label}</div><div className="text-xs text-muted-foreground">{e.hint}</div><div className="mt-1 text-xs underline">Ouvrir et cliquer sur « Importer »</div></Link>
          ))}
        </div>
      </Panel>
      <OpeningStockWizard />
      <Exports />
      <Panel title="Historique des imports">
        <ul className="divide-y text-[13px]">
          {(jobs.data ?? []).map((j) => (
            <li key={j.id} className="flex flex-wrap items-center gap-3 py-2"><Pill tone={j.status === 'completed' ? 'success' : 'critical'}>{j.status}</Pill><span className="font-medium">{j.kind}</span><span className="text-muted-foreground">{j.filename}</span>
              <span className="ms-auto text-muted-foreground">{j.valid_rows}/{j.total_rows} valides · {formatDateTime(j.created_at)}</span></li>
          ))}
        </ul>
        {(jobs.data ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Aucun import pour le moment.</p>}
      </Panel>
    </PageShell>
  )
}
