-- Analytics views (security_invoker: RLS of the caller applies), traceability, recalls, KPI function.

create or replace view public.inventory_stock_view with (security_invoker = true) as
select i.organization_id, i.id as item_id, b.warehouse_id,
  coalesce(sum(b.quantity) filter (where b.bucket = 'available'), 0) as on_hand,
  coalesce(sum(b.quantity) filter (where b.bucket = 'quarantine'), 0) as quarantine,
  coalesce(sum(b.quantity) filter (where b.bucket = 'damaged'), 0) as damaged,
  coalesce(sum(b.quantity) filter (where b.bucket = 'scrap'), 0) as scrap,
  coalesce((select sum(r.quantity) from public.inventory_reservations r where r.item_id = i.id and r.warehouse_id = b.warehouse_id and r.status = 'active'), 0) as reserved
from public.items i join public.inventory_balances b on b.item_id = i.id
group by i.organization_id, i.id, b.warehouse_id;

create or replace view public.item_stock_summary with (security_invoker = true) as
select i.organization_id, i.id as item_id, i.sku, i.name, i.item_type, i.category_id, i.base_uom_id, i.min_stock, i.max_stock, i.reorder_point, i.reorder_qty, i.safety_stock, i.avg_cost, i.standard_cost, i.active,
  coalesce(s.on_hand, 0) as on_hand, coalesce(s.quarantine, 0) as quarantine, coalesce(s.damaged, 0) as damaged, coalesce(s.reserved, 0) as reserved,
  coalesce(s.on_hand, 0) - coalesce(s.reserved, 0) as available,
  coalesce((select sum(l.remaining_qty * l.unit_cost) from public.stock_valuation_layers l where l.item_id = i.id and l.remaining_qty > 0), 0) as stock_value,
  coalesce((select sum(greatest(pl.quantity - pl.received_qty, 0) * coalesce(pl.base_quantity / nullif(pl.quantity, 0), 1)) from public.purchase_order_lines pl
             join public.purchase_orders po on po.id = pl.po_id where pl.item_id = i.id and po.status in ('approved', 'ordered', 'partially_received')), 0) as incoming,
  (i.reorder_point > 0 and coalesce(s.on_hand, 0) <= i.reorder_point) or (i.min_stock > 0 and coalesce(s.on_hand, 0) < i.min_stock) as low_stock
from public.items i
left join (select item_id, sum(on_hand) as on_hand, sum(quarantine) as quarantine, sum(damaged) as damaged, sum(reserved) as reserved from public.inventory_stock_view group by item_id) s on s.item_id = i.id
where i.item_type <> 'service';

create or replace view public.stock_aging_view with (security_invoker = true) as
select organization_id, item_id, age_bucket, sum(remaining_qty) as quantity, sum(remaining_qty * unit_cost) as value
from (
  select l.organization_id, l.item_id, l.remaining_qty, l.unit_cost,
    case when current_date - l.received_at::date <= 30 then '0-30' when current_date - l.received_at::date <= 90 then '31-90'
         when current_date - l.received_at::date <= 180 then '91-180' else '180+' end as age_bucket
  from public.stock_valuation_layers l where l.remaining_qty > 0
) x group by organization_id, item_id, age_bucket;

create or replace view public.slow_moving_view with (security_invoker = true) as
select s.organization_id, s.item_id, s.sku, s.name, s.on_hand, s.stock_value,
  m.last_out::date as last_movement, coalesce(current_date - m.last_out::date, 9999) as days_idle,
  case when m.last_out is null or current_date - m.last_out::date > 180 then 'dead' when current_date - m.last_out::date > 90 then 'slow' else 'active' end as classification
from public.item_stock_summary s
left join (select item_id, max(occurred_at) as last_out from public.inventory_movements where quantity < 0 and movement_type in ('sale', 'production_consume', 'issue', 'maintenance_consume') group by item_id) m on m.item_id = s.item_id
where s.on_hand > 0;

create or replace view public.purchase_price_history_view with (security_invoker = true) as
select po.organization_id, pl.item_id, po.supplier_id, po.id as po_id, po.number as po_number, po.order_date,
  pl.unit_price * (1 - pl.discount_pct / 100) / coalesce(nullif(pl.base_quantity / nullif(pl.quantity, 0), 0), 1) as unit_price_base,
  i.standard_cost,
  pl.unit_price * (1 - pl.discount_pct / 100) / coalesce(nullif(pl.base_quantity / nullif(pl.quantity, 0), 0), 1) - i.standard_cost as variance_vs_standard
