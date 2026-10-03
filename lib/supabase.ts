import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** `null` when env vars are missing — the app then shows a configuration notice instead of crashing. */
export const supabase = url && key ? createClient(url, key) : null
export const isSupabaseConfigured = supabase !== null

/** For services: throws a readable error when Supabase isn't configured. */
export function requireSupabase() {
  if (!supabase) throw new Error('Supabase n’est pas configuré (voir .env.example).')
  return supabase
}
