import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { createCrudService } from '../_core/crud-service'

type P = Record<string, unknown>
export type Site = { id: string; code: string; name: string; kind: 'factory' | 'workshop' | 'warehouse' | 'office'; address: string | null; city: string | null; phone: string | null; active: boolean }
export type DocumentSequence = { id: string; doc_type: string; prefix: string; padding: number; next_value: number; reset_yearly: boolean; year: number | null }
export type Webhook = { id: string; name: string; url: string; events: string[]; secret: string; active: boolean }
export type WebhookDelivery = { id: string; webhook_id: string; status: 'pending' | 'delivered' | 'failed'; response_status: number | null; attempts: number; last_error: string | null; created_at: string }
export type ApiKey = { id: string; name: string; prefix: string; scopes: string[]; last_used_at: string | null; revoked_at: string | null; created_at?: string }
export type Subscription = { plan: string; status: string; seats: number; max_items: number; max_warehouses: number; max_movements_per_month: number; current_period_end: string | null }
export type UsageCounter = { metric: string; period: string; value: number }

export const sitesService = createCrudService<Site, P, P>('sites', { order: { column: 'code', ascending: true } })
export const sequencesService = createCrudService<DocumentSequence, P, P>('document_sequences', { order: { column: 'doc_type', ascending: true } })
export const webhooksService = createCrudService<Webhook, P, P>('webhooks', { order: { column: 'name', ascending: true } })
export const apiKeysService = createCrudService<ApiKey, P, P>('api_keys', { order: { column: 'name', ascending: true } })

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
export const sha256 = async (text: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))
export function generateApiKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return `uf_${hex(bytes.buffer)}`
}

export const platformApi = {
  async overrides(organizationId: string): Promise<{ role: string; permission: string; granted: boolean }[]> {
    const { data, error } = await requireSupabase().from('org_role_permissions').select('role, permission, granted').eq('organization_id', organizationId)
    if (error) throw toUserError(error)
    return (data ?? []) as { role: string; permission: string; granted: boolean }[]
  },
  async setOverride(organizationId: string, role: string, permission: string, granted: boolean | null): Promise<void> {
    const db = requireSupabase()
    const q = granted === null
      ? db.from('org_role_permissions').delete().eq('organization_id', organizationId).eq('role', role).eq('permission', permission)
      : db.from('org_role_permissions').upsert({ organization_id: organizationId, role, permission, granted })
    const { error } = await q
    if (error) throw toUserError(error)
  },
  async subscription(organizationId: string): Promise<Subscription | null> {
    const { data, error } = await requireSupabase().from('subscriptions').select('*').eq('organization_id', organizationId).maybeSingle()
    if (error) throw toUserError(error)
    return (data as Subscription | null) ?? null
  },
  async usage(organizationId: string): Promise<UsageCounter[]> {
    const { data, error } = await requireSupabase().from('usage_counters').select('metric, period, value').eq('organization_id', organizationId).order('period', { ascending: false }).limit(60)
    if (error) throw toUserError(error)
    return (data ?? []) as UsageCounter[]
  },
  async counts(organizationId: string): Promise<{ items: number; warehouses: number; members: number }> {
    const db = requireSupabase()
    const count = async (table: string) => {
      const { count: c, error } = await db.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', organizationId)
      if (error) throw toUserError(error)
      return c ?? 0
    }
    const [items, warehouses] = await Promise.all([count('items'), count('warehouses')])
    const { count: members, error } = await db.from('memberships').select('user_id', { count: 'exact', head: true }).eq('organization_id', organizationId)
    if (error) throw toUserError(error)
    return { items, warehouses, members: members ?? 0 }
  },
  async deliveries(organizationId: string): Promise<WebhookDelivery[]> {
    const { data, error } = await requireSupabase().from('webhook_deliveries').select('id, webhook_id, status, response_status, attempts, last_error, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(50)
    if (error) throw toUserError(error)
    return (data ?? []) as WebhookDelivery[]
  },
  async createApiKey(organizationId: string, name: string, scopes: string[]): Promise<string> {
    const key = generateApiKey()
    const { error } = await requireSupabase().from('api_keys').insert({ organization_id: organizationId, name, prefix: key.slice(0, 11), key_hash: await sha256(key), scopes })
    if (error) throw toUserError(error)
    return key
  },
  async revokeApiKey(id: string): Promise<void> {
    const { error } = await requireSupabase().from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id)
    if (error) throw toUserError(error)
  },
}
