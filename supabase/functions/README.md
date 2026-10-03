# Edge functions

| Function | Purpose | Schedule |
| --- | --- | --- |
| `dispatch-webhooks` | Sends queued `webhook_deliveries` with an HMAC-SHA256 signature (`X-UsineFlow-Signature`), retries with exponential backoff (6 attempts). | every minute |
| `daily-jobs` | Calls `snapshot_inventory`, `cron_generate_preventive_work_orders`, `flag_late_production_orders` when `pg_cron` is unavailable. | daily, 05:00 |

Deploy: `supabase functions deploy dispatch-webhooks daily-jobs`. Set `CRON_SECRET` (`supabase secrets set CRON_SECRET=…`) and call with the header `x-cron-secret`.

Verifying a webhook on the receiving side:

```ts
const expected = 'sha256=' + hmacSha256Hex(secret, rawBody)
if (!timingSafeEqual(expected, req.headers['x-usineflow-signature'])) reject()
```
