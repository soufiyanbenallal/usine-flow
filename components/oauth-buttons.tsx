'use client'

import { Button } from '@xco-agency/corex-ui'
import { supabase } from '@/lib/supabase'

export function GoogleButton({ onError }: { onError: (message: string) => void }) {
  return (
    <Button
      inlineSize="fill"
      onClick={async () => {
        if (!supabase) return onError('Supabase n’est pas configuré (voir .env.example).')
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/login` } })
        if (error) onError(error.message)
      }}
    >
      Continuer avec Google
    </Button>
  )
}

export function OrDivider() {
  return (
    <div className="my-1 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
    </div>
  )
}