from public.purchase_order_lines pl join public.purchase_orders po on po.id = pl.po_id join public.items i on i.id = pl.item_id
where po.status not in ('draft', 'cancelled');

create or replace view public.supplier_performance_view with (security_invoker = true) as
select p.organization_id, p.id as supplier_id, p.name,
  (select count(*) from public.purchase_orders po where po.supplier_id = p.id and po.status not in ('draft', 'cancelled')) as orders,
  (select count(*) from public.purchase_receipts r where r.supplier_id = p.id and r.status = 'posted') as receipts,
  (select round(100.0 * count(*) filter (where r.received_on <= coalesce(po.expected_date, r.received_on)) / nullif(count(*), 0), 1)
     from public.purchase_receipts r join public.purchase_orders po on po.id = r.po_id where r.supplier_id = p.id and r.status = 'posted') as on_time_pct,
  (select round(avg(r.received_on - po.order_date), 1) from public.purchase_receipts r join public.purchase_orders po on po.id = r.po_id where r.supplier_id = p.id and r.status = 'posted') as avg_lead_time_days,
  (select round(100.0 * sum(i.rejected_qty) / nullif(sum(i.quantity), 0), 2) from public.inspections i where i.supplier_id = p.id and i.kind = 'incoming' and i.status in ('passed', 'failed', 'accepted_with_deviation')) as defect_rate_pct
from public.partners p where 'supplier' = any (p.kinds);

create or replace view public.sales_margin_view with (security_invoker = true) as
select so.organization_id, so.customer_id, l.item_id, so.id as so_id, so.order_date,
  l.delivered_qty,
  round(l.delivered_qty * l.unit_price * (1 - l.discount_pct / 100), 2) as revenue,
  round(l.cost_amount, 2) as cost,
  round(l.delivered_qty * l.unit_price * (1 - l.discount_pct / 100) - l.cost_amount, 2) as margin
from public.sales_order_lines l join public.sales_orders so on so.id = l.so_id where l.delivered_qty > 0 and so.status <> 'cancelled';

create or replace view public.order_otif_view with (security_invoker = true) as
select so.organization_id, so.id as so_id, so.number, so.customer_id, so.requested_date,
  (select max(d.delivery_date) from public.deliveries d where d.so_id = so.id and d.status = 'posted') as delivered_on,
  not exists (select 1 from public.sales_order_lines l where l.so_id = so.id and l.delivered_qty < l.quantity) as in_full,
  coalesce((select max(d.delivery_date) from public.deliveries d where d.so_id = so.id and d.status = 'posted') <= so.requested_date, so.requested_date is null) as on_time
from public.sales_orders so where so.status in ('delivered', 'invoiced', 'closed', 'partially_delivered');

create or replace view public.production_daily_view with (security_invoker = true) as
with out as (
  select organization_id, reported_at::date as day, item_id, sum(quantity) filter (where kind = 'finished') as produced_qty
    from public.production_outputs group by organization_id, reported_at::date, item_id),
scr as (
  select organization_id, reported_at::date as day, item_id, sum(quantity) as scrap_qty
    from public.production_scrap group by organization_id, reported_at::date, item_id)
select coalesce(out.organization_id, scr.organization_id) as organization_id, coalesce(out.day, scr.day) as day, coalesce(out.item_id, scr.item_id) as item_id,
       coalesce(out.produced_qty, 0) as produced_qty, coalesce(scr.scrap_qty, 0) as scrap_qty
  from out full join scr on scr.organization_id = out.organization_id and scr.day = out.day and scr.item_id = out.item_id;

create or replace view public.machine_downtime_daily_view with (security_invoker = true) as
select d.organization_id, d.started_at::date as day, d.work_center_id, d.asset_id, d.category, sum(d.minutes) as minutes, count(*) as events
from public.production_downtime d group by d.organization_id, d.started_at::date, d.work_center_id, d.asset_id, d.category;

create or replace view public.asset_reliability_view with (security_invoker = true) as
select a.organization_id, a.id as asset_id, a.code, a.name,
  count(w.id) filter (where w.breakdown and w.status = 'completed') as failures,
  coalesce(sum(w.downtime_minutes) filter (where w.breakdown and w.status = 'completed'), 0) as downtime_minutes,
  round(coalesce(sum(coalesce(w.labor_minutes, 0)) filter (where w.breakdown and w.status = 'completed'), 0)::numeric / nullif(count(w.id) filter (where w.breakdown and w.status = 'completed'), 0), 1) as mttr_minutes,
  round((greatest(extract(epoch from (now() - coalesce(a.installed_on::timestamptz, a.created_at))) / 3600, 1)
         - coalesce(sum(w.downtime_minutes) filter (where w.breakdown and w.status = 'completed'), 0) / 60.0) / nullif(count(w.id) filter (where w.breakdown and w.status = 'completed'), 0), 1) as mtbf_hours,
  coalesce(sum(w.total_cost), 0) as maintenance_cost
