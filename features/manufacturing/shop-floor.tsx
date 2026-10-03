'use client'

import { Banner, Button } from '@xco-agency/corex-ui'
import { AlertTriangle, ClipboardList, Gauge as GaugeIcon, LogIn, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageShell, Panel } from '@/components/page-shell'
import { StatStrip } from '@/components/stat-strip'
import { formatQty } from '@/lib/format'
import { Status } from '../_core/status'
import { useView } from '../_core/view-hooks'
import { useItemIndex } from '../items/hooks'
import { assetHooks, workOrderHooks } from '../maintenance/hooks'
import { useOrgPath } from '../organization/context'
import { useCan } from '../organization/permissions'
import { useCheckInOut, useMyEmployee } from '../workforce/hooks'
import { useDowntimeReasons as useDowntimeReasonOptions } from '../quality/hooks'
import { downtimeHooks, operationHooks, productionOrderHooks, useOee, useWorkCenterIndex, useWorkCenterOptions } from './hooks'
import { OperationControls } from './operation-controls'
import { isLate, operationProgress, orderProgress } from './production-rules'
import type { Downtime, ProductionOrder } from './types'
import { manufacturingApi } from './service'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from '../organization/context'

const axis = { fontSize: 12, fill: '#6b6b6b' }

/** Worker screen — "MY WORK": a few big buttons, no ERP forms (guide §15). */
export function ShopFloorPage() {
  const orders = productionOrderHooks.useList()
  const ops = operationHooks.useList()
  const items = useItemIndex()
  const wcs = useWorkCenterIndex()
  const wcOptions = useWorkCenterOptions()
  const me = useMyEmployee()
  const { checkIn, checkOut } = useCheckInOut()
  const can = useCan('production.report')
  const [wc, setWc] = useState('')

  const cards = useMemo(() => {
    const open = new Map((orders.data ?? []).filter((o) => ['released', 'in_progress', 'paused'].includes(o.status)).map((o) => [o.id, o]))
    const byOrder = new Map<string, number>()
    for (const o of ops.data ?? []) byOrder.set(o.production_order_id, Math.max(byOrder.get(o.production_order_id) ?? 0, o.seq))
    return (ops.data ?? [])
      .filter((o) => open.has(o.production_order_id) && ['pending', 'running', 'paused'].includes(o.status) && (!wc || o.work_center_id === wc))
      .map((o) => ({ op: o, order: open.get(o.production_order_id)!, isLast: byOrder.get(o.production_order_id) === o.seq }))
      .sort((a, b) => Number(b.op.status === 'running') - Number(a.op.status === 'running') || a.order.priority - b.order.priority || (a.order.planned_end ?? '').localeCompare(b.order.planned_end ?? ''))
  }, [orders.data, ops.data, wc])

  return (
    <PageShell
      title="Atelier — mon travail"
      icon={ClipboardList}
      description="Démarrer, déclarer la production, signaler un rebut, terminer. Interface simplifiée pour les opérateurs."
      error={orders.error?.message ?? ops.error?.message}
      actions={
        me.data && (
          <>
            <Button variant="secondary" loading={checkIn.isPending} onClick={() => checkIn.mutate(me.data!.id)}><span className="inline-flex items-center gap-1.5"><LogIn className="size-3.5" /> Pointer l’arrivée</span></Button>
            <Button variant="secondary" loading={checkOut.isPending} onClick={() => checkOut.mutate(me.data!.id)}><span className="inline-flex items-center gap-1.5"><LogOut className="size-3.5" /> Pointer le départ</span></Button>
          </>
        )
      }
    >
      {!me.data && !me.isPending && <Banner tone="info">Votre compte n’est lié à aucune fiche employé : le temps passé ne sera pas imputé à votre nom.</Banner>}
      {!can && <Banner tone="info">Lecture seule : vous n’avez pas le droit de déclarer la production.</Banner>}
      <div className="max-w-xs">
        <label className="flex flex-col gap-1 text-[13px]">
          <span className="font-medium">Poste de charge</span>
          <select value={wc} onChange={(e) => setWc(e.target.value)} className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm">
            <option value="">Tous les postes</option>
            {wcOptions.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </label>
      </div>
      {cards.length === 0 && <Banner tone="success">Aucune opération à traiter.</Banner>}
      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map(({ op, order, isLast }) => (
          <section key={op.id} className="space-y-3 rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{order.number}</p>
                <p className="text-[13px] text-muted-foreground">{items.get(order.item_id)?.name ?? order.item_id}</p>
              </div>
              <Status value={op.status} />
            </div>
            <p className="text-xl font-semibold">{op.name}</p>
            <p className="text-[13px] text-muted-foreground">{op.work_center_id ? wcs.get(op.work_center_id)?.name : 'Sans poste'} · {formatQty(op.planned_qty)} unités · {formatQty(op.done_qty)} produites</p>
            <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${operationProgress({ status: op.status, plannedQty: op.planned_qty, doneQty: op.done_qty, scrapQty: op.scrap_qty })}%` }} /></div>
            {can && <OperationControls op={op} order={order} isLast={isLast} />}
          </section>
        ))}
      </div>
    </PageShell>
  )
}

function StartDowntime() {
  const org = useOrganization()
  const client = useQueryClient()
  const wcs = useWorkCenterOptions()
  const reasons = useDowntimeReasonOptions()
  const can = useCan('production.report')
  const [wc, setWc] = useState('')
  const [cat, setCat] = useState('other')
  const [reason, setReason] = useState('')
  const start = useMutation({ mutationFn: () => manufacturingApi.startDowntime({ workCenter: wc, category: cat, reason: reason || undefined }), onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }) })
  if (!can) return null
  const sel = 'h-9 rounded-lg border border-input bg-transparent px-2 text-sm'
  return (
    <Panel title="Déclarer un arrêt">
      {start.error && <Banner tone="critical">{start.error.message}</Banner>}
      <div className="flex flex-wrap items-end gap-3">
        <select aria-label="Poste" value={wc} onChange={(e) => setWc(e.target.value)} className={sel}><option value="">Poste de charge…</option>{wcs.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}</select>
        <select aria-label="Catégorie" value={cat} onChange={(e) => setCat(e.target.value)} className={sel}>{['breakdown:Panne', 'setup:Réglage', 'material:Manque matière', 'planned:Arrêt planifié', 'quality:Qualité', 'other:Autre'].map((o) => { const [v, l] = o.split(':'); return <option key={v} value={v}>{l}</option> })}</select>
        <select aria-label="Motif" value={reason} onChange={(e) => setReason(e.target.value)} className={sel}><option value="">Motif…</option>{reasons.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
        <Button variant="primary" disabled={!wc} loading={start.isPending} onClick={() => start.mutate()}>Arrêter le poste</Button>
      </div>
    </Panel>
  )
}

/** Supervisor board — live production floor: work-center progress, stopped machines, downtime, late orders, shortages. */
export function SupervisionPage() {
  const href = useOrgPath()
  const orders = productionOrderHooks.useList()
  const ops = operationHooks.useList()
  const wcs = useWorkCenterIndex()
  const assets = assetHooks.useList()
  const downtime = downtimeHooks.useList()
  const workOrders = workOrderHooks.useList()
  const items = useItemIndex()
  const oee = useOee(30)
  const shortages = useView<{ production_order_id: string; number: string; item_id: string; shortage: number }>('production_orders', 'production_material_shortages_view')
  const today = new Date().toISOString().slice(0, 10)
  const end = useMutation({ mutationFn: (id: string) => manufacturingApi.endDowntime(id) })
  const client = useQueryClient()
  const org = useOrganization()

  const board = useMemo(() => {
    return [...wcs.values()].filter((w) => w.active).map((w) => {
      const running = (ops.data ?? []).filter((o) => o.work_center_id === w.id && ['running', 'paused'].includes(o.status))
      const planned = running.reduce((a, o) => a + o.planned_qty, 0)
      const done = running.reduce((a, o) => a + o.done_qty, 0)
      const stoppedAsset = (assets.data ?? []).find((a) => a.work_center_id === w.id && ['stopped', 'maintenance'].includes(a.status))
      const openWo = stoppedAsset ? (workOrders.data ?? []).find((x) => x.asset_id === stoppedAsset.id && x.breakdown && ['open', 'assigned', 'in_progress'].includes(x.status)) : null
      return { wc: w, progress: planned > 0 ? Math.min(Math.round((done / planned) * 100), 100) : 0, running: running.length, stoppedAsset, openWo }
    })
  }, [wcs, ops.data, assets.data, workOrders.data])

  const late: ProductionOrder[] = (orders.data ?? []).filter((o) => isLate(o.planned_end, o.status, today))
  const openDowntime: Downtime[] = (downtime.data ?? []).filter((d) => !d.ended_at)
  const avgOee = (() => { const v = (oee.data ?? []).map((r) => r.oee_pct).filter((x): x is number => x !== null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null })()

  return (
    <PageShell title="Supervision de la production" icon={GaugeIcon} description="Tableau en temps réel : avancement par poste, machines à l’arrêt, retards et pénuries de matières." error={orders.error?.message}>
      <StatStrip period="Aujourd’hui" stats={[
        { label: 'OF en cours', value: String((orders.data ?? []).filter((o) => ['released', 'in_progress', 'paused'].includes(o.status)).length) },
        { label: 'OF en retard', value: String(late.length), hint: late.length ? 'À traiter' : 'RAS' },
        { label: 'Postes à l’arrêt', value: String(board.filter((b) => b.stoppedAsset).length) },
        { label: 'TRS (30 j)', value: avgOee === null ? '—' : `${avgOee} %` },
      ]} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {board.map(({ wc, progress, running, stoppedAsset, openWo }) => (
          <section key={wc.id} className={`rounded-2xl border p-4 shadow-xs ${stoppedAsset ? 'border-red-300 bg-red-50' : 'bg-card'}`}>
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">{wc.name}</h3>{stoppedAsset ? <Status value="stopped" /> : running > 0 ? <Status value="running" /> : <Status value="standby" />}</div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-foreground" style={{ width: `${progress}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{progress} % · {running} opération(s) en cours</p>
            {stoppedAsset && (
              <p className="mt-2 flex items-center gap-1 text-[13px] font-medium text-red-700"><AlertTriangle className="size-4" /> {stoppedAsset.name} — {openWo ? <Link href={href(`maintenance/ordres/${openWo.id}`)} className="underline">maintenance requise</Link> : 'à l’arrêt'}</p>
            )}
          </section>
        ))}
      </div>
      {(shortages.data ?? []).length > 0 && (
        <Panel title="Pénuries de matières">
          <ul className="divide-y text-[13px]">{shortages.data!.map((s, i) => <li key={i} className="flex gap-3 py-2"><Link href={href(`production/ordres/${s.production_order_id}`)} className="font-medium underline">{s.number}</Link><span>{items.get(s.item_id)?.sku ?? s.item_id}</span><span className="ml-auto font-semibold text-red-700">manque {formatQty(s.shortage)}</span></li>)}</ul>
        </Panel>
      )}
      {late.length > 0 && (
        <Panel title="Ordres en retard">
          <ul className="divide-y text-[13px]">{late.map((o) => <li key={o.id} className="flex gap-3 py-2"><Link href={href(`production/ordres/${o.id}`)} className="font-medium underline">{o.number}</Link><span>{items.get(o.item_id)?.name}</span><span className="ml-auto text-red-700">fin prévue {o.planned_end}</span><span>{orderProgress(o.produced_qty, o.quantity)} %</span></li>)}</ul>
        </Panel>
      )}
      {openDowntime.length > 0 && (
        <Panel title="Arrêts en cours">
          <ul className="divide-y text-[13px]">{openDowntime.map((d) => <li key={d.id} className="flex items-center gap-3 py-2"><span>{d.work_center_id ? wcs.get(d.work_center_id)?.name : '—'}</span><span className="text-muted-foreground">{d.category}</span><Button variant="tertiary" loading={end.isPending} onClick={() => end.mutate(d.id, { onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }) })}>Terminer l’arrêt</Button></li>)}</ul>
          {end.error && <Banner tone="critical">{end.error.message}</Banner>}
        </Panel>
      )}
      <StartDowntime />
      <Panel title="TRS par poste (30 jours)">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...wcs.values()].map((w) => { const rows = (oee.data ?? []).filter((r) => r.work_center_id === w.id && r.oee_pct !== null); return { name: w.name, oee: rows.length ? Math.round(rows.reduce((a, r) => a + (r.oee_pct ?? 0), 0) / rows.length) : 0 } })} margin={{ left: -8 }}>
              <CartesianGrid vertical={false} stroke="#ebebeb" /><XAxis dataKey="name" tick={axis} axisLine={false} tickLine={false} /><YAxis domain={[0, 100]} tick={axis} axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="oee" name="TRS %" fill="#1a1a1a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </PageShell>
  )
}

