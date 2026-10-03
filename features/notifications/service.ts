import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Notification, NotificationPreference } from './types'

export const notificationsService = {
  async list(organizationId: string, limit = 100): Promise<Notification[]> {
    const { data, error } = await requireSupabase().from('notifications').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(limit)
    if (error) throw toUserError(error)
    return (data ?? []) as Notification[]
  },
  async markRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return
    const { error } = await requireSupabase().from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
    if (error) throw toUserError(error)
  },
  async remove(id: string): Promise<void> {
    const { error } = await requireSupabase().from('notifications').delete().eq('id', id)
    if (error) throw toUserError(error)
  },
  async preferences(organizationId: string, userId: string): Promise<NotificationPreference[]> {
    const { data, error } = await requireSupabase().from('notification_preferences').select('*').eq('organization_id', organizationId).eq('user_id', userId)
    if (error) throw toUserError(error)
    return (data ?? []) as NotificationPreference[]
  },
  async savePreference(pref: NotificationPreference): Promise<void> {
    const { error } = await requireSupabase().from('notification_preferences').upsert(pref)
    if (error) throw toUserError(error)
  },
}