from public.assets a left join public.maintenance_work_orders w on w.asset_id = a.id group by a.organization_id, a.id, a.code, a.name, a.installed_on, a.created_at;

create or replace view public.oee_daily_view with (security_invoker = true) as
with ops as (
  select op.organization_id, op.work_center_id, op.finished_at::date as day,
         sum(op.accumulated_minutes) as run_minutes, sum(op.done_qty) as good_qty, sum(op.scrap_qty) as scrap_qty,
         sum(op.done_qty * op.run_minutes_per_unit) as ideal_minutes
    from public.production_order_operations op where op.status = 'done' and op.finished_at is not null and op.work_center_id is not null
   group by op.organization_id, op.work_center_id, op.finished_at::date),
dt as (
  select d.organization_id, d.work_center_id, d.started_at::date as day, sum(d.minutes) filter (where d.category <> 'planned') as down_minutes
    from public.production_downtime d where d.work_center_id is not null group by d.organization_id, d.work_center_id, d.started_at::date)
select ops.organization_id, ops.work_center_id, ops.day, ops.run_minutes, coalesce(dt.down_minutes, 0) as downtime_minutes,
  round(100.0 * ops.run_minutes / nullif(ops.run_minutes + coalesce(dt.down_minutes, 0), 0), 1) as availability_pct,
  round(least(100.0 * ops.ideal_minutes / nullif(ops.run_minutes, 0), 100), 1) as performance_pct,
  round(100.0 * ops.good_qty / nullif(ops.good_qty + ops.scrap_qty, 0), 1) as quality_pct,
  round(
    (ops.run_minutes / nullif(ops.run_minutes + coalesce(dt.down_minutes, 0), 0)) * least(ops.ideal_minutes / nullif(ops.run_minutes, 0), 1) * (ops.good_qty / nullif(ops.good_qty + ops.scrap_qty, 0)) * 100, 1) as oee_pct
from ops left join dt on dt.organization_id = ops.organization_id and dt.work_center_id = ops.work_center_id and dt.day = ops.day;

create or replace view public.quality_daily_view with (security_invoker = true) as
select i.organization_id, i.inspected_at::date as day,
  count(*) as inspections, count(*) filter (where i.status = 'passed') as passed, count(*) filter (where i.status = 'failed') as failed,
  coalesce(sum(i.rejected_qty), 0) as rejected_qty, coalesce(sum(i.quantity), 0) as inspected_qty,
  round(100.0 * count(*) filter (where i.status = 'passed') / nullif(count(*), 0), 1) as first_pass_yield_pct
from public.inspections i where i.inspected_at is not null group by i.organization_id, i.inspected_at::date;

create or replace view public.purchasing_daily_view with (security_invoker = true) as
select organization_id, order_date as day, count(*) as orders, coalesce(sum(total_amount), 0) as total
from public.purchase_orders where status not in ('draft', 'cancelled') group by organization_id, order_date;

create or replace view public.sales_daily_view with (security_invoker = true) as
select organization_id, order_date as day, count(*) as orders, coalesce(sum(total_amount), 0) as total
from public.sales_orders where status not in ('draft', 'cancelled') group by organization_id, order_date;

create or replace view public.partner_balances_view with (security_invoker = true) as
select p.organization_id, p.id as partner_id, p.name, p.kinds, p.credit_limit,
  coalesce((select sum(i.total_amount - i.paid_amount) from public.sales_invoices i where i.customer_id = p.id and i.status = 'posted'), 0) as receivable,
  coalesce((select sum(i.total_amount - i.paid_amount) from public.sales_invoices i where i.customer_id = p.id and i.status = 'posted' and i.due_date < current_date and i.payment_status <> 'paid'), 0) as receivable_overdue,
  coalesce((select sum(i.total_amount - i.paid_amount) from public.supplier_invoices i where i.supplier_id = p.id and i.status = 'posted'), 0) as payable,
  coalesce((select sum(i.total_amount - i.paid_amount) from public.supplier_invoices i where i.supplier_id = p.id and i.status = 'posted' and i.due_date < current_date and i.payment_status <> 'paid'), 0) as payable_overdue
