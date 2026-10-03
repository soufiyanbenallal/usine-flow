// k6 load test for the Supabase REST API (read paths used by lists and dashboards).
//   k6 run -e SUPABASE_URL=https://xxx.supabase.co -e SUPABASE_KEY=<publishable key> -e JWT=<user access token> -e ORG=<organization id> perf/api-load.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.01'], http_req_duration: ['p(95)<800'] },
}

const base = __ENV.SUPABASE_URL
const headers = { apikey: __ENV.SUPABASE_KEY, Authorization: `Bearer ${__ENV.JWT}`, 'Content-Type': 'application/json' }
const org = __ENV.ORG

export default function () {
  const kpis = http.post(`${base}/rest/v1/rpc/dashboard_kpis`, JSON.stringify({ p_org: org }), { headers })
  check(kpis, { 'kpis 200': (r) => r.status === 200 })
  const items = http.get(`${base}/rest/v1/item_stock_summary?organization_id=eq.${org}&select=sku,name,on_hand,available&order=sku&limit=50`, { headers })
  check(items, { 'stock 200': (r) => r.status === 200 })
  const orders = http.get(`${base}/rest/v1/sales_orders?organization_id=eq.${org}&select=id,number,status,total_amount&order=created_at.desc&limit=50`, { headers })
  check(orders, { 'orders 200': (r) => r.status === 200 })
  sleep(1)
}
