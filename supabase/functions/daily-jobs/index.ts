// Runs the nightly maintenance routines when pg_cron is not available on the project
// (inventory snapshot, preventive work orders, late production flags). Protect with CRON_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('Unauthorized', { status: 401 })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const jobs = ['snapshot_inventory', 'cron_generate_preventive_work_orders', 'flag_late_production_orders'] as const
  const results: Record<string, string> = {}
  for (const job of jobs) {
    const { error } = await db.rpc(job)
    results[job] = error ? `error: ${error.message}` : 'ok'
  }
  return Response.json(results)
})
