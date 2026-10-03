'use client'

import { Banner } from '@xco-agency/corex-ui'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageShell, Panel } from '@/components/page-shell'
import { formatQty } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { Pill } from '../_core/pill'
import { useOrgPath } from '../organization/context'
import { AssistantChat } from './assistant-chat'
import { useMonthlyDemand, useStockLevels } from './hooks'
import { detectAnomalies, forecast, reorderAdvice, type ReorderAdvice } from './insights'

const axis = { fontSize: 12, fill: '#6b6b6b' }

export function AssistantPage() {
  const t = useT()
  const href = useOrgPath()
  const demand = useMonthlyDemand()
  const stock = useStockLevels()

  const analysis = useMemo(() => {
    const byItem = new Map<string, { month: string; quantity: number }[]>()
    for (const r of demand.data ?? []) byItem.set(r.item_id, [...(byItem.get(r.item_id) ?? []), { month: r.month, quantity: Number(r.quantity) }])
    const stockIdx = new Map((stock.data ?? []).map((s) => [s.item_id, s]))
    const advice: (ReorderAdvice & { sku: string; name: string })[] = []
    const anomalies: { itemId: string; name: string; period: string; value: number; expected: number; direction: string }[] = []
    const totals = new Map<string, number>()
    for (const [itemId, rows] of byItem) {
      const s = stockIdx.get(itemId)
      if (!s) continue
      const qty = rows.map((r) => r.quantity)
      for (const r of rows) totals.set(r.month, (totals.get(r.month) ?? 0) + r.quantity)
      const a = reorderAdvice({ itemId, onHand: Number(s.on_hand), incoming: Number(s.incoming), monthlyDemand: qty })
      if (a.urgency !== 'ok' && a.suggestedOrderQty > 0) advice.push({ ...a, sku: s.sku, name: s.name })
      for (const x of detectAnomalies(rows.map((r) => ({ period: r.month, value: r.quantity }))).slice(-1)) anomalies.push({ itemId, name: s.name, period: x.period, value: x.value, expected: x.expected, direction: x.direction })
    }
    const history = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, quantity]) => ({ month: month.slice(0, 7), quantity }))
    const fc = forecast(history.map((h) => h.quantity), 3)
    const chart = [...history.map((h) => ({ month: h.month, réel: h.quantity })), ...fc.next.map((v, i) => ({ month: `+${i + 1}`, prévision: v }))]
    return { advice: advice.sort((a, b) => (a.urgency === b.urgency ? 0 : a.urgency === 'critical' ? -1 : 1)).slice(0, 10), anomalies: anomalies.slice(0, 8), chart, fc }
  }, [demand.data, stock.data])

  return (
    <PageShell title="Assistant IA" icon={Sparkles} description="Posez vos questions en langage naturel et obtenez des prévisions, anomalies et recommandations de réapprovisionnement calculées sur vos données.">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="flex h-[32rem] min-h-0 flex-col"><AssistantChat /></div>
        <div className="space-y-4">
          <Panel title="Prévision de la demande (3 mois)">
            {analysis.chart.length < 3 ? <p className="text-[13px] text-muted-foreground">{t('Pas encore assez d’historique pour prévoir la demande.')}</p> : (
              <>
                <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={analysis.chart}><CartesianGrid vertical={false} stroke="#e5e5e5" /><XAxis dataKey="month" tick={axis} /><YAxis tick={axis} /><Tooltip /><Bar dataKey="réel" fill="#303030" radius={[3, 3, 0, 0]} /><Bar dataKey="prévision" fill="#b45309" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
                <p className="mt-2 text-xs text-muted-foreground">{t('Confiance')} : {analysis.fc.confidence} · ± {formatQty(analysis.fc.band)}</p>
              </>
            )}
          </Panel>
          <Panel title="Réapprovisionnements recommandés">
            <ul className="divide-y text-[13px]">
              {analysis.advice.map((a) => (
                <li key={a.itemId} className="flex items-center gap-3 py-2">
                  <Pill tone={a.urgency === 'critical' ? 'critical' : 'warning'}>{a.urgency === 'critical' ? 'Critique' : 'Bientôt'}</Pill>
                  <Link href={href(`catalogue/articles/${a.itemId}`)} className="font-medium underline">{a.name}</Link>
                  <span className="text-muted-foreground">{a.coverageMonths ?? '—'} mois de couverture</span>
                  <span className="ms-auto font-medium">+ {formatQty(a.suggestedOrderQty)}</span>
                </li>
              ))}
            </ul>
            {analysis.advice.length === 0 && <p className="text-[13px] text-muted-foreground">{t('Aucun risque de rupture détecté.')}</p>}
          </Panel>
          <Panel title="Anomalies de consommation">
            <ul className="divide-y text-[13px]">
              {analysis.anomalies.map((a) => (
                <li key={`${a.itemId}${a.period}`} className="flex items-center gap-3 py-2">
                  <Pill tone={a.direction === 'high' ? 'warning' : 'info'}>{a.direction === 'high' ? 'Pic' : 'Creux'}</Pill>
                  <span className="font-medium">{a.name}</span><span className="text-muted-foreground">{a.period.slice(0, 7)}</span>
                  <span className="ms-auto">{formatQty(a.value)} <span className="text-muted-foreground">(attendu ≈ {formatQty(a.expected)})</span></span>
                </li>
              ))}
            </ul>
            {analysis.anomalies.length === 0 && <p className="text-[13px] text-muted-foreground">{t('Aucune anomalie détectée.')}</p>}
          </Panel>
          <Banner tone="info">Les chiffres ci-dessus sont calculés localement ; le chat utilise l’API Anthropic uniquement si ANTHROPIC_API_KEY est configurée côté serveur.</Banner>
        </div>
      </div>
    </PageShell>
  )
}
