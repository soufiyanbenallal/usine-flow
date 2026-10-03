'use client'

import { Banner, Button, NumberField } from '@xco-agency/corex-ui'
import { Cog, GitBranch, Hammer, Route as RouteIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { formatDate, formatMoney, formatQty } from '@/lib/format'
import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { ChildTable } from '../_core/child-table'
import { EntityPage } from '../_core/entity-page'
import { Pill } from '../_core/pill'
import { useListOptions } from '../_core/options'
import { RecordEditor } from '../_core/record-editor'
import { Status } from '../_core/status'
import { EntityHistory } from '../audit/entity-history'
import { AttachmentsPanel } from '../documents/attachments-panel'
import { itemPicker, useItemIndex } from '../items/hooks'
import { useOrgPath, useOrganization } from '../organization/context'
import { useCan } from '../organization/permissions'
import { partnerPicker, usePartnerIndex } from '../partners/hooks'
import { useUomOptions } from '../uoms/hooks'
import { operationCost } from '../costing/costing'
import { explodeBom, flattenRequirements, rollupStandardCost, whereUsed } from './bom'
import { bomHooks, bomLineHooks, bomVersionHooks, routingHooks, routingOperationHooks, standardRollHooks, subcontractHooks, useBomIndex, useWorkCenterIndex, useWorkCenterOptions, workCenterHooks } from './hooks'
import { manufacturingApi } from './service'
import { BOM_LINE_KINDS, WORK_CENTER_KINDS, type Bom, type BomLineRow, type BomVersion, type Routing, type RoutingOperation, type SubcontractOrder, type WorkCenter } from './types'

const active = (a: boolean) => <Pill tone={a ? 'success' : 'neutral'}>{a ? 'Actif' : 'Inactif'}</Pill>

/* ───────── work centers ───────── */
export function WorkCentersPage() {
  const columns: DataTableColumn<WorkCenter>[] = [
    { key: 'code', label: 'Code', value: (w) => w.code },
    { key: 'name', label: 'Nom', value: (w) => w.name },
    { key: 'kind', label: 'Type', value: (w) => WORK_CENTER_KINDS.find((k) => k.value === w.kind)?.label ?? w.kind },
    { key: 'cap', label: 'Capacité (h/j)', align: 'right', value: (w) => w.capacity_hours_per_day },
    { key: 'machine', label: 'Machine (MAD/h)', align: 'right', value: (w) => w.hourly_machine_cost, render: (w) => formatMoney(w.hourly_machine_cost) },
    { key: 'labor', label: 'Main-d’œuvre (MAD/h)', align: 'right', value: (w) => w.hourly_labor_cost, render: (w) => formatMoney(w.hourly_labor_cost) },
    { key: 'active', label: 'Statut', value: (w) => (w.active ? 'Actif' : 'Inactif'), render: (w) => active(w.active) },
  ]
  return (
    <EntityPage<WorkCenter>
      title="Postes de charge" singular="poste de charge" icon={Cog} description="Machines et postes de travail : capacité, coûts horaires machine / main-d’œuvre / frais généraux." hooks={workCenterHooks} permission="production.write" columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'kind', label: 'Type', type: 'select', options: WORK_CENTER_KINDS, required: true, default: 'machine' },
        { key: 'facility_id', label: 'Installation', type: 'relation', useOptions: () => useListOptions('facilities') },
        { key: 'capacity_hours_per_day', label: 'Capacité (heures / jour)', type: 'number', min: 0.1, default: 8, required: true },
        { key: 'efficiency_pct', label: 'Rendement (%)', type: 'number', min: 1, default: 100, required: true },
        { key: 'hourly_machine_cost', label: 'Coût machine (MAD / h)', type: 'money', min: 0, default: 0 },
        { key: 'hourly_labor_cost', label: 'Coût main-d’œuvre (MAD / h)', type: 'money', min: 0, default: 0 },
        { key: 'overhead_rate_pct', label: 'Frais généraux (%)', type: 'number', min: 0, default: 0 },
        { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]}
      importConfig={{ fields: [{ key: 'code', label: 'Code', required: true }, { key: 'name', label: 'Nom', required: true }, { key: 'capacity_hours_per_day', label: 'Capacité', kind: 'number', fallback: 8, min: 0.1 }, { key: 'hourly_machine_cost', label: 'Coût machine', kind: 'number', fallback: 0, min: 0 }, { key: 'hourly_labor_cost', label: 'Coût main-d’œuvre', kind: 'number', fallback: 0, min: 0 }], example: { code: 'WC-01', name: 'Presse', capacity_hours_per_day: 8, hourly_machine_cost: 60, hourly_labor_cost: 30 }, templateName: 'modele-postes.csv' }}
      exportName="postes-de-charge"
    />
  )
}

