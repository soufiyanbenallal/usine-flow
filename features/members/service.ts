import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { OrgRole } from '../organization/types'
import type { Invitation, InvitationPreview, Member } from './types'

export const membersService = {
  /** Memberships + profile names. Two queries: memberships reference auth.users, not profiles. */
  async list(organizationId: string): Promise<Member[]> {
    const supabase = requireSupabase()
    const { data: memberships, error } = await supabase.from('memberships').select('user_id, role, created_at').eq('organization_id', organizationId).order('created_at')
    if (error) throw toUserError(error)
    const ids = (memberships ?? []).map((m) => m.user_id)
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name, email').in('id', ids)
    if (profileError) throw toUserError(profileError)
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
    return (memberships ?? []).map((m) => ({ ...m, full_name: byId.get(m.user_id)?.full_name ?? '', email: byId.get(m.user_id)?.email ?? null })) as Member[]
  },

  async updateRole(organizationId: string, userId: string, role: OrgRole): Promise<void> {
    const { error } = await requireSupabase().from('memberships').update({ role }).eq('organization_id', organizationId).eq('user_id', userId)
    if (error) throw toUserError(error)
  },

  async remove(organizationId: string, userId: string): Promise<void> {
    const { error } = await requireSupabase().from('memberships').delete().eq('organization_id', organizationId).eq('user_id', userId)
    if (error) throw toUserError(error)
  },

  async listInvitations(organizationId: string): Promise<Invitation[]> {
    const { data, error } = await requireSupabase().from('invitations').select('*').eq('organization_id', organizationId).is('accepted_at', null).order('created_at', { ascending: false })
    if (error) throw toUserError(error)
    return (data ?? []) as Invitation[]
  },

  async invite(organizationId: string, email: string, role: OrgRole): Promise<Invitation> {
    const { data, error } = await requireSupabase().from('invitations').insert({ organization_id: organizationId, email: email.trim().toLowerCase(), role }).select('*').single()
    if (error) throw toUserError(error)
    return data as Invitation
  },

  async revokeInvitation(id: string): Promise<void> {
    const { error } = await requireSupabase().from('invitations').delete().eq('id', id)
    if (error) throw toUserError(error)
  },

  /** Public (signed-out) lookup by secret token. Returns null when invalid/expired/used. */
  async previewInvitation(token: string): Promise<InvitationPreview | null> {
    const { data, error } = await requireSupabase().rpc('get_invitation', { invite_token: token })
    if (error) throw toUserError(error)
    return ((data as InvitationPreview[] | null) ?? [])[0] ?? null
  },
}

export const inviteLink = (token: string) => `${window.location.origin}/signup?invite=${token}`
