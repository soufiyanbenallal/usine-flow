import { toUserError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'

export type ChatMessage = { role: 'user' | 'assistant'; content: string; tools?: string[] }

export async function askAssistant(organizationId: string, messages: ChatMessage[]): Promise<{ reply: string; tools: string[] }> {
  const { data } = await requireSupabase().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Session expirée, reconnectez-vous.')
  const res = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ organizationId, messages: messages.map(({ role, content }) => ({ role, content })) }),
  })
  const json = (await res.json().catch(() => ({}))) as { reply?: string; tools?: string[]; error?: string }
  if (!res.ok) throw toUserError(new Error(json.error ?? 'Erreur du service IA.'))
  return { reply: json.reply ?? '', tools: json.tools ?? [] }
}
