import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'

type ServiceOptions = {
  /** PostgREST select string, e.g. '*, chantiers(name)'. Defaults to '*'. */
  select?: string
  order?: { column: string; ascending?: boolean }
}

export type CrudService<Row, Insert, Update> = {
  list(organizationId: string): Promise<Row[]>
  create(organizationId: string, input: Insert): Promise<Row>
  /** Inserts many rows at once (chunked); resolves with the number inserted. All-or-nothing per chunk. */
  createMany(organizationId: string, inputs: Insert[]): Promise<number>
  update(id: string, patch: Update): Promise<Row>
  remove(id: string): Promise<void>
}

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