from public.partners p;

create or replace view public.production_progress_view with (security_invoker = true) as
select po.organization_id, po.id as production_order_id, po.number, po.item_id, po.quantity, po.produced_qty, po.scrap_qty, po.status, po.planned_start, po.planned_end,
  round(100.0 * least(po.produced_qty / nullif(po.quantity, 0), 1), 1) as progress_pct,
  (po.planned_end < current_date and po.status in ('released', 'in_progress', 'paused')) as is_late
from public.production_orders po;

create or replace view public.production_material_shortages_view with (security_invoker = true) as
select m.organization_id, m.production_order_id, po.number, m.item_id, m.required_qty - m.issued_qty as remaining_qty,
  coalesce(s.on_hand, 0) as on_hand, greatest(m.required_qty - m.issued_qty - coalesce(s.on_hand, 0), 0) as shortage
from public.production_order_materials m join public.production_orders po on po.id = m.production_order_id
left join (select item_id, sum(on_hand) as on_hand from public.inventory_stock_view group by item_id) s on s.item_id = m.item_id
where po.status in ('released', 'in_progress', 'paused', 'planned') and m.required_qty - m.issued_qty > coalesce(s.on_hand, 0);

create or replace view public.production_costs_view with (security_invoker = true) as
select c.*, po.number, po.item_id from public.production_cost_snapshots c join public.production_orders po on po.id = c.production_order_id;

-- ───────── daily inventory snapshot ─────────
create table public.inventory_snapshots_daily (
  organization_id text not null references public.organizations (id) on delete cascade,
  day date not null,
  total_value numeric(18, 2) not null default 0,
  items_in_stock int not null default 0,
  low_stock_items int not null default 0,
  primary key (organization_id, day)
);
select public._readonly('inventory_snapshots_daily');

create or replace function public.snapshot_inventory(p_org text default null)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  insert into public.inventory_snapshots_daily (organization_id, day, total_value, items_in_stock, low_stock_items)
  select o.id, current_date,
    coalesce((select sum(l.remaining_qty * l.unit_cost) from public.stock_valuation_layers l where l.organization_id = o.id and l.remaining_qty > 0), 0),
    coalesce((select count(distinct b.item_id) from public.inventory_balances b where b.organization_id = o.id and b.quantity > 0 and b.bucket = 'available'), 0),
    coalesce((select count(*) from (select i.id from public.items i left join public.inventory_balances b on b.item_id = i.id and b.bucket = 'available'
               where i.organization_id = o.id and i.active and i.item_type <> 'service' group by i.id, i.reorder_point having i.reorder_point > 0 and coalesce(sum(b.quantity), 0) <= i.reorder_point) x), 0)
  from public.organizations o where p_org is null or o.id = p_org
  on conflict (organization_id, day) do update set total_value = excluded.total_value, items_in_stock = excluded.items_in_stock, low_stock_items = excluded.low_stock_items;
  get diagnostics n = row_count;
  return n;
end $$;

