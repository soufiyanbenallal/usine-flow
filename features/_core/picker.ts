'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { useOrganization } from '../organization/context'
import { featureKey } from './crud-hooks'
import type { Option, PickerSource } from './form-values'

const sanitize = (q: string) => q.trim().replace(/[%_\\,()]/g, ' ').slice(0, 50)

function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

/**
 * Typeahead source over a table: server-side `ilike` search (20 rows) + lookup of the selected row.
 * Scales to hundreds of thousands of rows because nothing is loaded up-front.
 */
export function createPickerSource<Row extends { id: string }>(opts: {
  feature: string
  table: string
  select: string
  searchColumns: string[]
  toOption: (row: Row) => Option
  /** Extra equality filters (e.g. `{ active: true }`). */
  where?: Record<string, string | number | boolean>
  order?: string
}): PickerSource {
  const base = (organizationId: string) => {
    let qb = requireSupabase().from(opts.table).select(opts.select).eq('organization_id', organizationId)
    for (const [k, v] of Object.entries(opts.where ?? {})) qb = qb.eq(k, v)
    return qb
  }
  return {
    useSearch(term) {
      const org = useOrganization()
      const debounced = useDebounced(term)
      const q = useQuery<Option[], Error>({
        queryKey: [...featureKey(org.id, opts.feature), 'picker', debounced],
        queryFn: async () => {
          let qb = base(org.id)
          const clean = sanitize(debounced)
          if (clean) qb = qb.or(opts.searchColumns.map((c) => `${c}.ilike.%${clean}%`).join(','))
          const { data, error } = await qb.order(opts.order ?? opts.searchColumns[0]!, { ascending: true }).limit(20)
          if (error) throw toUserError(error)
          return ((data ?? []) as unknown as Row[]).map(opts.toOption)
        },
        staleTime: 30_000,
      })
      return { options: q.data ?? [], loading: q.isFetching }
    },
    useById(id) {
      const org = useOrganization()
      const q = useQuery<Option | null, Error>({
        queryKey: [...featureKey(org.id, opts.feature), 'picker-one', id],
        enabled: !!id,
        queryFn: async () => {
          const { data, error } = await requireSupabase().from(opts.table).select(opts.select).eq('id', id).maybeSingle()
          if (error) throw toUserError(error)
          return data ? opts.toOption(data as unknown as Row) : null
        },
        staleTime: 5 * 60_000,
      })
      return q.data ?? undefined
    },
  }
}
