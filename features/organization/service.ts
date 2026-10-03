import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Organization, OrganizationDetails, OrganizationPatch, OrgRole } from './types'

const DETAILS = 'id, name, slug, legal_form, ice, if_number, rc, patente, cnss, address, city, phone, email, currency, created_at, settings'

export const organizationService = {
  /** The user's organization (one per user for now) and their role in it. */
  async getForUser(userId: string): Promise<Organization | null> {
    const { data, error } = await requireSupabase()
      .from('memberships')
      .select('role, organizations(id, name, slug)')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw toUserError(error)
    const org = data?.organizations as unknown as { id: string; name: string; slug: string } | null | undefined
    return org ? { ...org, role: data!.role as OrgRole } : null
  },

  /** For a signed-in user without an organization. Returns the new slug. */
  async create(company: string): Promise<string> {
    const { data, error } = await requireSupabase().rpc('create_organization', { company })
    if (error) throw toUserError(error)
    return data as string
  },

  async getDetails(id: string): Promise<OrganizationDetails> {
    const { data, error } = await requireSupabase().from('organizations').select(DETAILS).eq('id', id).single()
    if (error) throw toUserError(error)
    return data as OrganizationDetails
  },

  async update(id: string, patch: OrganizationPatch): Promise<OrganizationDetails> {
    const { data, error } = await requireSupabase().from('organizations').update(patch).eq('id', id).select(DETAILS).single()
    if (error) throw toUserError(error)
    return data as OrganizationDetails
  },
}
