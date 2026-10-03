'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOrganization } from './context'
import { organizationService } from './service'
import type { OrganizationPatch } from './types'

export function useOrganizationDetails() {
  const org = useOrganization()
  return useQuery({ queryKey: ['org', org.id, 'details'], queryFn: () => organizationService.getDetails(org.id) })
}

export function useUpdateOrganization() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (patch: OrganizationPatch) => organizationService.update(org.id, patch),
    onSuccess: async () => {
      // `['organization', userId]` feeds the sidebar/slug; details feed the settings form.
      await Promise.all([client.invalidateQueries({ queryKey: ['organization'] }), client.invalidateQueries({ queryKey: ['org', org.id, 'details'] })])
    },
  })
}
