import { toUserError } from './errors'
import { requireSupabase } from './supabase'

/** Calls a Postgres function (RPC). Errors are mapped to user-readable messages. */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireSupabase().rpc(fn, args)
  if (error) throw toUserError(error)
  return data as T
}

export type Page<Row> = { rows: Row[]; total: number }
export type PageQuery = {
  page: number
  pageSize: number
  search?: string
  searchColumns?: string[]
  filters?: Record<string, string | number | boolean | null | undefined>
  orderBy?: string
  ascending?: boolean
}
