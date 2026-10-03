'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useOrganization } from '../organization/context'
import { useOrganizationDetails } from '../organization/hooks'
import { organizationService } from '../organization/service'
import { resolveSettings, type OrgSettings } from './types'

/** Resolved organization settings (defaults applied). `ready` is false until loaded. */
export function useSettings() {
  const { data, isPending, error } = useOrganizationDetails()
  const settings = useMemo(() => resolveSettings(data?.settings), [data?.settings])
  return { settings, ready: !isPending, error }
}

export function useUpdateSettings() {
  const org = useOrganization()
  const client = useQueryClient()
  const { data } = useOrganizationDetails()
  return useMutation<unknown, Error, Partial<OrgSettings>>({
    // merge into the stored JSON so keys we don't know about are preserved
    mutationFn: (patch) => organizationService.update(org.id, { settings: { ...(data?.settings ?? {}), ...patch } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id, 'details'] }),
  })
}