-- ───────── dashboard KPIs (single round trip) ─────────
create or replace function public.dashboard_kpis(p_org text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.is_member(p_org) then raise exception 'Accès refusé.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'inventory_value', coalesce((select sum(remaining_qty * unit_cost) from public.stock_valuation_layers where organization_id = p_org and remaining_qty > 0), 0),
    'items_count', (select count(*) from public.items where organization_id = p_org and active),
    'low_stock_count', (select count(*) from public.item_stock_summary where organization_id = p_org and low_stock and active),
    'open_purchase_orders', (select count(*) from public.purchase_orders where organization_id = p_org and status in ('approved', 'ordered', 'partially_received')),
    'pending_approvals', (select count(*) from public.approval_requests where organization_id = p_org and status = 'pending'),
    'open_sales_orders', (select count(*) from public.sales_orders where organization_id = p_org and status in ('confirmed', 'partially_delivered')),
    'sales_30d', coalesce((select sum(total_amount) from public.sales_orders where organization_id = p_org and status not in ('draft', 'cancelled') and order_date >= current_date - 30), 0),
    'purchases_30d', coalesce((select sum(total_amount) from public.purchase_orders where organization_id = p_org and status not in ('draft', 'cancelled') and order_date >= current_date - 30), 0),
    'production_in_progress', (select count(*) from public.production_orders where organization_id = p_org and status in ('released', 'in_progress', 'paused')),
    'production_late', (select count(*) from public.production_orders where organization_id = p_org and status in ('released', 'in_progress', 'paused') and planned_end < current_date),
    'produced_7d', coalesce((select sum(quantity) from public.production_outputs where organization_id = p_org and kind = 'finished' and reported_at >= now() - interval '7 days'), 0),
    'scrap_7d', coalesce((select sum(quantity) from public.production_scrap where organization_id = p_org and reported_at >= now() - interval '7 days'), 0),
    'open_ncr', (select count(*) from public.non_conformances where organization_id = p_org and status in ('open', 'investigating', 'contained')),
    'overdue_capa', (select count(*) from public.capa_actions where organization_id = p_org and status in ('open', 'in_progress') and due_date < current_date),
    'pending_inspections', (select count(*) from public.inspections where organization_id = p_org and status in ('pending', 'in_progress')),
    'open_breakdowns', (select count(*) from public.maintenance_work_orders where organization_id = p_org and breakdown and status in ('open', 'assigned', 'in_progress')),
    'machines_stopped', (select count(*) from public.assets where organization_id = p_org and status = 'stopped'),
    'preventive_due', (select count(*) from public.maintenance_plans where organization_id = p_org and active and next_due_date <= current_date + 7),
    'downtime_minutes_7d', coalesce((select sum(minutes) from public.production_downtime where organization_id = p_org and started_at >= now() - interval '7 days'), 0),
    'receivable', coalesce((select sum(total_amount - paid_amount) from public.sales_invoices where organization_id = p_org and status = 'posted'), 0),
    'receivable_overdue', coalesce((select sum(total_amount - paid_amount) from public.sales_invoices where organization_id = p_org and status = 'posted' and due_date < current_date and payment_status <> 'paid'), 0),
    'payable', coalesce((select sum(total_amount - paid_amount) from public.supplier_invoices where organization_id = p_org and status = 'posted'), 0),
    'cash_balance', coalesce((select sum(case when kind = 'in' then amount else -amount end) from public.cash_movements where organization_id = p_org), 0),
    'open_tasks', (select count(*) from public.warehouse_tasks where organization_id = p_org and status in ('open', 'in_progress')),
    'expiring_lots', (select count(*) from public.lots where organization_id = p_org and expires_on between current_date and current_date + 30 and status = 'available'),
    'unread_notifications', (select count(*) from public.notifications where organization_id = p_org and user_id = (select auth.uid()) and read_at is null)
  ) into r;
  return r;
end $$;

-- ───────── traceability ─────────
create or replace function public.trace_forward(p_lot text)
returns table (level int, node_type text, node_id text, label text, lot_id text, partner_id text, quantity numeric, ref_date date)
language plpgsql stable security definer set search_path = '' as $$
declare org text;
begin
  select organization_id into org from public.lots where id = p_lot;
  if org is null or not public.is_member(org) then raise exception 'Lot introuvable.' using errcode = '42501'; end if;
  return query
  with recursive chain (lvl, lot, via_po) as (
    select 0, p_lot, null::text
    union
    select c.lvl + 1, g.child_lot_id, g.production_order_id from chain c join public.lot_genealogy g on g.parent_lot_id = c.lot where c.lvl < 8
  )
  select c.lvl, 'lot'::text, l.id, l.lot_number || ' (' || i.sku || ')', l.id, null::text, null::numeric, l.received_on
    from chain c join public.lots l on l.id = c.lot join public.items i on i.id = l.item_id
  union all
  select c.lvl, 'production_order', po.id, po.number, c.lot, null, po.produced_qty, po.actual_start::date from chain c join public.production_orders po on po.id = c.via_po where c.via_po is not null
  union all
  select c.lvl + 1, 'delivery', d.id, d.number, c.lot, d.customer_id, dl.base_quantity, d.delivery_date
    from chain c join public.delivery_lines dl on dl.lot_id = c.lot join public.deliveries d on d.id = dl.delivery_id and d.status = 'posted'
  order by 1;
end $$;

