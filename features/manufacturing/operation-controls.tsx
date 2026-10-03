'use client'

import { Banner, Button, Select, TextField } from '@xco-agency/corex-ui'
import { Pause, Play, Square } from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { QuantityInput } from '@/components/business/quantity-input'
import { useOrganization } from '../organization/context'
import { useMyEmployee } from '../workforce/hooks'
import { useScrapReasons } from '../quality/hooks'
import { manufacturingApi } from './service'
import { DOWNTIME_CATEGORIES, type ProductionOperation, type ProductionOrder } from './types'

/**
 * Operator controls of one operation: start / pause / resume / complete and « Produced / Scrap / Report ».
 * Deliberately tiny (guide §15): a worker should not see ERP complexity.
 */
export function OperationControls({ op, order, isLast, compact = false }: { op: ProductionOperation; order: Pick<ProductionOrder, 'id' | 'status' | 'lot_number'>; isLast: boolean; compact?: boolean }) {
  const org = useOrganization()
  const client = useQueryClient()
  const me = useMyEmployee()
  const scrapReasons = useScrapReasons()
  const [produced, setProduced] = useState('0')
  const [scrap, setScrap] = useState('0')
  const [reason, setReason] = useState('')
  const [lot, setLot] = useState(order.lot_number ?? '')
  const [category, setCategory] = useState('other')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const orderOpen = ['released', 'in_progress', 'paused'].includes(order.status)

  const run = async (key: string, fn: () => Promise<unknown>, message?: string) => {
    setBusy(key)
    setError(null)
    setDone(null)
    try {
      await fn()
      await client.invalidateQueries({ queryKey: ['org', org.id] })
      if (message) setDone(message)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (!orderOpen || op.status === 'done' || op.status === 'skipped') return <span className="text-xs text-muted-foreground">{op.status === 'done' ? 'Terminée' : '—'}</span>

  return (
    <div className={`space-y-3 ${compact ? '' : 'rounded-xl border p-3'}`}>
      {error && <Banner tone="critical">{error}</Banner>}
      {done && <Banner tone="success">{done}</Banner>}
      <div className="flex flex-wrap gap-2">
        {(op.status === 'pending') && (
          <Button variant="primary" loading={busy === 'start'} onClick={() => void run('start', () => manufacturingApi.startOperation(op.id, me.data?.id))}>
            <span className="inline-flex items-center gap-1.5"><Play className="size-4" /> DÉMARRER</span>
          </Button>
        )}
        {op.status === 'paused' && (
          <Button variant="primary" loading={busy === 'resume'} onClick={() => void run('resume', () => manufacturingApi.resumeOperation(op.id))}>
            <span className="inline-flex items-center gap-1.5"><Play className="size-4" /> REPRENDRE</span>
          </Button>
        )}
        {op.status === 'running' && (
          <>
            <Button variant="secondary" loading={busy === 'pause'} onClick={() => void run('pause', () => manufacturingApi.pauseOperation(op.id, category))}>
              <span className="inline-flex items-center gap-1.5"><Pause className="size-4" /> Pause</span>
            </Button>
            <div className="w-56">
              <Select label="Motif de pause" labelAccessibilityVisibility="exclusive" value={category} options={DOWNTIME_CATEGORIES} onChange={setCategory} />
            </div>
          </>
        )}
        {(op.status === 'running' || op.status === 'paused') && (
          <Button variant="secondary" tone="critical" loading={busy === 'complete'} onClick={() => void run('complete', () => manufacturingApi.completeOperation(op.id), 'Opération terminée')}>
            <span className="inline-flex items-center gap-1.5"><Square className="size-4" /> Terminer l’opération</span>
          </Button>
        )}
      </div>

      {(op.status === 'running' || op.status === 'paused') && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <QuantityInput label="Produit" value={produced} onChange={setProduced} size={compact ? 'md' : 'lg'} />
            <QuantityInput label="Rebut" value={scrap} onChange={setScrap} size={compact ? 'md' : 'lg'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Number(scrap) > 0 && <Select label="Motif du rebut" value={reason} options={[{ value: '', label: '—' }, ...scrapReasons.map((r) => ({ value: r.value, label: r.label }))]} onChange={setReason} />}
            {isLast && <TextField label="N° de lot produit (optionnel)" value={lot} onChange={setLot} />}
          </div>
          <Button
            variant="primary"
            loading={busy === 'report'}
            disabled={Number(produced) <= 0 && Number(scrap) <= 0}
            onClick={() =>
              void run('report', async () => {
                await manufacturingApi.report({ op: op.id, produced: Number(produced), scrap: Number(scrap), scrapReason: reason || undefined, lot: lot || undefined, employee: me.data?.id })
                setProduced('0')
                setScrap('0')
              }, 'Production déclarée')
            }
          >
            Déclarer
          </Button>
        </div>
      )}
    </div>
  )
}