/* ───────── BOMs ───────── */
export function BomsPage() {
  const items = useItemIndex()
  const versions = bomVersionHooks.useList()
  const columns: DataTableColumn<Bom>[] = [
    { key: 'code', label: 'Code', value: (b) => b.code },
    { key: 'item', label: 'Article fabriqué', value: (b) => (items.get(b.item_id) ? `${items.get(b.item_id)!.sku} — ${items.get(b.item_id)!.name}` : b.item_id) },
    { key: 'name', label: 'Nom', value: (b) => b.name },
    { key: 'version', label: 'Version active', value: (b) => { const v = (versions.data ?? []).find((x) => x.bom_id === b.id && x.status === 'active'); return v ? `v${v.version}` : '—' } },
    { key: 'active', label: 'Statut', value: (b) => (b.active ? 'Actif' : 'Inactif'), render: (b) => active(b.active) },
  ]
  return (
    <EntityPage<Bom>
      title="Nomenclatures (BOM)" singular="nomenclature" icon={GitBranch} description="Nomenclatures multi-niveaux versionnées, avec composants alternatifs, co-produits, sous-produits et taux de rebut." hooks={bomHooks} permission="production.write" columns={columns}
      fields={[
        { key: 'item_id', label: 'Article fabriqué', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ]}
      detailPath={(b) => `production/nomenclatures/${b.id}`} afterCreatePath={(b) => `production/nomenclatures/${b.id}`} exportName="nomenclatures"
    />
  )
}

function useStandardRates() {
  const routingOps = routingOperationHooks.useList()
  const routings = routingHooks.useList()
  const wcs = useWorkCenterIndex()
  return useMemo(() => {
    const byItem = new Map<string, { labor: number; machine: number; overhead: number }>()
    for (const r of routings.data ?? []) {
      if (!r.item_id) continue
      let labor = 0
      let machine = 0
      let overhead = 0
      for (const op of (routingOps.data ?? []).filter((o) => o.routing_id === r.id)) {
        const wc = op.work_center_id ? wcs.get(op.work_center_id) : null
        if (!wc) continue
        const c = operationCost(op.run_minutes_per_unit + op.setup_minutes / 100, { machinePerHour: wc.hourly_machine_cost, laborPerHour: wc.hourly_labor_cost, laborCount: op.labor_count, overheadPct: wc.overhead_rate_pct })
        labor += c.labor
        machine += c.machine
        overhead += c.overhead
      }
      byItem.set(r.item_id, { labor, machine, overhead })
    }
    return byItem
  }, [routingOps.data, routings.data, wcs])
}

function BomExplosion({ itemId, baseQty }: { itemId: string; baseQty: number }) {
  const { index } = useBomIndex()
  const items = useItemIndex()
  const rates = useStandardRates()
  const org = useOrganization()
  const client = useQueryClient()
  const canWrite = useCan('production.write')
  const [qty, setQty] = useState('100')
  const result = useMemo(() => {
    try {
      const reqs = explodeBom(itemId, Number(qty) || 0, index)
      return { reqs, flat: flattenRequirements(reqs, index), error: null as string | null }
    } catch (e) {
      return { reqs: [], flat: new Map<string, number>(), error: (e as Error).message }
    }
  }, [itemId, qty, index])
  const cost = useMemo(() => {
    try {
      return rollupStandardCost(itemId, index, {
        itemCost: (id) => { const i = items.get(id); return i ? (i.standard_cost || i.last_purchase_cost || i.avg_cost) : 0 },
        operationCost: (id) => ({ labor: rates.get(id)?.labor ?? 0, machine: rates.get(id)?.machine ?? 0, overhead: rates.get(id)?.overhead ?? 0, subcontract: 0 }),
      })
    } catch {
      return null
    }
  }, [itemId, index, items, rates])
  const save = useMutation({
    mutationFn: async () => {
      if (!cost) return
      const supabase = requireSupabase()
      const { error: e1 } = await supabase.from('standard_cost_rolls').upsert({ organization_id: org.id, item_id: itemId, ...cost, computed_at: new Date().toISOString() }, { onConflict: 'organization_id,item_id' })
      if (e1) throw toUserError(e1)
      const { error: e2 } = await supabase.from('items').update({ standard_cost: cost.total }).eq('id', itemId)
      if (e2) throw toUserError(e2)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }),
  })
  const used = whereUsed(itemId, index)
  return (
    <>
      <Panel title="Éclatement multi-niveaux">
        <div className="mb-3 w-48">
          <NumberField label={`Quantité à produire (base ${formatQty(baseQty)})`} value={qty} min={0} onChange={setQty} />
        </div>
        {result.error && <Banner tone="critical">{result.error}</Banner>}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-muted-foreground"><th className="py-1 pr-3 font-medium">Niveau</th><th className="px-3 font-medium">Article</th><th className="px-3 text-right font-medium">Quantité</th><th className="px-3 font-medium">Nature</th></tr></thead>
            <tbody>
              {result.reqs.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 pr-3">{'— '.repeat(r.level - 1)}{r.level}</td>
                  <td className="px-3">{items.get(r.itemId)?.sku ?? r.itemId} — {items.get(r.itemId)?.name}</td>
                  <td className="px-3 text-right tabular-nums">{formatQty(r.quantity)}</td>
                  <td className="px-3">{index.has(r.itemId) ? <Pill tone="info">Semi-fini</Pill> : <Pill tone="neutral">Acheté</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Besoins nets à acheter : {[...result.flat.entries()].map(([id, q]) => `${items.get(id)?.sku ?? id} ×${formatQty(q)}`).join(' · ') || '—'}</p>
      </Panel>
      <Panel title="Coût standard (cumul des niveaux + gamme)" action={canWrite && cost && <Button variant="secondary" loading={save.isPending} onClick={() => save.mutate()}>Enregistrer comme coût standard</Button>}>
        {save.error && <Banner tone="critical">{save.error.message}</Banner>}
        {cost && (
          <dl className="grid gap-3 text-[13px] sm:grid-cols-3 lg:grid-cols-6">
            {([['Matières', cost.material], ['Main-d’œuvre', cost.labor], ['Machine', cost.machine], ['Frais généraux', cost.overhead], ['Sous-traitance', cost.subcontract], ['Total / unité', cost.total]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{formatMoney(v)}</dd></div>
            ))}
          </dl>
        )}
      </Panel>
      {used.length > 0 && <Panel title="Utilisé dans"><p className="text-[13px]">{used.map((id) => items.get(id)?.sku ?? id).join(', ')}</p></Panel>}
    </>
  )
}

export function BomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const canWrite = useCan('production.write')
  const client = useQueryClient()
  const org = useOrganization()
  const one = bomHooks.useOne(id)
  const versions = bomVersionHooks.useListBy('bom_id', id)
  const items = useItemIndex()
  const [selected, setSelected] = useState<string | null>(null)
  const bom = one.data
  const current = (versions.data ?? []).find((v) => v.id === selected) ?? (versions.data ?? []).find((v) => v.status === 'active') ?? (versions.data ?? [])[0]
  const activate = useMutation({ mutationFn: (v: string) => manufacturingApi.activateBom(v), onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id] }) })
  const copy = useMutation({ mutationFn: () => manufacturingApi.newBomVersion(id, 'Modification d’ingénierie'), onSuccess: (vid) => { setSelected(vid); return client.invalidateQueries({ queryKey: ['org', org.id] }) } })
  const lineColumns: DataTableColumn<BomLineRow>[] = [
    { key: 'item', label: 'Composant', value: (l) => (items.get(l.component_item_id) ? `${items.get(l.component_item_id)!.sku} — ${items.get(l.component_item_id)!.name}` : l.component_item_id) },
    { key: 'qty', label: 'Quantité', align: 'right', value: (l) => formatQty(l.quantity) },
    { key: 'scrap', label: 'Rebut %', align: 'right', value: (l) => l.scrap_pct },
    { key: 'kind', label: 'Nature', value: (l) => BOM_LINE_KINDS.find((k) => k.value === l.kind)?.label ?? l.kind },
    { key: 'alt', label: 'Alternative', value: (l) => (l.is_alternative ? `Oui (${l.alternative_group ?? '—'})` : '') },
  ]
  const versionColumns: DataTableColumn<BomVersion>[] = [
    { key: 'v', label: 'Version', value: (v) => `v${v.version}` },
    { key: 'status', label: 'Statut', value: (v) => v.status, render: (v) => <Status value={v.status} /> },
    { key: 'from', label: 'Effective du', value: (v) => formatDate(v.effective_from) },
    { key: 'to', label: 'Au', value: (v) => formatDate(v.effective_to) },
    { key: 'base', label: 'Qté de base', align: 'right', value: (v) => v.base_quantity },
    { key: 'note', label: 'Changement', value: (v) => v.change_note ?? '' },
  ]
  return (
    <PageShell title={bom ? `${bom.code} — ${bom.name}` : 'Nomenclature'} icon={GitBranch} error={one.error?.message ?? activate.error?.message ?? copy.error?.message}
      actions={<><Link href={href('production/nomenclatures')}><Button variant="secondary">Nomenclatures</Button></Link>{canWrite && <Button variant="secondary" loading={copy.isPending} onClick={() => copy.mutate()}>Nouvelle version (copie)</Button>}</>}>
      {bom && (
        <>
          <RecordEditor<Bom> title="Informations" hooks={bomHooks} row={bom} permission="production.write" fields={[{ key: 'code', label: 'Code', lockedOnEdit: true }, { key: 'name', label: 'Nom', required: true }, { key: 'active', label: 'Active', type: 'checkbox' }]} />
          <ChildTable<BomVersion>
            title="Versions (changements d’ingénierie)" singular="version" hooks={bomVersionHooks} fk="bom_id" parentId={bom.id} canEdit={canWrite} columns={versionColumns}
            defaults={{ version: String((versions.data?.length ?? 0) + 1), base_quantity: '1' }}
            fields={[
              { key: 'version', label: 'N° de version', type: 'number', min: 1, required: true, lockedOnEdit: true },
              { key: 'base_quantity', label: 'Quantité de base produite', type: 'number', min: 0.0001, default: 1, required: true },
              { key: 'effective_from', label: 'Effective du', type: 'date' },
              { key: 'effective_to', label: 'Au', type: 'date' },
              { key: 'change_note', label: 'Motif du changement' },
            ]}
            extraRowActions={(v) => (
              <>
                <Button variant="tertiary" onClick={() => setSelected(v.id)}>Ouvrir</Button>
                {canWrite && v.status === 'draft' && <Button variant="tertiary" loading={activate.isPending} onClick={() => activate.mutate(v.id)}>Activer</Button>}
              </>
            )}
          />
          {current && (
            <ChildTable<BomLineRow>
              key={current.id}
              title={`Composants — v${current.version} (${current.status === 'draft' ? 'modifiable' : 'figée : créez une nouvelle version pour modifier'})`}
              singular="composant" hooks={bomLineHooks} fk="version_id" parentId={current.id} canEdit={canWrite && current.status === 'draft'} columns={lineColumns}
              fields={[
                { key: 'component_item_id', label: 'Composant', type: 'picker', picker: itemPicker, required: true, lockedOnEdit: true },
                { key: 'quantity', label: 'Quantité par quantité de base', type: 'number', min: 0.000001, required: true },
                { key: 'uom_id', label: 'Unité', type: 'relation', useOptions: useUomOptions },
                { key: 'scrap_pct', label: 'Rebut attendu (%)', type: 'number', min: 0, default: 0 },
                { key: 'kind', label: 'Nature', type: 'select', options: BOM_LINE_KINDS, required: true, default: 'component' },
                { key: 'is_alternative', label: 'Composant alternatif (substitut)', type: 'checkbox' },
                { key: 'alternative_group', label: 'Groupe d’alternatives' },
                { key: 'operation_seq', label: 'Consommé à l’opération n°', type: 'number', min: 0 },
                { key: 'notes', label: 'Notes' },
              ]}
            />
          )}
          <BomExplosion itemId={bom.item_id} baseQty={current?.base_quantity ?? 1} />
          <AttachmentsPanel entityType="boms" entityId={bom.id} kind="technical" title="Plans et documents techniques" />
          <EntityHistory entity="boms" entityId={bom.id} />
        </>
      )}
    </PageShell>
  )
}

