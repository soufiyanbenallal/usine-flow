'use client'

import { Banner, Button, Checkbox, TextField } from '@xco-agency/corex-ui'
import { Boxes, Building2, Copy, Hash, KeyRound, Plug, ShieldCheck, Gauge, Webhook as WebhookIcon } from 'lucide-react'
import { useState } from 'react'
import type { DataTableColumn } from '@/components/data-table'
import { PageShell, Panel } from '@/components/page-shell'
import { Pill } from '@/features/_core/pill'
import { EntityPage } from '@/features/_core/entity-page'
import { ApprovalPoliciesPage } from '@/features/approvals/policies-page'
import { useOrganization } from '@/features/organization/context'
import { FEATURE_FLAGS, MODULES, OPERATING_MODES, type ModuleKey } from '@/lib/modules'
import { useEnabledModules, useFeatureFlags, useSetFeatureFlag, useSetModule } from '@/features/organization/modules'
import { ASSIGNABLE_ROLES, ROLE_LABELS, type OrgRole } from '@/features/organization/types'
import { useCan } from '@/features/organization/permissions'
import { formatDateTime } from '@/lib/format'
import { PERMISSIONS, PERMISSION_LABELS, ROLE_PERMISSIONS, permissionGroup } from '@/lib/permissions'
import { apiKeyHooks, sequenceHooks, siteHooks, useCounts, useCreateApiKey, useRevokeApiKey, useRoleOverrides, useSetRoleOverride, useSubscription, useUsage, useWebhookDeliveries, webhookHooks } from '../platform-hooks'
import type { ApiKey, DocumentSequence, Site, Webhook } from '../platform-service'

const SITE_KINDS = [{ value: 'factory', label: 'Usine' }, { value: 'workshop', label: 'Atelier' }, { value: 'warehouse', label: 'Entrepôt' }, { value: 'office', label: 'Bureau' }]
const DOC_LABELS: Record<string, string> = {
  purchase_request: 'Demande d’achat', purchase_order: 'Commande d’achat', purchase_receipt: 'Bon de réception', supplier_invoice: 'Facture fournisseur', supplier_return: 'Retour fournisseur', rfq: 'Appel d’offres',
  quote: 'Devis', sales_order: 'Commande client', delivery: 'Bon de livraison', sales_invoice: 'Facture client', customer_return: 'Retour client', production_order: 'Ordre de fabrication',
  stock_adjustment: 'Ajustement', stock_transfer: 'Transfert', inventory_count: 'Inventaire', pick_list: 'Liste de picking', pick_wave: 'Vague', maintenance_wo: 'Ordre de maintenance', inspection: 'Inspection', ncr: 'Non-conformité', capa: 'CAPA',
}

