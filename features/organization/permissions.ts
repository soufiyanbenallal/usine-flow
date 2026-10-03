'use client'

import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { rpc } from '@/lib/rpc'
import { hasPermission, type Permission } from '@/lib/permissions'
import { isSupabaseConfigured } from '@/lib/supabase'
import { useOrganization } from './context'

/**
 * Effective permissions of the current user (role defaults + organization overrides, resolved by `public.my_permissions`).
 * Falls back to the role defaults until loaded. The database still enforces everything: this only shapes the UI.
 */
export function usePermissions() {
  const org = useOrganization()
  const query = useQuery<string[], Error>({
    queryKey: ['org', org.id, 'my-permissions', org.role],
    queryFn: () => rpc<string[]>('my_permissions', { org: org.id }),
    enabled: isSupabaseConfigured,
    staleTime: 5 * 60_000,
  })
  const granted = useMemo(() => (query.data ? new Set(query.data) : null), [query.data])
  const can = useCallback((permission: Permission) => (granted ? granted.has(permission) : hasPermission(org.role, permission)), [granted, org.role])
  return { can, role: org.role, loading: query.isPending && isSupabaseConfigured }
}

export const useCan = (permission: Permission) => usePermissions().can(permission)
