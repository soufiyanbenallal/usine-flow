'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'

/**
 * Optional product analytics and error tracking. Both are inert unless their public key is configured
 * (NEXT_PUBLIC_POSTHOG_KEY / NEXT_PUBLIC_SENTRY_DSN), so local development and tests never send anything.
 */
export function Telemetry() {
  const { auth } = useAuth()
  const userId = auth?.user.id

  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (!dsn) return
    void import('@sentry/nextjs').then((Sentry) => {
      if (!Sentry.getClient()) Sentry.init({ dsn, tracesSampleRate: 0.1, environment: process.env.NODE_ENV })
    })
  }, [])

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    void import('posthog-js').then(({ default: posthog }) => {
      if (!posthog.__loaded) posthog.init(key, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com', capture_pageview: true, person_profiles: 'identified_only' })
      if (userId) posthog.identify(userId)
    })
  }, [userId])

  return null
}
