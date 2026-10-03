'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { featureKey } from '../_core/crud-hooks'
import { useOrganization } from '../organization/context'
import { useAuth } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { notificationsService } from './service'
import type { Notification, NotificationPreference } from './types'

export function useNotifications() {
  const org = useOrganization()
  return useQuery<Notification[], Error>({
    queryKey: featureKey(org.id, 'notifications'),
    queryFn: () => notificationsService.list(org.id),
    enabled: isSupabaseConfigured,
    refetchInterval: 60_000,
  })
}

export const useUnreadCount = () => useNotifications().data?.filter((n) => !n.read_at).length ?? 0

export function useMarkRead() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, string[]>({ mutationFn: notificationsService.markRead, onSuccess: () => client.invalidateQueries({ queryKey: featureKey(org.id, 'notifications') }) })
}

export function useDeleteNotification() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, string>({ mutationFn: notificationsService.remove, onSuccess: () => client.invalidateQueries({ queryKey: featureKey(org.id, 'notifications') }) })
}

export function useNotificationPreferences() {
  const org = useOrganization()
  const { auth } = useAuth()
  return useQuery<NotificationPreference[], Error>({
    queryKey: [...featureKey(org.id, 'notification_preferences'), auth?.user.id],
    queryFn: () => notificationsService.preferences(org.id, auth!.user.id),
    enabled: !!auth && isSupabaseConfigured,
  })
}

export function useSavePreference() {
  const org = useOrganization()
  const client = useQueryClient()
  return useMutation<void, Error, NotificationPreference>({ mutationFn: notificationsService.savePreference, onSuccess: () => client.invalidateQueries({ queryKey: featureKey(org.id, 'notification_preferences') }) })
}