create or replace function public.trace_backward(p_lot text)
returns table (level int, node_type text, node_id text, label text, lot_id text, partner_id text, quantity numeric, ref_date date)
language plpgsql stable security definer set search_path = '' as $$
declare org text;
begin
  select organization_id into org from public.lots where id = p_lot;
  if org is null or not public.is_member(org) then raise exception 'Lot introuvable.' using errcode = '42501'; end if;
  return query
  with recursive chain (lvl, lot, via_po) as (
    select 0, p_lot, null::text
    union
    select c.lvl + 1, g.parent_lot_id, g.production_order_id from chain c join public.lot_genealogy g on g.child_lot_id = c.lot where c.lvl < 8
  )
  select c.lvl, 'lot'::text, l.id, l.lot_number || ' (' || i.sku || ')', l.id, l.supplier_id, null::numeric, l.received_on
    from chain c join public.lots l on l.id = c.lot join public.items i on i.id = l.item_id
  union all
  select c.lvl, 'production_order', po.id, po.number, c.lot, null, po.produced_qty, po.actual_start::date from public.production_outputs o join chain c on c.lot = o.lot_id join public.production_orders po on po.id = o.production_order_id
  union all
  select c.lvl, 'receipt', r.id, r.number, c.lot, r.supplier_id, rl.base_quantity, r.received_on
    from chain c join public.purchase_receipt_lines rl on rl.lot_id = c.lot join public.purchase_receipts r on r.id = rl.receipt_id and r.status = 'posted'
  order by 1;
end $$;

create table public.recalls (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  lot_id text not null references public.lots (id),
  reason text not null,
  severity text not null default 'major' check (severity in ('minor', 'major', 'critical')),
  status text not null default 'open' check (status in ('open', 'notified', 'closed')),
  closed_at timestamptz,
  notes text
);
create unique index recalls_number_key on public.recalls (organization_id, number);
select public._secure('recalls', 'quality.manage');
create trigger assign_number before insert on public.recalls for each row execute function public.assign_document_number('recall');

create table public.recall_items (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  recall_id text not null references public.recalls (id) on delete cascade,
  node_type text not null,
  node_id text not null,
  label text,
  lot_id text references public.lots (id) on delete set null,
  partner_id text references public.partners (id) on delete set null,
  quantity numeric(18, 4),
  notified boolean not null default false
);
create index recall_items_recall_idx on public.recall_items (recall_id);
select public._secure('recall_items', 'quality.manage');

create or replace function public.open_recall(p_lot text, p_reason text, p_severity text default 'major')
returns text language plpgsql security definer set search_path = '' as $$
declare org text; rid text; t record; n int;
begin
  select organization_id into org from public.lots where id = p_lot;
  if org is null then raise exception 'Lot introuvable.' using errcode = '22023'; end if;
  perform public._require(org, 'quality.manage');
  insert into public.recalls (organization_id, lot_id, reason, severity) values (org, p_lot, p_reason, p_severity) returning id into rid;
  for t in select * from public.trace_forward(p_lot) loop
    if t.node_type in ('delivery', 'lot') then
      insert into public.recall_items (organization_id, recall_id, node_type, node_id, label, lot_id, partner_id, quantity) values (org, rid, t.node_type, t.node_id, t.label, t.lot_id, t.partner_id, t.quantity);
    end if;
  end loop;
  update public.lots set status = 'blocked' where organization_id = org and id in (select lot_id from public.recall_items where recall_id = rid and node_type = 'lot') or id = p_lot;
  select count(*) into n from public.recall_items where recall_id = rid and node_type = 'delivery';
  perform public.notify(org, 'quality.recall', 'Rappel de lot ouvert', p_reason || ' — ' || n || ' livraison(s) concernée(s)', 'qualite/rappels', 'critical', array['quality_manager']::public.org_role[]);
  perform public.emit_event(org, 'quality.recall.opened', 'recall', rid, jsonb_build_object('lot_id', p_lot, 'deliveries', n));
  return rid;
end $$;

revoke execute on function public.snapshot_inventory(text) from public, anon, authenticated;
revoke execute on function public.dashboard_kpis(text), public.trace_forward(text), public.trace_backward(text), public.open_recall(text, text, text) from public, anon;
grant execute on function public.dashboard_kpis(text), public.trace_forward(text), public.trace_backward(text), public.open_recall(text, text, text) to authenticated;
grant select on public.inventory_stock_view, public.item_stock_summary, public.stock_aging_view, public.slow_moving_view, public.purchase_price_history_view, public.supplier_performance_view,
  public.sales_margin_view, public.order_otif_view, public.production_daily_view, public.machine_downtime_daily_view, public.asset_reliability_view, public.oee_daily_view,
  public.quality_daily_view, public.purchasing_daily_view, public.sales_daily_view, public.partner_balances_view, public.production_progress_view,
  public.production_material_shortages_view, public.production_costs_view to authenticated;
