// Delivers queued webhook_deliveries (outbox pattern). Schedule it every minute (Supabase cron / pg_net) or call it manually.
// Requires the standard function env: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Optional: CRON_SECRET (shared secret header).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { backoffSeconds, sign } from '../_shared/hmac.ts'

const MAX_ATTEMPTS = 6
const BATCH = 50

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (secret && req.headers.get('x-cron-secret') !== secret) return new Response('Unauthorized', { status: 401 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const { data: due, error } = await db
    .from('webhook_deliveries')
    .select('id, attempts, created_at, webhook_id, event_id, webhooks(url, secret, active), domain_events(event_type, aggregate_type, aggregate_id, payload, created_at, organization_id)')
    .eq('status', 'pending')
    .order('created_at')
    .limit(BATCH)
  if (error) return Response.json({ error: error.message }, { status: 500 })

  let delivered = 0
  let failed = 0
  for (const d of due ?? []) {
    // honour backoff: skip deliveries whose next attempt is not due yet
    if (d.attempts > 0) {
      const last = new Date(d.created_at).getTime() + backoffSeconds(d.attempts) * 1000
      if (Date.now() < last) continue
    }
    const hook = d.webhooks as unknown as { url: string; secret: string; active: boolean } | null
    const event = d.domain_events as unknown as { event_type: string; aggregate_type: string; aggregate_id: string | null; payload: unknown; created_at: string; organization_id: string } | null
    if (!hook || !hook.active || !event) {
      await db.from('webhook_deliveries').update({ status: 'failed', last_error: 'Webhook inactif ou événement supprimé' }).eq('id', d.id)
      failed++
      continue
    }
    const body = JSON.stringify({ id: d.event_id, type: event.event_type, aggregate: { type: event.aggregate_type, id: event.aggregate_id }, organization_id: event.organization_id, occurred_at: event.created_at, data: event.payload })
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-UsineFlow-Event': event.event_type, 'X-UsineFlow-Delivery': d.id, 'X-UsineFlow-Signature': `sha256=${await sign(hook.secret, body)}` },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      if (res.ok) {
        await db.from('webhook_deliveries').update({ status: 'delivered', response_status: res.status, attempts: d.attempts + 1, delivered_at: new Date().toISOString(), last_error: null }).eq('id', d.id)
        delivered++
      } else throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      const attempts = d.attempts + 1
      await db.from('webhook_deliveries').update({ status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending', attempts, last_error: e instanceof Error ? e.message : String(e) }).eq('id', d.id)
      failed++
    }
  }
  return Response.json({ processed: (due ?? []).length, delivered, failed })
})
