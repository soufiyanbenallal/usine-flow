'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toUserError } from '@/lib/errors'
import { MODULES, type ModuleKey } from '@/lib/modules'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'
import { useOrganization } from './context'

type ModuleRow = { module: string; enabled: boolean }
type FlagRow = { key: string; enabled: boolean; config: Record<string, unknown> }

export function useModuleRows() {
  const org = useOrganization()
  return useQuery<ModuleRow[], Error>({
    queryKey: ['org', org.id, 'modules'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('org_modules').select('module, enabled').eq('organization_id', org.id)
      if (error) throw toUserError(error)
      return (data ?? []) as ModuleRow[]
    },
  })
}

/** Enabled modules of the organization; `null` while loading (everything visible). Modules without a row are enabled. */
export function useEnabledModules(): ReadonlySet<ModuleKey> | null {
  const { data } = useModuleRows()
  return useMemo(() => {
    if (!data) return null
    const disabled = new Set(data.filter((r) => !r.enabled).map((r) => r.module))
    return new Set(MODULES.map((m) => m.key).filter((k) => !disabled.has(k)))
  }, [data])
}

export function useSetModule() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, { module: ModuleKey; enabled: boolean }>({
    mutationFn: async ({ module, enabled }) => {
      const { error } = await requireSupabase().from('org_modules').upsert({ organization_id: org.id, module, enabled, updated_at: new Date().toISOString() })
      if (error) throw toUserError(error)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id, 'modules'] }),
  })
}

export function useFeatureFlags() {
  const org = useOrganization()
  return useQuery<FlagRow[], Error>({
    queryKey: ['org', org.id, 'flags'],
    enabled: isSupabaseConfigured,
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('feature_flags').select('key, enabled, config').eq('organization_id', org.id)
      if (error) throw toUserError(error)
      return (data ?? []) as FlagRow[]
    },
  })
}

export function useFeatureFlag(key: string): boolean {
  const { data } = useFeatureFlags()
  return data?.find((f) => f.key === key)?.enabled ?? false
}

export function useSetFeatureFlag() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, { key: string; enabled: boolean }>({
    mutationFn: async ({ key, enabled }) => {
      const { error } = await requireSupabase().from('feature_flags').upsert({ organization_id: org.id, key, enabled })
      if (error) throw toUserError(error)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id, 'flags'] }),
  })
}
