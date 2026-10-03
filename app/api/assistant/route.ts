import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { runTool, TOOL_DEFINITIONS } from '@/features/ai/tools'

export const runtime = 'nodejs'
export const maxDuration = 60

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5'
const MAX_STEPS = 6

const SYSTEM = `Tu es l’assistant d’UsineFlow, un système d’exploitation des opérations industrielles pour usines, ateliers et entrepôts au Maroc.
Tu réponds dans la langue de l’utilisateur (français par défaut, arabe ou anglais s’il écrit dans ces langues), de façon concise et opérationnelle.
Tu n’inventes jamais de chiffres : utilise les outils pour lire les données de l’organisation. Si un outil ne renvoie rien, dis-le.
Les montants sont en MAD. Propose des actions concrètes (ex. « lancer un réapprovisionnement de X ») sans les exécuter : tu es en lecture seule.`

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return Response.json({ error: 'L’assistant IA n’est pas configuré (ANTHROPIC_API_KEY manquante).' }, { status: 503 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!url || !anon || !token) return Response.json({ error: 'Non authentifié.' }, { status: 401 })

  let body: { organizationId?: string; messages?: ChatMessage[] }
  try { body = await request.json() } catch { return Response.json({ error: 'Requête invalide.' }, { status: 400 }) }
  const organizationId = body.organizationId
  const messages = (body.messages ?? []).filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim()).slice(-20)
  if (!organizationId || messages.length === 0 || messages[messages.length - 1]!.role !== 'user') return Response.json({ error: 'Requête invalide.' }, { status: 400 })

  // every tool query runs as the caller: RLS limits it to their organization
  const db = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: member } = await db.from('memberships').select('role').eq('organization_id', organizationId).maybeSingle()
  if (!member) return Response.json({ error: 'Accès refusé.' }, { status: 403 })

  const client = new Anthropic({ apiKey })
  const convo: Anthropic.MessageParam[] = messages.map((m) => ({ role: m.role, content: m.content }))
  const used: string[] = []

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await client.messages.create({ model: MODEL, max_tokens: 1500, system: SYSTEM, tools: TOOL_DEFINITIONS, messages: convo })
      if (res.stop_reason !== 'tool_use') {
        const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim()
        return Response.json({ reply: text || 'Je n’ai pas de réponse.', tools: used })
      }
      convo.push({ role: 'assistant', content: res.content })
      const results: Anthropic.ToolResultBlockParam[] = []
      for (const block of res.content) {
        if (block.type !== 'tool_use') continue
        used.push(block.name)
        try {
          const out = await runTool(db, organizationId, block.name, (block.input ?? {}) as Record<string, unknown>)
          results.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(out ?? null).slice(0, 12_000) })
        } catch (e) {
          results.push({ type: 'tool_result', tool_use_id: block.id, is_error: true, content: e instanceof Error ? e.message : 'Erreur' })
        }
      }
      convo.push({ role: 'user', content: results })
    }
    return Response.json({ reply: 'La question demande trop d’étapes. Reformulez-la plus précisément.', tools: used })
  } catch (e) {
    const message = e instanceof Anthropic.APIError ? `Erreur du service IA (${e.status}).` : 'Erreur du service IA.'
    return Response.json({ error: message }, { status: 502 })
  }
}