/* ───────── sites ───────── */
export function SitesPage() {
  const columns: DataTableColumn<Site>[] = [
    { key: 'code', label: 'Code', value: (s) => s.code }, { key: 'name', label: 'Nom', value: (s) => s.name },
    { key: 'kind', label: 'Type', value: (s) => SITE_KINDS.find((k) => k.value === s.kind)?.label ?? s.kind }, { key: 'city', label: 'Ville', value: (s) => s.city ?? '—' },
    { key: 'active', label: 'Statut', value: (s) => (s.active ? 'Actif' : 'Inactif'), render: (s) => <Pill tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Actif' : 'Inactif'}</Pill> },
  ]
  return (
    <EntityPage<Site> title="Sites" singular="site" icon={Building2} description="Usines, ateliers, entrepôts et bureaux de l’organisation." hooks={siteHooks} permission="platform.manage" columns={columns}
      fields={[
        { key: 'code', label: 'Code', required: true, lockedOnEdit: true }, { key: 'name', label: 'Nom', required: true }, { key: 'kind', label: 'Type', type: 'select', options: SITE_KINDS, required: true, default: 'factory' },
        { key: 'address', label: 'Adresse' }, { key: 'city', label: 'Ville' }, { key: 'phone', label: 'Téléphone', type: 'phone' }, { key: 'active', label: 'Actif', type: 'checkbox', default: true },
      ]} />
  )
}

/* ───────── modules & feature flags ───────── */
export function ModulesPage() {
  const can = useCan('platform.manage')
  const enabled = useEnabledModules()
  const setModule = useSetModule()
  const flags = useFeatureFlags()
  const setFlag = useSetFeatureFlag()
  const error = setModule.error ?? setFlag.error
  const applyMode = async (mode: (typeof OPERATING_MODES)[number]) => {
    const on = new Set<string>(mode.modules)
    for (const m of MODULES) await setModule.mutateAsync({ module: m.key, enabled: on.has(m.key) })
  }
  return (
    <PageShell title="Modules" icon={Boxes} description="Activez uniquement ce dont vous avez besoin : l’interface masque les modules désactivés.">
      {error && <Banner tone="critical">{error.message}</Banner>}
      <Panel title="Mode d’exploitation">
        <div className="grid gap-3 sm:grid-cols-3">
          {OPERATING_MODES.map((m) => (
            <div key={m.key} className="rounded-xl border p-4">
              <div className="font-semibold">{m.label}</div><p className="mt-1 text-[13px] text-muted-foreground">{m.description}</p>
              {can && <div className="mt-3"><Button variant="secondary" loading={setModule.isPending} onClick={() => void applyMode(m)}>Appliquer</Button></div>}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Modules">
        <ul className="divide-y">
          {MODULES.map((m) => (
            <li key={m.key} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{m.label}</div><div className="text-xs text-muted-foreground">{m.description}</div></div>
              <Checkbox label="" checked={enabled ? enabled.has(m.key as ModuleKey) : true} disabled={!can || setModule.isPending} onChange={(v) => setModule.mutate({ module: m.key, enabled: v })} />
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Fonctionnalités">
        <ul className="divide-y">
          {FEATURE_FLAGS.map((f) => (
            <li key={f.key} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{f.label}</div><div className="text-xs text-muted-foreground">{f.description}</div></div>
              <Checkbox label="" checked={flags.data?.find((x) => x.key === f.key)?.enabled ?? false} disabled={!can || setFlag.isPending} onChange={(v) => setFlag.mutate({ key: f.key, enabled: v })} />
            </li>
          ))}
        </ul>
      </Panel>
    </PageShell>
  )
}

/* ───────── role permission matrix ───────── */
export function RolesPage() {
  const can = useCan('users.manage')
  const overrides = useRoleOverrides()
  const set = useSetRoleOverride()
  const [role, setRole] = useState<OrgRole>('warehouse_manager')
  const base = new Set<string>(ROLE_PERMISSIONS[role])
  const over = new Map((overrides.data ?? []).filter((o) => o.role === role).map((o) => [o.permission, o.granted]))
  const groups = [...new Set(PERMISSIONS.map(permissionGroup))]
  const effective = (p: string) => over.get(p) ?? base.has(p)
  const toggle = (p: string, next: boolean) => set.mutate({ role, permission: p, granted: next === base.has(p) ? null : next })
  return (
    <PageShell title="Rôles et permissions" icon={ShieldCheck} description="Les permissions par défaut de chaque rôle peuvent être ajustées pour votre organisation. Le propriétaire et l’administrateur ont toujours tous les droits.">
      {set.error && <Banner tone="critical">{set.error.message}</Banner>}
      <div className="flex flex-wrap gap-2">
        {ASSIGNABLE_ROLES.map((r) => <Button key={r} variant={r === role ? 'primary' : 'secondary'} onClick={() => setRole(r)}>{ROLE_LABELS[r]}</Button>)}
      </div>
      {groups.map((g) => (
        <Panel key={g} title={g}>
          <ul className="divide-y">
            {PERMISSIONS.filter((p) => permissionGroup(p) === g).map((p) => (
              <li key={p} className="flex items-center gap-3 py-2 text-[13px]">
                <div className="min-w-0 flex-1"><div>{PERMISSION_LABELS[p]}</div><div className="font-mono text-xs text-muted-foreground">{p}</div></div>
                {over.has(p) && <Pill tone="warning">Personnalisé</Pill>}
                <Checkbox label="" checked={effective(p)} disabled={!can || set.isPending} onChange={(v) => toggle(p, v)} />
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </PageShell>
  )
}

/* ───────── numbering ───────── */
export function NumberingPage() {
  const org = useOrganization()
  const preview = (s: DocumentSequence) => `${s.prefix}${s.reset_yearly ? `-${new Date().getFullYear()}` : ''}-${String(s.next_value).padStart(s.padding, '0')}`
  const columns: DataTableColumn<DocumentSequence>[] = [
    { key: 'type', label: 'Document', value: (s) => DOC_LABELS[s.doc_type] ?? s.doc_type }, { key: 'prefix', label: 'Préfixe', value: (s) => s.prefix },
    { key: 'next', label: 'Prochain numéro', value: (s) => preview(s) }, { key: 'reset', label: 'Remise à zéro annuelle', value: (s) => (s.reset_yearly ? 'Oui' : 'Non') },
  ]
  return (
    <EntityPage<DocumentSequence> title="Numérotation" singular="séquence" icon={Hash} description="Préfixe, longueur et remise à zéro annuelle des numéros de documents. Les séquences sont créées au premier document de chaque type." hooks={sequenceHooks} permission="platform.manage" columns={columns}
      createDefaults={{ organization_id: org.id }}
      fields={[
        { key: 'doc_type', label: 'Type de document', type: 'select', options: Object.entries(DOC_LABELS).map(([value, label]) => ({ value, label })), required: true, lockedOnEdit: true },
        { key: 'prefix', label: 'Préfixe', required: true }, { key: 'padding', label: 'Nombre de chiffres', type: 'number', min: 1, default: 5 },
        { key: 'next_value', label: 'Prochain numéro', type: 'number', min: 1, default: 1 }, { key: 'reset_yearly', label: 'Remise à zéro chaque année', type: 'checkbox', default: true },
      ]} />
  )
}

export function ApprovalSettingsPage() {
  return <ApprovalPoliciesPage />
}

/* ───────── usage & plan ───────── */
export function UsagePage() {
  const sub = useSubscription()
  const usage = useUsage()
  const counts = useCounts()
  const s = sub.data
  const month = new Date().toISOString().slice(0, 7)
  const movements = (usage.data ?? []).find((u) => u.metric === 'movements' && u.period === month)?.value ?? 0
  const bar = (label: string, used: number, max: number) => (
    <div>
      <div className="flex justify-between text-[13px]"><span>{label}</span><span>{used} / {max}</span></div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary"><div className={`h-full ${used / max > 0.9 ? 'bg-red-600' : 'bg-foreground'}`} style={{ width: `${Math.min(100, (100 * used) / Math.max(1, max))}%` }} /></div>
    </div>
  )
  return (
    <PageShell title="Utilisation et quotas" icon={Gauge} description="Consommation du plan en cours.">
      {s && (
        <Panel title={`Plan ${s.plan}`} action={<Pill tone={s.status === 'active' ? 'success' : s.status === 'trialing' ? 'info' : 'critical'}>{s.status}</Pill>}>
          <div className="space-y-4">
            {bar('Articles', counts.data?.items ?? 0, s.max_items)}
            {bar('Entrepôts', counts.data?.warehouses ?? 0, s.max_warehouses)}
            {bar('Utilisateurs', counts.data?.members ?? 0, s.seats)}
            {bar('Mouvements de stock (ce mois)', Number(movements), s.max_movements_per_month)}
          </div>
          {s.current_period_end && <p className="mt-3 text-xs text-muted-foreground">Période en cours jusqu’au {s.current_period_end}.</p>}
        </Panel>
      )}
      <Panel title="Historique">
        <table className="w-full text-[13px]"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-2">Période</th><th className="p-2">Indicateur</th><th className="p-2 text-right">Valeur</th></tr></thead>
          <tbody>{(usage.data ?? []).map((u) => <tr key={`${u.metric}${u.period}`} className="border-b last:border-0"><td className="p-2">{u.period}</td><td className="p-2">{u.metric}</td><td className="p-2 text-right tabular-nums">{u.value}</td></tr>)}</tbody></table>
      </Panel>
    </PageShell>
  )
}

/* ───────── integrations: webhooks + API keys ───────── */
const WEBHOOK_EVENTS = ['stock.low', 'purchase_order.approved', 'sales_order.confirmed', 'delivery.posted', 'production_order.completed', 'inspection.failed', 'maintenance.breakdown', 'lot.recalled']

export function IntegrationsPage() {
  const can = useCan('integrations.manage')
  const keys = apiKeyHooks.useList()
  const createKey = useCreateApiKey()
  const revoke = useRevokeApiKey()
  const deliveries = useWebhookDeliveries()
  const [name, setName] = useState('')
  const [created, setCreated] = useState<string | null>(null)
  const webhookColumns: DataTableColumn<Webhook>[] = [
    { key: 'name', label: 'Nom', value: (w) => w.name }, { key: 'url', label: 'URL', value: (w) => w.url },
    { key: 'events', label: 'Événements', value: (w) => (w.events.length ? w.events.join(', ') : 'Tous') },
    { key: 'active', label: 'Statut', value: (w) => (w.active ? 'Actif' : 'Inactif'), render: (w) => <Pill tone={w.active ? 'success' : 'neutral'}>{w.active ? 'Actif' : 'Inactif'}</Pill> },
  ]
  return (
    <PageShell title="Intégrations" icon={Plug} description="Webhooks signés (HMAC) pour vos ERP / comptabilité, et clés API pour l’accès en lecture.">
      <EntityPage<Webhook> embedded title="Webhooks" singular="webhook" icon={WebhookIcon} hooks={webhookHooks} permission="integrations.manage" columns={webhookColumns}
        fields={[
          { key: 'name', label: 'Nom', required: true }, { key: 'url', label: 'URL (https)', required: true, placeholder: 'https://…' },
          { key: 'events', label: 'Événements (vide = tous)', type: 'tags', help: WEBHOOK_EVENTS.join(', ') }, { key: 'active', label: 'Actif', type: 'checkbox', default: true },
        ]} />
      <Panel title="Clés API">
        {created && (
          <Banner tone="success">
            <div className="space-y-1"><div>Copiez cette clé maintenant, elle ne sera plus affichée :</div>
              <div className="flex items-center gap-2"><code className="break-all rounded bg-secondary px-2 py-1 text-xs">{created}</code>
                <Button variant="secondary" onClick={() => void navigator.clipboard.writeText(created)}><Copy className="size-3.5" /></Button></div></div>
          </Banner>
        )}
        {createKey.error && <Banner tone="critical">{createKey.error.message}</Banner>}
        {can && (
          <div className="mb-3 flex items-end gap-2">
            <div className="w-64"><TextField label="Nom de la clé" value={name} onChange={setName} /></div>
            <Button variant="primary" loading={createKey.isPending} disabled={name.trim().length < 2} onClick={() => createKey.mutate({ name: name.trim(), scopes: ['read'] }, { onSuccess: (k) => { setCreated(k); setName('') } })}><span className="inline-flex items-center gap-1.5"><KeyRound className="size-3.5" /> Générer</span></Button>
          </div>
        )}
        <ul className="divide-y text-[13px]">
          {(keys.data ?? []).map((k: ApiKey) => (
            <li key={k.id} className="flex items-center gap-3 py-2">
              <span className="font-medium">{k.name}</span><code className="text-xs text-muted-foreground">{k.prefix}…</code><span className="text-muted-foreground">{k.last_used_at ? `utilisée ${formatDateTime(k.last_used_at)}` : 'jamais utilisée'}</span>
              <span className="ml-auto">{k.revoked_at ? <Pill tone="neutral">Révoquée</Pill> : can && <Button variant="secondary" tone="critical" loading={revoke.isPending} onClick={() => revoke.mutate(k.id)}>Révoquer</Button>}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Dernières livraisons de webhooks">
        <ul className="divide-y text-[13px]">
          {(deliveries.data ?? []).map((d) => (
            <li key={d.id} className="flex items-center gap-3 py-2"><Pill tone={d.status === 'delivered' ? 'success' : d.status === 'failed' ? 'critical' : 'warning'}>{d.status}</Pill><span>{formatDateTime(d.created_at)}</span><span className="text-muted-foreground">{d.response_status ?? ''} {d.last_error ?? ''}</span><span className="ml-auto text-muted-foreground">{d.attempts} tentative(s)</span></li>
          ))}
        </ul>
        {(deliveries.data ?? []).length === 0 && <p className="text-[13px] text-muted-foreground">Aucune livraison.</p>}
      </Panel>
    </PageShell>
  )
}

