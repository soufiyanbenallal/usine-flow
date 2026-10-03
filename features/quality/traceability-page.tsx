'use client'

import { Banner, Button, TextField } from '@xco-agency/corex-ui'
import { GitCommitHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { PageShell, Panel } from '@/components/page-shell'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { formatDate, formatQty } from '@/lib/format'
import { Pill } from '../_core/pill'
import { lotPicker } from '../inventory/hooks'
import { useOrgPath } from '../organization/context'
import { useCan } from '../organization/permissions'
import { usePartnerIndex } from '../partners/hooks'
import { useTrace } from './hooks'
import { groupTraceByLevel, type TraceNode } from './rules'
import { qualityApi } from './service'
import type { TraceRow } from './types'

const TYPE_LABEL: Record<TraceRow['node_type'], string> = { lot: 'Lot', production_order: 'Ordre de fabrication', delivery: 'Livraison client', receipt: 'Réception fournisseur' }
const TYPE_TONE: Record<TraceRow['node_type'], 'info' | 'warning' | 'success' | 'neutral'> = { lot: 'info', production_order: 'warning', delivery: 'success', receipt: 'neutral' }

function LotSearch({ onPick }: { onPick: (id: string) => void }) {
  const [term, setTerm] = useState('')
  const { options, loading } = lotPicker.useSearch(term)
  return (
    <div className="max-w-md space-y-2">
      <TextField label="Rechercher un lot" value={term} onChange={setTerm} placeholder="LOT-2026-00482" />
      {loading && <p className="text-xs text-muted-foreground">Recherche…</p>}
      <ul className="max-h-48 overflow-auto rounded-lg border">
        {options.map((o) => (
          <li key={o.value}><button type="button" className="w-full px-3 py-2 text-left text-[13px] hover:bg-secondary" onClick={() => onPick(o.value)}>{o.label}</button></li>
        ))}
      </ul>
    </div>
  )
}

function TraceTree({ rows }: { rows: TraceRow[] }) {
  const partners = usePartnerIndex()
  const href = useOrgPath()
  const nodes: (TraceNode & { row: TraceRow })[] = rows.map((r) => ({ id: `${r.node_type}-${r.node_id}-${r.level}`, type: r.node_type, label: r.label, level: r.level, partnerId: r.partner_id, row: r }))
  const groups = groupTraceByLevel(nodes)
  const link = (r: TraceRow) => (r.node_type === 'production_order' ? href(`production/ordres/${r.node_id}`) : r.node_type === 'delivery' ? href(`ventes/livraisons/${r.node_id}`) : r.node_type === 'receipt' ? href(`achats/receptions/${r.node_id}`) : `${href('qualite/tracabilite')}?lot=${r.node_id}`)
  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([level, list]) => (
        <div key={level} className="flex gap-3">
          <div className="w-16 shrink-0 pt-1 text-xs font-semibold text-muted-foreground">Niveau {level}</div>
          <div className="flex flex-1 flex-wrap gap-2">
            {list.map((n) => (
              <Link key={n.id} href={link((n as unknown as { row: TraceRow }).row)} className="rounded-lg border bg-card px-3 py-2 text-[13px] hover:border-foreground/40">
                <Pill tone={TYPE_TONE[n.type]}>{TYPE_LABEL[n.type]}</Pill>
                <p className="mt-1 font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{[n.partnerId ? partners.get(n.partnerId)?.name : null, (n as unknown as { row: TraceRow }).row.quantity !== null ? `${formatQty((n as unknown as { row: TraceRow }).row.quantity)}` : null, formatDate((n as unknown as { row: TraceRow }).row.ref_date)].filter((x) => x && x !== '—').join(' · ')}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Forward ("which customers received this raw-material lot?") and backward ("which lots and supplier made this delivery?") traceability. */
export function TraceabilityPage() {
  const params = useSearchParams()
  const router = useRouter()
  const href = useOrgPath()
  const lot = params.get('lot') ?? undefined
  const can = useCan('quality.manage')
  const [tab, setTab] = useState<'forward' | 'backward'>('forward')
  const forward = useTrace(lot, 'forward')
  const backward = useTrace(lot, 'backward')
  const current = tab === 'forward' ? forward : backward
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const openRecall = async () => {
    if (!lot) return
    setBusy(true)
    setError(null)
    try {
      const id = await qualityApi.openRecall(lot, reason)
      router.push(href(`qualite/rappels/${id}`))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <PageShell title="Traçabilité" icon={GitCommitHorizontal} description="Matière première → ordre de fabrication → produit fini → livraison client, et inversement." error={current.error?.message}>
      <LotSearch onPick={(id) => router.push(`${href('qualite/tracabilite')}?lot=${id}`)} />
      {lot && (
        <>
          <SegmentedTabs tabs={[{ id: 'forward', label: 'Aval (où est allé ce lot ?)', badge: forward.data?.length }, { id: 'backward', label: 'Amont (d’où vient ce lot ?)', badge: backward.data?.length }]} value={tab} onChange={setTab} />
          <Panel title={tab === 'forward' ? 'Lot → production → clients' : 'Lot → matières → fournisseurs'}>
            {current.isPending ? <p className="text-[13px] text-muted-foreground">Chargement…</p> : <TraceTree rows={current.data ?? []} />}
            {current.data?.length === 0 && <p className="text-[13px] text-muted-foreground">Aucun lien trouvé.</p>}
          </Panel>
          {can && (
            <Panel title="Ouvrir un rappel de ce lot">
              {error && <Banner tone="critical">{error}</Banner>}
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <TextField label="Motif du rappel" value={reason} onChange={setReason} />
                <Button variant="primary" tone="critical" disabled={reason.trim().length < 3} loading={busy} onClick={() => void openRecall()}>Ouvrir le rappel</Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Tous les lots dérivés sont bloqués et les livraisons concernées listées.</p>
            </Panel>
          )}
        </>
      )}
    </PageShell>
  )
}
