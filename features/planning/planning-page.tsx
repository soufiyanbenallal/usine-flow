'use client'

import { Banner, Button, NumberField, Select } from '@xco-agency/corex-ui'
import { CalendarClock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageShell, Panel } from '@/components/page-shell'
import { StatStrip } from '@/components/stat-strip'
import { formatDate, formatQty } from '@/lib/format'
import { Pill } from '../_core/pill'
import { Status } from '../_core/status'
import { useItemIndex } from '../items/hooks'
import { useBomIndex, mrpRunHooks, mrpSuggestionHooks } from '../manufacturing/hooks'
import { manufacturingApi } from '../manufacturing/service'
import type { MrpSuggestionRow } from '../manufacturing/types'
import { useOrgPath, useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { usePartnerIndex } from '../partners/hooks'
import { useWarehouseOptions } from '../warehouses/hooks'
import { capacityWarnings, type MrpResult } from './mrp'
import { loadMrpInput, loadRoutingLoads, runMrp, saveMrpRun } from './service'
import { useWorkCenterIndex } from '../manufacturing/hooks'

/** Planning: runs the MRP engine on current demand / stock / incoming supply and stores purchase & production suggestions. */
export function PlanningPage() {
  const org = useOrganization()
  const href = useOrgPath()
  const router = useRouter()
  const client = useQueryClient()
  const can = useCan('planning.run')
  const { index } = useBomIndex()
  const items = useItemIndex()
  const suppliers = usePartnerIndex()
  const wcs = useWorkCenterIndex()
  const warehouses = useWarehouseOptions()
  const suggestions = mrpSuggestionHooks.useList()
  const runs = mrpRunHooks.useList()
  const [horizon, setHorizon] = useState('30')
  const [warehouse, setWarehouse] = useState('')
  const [last, setLast] = useState<(MrpResult & { loads: ReturnType<typeof capacityWarnings> }) | null>(null)

  const run = useMutation({
    mutationFn: async () => {
      const days = Math.max(Number(horizon) || 30, 1)
      const today = new Date().toISOString().slice(0, 10)
      const input = await loadMrpInput(org.id, index, today, days)
      const result = runMrp(input)
      const routing = await loadRoutingLoads(org.id)
      const loads = capacityWarnings(result.suggestions, routing.minutes, routing.capacity, days)
      await saveMrpRun(org.id, days, result)
      setLast({ ...result, loads })
      await client.invalidateQueries({ queryKey: ['org', org.id] })
    },
  })
  const convert = useMutation({
    mutationFn: ({ s }: { s: MrpSuggestionRow }) => manufacturingApi.convertSuggestion(s.id, warehouse),
    onSuccess: async (ref, { s }) => {
      await client.invalidateQueries({ queryKey: ['org', org.id] })
      router.push(href(s.kind === 'purchase' ? `achats/commandes/${ref}` : `production/ordres/${ref}`))
    },
  })
  const dismiss = mrpSuggestionHooks.useUpdate()

  const open = useMemo(() => (suggestions.data ?? []).filter((s) => s.status === 'open').sort((a, b) => a.need_date.localeCompare(b.need_date)), [suggestions.data])
  const latest = runs.data?.[0]

  return (
    <PageShell
      title="Planification (MRP)"
      icon={CalendarClock}
      description="Besoin net = demande − (stock + achats attendus + production en cours), puis suggestion d’achat ou de fabrication, éclatée niveau par niveau."
      error={suggestions.error?.message}
      actions={can && <Button variant="primary" loading={run.isPending} onClick={() => run.mutate()}>Lancer le calcul</Button>}
    >
      {run.error && <Banner tone="critical">{run.error.message}</Banner>}
      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <NumberField label="Horizon de planification (jours)" value={horizon} min={1} onChange={setHorizon} />
        <Select label="Entrepôt cible des conversions" value={warehouse} options={[{ value: '', label: 'Choisir…' }, ...warehouses.map((w) => ({ value: w.value, label: w.label }))]} onChange={setWarehouse} />
      </div>
      <StatStrip period={latest ? `Dernier calcul : ${formatDate(latest.run_at.slice(0, 10))}` : 'Jamais lancé'} stats={[
        { label: 'Suggestions ouvertes', value: String(open.length) },
        { label: 'Achats', value: String(open.filter((s) => s.kind === 'purchase').length) },
        { label: 'Fabrications', value: String(open.filter((s) => s.kind === 'production').length) },
        { label: 'Alertes', value: String(latest?.warnings.length ?? 0) },
      ]} />
      {convert.error && <Banner tone="critical">{convert.error.message}</Banner>}
      {(latest?.warnings ?? []).slice(0, 5).map((w, i) => <Banner key={i} tone="warning">{w}</Banner>)}
      {last?.loads.filter((l) => l.overloaded).map((l) => <Banner key={l.workCenterId} tone="warning">Capacité dépassée sur {wcs.get(l.workCenterId)?.name ?? l.workCenterId} : {l.plannedHours} h planifiées pour {l.capacityHours} h disponibles ({l.loadPct} %).</Banner>)}
      <Panel title="Suggestions">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-muted-foreground"><th className="py-2 pr-3 font-medium">Article</th><th className="px-3 font-medium">Type</th><th className="px-3 font-medium">Besoin le</th><th className="px-3 text-right font-medium">Net</th><th className="px-3 text-right font-medium">Suggéré</th><th className="px-3 font-medium">Fournisseur</th><th className="px-3 font-medium">Raison</th><th /></tr></thead>
            <tbody>
              {open.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 pr-3">{items.get(s.item_id)?.sku ?? s.item_id} — {items.get(s.item_id)?.name}</td>
                  <td className="px-3"><Pill tone={s.kind === 'purchase' ? 'info' : 'warning'}>{s.kind === 'purchase' ? 'Achat' : 'Fabrication'}</Pill></td>
                  <td className="px-3">{formatDate(s.need_date)}</td>
                  <td className="px-3 text-right tabular-nums">{formatQty(s.net_qty)}</td>
                  <td className="px-3 text-right font-semibold tabular-nums">{formatQty(s.suggested_qty)}</td>
                  <td className="px-3">{s.supplier_id ? (suppliers.get(s.supplier_id)?.name ?? '—') : '—'}</td>
                  <td className="px-3 text-muted-foreground">{s.reason}</td>
                  <td className="whitespace-nowrap px-3 text-right">
                    {can && <Button variant="tertiary" disabled={!warehouse} loading={convert.isPending} onClick={() => convert.mutate({ s })}>{s.kind === 'purchase' ? 'Créer la commande' : 'Créer l’OF'}</Button>}
                    {can && <Button variant="tertiary" tone="critical" onClick={() => dismiss.mutate({ id: s.id, patch: { status: 'dismissed' } })}>Ignorer</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {open.length === 0 && <p className="py-4 text-center text-[13px] text-muted-foreground">Aucune suggestion ouverte. Lancez le calcul pour planifier les besoins.</p>}
        {!warehouse && open.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Choisissez un entrepôt pour convertir les suggestions en commandes / ordres.</p>}
      </Panel>
      {(suggestions.data ?? []).filter((s) => s.status !== 'open').length > 0 && (
        <Panel title="Traitées">
          <ul className="divide-y text-[13px]">{(suggestions.data ?? []).filter((s) => s.status !== 'open').slice(0, 15).map((s) => <li key={s.id} className="flex gap-3 py-2"><span>{items.get(s.item_id)?.sku}</span><span>{formatQty(s.suggested_qty)}</span><Status value={s.status === 'converted' ? 'converted' : 'cancelled'} /></li>)}</ul>
        </Panel>
      )}
    </PageShell>
  )
}
