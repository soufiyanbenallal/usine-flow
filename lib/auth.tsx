'use client'

import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'

type AuthState = { user: Pick<User, 'id' | 'email'> & { fullName: string } }

type AuthContextValue = {
  /** True until the stored session has been read. */
  loading: boolean
  auth: AuthState | null
  session: Session | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(supabase !== null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user
    const auth: AuthState | null = user
      ? { user: { id: user.id, email: user.email, fullName: (user.user_metadata?.full_name as string) || user.email || '' } }
      : null
    return { loading, auth, session, signOut }
  }, [loading, session, signOut])

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
