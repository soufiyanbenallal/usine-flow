'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCrudHooks } from '../_core/crud-hooks'
import { useOrganization } from '../organization/context'
import { apiKeysService, platformApi, sequencesService, sitesService, webhooksService } from './platform-service'

export const siteHooks = createCrudHooks('sites', sitesService, ['options'])
export const sequenceHooks = createCrudHooks('document_sequences', sequencesService)
export const webhookHooks = createCrudHooks('webhooks', webhooksService)
export const apiKeyHooks = createCrudHooks('api_keys', apiKeysService)

export function useRoleOverrides() {
  const org = useOrganization()
  return useQuery({ queryKey: ['org', org.id, 'role-overrides'], queryFn: () => platformApi.overrides(org.id) })
}
export function useSetRoleOverride() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, { role: string; permission: string; granted: boolean | null }>({
    mutationFn: ({ role, permission, granted }) => platformApi.setOverride(org.id, role, permission, granted),
    onSuccess: () => Promise.all([client.invalidateQueries({ queryKey: ['org', org.id, 'role-overrides'] }), client.invalidateQueries({ queryKey: ['org', org.id, 'my-permissions'] })]),
  })
}
export function useSubscription() {
  const org = useOrganization()
  return useQuery({ queryKey: ['org', org.id, 'subscription'], queryFn: () => platformApi.subscription(org.id) })
}
export function useUsage() {
  const org = useOrganization()
  return useQuery({ queryKey: ['org', org.id, 'usage'], queryFn: () => platformApi.usage(org.id) })
}
export function useCounts() {
  const org = useOrganization()
  return useQuery({ queryKey: ['org', org.id, 'counts'], queryFn: () => platformApi.counts(org.id) })
}
export function useWebhookDeliveries() {
  const org = useOrganization()
  return useQuery({ queryKey: ['org', org.id, 'webhook-deliveries'], queryFn: () => platformApi.deliveries(org.id) })
}
export function useCreateApiKey() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<string, Error, { name: string; scopes: string[] }>({
    mutationFn: ({ name, scopes }) => platformApi.createApiKey(org.id, name, scopes),
    onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id, 'api_keys'] }),
  })
}
export function useRevokeApiKey() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, string>({ mutationFn: platformApi.revokeApiKey, onSuccess: () => client.invalidateQueries({ queryKey: ['org', org.id, 'api_keys'] }) })
}