/* ───────── routings ───────── */
export function RoutingsPage() {
  const items = useItemIndex()
  const columns: DataTableColumn<Routing>[] = [
    { key: 'code', label: 'Code', value: (r) => r.code },
    { key: 'name', label: 'Nom', value: (r) => r.name },
    { key: 'item', label: 'Article', value: (r) => (r.item_id ? (items.get(r.item_id)?.sku ?? r.item_id) : '—') },
    { key: 'active', label: 'Statut', value: (r) => (r.active ? 'Actif' : 'Inactif'), render: (r) => active(r.active) },
  ]
  return (
    <EntityPage<Routing>
      title="Gammes" singular="gamme" icon={RouteIcon} description="Gamme d’opérations : découpe → assemblage → soudure → peinture → contrôle → conditionnement, avec temps de réglage, de marche, de déplacement et d’attente." hooks={routingHooks} permission="production.write" columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true },
        { key: 'name', label: 'Nom', required: true },
        { key: 'item_id', label: 'Article produit', type: 'picker', picker: itemPicker },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ]}
      detailPath={(r) => `production/gammes/${r.id}`} afterCreatePath={(r) => `production/gammes/${r.id}`} exportName="gammes"
    />
  )
}

export function RoutingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const href = useOrgPath()
  const canWrite = useCan('production.write')
  const one = routingHooks.useOne(id)
  const wcs = useWorkCenterIndex()
  const skills = useListOptions('skills')
  const routing = one.data
  const columns: DataTableColumn<RoutingOperation>[] = [
    { key: 'seq', label: 'Séq.', align: 'right', value: (o) => o.seq },
    { key: 'name', label: 'Opération', value: (o) => o.name },
    { key: 'wc', label: 'Poste', value: (o) => (o.work_center_id ? (wcs.get(o.work_center_id)?.name ?? '—') : '—') },
    { key: 'setup', label: 'Réglage (min)', align: 'right', value: (o) => o.setup_minutes },
    { key: 'run', label: 'Marche (min/u)', align: 'right', value: (o) => o.run_minutes_per_unit },
    { key: 'move', label: 'Déplacement', align: 'right', value: (o) => o.move_minutes },
    { key: 'queue', label: 'Attente', align: 'right', value: (o) => o.queue_minutes },
    { key: 'labor', label: 'Opérateurs', align: 'right', value: (o) => o.labor_count },
    { key: 'skill', label: 'Compétence', value: (o) => skills.find((s) => s.value === o.required_skill_id)?.label ?? '—' },
  ]
  return (
    <PageShell title={routing ? `${routing.code} — ${routing.name}` : 'Gamme'} icon={RouteIcon} error={one.error?.message} actions={<Link href={href('production/gammes')}><Button variant="secondary">Gammes</Button></Link>}>
      {routing && (
        <>
          <RecordEditor<Routing> title="Informations" hooks={routingHooks} row={routing} permission="production.write" fields={[{ key: 'code', label: 'Code', lockedOnEdit: true }, { key: 'name', label: 'Nom', required: true }, { key: 'item_id', label: 'Article produit', type: 'picker', picker: itemPicker }, { key: 'active', label: 'Active', type: 'checkbox' }]} />
          <ChildTable<RoutingOperation>
            title="Opérations" singular="opération" hooks={routingOperationHooks} fk="routing_id" parentId={routing.id} canEdit={canWrite} columns={columns}
            fields={[
              { key: 'seq', label: 'Séquence', type: 'number', min: 1, required: true, default: 10, lockedOnEdit: true },
              { key: 'name', label: 'Opération', required: true },
              { key: 'work_center_id', label: 'Poste de charge', type: 'relation', useOptions: useWorkCenterOptions },
              { key: 'setup_minutes', label: 'Temps de réglage (min)', type: 'number', min: 0, default: 0 },
              { key: 'run_minutes_per_unit', label: 'Temps de marche par unité (min)', type: 'number', min: 0, default: 0 },
              { key: 'move_minutes', label: 'Temps de déplacement (min)', type: 'number', min: 0, default: 0 },
              { key: 'queue_minutes', label: 'Temps d’attente (min)', type: 'number', min: 0, default: 0 },
              { key: 'labor_count', label: 'Nombre d’opérateurs', type: 'number', min: 0, default: 1 },
              { key: 'required_skill_id', label: 'Compétence requise', type: 'relation', useOptions: () => useListOptions('skills') },
              { key: 'instructions', label: 'Instructions', type: 'textarea' },
            ]}
          />
          <AttachmentsPanel entityType="routings" entityId={routing.id} kind="technical" title="Instructions de travail" />
        </>
      )}
    </PageShell>
  )
}

