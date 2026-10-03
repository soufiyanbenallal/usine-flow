-- Demand / consumption views feeding ABC classification, turnover, forecasting and the AI layer.

create or replace view public.item_consumption_view with (security_invoker = true) as
select organization_id, item_id,
  coalesce(sum(-value) filter (where quantity < 0), 0) as consumption_value,
  coalesce(sum(-quantity) filter (where quantity < 0), 0) as consumption_qty
from public.inventory_movements
where occurred_at >= now() - interval '365 days' and movement_type in ('sale', 'production_consume', 'issue', 'maintenance_consume')
group by organization_id, item_id;

create or replace view public.item_demand_monthly_view with (security_invoker = true) as
select organization_id, item_id, date_trunc('month', occurred_at)::date as month, sum(-quantity) as quantity, sum(-value) as value
from public.inventory_movements
where quantity < 0 and movement_type in ('sale', 'production_consume', 'issue')
group by organization_id, item_id, date_trunc('month', occurred_at)::date;

create or replace view public.downtime_by_reason_view with (security_invoker = true) as
select d.organization_id, d.work_center_id, coalesce(r.label, d.category) as reason, d.category, sum(d.minutes) as minutes, count(*) as events
from public.production_downtime d left join public.reason_codes r on r.id = d.reason_id
where d.started_at >= now() - interval '90 days'
group by d.organization_id, d.work_center_id, coalesce(r.label, d.category), d.category;

grant select on public.item_consumption_view, public.item_demand_monthly_view, public.downtime_by_reason_view to authenticated;
