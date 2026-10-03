'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { featureKey } from '../_core/crud-hooks'
import { useOrganization } from '@/features/organization/context'
import type { OrgRole } from '../organization/types'
import { membersService } from './service'
import type { Invitation, Member } from './types'

export function useMembers() {
  const org = useOrganization()
  return useQuery<Member[], Error>({ queryKey: featureKey(org.id, 'members'), queryFn: () => membersService.list(org.id) })
}

export function useInvitations(enabled: boolean) {
  const org = useOrganization()
  return useQuery<Invitation[], Error>({ queryKey: featureKey(org.id, 'invitations'), queryFn: () => membersService.listInvitations(org.id), enabled })
}

function useRefresh(feature: 'members' | 'invitations') {
  const org = useOrganization()
  const client = useQueryClient()
  return () => client.invalidateQueries({ queryKey: featureKey(org.id, feature) })
}

export function useInvite() {
  const org = useOrganization()
  const refresh = useRefresh('invitations')
  return useMutation<Invitation, Error, { email: string; role: OrgRole }>({ mutationFn: ({ email, role }) => membersService.invite(org.id, email, role), onSuccess: refresh })
}
export function useRevokeInvitation() {
  const refresh = useRefresh('invitations')
  return useMutation<void, Error, string>({ mutationFn: (id) => membersService.revokeInvitation(id), onSuccess: refresh })
}
export function useChangeRole() {
  const org = useOrganization()
  const refresh = useRefresh('members')
  return useMutation<void, Error, { userId: string; role: OrgRole }>({ mutationFn: ({ userId, role }) => membersService.updateRole(org.id, userId, role), onSuccess: refresh })
}
export function useRemoveMember() {
  const org = useOrganization()
  const refresh = useRefresh('members')
  return useMutation<void, Error, string>({ mutationFn: (userId) => membersService.remove(org.id, userId), onSuccess: refresh })
}
