import type { OrgRole } from '../organization/types'

export type Member = { user_id: string; role: OrgRole; created_at: string; full_name: string; email: string | null }

export type Invitation = {
  id: string
  organization_id: string
  email: string
  role: OrgRole
  token: string
  created_at: string
  expires_at: string
  accepted_at: string | null
}

/** What a signed-out invitee may see about their invitation (RPC `get_invitation`). */
export type InvitationPreview = { organization_name: string; email: string; role: OrgRole }