/* ───────── subcontracting ───────── */
export function SubcontractingPage() {
  const partners = usePartnerIndex()
  const columns: DataTableColumn<SubcontractOrder>[] = [
    { key: 'number', label: 'N°', value: (s) => s.number ?? '—' },
    { key: 'partner', label: 'Sous-traitant', value: (s) => partners.get(s.partner_id)?.name ?? s.partner_id },
    { key: 'desc', label: 'Prestation', value: (s) => s.description ?? '—' },
    { key: 'qty', label: 'Quantité', align: 'right', value: (s) => formatQty(s.quantity) },
    { key: 'total', label: 'Montant HT', align: 'right', value: (s) => s.total_amount, render: (s) => formatMoney(s.total_amount) },
    { key: 'expected', label: 'Retour prévu', value: (s) => formatDate(s.expected_date) },
    { key: 'status', label: 'Statut', value: (s) => s.status, render: (s) => <Status value={s.status} /> },
  ]
  return (
    <EntityPage<SubcontractOrder>
      title="Sous-traitance" singular="ordre de sous-traitance" icon={Hammer} description="Opérations confiées à un sous-traitant ; le coût est intégré au coût de revient de l’ordre de fabrication à la réception." hooks={subcontractHooks} permission="production.write" columns={columns}
      filter={{ label: 'Statut', options: ['draft', 'sent', 'received', 'cancelled'].map((v) => ({ value: v, label: v })), getValue: (s) => s.status }}
      fields={[
        { key: 'partner_id', label: 'Sous-traitant', type: 'picker', picker: partnerPicker, required: true },
        { key: 'production_order_id', label: 'Ordre de fabrication (id)', help: 'Optionnel : rattache le coût à un OF.' },
        { key: 'description', label: 'Prestation', required: true },
        { key: 'quantity', label: 'Quantité', type: 'number', min: 0.0001, default: 1, required: true },
        { key: 'unit_price', label: 'Prix unitaire (MAD)', type: 'money', min: 0, default: 0, required: true },
        { key: 'expected_date', label: 'Retour prévu', type: 'date' },
        { key: 'status', label: 'Statut', type: 'select', options: ['draft', 'sent', 'received', 'cancelled'].map((v) => ({ value: v, label: v })), default: 'draft', required: true },
        { key: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      exportName="sous-traitance"
    />
  )
}

export function StandardCostsPanel() {
  const rolls = standardRollHooks.useList()
  const items = useItemIndex()
  return (
    <Panel title="Coûts standards calculés">
      <table className="w-full text-[13px]">
        <thead><tr className="text-left text-muted-foreground"><th className="py-1 font-medium">Article</th><th className="px-3 text-right font-medium">Matières</th><th className="px-3 text-right font-medium">M.O.</th><th className="px-3 text-right font-medium">Machine</th><th className="px-3 text-right font-medium">Total</th><th className="px-3 font-medium">Calculé le</th></tr></thead>
        <tbody>
          {(rolls.data ?? []).map((r) => (
            <tr key={r.id} className="border-t"><td className="py-1">{items.get(r.item_id)?.sku ?? r.item_id}</td><td className="px-3 text-right tabular-nums">{formatMoney(r.material)}</td><td className="px-3 text-right tabular-nums">{formatMoney(r.labor)}</td><td className="px-3 text-right tabular-nums">{formatMoney(r.machine)}</td><td className="px-3 text-right font-semibold tabular-nums">{formatMoney(r.total)}</td><td className="px-3">{formatDate(r.computed_at.slice(0, 10))}</td></tr>
          ))}
        </tbody>
      </table>
      {(rolls.data ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Aucun coût standard enregistré : ouvrez une nomenclature et utilisez « Enregistrer comme coût standard ».</p>}
    </Panel>
  )
}

