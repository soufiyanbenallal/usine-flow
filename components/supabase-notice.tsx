'use client'

import { Banner } from '@xco-agency/corex-ui'
import { isSupabaseConfigured } from '@/lib/supabase'

/** Shown on auth pages when NEXT_PUBLIC_SUPABASE_* are missing. */
export function SupabaseNotice() {
  if (isSupabaseConfigured) return null
  return (
    <div className="mb-6">
      <Banner tone="warning">
        <strong className="block">Supabase n’est pas configuré</strong>
        Copiez .env.example vers .env.local et renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, puis relancez le serveur.
      </Banner>
    </div>
  )
}
