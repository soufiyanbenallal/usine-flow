import { toUserError } from '@/lib/errors'
import type { Page, PageQuery } from '@/lib/rpc'
import { requireSupabase } from '@/lib/supabase'

type ServiceOptions = {
  /** PostgREST select string, e.g. '*, organizations(name)'. Defaults to '*'. */
  select?: string
  order?: { column: string; ascending?: boolean }
}

export type CrudService<Row, Insert, Update> = {
  list(organizationId: string): Promise<Row[]>
  /** Server-paginated list (range + exact count), with optional ilike search and equality filters. */
  page(organizationId: string, query: PageQuery): Promise<Page<Row>>
  get(id: string): Promise<Row | null>
  /** Rows of a parent document / entity (`column = value`). */
  listBy(organizationId: string, column: string, value: string): Promise<Row[]>
  create(organizationId: string, input: Insert): Promise<Row>
  /** Inserts many rows at once (chunked); resolves with the number inserted. All-or-nothing per chunk. */
  createMany(organizationId: string, inputs: Insert[]): Promise<number>
  update(id: string, patch: Update): Promise<Row>
  remove(id: string): Promise<void>
}

const sanitizeIlike = (q: string) => q.trim().replace(/[%_\\,()]/g, ' ').slice(0, 60)

/**
 * Typed CRUD over one Supabase table. Tenant isolation is enforced by RLS;
 * `organization_id` is still sent explicitly on insert and used to hit the index on reads.
 */
export function createCrudService<Row extends { id: string }, Insert extends object, Update extends object = Partial<Insert>>(
  table: string,
  options: ServiceOptions = {},
): CrudService<Row, Insert, Update> {
  const select = options.select ?? '*'
  const order = options.order ?? { column: 'created_at', ascending: false }

  return {
    async list(organizationId) {
      const { data, error } = await requireSupabase()
        .from(table)
        .select(select)
        .eq('organization_id', organizationId)
        .order(order.column, { ascending: order.ascending ?? false })
        .limit(5000)
      if (error) throw toUserError(error)
      return (data ?? []) as unknown as Row[]
    },
    async page(organizationId, query) {
      let qb = requireSupabase().from(table).select(select, { count: 'exact' }).eq('organization_id', organizationId)
      for (const [column, value] of Object.entries(query.filters ?? {})) {
        if (value !== undefined && value !== null && value !== '') qb = qb.eq(column, value)
      }
      const term = sanitizeIlike(query.search ?? '')
      if (term && query.searchColumns?.length) qb = qb.or(query.searchColumns.map((c) => `${c}.ilike.%${term}%`).join(','))
      const from = Math.max(query.page - 1, 0) * query.pageSize
      const { data, error, count } = await qb
        .order(query.orderBy ?? order.column, { ascending: query.ascending ?? order.ascending ?? false })
        .range(from, from + query.pageSize - 1)
      if (error) throw toUserError(error)
      return { rows: (data ?? []) as unknown as Row[], total: count ?? 0 }
    },
    async get(id) {
      const { data, error } = await requireSupabase().from(table).select(select).eq('id', id).maybeSingle()
      if (error) throw toUserError(error)
      return (data as unknown as Row | null) ?? null
    },
    async listBy(organizationId, column, value) {
      const { data, error } = await requireSupabase()
        .from(table)
        .select(select)
        .eq('organization_id', organizationId)
        .eq(column, value)
        .order('created_at', { ascending: true })
        .limit(2000)
      if (error) throw toUserError(error)
      return (data ?? []) as unknown as Row[]
    },
    async create(organizationId, input) {
      const { data, error } = await requireSupabase()
        .from(table)
        .insert({ ...input, organization_id: organizationId })
        .select(select)
        .single()
      if (error) throw toUserError(error)
      return data as unknown as Row
    },
    async createMany(organizationId, inputs) {
      const chunk = 200
      for (let i = 0; i < inputs.length; i += chunk) {
        const { error } = await requireSupabase()
          .from(table)
          .insert(inputs.slice(i, i + chunk).map((input) => ({ ...input, organization_id: organizationId })))
        if (error) throw toUserError(error)
      }
      return inputs.length
    },
    async update(id, patch) {
      const { data, error } = await requireSupabase().from(table).update(patch).eq('id', id).select(select).single()
      if (error) throw toUserError(error)
      return data as unknown as Row
    },
    async remove(id) {
      const { error } = await requireSupabase().from(table).delete().eq('id', id)
      if (error) throw toUserError(error)
    },
  }
}
