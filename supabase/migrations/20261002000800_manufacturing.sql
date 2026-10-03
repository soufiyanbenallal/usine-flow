-- Manufacturing: work centers, BOMs (versioned), routings, production orders, shop floor, MRP, costing.

create table public.work_centers (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  facility_id text references public.facilities (id) on delete set null,
  code text not null,
  name text not null,
  kind text not null default 'machine' check (kind in ('machine', 'manual', 'assembly', 'packaging', 'quality', 'subcontract')),
  capacity_hours_per_day numeric(6, 2) not null default 8 check (capacity_hours_per_day > 0),
  efficiency_pct numeric(5, 2) not null default 100 check (efficiency_pct > 0),
  hourly_machine_cost numeric(12, 2) not null default 0,
  hourly_labor_cost numeric(12, 2) not null default 0,
  overhead_rate_pct numeric(6, 2) not null default 0,
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('work_centers', 'production.write');
alter table public.assets add constraint assets_work_center_fk foreign key (work_center_id) references public.work_centers (id) on delete set null;

-- ───────── BOM ─────────
create table public.boms (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  code text not null,
  name text not null,
  active boolean not null default true,
  unique (organization_id, code)
);
create index boms_item_idx on public.boms (organization_id, item_id);
select public._secure('boms', 'production.write');

create table public.bom_versions (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  bom_id text not null references public.boms (id) on delete cascade,
  version int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'active', 'obsolete')),
  effective_from date,
  effective_to date,
  base_quantity numeric(18, 4) not null default 1 check (base_quantity > 0),
  change_note text,
  unique (bom_id, version)
);
select public._secure('bom_versions', 'production.write');
create unique index bom_versions_one_active_key on public.bom_versions (bom_id) where status = 'active';

create table public.bom_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  version_id text not null references public.bom_versions (id) on delete cascade,
  component_item_id text not null references public.items (id),
  quantity numeric(18, 6) not null check (quantity > 0),
  uom_id text references public.uoms (id),
  scrap_pct numeric(6, 2) not null default 0 check (scrap_pct >= 0),
  kind text not null default 'component' check (kind in ('component', 'co_product', 'by_product')),
  alternative_group text,
  is_alternative boolean not null default false,
  operation_seq int,
  notes text
);
create index bom_lines_version_idx on public.bom_lines (version_id);
create index bom_lines_component_idx on public.bom_lines (organization_id, component_item_id);
select public._secure('bom_lines', 'production.write');

create or replace function public.guard_bom_line()
returns trigger language plpgsql security definer set search_path = '' as $$
declare parent_item text; st text; cyc boolean;
begin
  select b.item_id, v.status into parent_item, st from public.bom_versions v join public.boms b on b.id = v.bom_id where v.id = new.version_id;
  if tg_op <> 'DELETE' and new.component_item_id = parent_item and new.kind = 'component' then
    raise exception 'Un article ne peut pas être son propre composant.' using errcode = '23514';
  end if;
  if new.kind = 'component' then
    with recursive tree as (
      select bl.component_item_id as item_id from public.bom_lines bl join public.bom_versions v on v.id = bl.version_id and v.status = 'active'
        join public.boms b on b.id = v.bom_id and b.item_id = new.component_item_id where bl.kind = 'component'
      union
      select bl.component_item_id from public.bom_lines bl join public.bom_versions v on v.id = bl.version_id and v.status = 'active'
        join public.boms b on b.id = v.bom_id join tree t on t.item_id = b.item_id where bl.kind = 'component'
    ) select exists (select 1 from tree where item_id = parent_item) into cyc;
    if cyc then raise exception 'Nomenclature circulaire détectée.' using errcode = '23514'; end if;
  end if;
  return new;
end $$;
create trigger guard before insert or update on public.bom_lines for each row execute function public.guard_bom_line();
create trigger lock_lines before insert or update or delete on public.bom_lines for each row execute function public.lock_lines_unless_draft('bom_versions', 'version_id');

-- ───────── routings ─────────
create table public.routings (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text references public.items (id) on delete cascade,
  code text not null,
  name text not null,
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('routings', 'production.write');

create table public.routing_operations (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  routing_id text not null references public.routings (id) on delete cascade,
  seq int not null default 10,
  name text not null,
  work_center_id text references public.work_centers (id) on delete set null,
  setup_minutes numeric(10, 2) not null default 0,
  run_minutes_per_unit numeric(10, 4) not null default 0,
  move_minutes numeric(10, 2) not null default 0,
  queue_minutes numeric(10, 2) not null default 0,
  labor_count int not null default 1 check (labor_count >= 0),
  required_skill_id text references public.skills (id) on delete set null,
  instructions text,
  unique (routing_id, seq)
);
select public._secure('routing_operations', 'production.write');

-- ───────── production orders ─────────
create table public.production_orders (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  item_id text not null references public.items (id),
  quantity numeric(18, 4) not null check (quantity > 0),
  bom_version_id text references public.bom_versions (id) on delete set null,
  routing_id text references public.routings (id) on delete set null,
  warehouse_id text not null references public.warehouses (id),
  output_location_id text references public.locations (id) on delete set null,
  sales_order_id text references public.sales_orders (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'planned', 'released', 'in_progress', 'paused', 'completed', 'closed', 'cancelled')),
  priority int not null default 3 check (priority between 1 and 5),
  source text not null default 'manual' check (source in ('manual', 'mrp', 'sales', 'maintenance')),
  planned_start date,
  planned_end date,
  actual_start timestamptz,
  actual_end timestamptz,
  produced_qty numeric(18, 4) not null default 0,
  scrap_qty numeric(18, 4) not null default 0,
  lot_number text,
  total_amount numeric(18, 2) not null default 0,
  notes text
);
create unique index production_orders_number_key on public.production_orders (organization_id, number);
create index production_orders_status_idx on public.production_orders (organization_id, status);
create index production_orders_item_idx on public.production_orders (organization_id, item_id);
create index production_orders_so_idx on public.production_orders (sales_order_id) where sales_order_id is not null;
select public._secure('production_orders', 'production.write');
create trigger assign_number before insert on public.production_orders for each row execute function public.assign_document_number('production_order');

create table public.production_order_materials (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  production_order_id text not null references public.production_orders (id) on delete cascade,
  bom_line_id text references public.bom_lines (id) on delete set null,
  item_id text not null references public.items (id),
  required_qty numeric(18, 4) not null check (required_qty >= 0),
  issued_qty numeric(18, 4) not null default 0,
  warehouse_id text references public.warehouses (id),
  backflush boolean not null default true,
  lot_id text references public.lots (id) on delete set null
);
create index production_order_materials_po_idx on public.production_order_materials (production_order_id);
create index production_order_materials_item_idx on public.production_order_materials (organization_id, item_id);
select public._secure('production_order_materials', 'production.write');

create table public.production_order_operations (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  production_order_id text not null references public.production_orders (id) on delete cascade,
  routing_operation_id text references public.routing_operations (id) on delete set null,
  seq int not null default 10,
  name text not null,
  work_center_id text references public.work_centers (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'running', 'paused', 'done', 'skipped')),
  planned_qty numeric(18, 4) not null default 0,
  done_qty numeric(18, 4) not null default 0,
  scrap_qty numeric(18, 4) not null default 0,
  setup_minutes numeric(10, 2) not null default 0,
  run_minutes_per_unit numeric(10, 4) not null default 0,
  planned_minutes numeric(12, 2) not null default 0,
  accumulated_minutes numeric(12, 2) not null default 0,
  resumed_at timestamptz,
  labor_count int not null default 1,
  operator_id text references public.employees (id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  unique (production_order_id, seq)
);
create index production_order_operations_wc_idx on public.production_order_operations (organization_id, work_center_id, status);
select public._secure('production_order_operations', 'production.report');

create table public.production_outputs (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  production_order_id text not null references public.production_orders (id) on delete cascade,
  operation_id text references public.production_order_operations (id) on delete set null,
  item_id text not null references public.items (id),
  kind text not null default 'finished' check (kind in ('finished', 'co_product', 'by_product', 'rework')),
  quantity numeric(18, 4) not null check (quantity > 0),
  lot_id text references public.lots (id) on delete set null,
  warehouse_id text references public.warehouses (id),
  location_id text references public.locations (id),
  movement_id text,
  unit_cost numeric(18, 4) not null default 0,
  reported_by uuid default auth.uid(),
  reported_at timestamptz not null default now()
);
create index production_outputs_po_idx on public.production_outputs (production_order_id);
select public._readonly('production_outputs');

create table public.production_consumptions (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  production_order_id text not null references public.production_orders (id) on delete cascade,
  material_id text references public.production_order_materials (id) on delete set null,
  item_id text not null references public.items (id),
  lot_id text references public.lots (id) on delete set null,
  quantity numeric(18, 4) not null,
  unit_cost numeric(18, 4) not null default 0,
  value numeric(18, 4) not null default 0,
  backflush boolean not null default false,
  movement_id text,
  consumed_at timestamptz not null default now()
);
create index production_consumptions_po_idx on public.production_consumptions (production_order_id);
create index production_consumptions_lot_idx on public.production_consumptions (lot_id) where lot_id is not null;
select public._readonly('production_consumptions');

create table public.production_scrap (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  production_order_id text not null references public.production_orders (id) on delete cascade,
  operation_id text references public.production_order_operations (id) on delete set null,
  item_id text not null references public.items (id),
  quantity numeric(18, 4) not null check (quantity > 0),
  reason_id text references public.reason_codes (id) on delete set null,
  unit_cost numeric(18, 4) not null default 0,
  cost numeric(18, 2) not null default 0,
  notes text,
  reported_by uuid default auth.uid(),
  reported_at timestamptz not null default now()
);
create index production_scrap_po_idx on public.production_scrap (production_order_id);
select public._readonly('production_scrap');

create table public.production_downtime (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  production_order_id text references public.production_orders (id) on delete set null,
  operation_id text references public.production_order_operations (id) on delete set null,
  work_center_id text references public.work_centers (id) on delete set null,
  asset_id text references public.assets (id) on delete set null,
  category text not null default 'other' check (category in ('breakdown', 'setup', 'material', 'planned', 'quality', 'other')),
  reason_id text references public.reason_codes (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes int not null default 0,
  maintenance_work_order_id text references public.maintenance_work_orders (id) on delete set null,
  notes text
);
create index production_downtime_wc_idx on public.production_downtime (organization_id, work_center_id, started_at desc);
create index production_downtime_open_idx on public.production_downtime (organization_id) where ended_at is null;
select public._secure('production_downtime', 'production.report');

create table public.production_cost_snapshots (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  production_order_id text not null unique references public.production_orders (id) on delete cascade,
  produced_qty numeric(18, 4) not null default 0,
  material_cost numeric(18, 2) not null default 0,
  labor_cost numeric(18, 2) not null default 0,
  machine_cost numeric(18, 2) not null default 0,
  overhead_cost numeric(18, 2) not null default 0,
  subcontract_cost numeric(18, 2) not null default 0,
  total_cost numeric(18, 2) not null default 0,
  unit_cost numeric(18, 4) not null default 0,
  standard_total numeric(18, 2) not null default 0,
  standard_unit numeric(18, 4) not null default 0,
  variance numeric(18, 2) not null default 0,
  material_variance numeric(18, 2) not null default 0,
  labor_variance numeric(18, 2) not null default 0,
  machine_variance numeric(18, 2) not null default 0,
  other_variance numeric(18, 2) not null default 0,
  computed_at timestamptz not null default now()
);
select public._readonly('production_cost_snapshots');

create table public.standard_cost_rolls (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  bom_version_id text references public.bom_versions (id) on delete set null,
  material numeric(18, 4) not null default 0,
  labor numeric(18, 4) not null default 0,
  machine numeric(18, 4) not null default 0,
  overhead numeric(18, 4) not null default 0,
  subcontract numeric(18, 4) not null default 0,
  total numeric(18, 4) not null default 0,
  computed_at timestamptz not null default now(),
  unique (organization_id, item_id)
);
select public._secure('standard_cost_rolls', 'production.write');

create table public.subcontract_orders (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  production_order_id text references public.production_orders (id) on delete set null,
  operation_id text references public.production_order_operations (id) on delete set null,
  partner_id text not null references public.partners (id),
  item_id text references public.items (id),
  description text,
  quantity numeric(18, 4) not null default 1 check (quantity > 0),
  unit_price numeric(18, 4) not null default 0 check (unit_price >= 0),
  total_amount numeric(18, 2) not null default 0,
  expected_date date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'received', 'cancelled')),
  notes text
);
create unique index subcontract_orders_number_key on public.subcontract_orders (organization_id, number);
select public._secure('subcontract_orders', 'production.write');
create trigger assign_number before insert on public.subcontract_orders for each row execute function public.assign_document_number('subcontract_order');
create or replace function public.compute_subcontract_total() returns trigger language plpgsql set search_path = '' as $$
begin new.total_amount := round(new.quantity * new.unit_price, 2); return new; end $$;
create trigger total before insert or update on public.subcontract_orders for each row execute function public.compute_subcontract_total();

-- late FKs for workforce logs
alter table public.time_logs add constraint time_logs_po_fk foreign key (production_order_id) references public.production_orders (id) on delete set null;
alter table public.time_logs add constraint time_logs_op_fk foreign key (operation_id) references public.production_order_operations (id) on delete set null;
alter table public.time_logs add constraint time_logs_wo_fk foreign key (work_order_id) references public.maintenance_work_orders (id) on delete set null;
alter table public.non_conformances add constraint ncr_po_fk foreign key (production_order_id) references public.production_orders (id) on delete set null;
alter table public.lot_genealogy add constraint genealogy_po_fk foreign key (production_order_id) references public.production_orders (id) on delete cascade;

-- ───────── MRP tables ─────────
create table public.mrp_runs (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  horizon_days int not null default 30,
  status text not null default 'completed' check (status in ('running', 'completed', 'failed')),
  params jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  suggestion_count int not null default 0,
  run_at timestamptz not null default now()
);
select public._secure('mrp_runs', 'planning.run');

create table public.mrp_suggestions (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  run_id text not null references public.mrp_runs (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  kind text not null check (kind in ('purchase', 'production')),
  need_date date not null,
  gross_qty numeric(18, 4) not null default 0,
  net_qty numeric(18, 4) not null default 0,
  suggested_qty numeric(18, 4) not null check (suggested_qty > 0),
  supplier_id text references public.partners (id) on delete set null,
  reason text,
  status text not null default 'open' check (status in ('open', 'converted', 'dismissed')),
  converted_ref_type text,
  converted_ref_id text
);
create index mrp_suggestions_run_idx on public.mrp_suggestions (run_id);
create index mrp_suggestions_open_idx on public.mrp_suggestions (organization_id, status);
select public._secure('mrp_suggestions', 'planning.run');

-- ───────── BOM functions ─────────
create or replace function public.activate_bom_version(p_version text)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.bom_versions;
begin
  select * into v from public.bom_versions where id = p_version for update;
  if not found then raise exception 'Version introuvable.' using errcode = '22023'; end if;
  perform public._require(v.organization_id, 'production.write');
  if v.status <> 'draft' then raise exception 'Seule une version brouillon peut être activée.' using errcode = '22023'; end if;
  if not exists (select 1 from public.bom_lines where version_id = p_version and kind = 'component') then raise exception 'La nomenclature ne contient aucun composant.' using errcode = '22023'; end if;
  update public.bom_versions set status = 'obsolete', effective_to = coalesce(effective_to, current_date) where bom_id = v.bom_id and status = 'active';
  update public.bom_versions set status = 'active', effective_from = coalesce(effective_from, current_date) where id = p_version;
  update public.items set is_manufactured = true where id = (select item_id from public.boms where id = v.bom_id);
  perform public.emit_event(v.organization_id, 'bom.version.activated', 'bom_version', p_version, jsonb_build_object('bom_id', v.bom_id, 'version', v.version));
end $$;

-- Engineering change: copies the current version into a new draft.
create or replace function public.new_bom_version(p_bom text, p_change_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare b public.boms; src public.bom_versions; nid text; nv int;
begin
  select * into b from public.boms where id = p_bom;
  if not found then raise exception 'Nomenclature introuvable.' using errcode = '22023'; end if;
  perform public._require(b.organization_id, 'production.write');
  select coalesce(max(version), 0) + 1 into nv from public.bom_versions where bom_id = p_bom;
  select * into src from public.bom_versions where bom_id = p_bom order by (status = 'active') desc, version desc limit 1;
  insert into public.bom_versions (organization_id, bom_id, version, status, base_quantity, change_note)
  values (b.organization_id, p_bom, nv, 'draft', coalesce(src.base_quantity, 1), p_change_note) returning id into nid;
  if src.id is not null then
    insert into public.bom_lines (organization_id, version_id, component_item_id, quantity, uom_id, scrap_pct, kind, alternative_group, is_alternative, operation_seq, notes)
    select organization_id, nid, component_item_id, quantity, uom_id, scrap_pct, kind, alternative_group, is_alternative, operation_seq, notes from public.bom_lines where version_id = src.id;
  end if;
  return nid;
end $$;

-- ───────── production helpers ─────────
create or replace function public._po_costs(p_po text)
returns table (material numeric, labor numeric, machine numeric, overhead numeric, subcontract numeric)
language plpgsql stable security definer set search_path = '' as $$
declare lab_logs numeric; lab_ops numeric;
begin
  select coalesce(sum(value), 0) into material from public.production_consumptions where production_order_id = p_po;
  select coalesce(sum(cost), 0) into lab_logs from public.time_logs where production_order_id = p_po;
  select coalesce(sum(op.accumulated_minutes / 60.0 * op.labor_count * wc.hourly_labor_cost), 0),
         coalesce(sum(op.accumulated_minutes / 60.0 * wc.hourly_machine_cost), 0),
         coalesce(sum(op.accumulated_minutes / 60.0 * (wc.hourly_machine_cost + op.labor_count * wc.hourly_labor_cost) * wc.overhead_rate_pct / 100.0), 0)
    into lab_ops, machine, overhead
    from public.production_order_operations op join public.work_centers wc on wc.id = op.work_center_id where op.production_order_id = p_po;
  labor := case when lab_logs > 0 then lab_logs else lab_ops end;
  select coalesce(sum(total_amount), 0) into subcontract from public.subcontract_orders where production_order_id = p_po and status = 'received';
  material := round(material, 2); labor := round(labor, 2); machine := round(machine, 2); overhead := round(overhead, 2); subcontract := round(subcontract, 2);
  return next;
end $$;

create or replace function public._consume_material(p_po text, p_material text, p_qty numeric, p_lot text, p_backflush boolean)
returns numeric language plpgsql security definer set search_path = '' as $$
declare po public.production_orders; m public.production_order_materials; a record; mid text; v numeric; total numeric := 0; n int := 0; wh text; res record; left_qty numeric; take numeric;
begin
  select * into po from public.production_orders where id = p_po;
  select * into m from public.production_order_materials where id = p_material and production_order_id = p_po for update;
  if not found then raise exception 'Matière introuvable pour cet ordre.' using errcode = '22023'; end if;
  wh := coalesce(m.warehouse_id, po.warehouse_id);
  -- free this order's reservation first so its own stock is available
  left_qty := p_qty;
  for res in select * from public.inventory_reservations where source_type = 'production_order' and source_id = p_po and item_id = m.item_id and status = 'active' order by created_at for update loop
    exit when left_qty <= 0;
    take := least(res.quantity, left_qty);
    if take >= res.quantity then update public.inventory_reservations set status = 'fulfilled' where id = res.id; else update public.inventory_reservations set quantity = quantity - take where id = res.id; end if;
    left_qty := left_qty - take;
  end loop;
  for a in select * from public.allocate_stock(po.organization_id, m.item_id, wh, p_qty, coalesce(p_lot, m.lot_id)) loop
    n := n + 1;
    mid := public.post_stock_movement(po.organization_id, 'production_consume', m.item_id, wh, -a.qty, a.location_id, a.lot_id, 'available', null,
             'production_orders', p_po, p_material, null, po.number);
    select -value into v from public.inventory_movements where id = mid;
    insert into public.production_consumptions (organization_id, production_order_id, material_id, item_id, lot_id, quantity, unit_cost, value, backflush, movement_id)
    values (po.organization_id, p_po, p_material, m.item_id, a.lot_id, a.qty, coalesce(v / nullif(a.qty, 0), 0), coalesce(v, 0), p_backflush, mid);
    total := total + coalesce(v, 0);
  end loop;
  update public.production_order_materials set issued_qty = issued_qty + p_qty where id = p_material;
  return total;
end $$;

-- ───────── release ─────────
create or replace function public.release_production_order(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare po public.production_orders; v public.bom_versions; l record; req numeric; rop record; ops int := 0; avail numeric; fac numeric; it public.items; wc_ok boolean;
begin
  select * into po from public.production_orders where id = p_id for update;
  if not found then raise exception 'Ordre introuvable.' using errcode = '22023'; end if;
  perform public._require(po.organization_id, 'production.start');
  if po.status not in ('draft', 'approved', 'planned') then raise exception 'Cet ordre ne peut pas être lancé (statut : %).', po.status using errcode = '22023'; end if;
  if not public.approval_satisfied(po.organization_id, 'production_order', p_id, po.total_amount) then raise exception 'Approbation requise avant lancement.' using errcode = 'P0001'; end if;
  if exists (select 1 from public.production_order_materials where production_order_id = p_id) then raise exception 'Cet ordre a déjà été lancé.' using errcode = '22023'; end if;
  select * into it from public.items where id = po.item_id;
  if po.bom_version_id is null then
    select v2.* into v from public.bom_versions v2 join public.boms b on b.id = v2.bom_id
     where b.organization_id = po.organization_id and b.item_id = po.item_id and v2.status = 'active' and b.active
       and (v2.effective_from is null or v2.effective_from <= current_date) and (v2.effective_to is null or v2.effective_to >= current_date) limit 1;
  else
    select * into v from public.bom_versions where id = po.bom_version_id;
  end if;
  if v.id is null then raise exception 'Aucune nomenclature active pour l’article %.', it.sku using errcode = '22023'; end if;
  if v.status = 'draft' then raise exception 'La version de nomenclature est encore en brouillon.' using errcode = '22023'; end if;
  insert into public.production_order_materials (organization_id, production_order_id, bom_line_id, item_id, required_qty, warehouse_id, backflush)
  select po.organization_id, p_id, bl.id, bl.component_item_id,
         round(bl.quantity * public.item_uom_factor(bl.component_item_id, bl.uom_id) / v.base_quantity * po.quantity * (1 + bl.scrap_pct / 100), 4), po.warehouse_id, true
    from public.bom_lines bl where bl.version_id = v.id and bl.kind = 'component' and not bl.is_alternative;
  if po.routing_id is null then
    select r.id into po.routing_id from public.routings r where r.organization_id = po.organization_id and r.item_id = po.item_id and r.active limit 1;
  end if;
  if po.routing_id is not null then
    for rop in select * from public.routing_operations where routing_id = po.routing_id order by seq loop
      ops := ops + 1;
      insert into public.production_order_operations (organization_id, production_order_id, routing_operation_id, seq, name, work_center_id, planned_qty, setup_minutes, run_minutes_per_unit, planned_minutes, labor_count)
      values (po.organization_id, p_id, rop.id, rop.seq, rop.name, rop.work_center_id, po.quantity, rop.setup_minutes, rop.run_minutes_per_unit,
              rop.setup_minutes + rop.run_minutes_per_unit * po.quantity + rop.move_minutes + rop.queue_minutes, rop.labor_count);
    end loop;
  end if;
  if ops = 0 then
    insert into public.production_order_operations (organization_id, production_order_id, seq, name, planned_qty) values (po.organization_id, p_id, 10, 'Production', po.quantity);
  end if;
  for l in select * from public.production_order_materials where production_order_id = p_id loop
    avail := public.available_to_promise(po.organization_id, l.item_id, coalesce(l.warehouse_id, po.warehouse_id));
    if avail > 0 then
      perform public.reserve_stock(po.organization_id, l.item_id, coalesce(l.warehouse_id, po.warehouse_id), least(avail, l.required_qty), 'production_order', p_id, l.id);
    end if;
  end loop;
  update public.production_orders set status = 'released', bom_version_id = v.id, routing_id = po.routing_id, planned_start = coalesce(planned_start, current_date),
         planned_end = coalesce(planned_end, current_date + 7) where id = p_id;
  perform public.emit_event(po.organization_id, 'production.order.released', 'production_order', p_id, jsonb_build_object('number', po.number, 'item_id', po.item_id, 'quantity', po.quantity));
end $$;

-- ───────── shop floor ─────────
create or replace function public.start_production_operation(p_op text, p_employee text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare op public.production_order_operations; po public.production_orders; stopped int;
begin
  select * into op from public.production_order_operations where id = p_op for update;
  if not found then raise exception 'Opération introuvable.' using errcode = '22023'; end if;
  perform public._require(op.organization_id, 'production.report');
  select * into po from public.production_orders where id = op.production_order_id for update;
  if po.status not in ('released', 'in_progress', 'paused') then raise exception 'L’ordre de fabrication n’est pas lancé (statut : %).', po.status using errcode = '22023'; end if;
  if op.status = 'done' then raise exception 'Cette opération est terminée.' using errcode = '22023'; end if;
  if op.status = 'running' then return; end if;
  if op.work_center_id is not null then
    select count(*) into stopped from public.assets where work_center_id = op.work_center_id and status in ('stopped', 'maintenance') and active;
    if stopped > 0 then raise exception 'Une machine du poste de charge est à l’arrêt ou en maintenance.' using errcode = 'P0001'; end if;
  end if;
  update public.production_order_operations set status = 'running', started_at = coalesce(started_at, now()), resumed_at = now(), operator_id = coalesce(p_employee, operator_id) where id = p_op;
  update public.production_orders set status = 'in_progress', actual_start = coalesce(actual_start, now()) where id = po.id;
  if p_employee is not null then
    insert into public.time_logs (organization_id, employee_id, production_order_id, operation_id, started_at) values (op.organization_id, p_employee, po.id, p_op, now());
  end if;
  perform public.emit_event(op.organization_id, 'production.order.started', 'production_order', po.id, jsonb_build_object('operation_id', p_op));
end $$;

create or replace function public._stop_op_clock(p_op text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.production_order_operations set accumulated_minutes = accumulated_minutes + coalesce(round(extract(epoch from (now() - resumed_at)) / 60, 2), 0), resumed_at = null
   where id = p_op and resumed_at is not null;
end $$;

create or replace function public.pause_production_operation(p_op text, p_category text default 'other', p_reason text default null, p_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare op public.production_order_operations;
begin
  select * into op from public.production_order_operations where id = p_op for update;
  if not found then raise exception 'Opération introuvable.' using errcode = '22023'; end if;
  perform public._require(op.organization_id, 'production.report');
  if op.status <> 'running' then raise exception 'Cette opération n’est pas en cours.' using errcode = '22023'; end if;
  perform public._stop_op_clock(p_op);
  update public.production_order_operations set status = 'paused' where id = p_op;
  insert into public.production_downtime (organization_id, production_order_id, operation_id, work_center_id, category, reason_id, notes)
  values (op.organization_id, op.production_order_id, p_op, op.work_center_id, p_category, p_reason, p_notes);
  update public.production_orders set status = 'paused' where id = op.production_order_id and not exists
    (select 1 from public.production_order_operations o where o.production_order_id = op.production_order_id and o.status = 'running');
end $$;

create or replace function public.resume_production_operation(p_op text)
returns void language plpgsql security definer set search_path = '' as $$
declare op public.production_order_operations; dt record;
begin
  select * into op from public.production_order_operations where id = p_op for update;
  if not found then raise exception 'Opération introuvable.' using errcode = '22023'; end if;
  perform public._require(op.organization_id, 'production.report');
  if op.status <> 'paused' then raise exception 'Cette opération n’est pas en pause.' using errcode = '22023'; end if;
  if op.work_center_id is not null and exists (select 1 from public.assets where work_center_id = op.work_center_id and status in ('stopped', 'maintenance') and active) then
    raise exception 'Une machine du poste de charge est encore à l’arrêt.' using errcode = 'P0001';
  end if;
  for dt in select * from public.production_downtime where operation_id = p_op and ended_at is null and maintenance_work_order_id is null loop
    update public.production_downtime set ended_at = now(), minutes = greatest(round(extract(epoch from (now() - dt.started_at)) / 60)::int, 0) where id = dt.id;
  end loop;
  update public.production_order_operations set status = 'running', resumed_at = now() where id = p_op;
  update public.production_orders set status = 'in_progress' where id = op.production_order_id and status = 'paused';
end $$;

create or replace function public.post_production_output(p_po text, p_qty numeric, p_lot_number text default null, p_location text default null,
                                                         p_op text default null, p_kind text default 'finished')
returns text language plpgsql security definer set search_path = '' as $$
declare po public.production_orders; it public.items; m record; need numeric; lid text; bucket public.stock_bucket; cost numeric; unit numeric; mid text; c record;
        costs record; total_cost numeric; v public.bom_versions; bl record; extra numeric; oid text; ins text; remaining_to_make numeric;
begin
  select * into po from public.production_orders where id = p_po for update;
  if not found then raise exception 'Ordre introuvable.' using errcode = '22023'; end if;
  perform public._require(po.organization_id, 'production.report');
  if po.status not in ('released', 'in_progress', 'paused') then raise exception 'L’ordre de fabrication n’accepte pas de production (statut : %).', po.status using errcode = '22023'; end if;
  if p_qty <= 0 then raise exception 'Quantité invalide.' using errcode = '22023'; end if;
  select * into it from public.items where id = po.item_id;
  -- backflush materials proportionally
  for m in select * from public.production_order_materials where production_order_id = p_po and backflush loop
    need := round(m.required_qty * p_qty / po.quantity, 4);
    need := least(need, greatest(m.required_qty * 1.1 - m.issued_qty, 0));
    if need > 0 then perform public._consume_material(p_po, m.id, need, null, true); end if;
  end loop;
  lid := null;
  if it.tracking = 'lot' or p_lot_number is not null or po.lot_number is not null then
    lid := public._ensure_lot(po.organization_id, po.item_id, coalesce(p_lot_number, po.lot_number, 'LOT-' || po.number), null,
             case when it.expiry_tracking then current_date + 365 else null end, current_date, 'available', 'production_orders', p_po);
    for c in select lot_id, sum(quantity) as qty from public.production_consumptions where production_order_id = p_po and lot_id is not null group by lot_id loop
      insert into public.lot_genealogy (organization_id, parent_lot_id, child_lot_id, production_order_id, quantity) values (po.organization_id, c.lot_id, lid, p_po, c.qty)
      on conflict (parent_lot_id, child_lot_id, production_order_id) do update set quantity = excluded.quantity;
    end loop;
  end if;
  select * into costs from public._po_costs(p_po);
  total_cost := costs.material + costs.labor + costs.machine + costs.overhead + costs.subcontract;
  unit := case when p_kind = 'finished' then round(total_cost / greatest(po.produced_qty + p_qty, 1), 4) else 0 end;
  if it.valuation_method = 'standard' and it.standard_cost > 0 then unit := it.standard_cost; end if;
  bucket := case when it.requires_inspection then 'quarantine' else 'available' end;
  mid := public.post_stock_movement(po.organization_id, 'production_output', po.item_id, po.warehouse_id, p_qty, coalesce(p_location, po.output_location_id), lid, bucket, nullif(unit, 0),
           'production_orders', p_po, p_op, null, po.number);
  insert into public.production_outputs (organization_id, production_order_id, operation_id, item_id, kind, quantity, lot_id, warehouse_id, location_id, movement_id, unit_cost)
  values (po.organization_id, p_po, p_op, po.item_id, p_kind, p_qty, lid, po.warehouse_id, coalesce(p_location, po.output_location_id), mid, unit) returning id into oid;
  update public.production_orders set produced_qty = produced_qty + case when p_kind = 'finished' then p_qty else 0 end,
         status = case when status = 'released' then 'in_progress' else status end, actual_start = coalesce(actual_start, now()) where id = p_po;
  -- co-products / by-products from the BOM
  if p_kind = 'finished' and po.bom_version_id is not null then
    select * into v from public.bom_versions where id = po.bom_version_id;
    for bl in select * from public.bom_lines where version_id = v.id and kind in ('co_product', 'by_product') loop
      extra := round(bl.quantity * public.item_uom_factor(bl.component_item_id, bl.uom_id) / v.base_quantity * p_qty, 4);
      if extra > 0 then
        mid := public.post_stock_movement(po.organization_id, 'production_output', bl.component_item_id, po.warehouse_id, extra, coalesce(p_location, po.output_location_id), null, 'available', 0,
                 'production_orders', p_po, p_op, null, bl.kind);
        insert into public.production_outputs (organization_id, production_order_id, operation_id, item_id, kind, quantity, warehouse_id, movement_id, unit_cost)
        values (po.organization_id, p_po, p_op, bl.component_item_id, bl.kind, extra, po.warehouse_id, mid, 0);
      end if;
    end loop;
  end if;
  if bucket = 'quarantine' then
    ins := public._create_inspection(po.organization_id, 'final', po.item_id, lid, p_qty, 'production_orders', p_po, po.warehouse_id, coalesce(p_location, po.output_location_id));
  end if;
  perform public.emit_event(po.organization_id, 'production.output.posted', 'production_order', p_po, jsonb_build_object('quantity', p_qty, 'lot_id', lid));
  return oid;
end $$;

create or replace function public.report_production(p_op text, p_produced numeric, p_scrap numeric default 0, p_scrap_reason text default null, p_lot_number text default null, p_employee text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare op public.production_order_operations; po public.production_orders; last_seq int; unit numeric; it public.items;
begin
  select * into op from public.production_order_operations where id = p_op for update;
  if not found then raise exception 'Opération introuvable.' using errcode = '22023'; end if;
  perform public._require(op.organization_id, 'production.report');
  if op.status not in ('running', 'paused') then raise exception 'Démarrez l’opération avant de déclarer la production.' using errcode = '22023'; end if;
  if coalesce(p_produced, 0) < 0 or coalesce(p_scrap, 0) < 0 or (coalesce(p_produced, 0) = 0 and coalesce(p_scrap, 0) = 0) then raise exception 'Quantités invalides.' using errcode = '22023'; end if;
  select * into po from public.production_orders where id = op.production_order_id;
  select * into it from public.items where id = po.item_id;
  update public.production_order_operations set done_qty = done_qty + coalesce(p_produced, 0), scrap_qty = scrap_qty + coalesce(p_scrap, 0), operator_id = coalesce(p_employee, operator_id) where id = p_op;
  if coalesce(p_scrap, 0) > 0 then
    unit := coalesce(nullif(it.avg_cost, 0), it.standard_cost, 0);
    insert into public.production_scrap (organization_id, production_order_id, operation_id, item_id, quantity, reason_id, unit_cost, cost)
    values (op.organization_id, po.id, p_op, po.item_id, p_scrap, p_scrap_reason, unit, round(unit * p_scrap, 2));
    update public.production_orders set scrap_qty = scrap_qty + p_scrap where id = po.id;
  end if;
  select max(seq) into last_seq from public.production_order_operations where production_order_id = po.id;
  if op.seq = last_seq and coalesce(p_produced, 0) > 0 then
    perform public.post_production_output(po.id, p_produced, p_lot_number, null, p_op, 'finished');
  end if;
end $$;

create or replace function public.complete_production_operation(p_op text)
returns void language plpgsql security definer set search_path = '' as $$
declare op public.production_order_operations; wc public.work_centers; a record; hrs numeric;
begin
  select * into op from public.production_order_operations where id = p_op for update;
  if not found then raise exception 'Opération introuvable.' using errcode = '22023'; end if;
  perform public._require(op.organization_id, 'production.report');
  if op.status = 'done' then return; end if;
  if op.status = 'pending' then raise exception 'Cette opération n’a pas été démarrée.' using errcode = '22023'; end if;
  perform public._stop_op_clock(p_op);
  update public.production_order_operations set status = 'done', finished_at = now() where id = p_op;
  update public.time_logs set ended_at = now() where operation_id = p_op and ended_at is null;
  update public.production_downtime set ended_at = now(), minutes = greatest(round(extract(epoch from (now() - started_at)) / 60)::int, 0) where operation_id = p_op and ended_at is null and maintenance_work_order_id is null;
  -- machine runtime feeds meters (preventive maintenance by operating hours)
  select accumulated_minutes / 60.0 into hrs from public.production_order_operations where id = p_op;
  if op.work_center_id is not null and coalesce(hrs, 0) > 0 then
    for a in select id, meter_reading from public.assets where work_center_id = op.work_center_id and meter_unit = 'hours' and active and kind = 'machine' loop
      perform public.record_meter_reading(a.id, a.meter_reading + round(hrs, 2), 'hours', 'Temps de marche OF');
    end loop;
  end if;
end $$;

create or replace function public.consume_material(p_po text, p_material text, p_qty numeric, p_lot text default null)
returns numeric language plpgsql security definer set search_path = '' as $$
declare po public.production_orders;
begin
  select * into po from public.production_orders where id = p_po for update;
  if not found then raise exception 'Ordre introuvable.' using errcode = '22023'; end if;
  perform public._require(po.organization_id, 'production.report');
  if po.status not in ('released', 'in_progress', 'paused') then raise exception 'Consommation impossible (statut : %).', po.status using errcode = '22023'; end if;
  if p_qty <= 0 then raise exception 'Quantité invalide.' using errcode = '22023'; end if;
  return public._consume_material(p_po, p_material, p_qty, p_lot, false);
end $$;

create or replace function public.start_downtime(p_work_center text, p_category text, p_reason text default null, p_asset text default null, p_po text default null, p_notes text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare org text; did text;
begin
  select organization_id into org from public.work_centers where id = p_work_center;
  if org is null then raise exception 'Poste de charge introuvable.' using errcode = '22023'; end if;
  perform public._require(org, 'production.report');
  insert into public.production_downtime (organization_id, production_order_id, work_center_id, asset_id, category, reason_id, notes) values (org, p_po, p_work_center, p_asset, p_category, p_reason, p_notes) returning id into did;
  return did;
end $$;

create or replace function public.end_downtime(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.production_downtime;
begin
  select * into d from public.production_downtime where id = p_id for update;
  if not found then raise exception 'Arrêt introuvable.' using errcode = '22023'; end if;
  perform public._require(d.organization_id, 'production.report');
  if d.ended_at is not null then return; end if;
  if d.maintenance_work_order_id is not null and exists (select 1 from public.maintenance_work_orders w where w.id = d.maintenance_work_order_id and w.status not in ('completed', 'cancelled')) then
    raise exception 'L’arrêt est lié à un ordre de maintenance non clôturé.' using errcode = 'P0001';
  end if;
  update public.production_downtime set ended_at = now(), minutes = greatest(round(extract(epoch from (now() - started_at)) / 60)::int, 0) where id = p_id;
end $$;

-- ───────── completion / cost ─────────
create or replace function public._snapshot_po_cost(p_po text)
returns void language plpgsql security definer set search_path = '' as $$
declare po public.production_orders; c record; s public.standard_cost_rolls; produced numeric; tot numeric; std_tot numeric; mv numeric; lv numeric; hv numeric;
begin
  select * into po from public.production_orders where id = p_po;
  select * into c from public._po_costs(p_po);
  select * into s from public.standard_cost_rolls where organization_id = po.organization_id and item_id = po.item_id;
  produced := greatest(po.produced_qty, 0);
  tot := c.material + c.labor + c.machine + c.overhead + c.subcontract;
  std_tot := coalesce(s.total, (select standard_cost from public.items where id = po.item_id), 0) * produced;
  mv := c.material - coalesce(s.material, 0) * produced;
  lv := c.labor - coalesce(s.labor, 0) * produced;
  hv := c.machine - coalesce(s.machine, 0) * produced;
  insert into public.production_cost_snapshots (organization_id, production_order_id, produced_qty, material_cost, labor_cost, machine_cost, overhead_cost, subcontract_cost, total_cost, unit_cost,
    standard_total, standard_unit, variance, material_variance, labor_variance, machine_variance, other_variance, computed_at)
  values (po.organization_id, p_po, produced, c.material, c.labor, c.machine, c.overhead, c.subcontract, tot, round(tot / nullif(produced, 0), 4), round(std_tot, 2),
          round(std_tot / nullif(produced, 0), 4), round(tot - std_tot, 2), round(mv, 2), round(lv, 2), round(hv, 2), round((tot - std_tot) - mv - lv - hv, 2), now())
  on conflict (production_order_id) do update set produced_qty = excluded.produced_qty, material_cost = excluded.material_cost, labor_cost = excluded.labor_cost, machine_cost = excluded.machine_cost,
    overhead_cost = excluded.overhead_cost, subcontract_cost = excluded.subcontract_cost, total_cost = excluded.total_cost, unit_cost = excluded.unit_cost, standard_total = excluded.standard_total,
    standard_unit = excluded.standard_unit, variance = excluded.variance, material_variance = excluded.material_variance, labor_variance = excluded.labor_variance,
    machine_variance = excluded.machine_variance, other_variance = excluded.other_variance, computed_at = now();
end $$;

create or replace function public.complete_production_order(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare po public.production_orders; op record;
begin
  select * into po from public.production_orders where id = p_id for update;
  if not found then raise exception 'Ordre introuvable.' using errcode = '22023'; end if;
  perform public._require(po.organization_id, 'production.complete');
  if po.status not in ('in_progress', 'paused', 'released') then raise exception 'Cet ordre ne peut pas être terminé (statut : %).', po.status using errcode = '22023'; end if;
  if po.produced_qty <= 0 then raise exception 'Aucune production déclarée : annulez l’ordre ou déclarez une production.' using errcode = '22023'; end if;
  for op in select * from public.production_order_operations where production_order_id = p_id and status in ('running', 'paused') loop
    perform public._stop_op_clock(op.id);
  end loop;
  update public.production_order_operations set status = case when status = 'pending' then 'skipped' else 'done' end, finished_at = coalesce(finished_at, now()) where production_order_id = p_id and status <> 'done';
  update public.time_logs set ended_at = now() where production_order_id = p_id and ended_at is null;
  update public.production_downtime set ended_at = now(), minutes = greatest(round(extract(epoch from (now() - started_at)) / 60)::int, 0)
   where production_order_id = p_id and ended_at is null and maintenance_work_order_id is null;
  perform public.release_reservations(po.organization_id, 'production_order', p_id, 'released');
  perform public._snapshot_po_cost(p_id);
  update public.production_orders set status = 'completed', actual_end = now() where id = p_id;
  perform public.emit_event(po.organization_id, 'production.order.completed', 'production_order', p_id, jsonb_build_object('number', po.number, 'produced', po.produced_qty, 'planned', po.quantity));
end $$;

create or replace function public.close_production_order(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare po public.production_orders; tot numeric;
begin
  select * into po from public.production_orders where id = p_id for update;
  if not found then raise exception 'Ordre introuvable.' using errcode = '22023'; end if;
  perform public._require(po.organization_id, 'production.complete');
  if po.status <> 'completed' then raise exception 'Seul un ordre terminé peut être clôturé.' using errcode = '22023'; end if;
  perform public._snapshot_po_cost(p_id);
  select total_cost into tot from public.production_cost_snapshots where production_order_id = p_id;
  if not public.approval_satisfied(po.organization_id, 'production_close', p_id, tot) then raise exception 'Approbation requise pour la clôture de cet ordre.' using errcode = 'P0001'; end if;
  update public.production_orders set status = 'closed' where id = p_id;
  perform public.emit_event(po.organization_id, 'production.order.closed', 'production_order', p_id, jsonb_build_object('total_cost', tot));
end $$;

create or replace function public.request_production_close_approval(p_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare po public.production_orders; tot numeric;
begin
  select * into po from public.production_orders where id = p_id;
  if not found then raise exception 'Ordre introuvable.' using errcode = '22023'; end if;
  perform public._require(po.organization_id, 'production.complete');
  perform public._snapshot_po_cost(p_id);
  select total_cost into tot from public.production_cost_snapshots where production_order_id = p_id;
  return public.request_approval(po.organization_id, 'production_close', p_id, tot, 'Clôture ' || po.number);
end $$;

-- Cron helper: flag orders that passed their planned end date.
create or replace function public.flag_late_production_orders()
returns int language plpgsql security definer set search_path = '' as $$
declare po record; n int := 0;
begin
  for po in select * from public.production_orders where status in ('released', 'in_progress', 'paused') and planned_end < current_date
             and not exists (select 1 from public.domain_events e where e.aggregate_id = production_orders.id and e.event_type = 'production.order.delayed' and e.created_at::date = current_date) loop
    perform public.emit_event(po.organization_id, 'production.order.delayed', 'production_order', po.id, jsonb_build_object('number', po.number, 'planned_end', po.planned_end));
    perform public.notify(po.organization_id, 'production.delayed', 'Ordre en retard : ' || po.number, 'Fin planifiée le ' || po.planned_end, 'production/ordres', 'warning', array['production_manager']::public.org_role[]);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ───────── MRP conversion ─────────
create or replace function public.convert_mrp_suggestion(p_id text, p_warehouse text, p_supplier text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare s public.mrp_suggestions; ref text; sup text; it public.items;
begin
  select * into s from public.mrp_suggestions where id = p_id for update;
  if not found then raise exception 'Suggestion introuvable.' using errcode = '22023'; end if;
  perform public._require(s.organization_id, 'planning.run');
  if s.status <> 'open' then raise exception 'Suggestion déjà traitée.' using errcode = '22023'; end if;
  select * into it from public.items where id = s.item_id;
  if s.kind = 'purchase' then
    perform public._require(s.organization_id, 'purchase.write');
    sup := coalesce(p_supplier, s.supplier_id, (select supplier_id from public.item_suppliers where item_id = s.item_id order by preferred desc, price limit 1));
    if sup is null then raise exception 'Aucun fournisseur défini pour %.', it.sku using errcode = '22023'; end if;
    insert into public.purchase_orders (organization_id, supplier_id, warehouse_id, expected_date) values (s.organization_id, sup, p_warehouse, s.need_date) returning id into ref;
    insert into public.purchase_order_lines (organization_id, po_id, item_id, quantity, uom_id, unit_price, vat_rate)
    values (s.organization_id, ref, s.item_id, s.suggested_qty, it.base_uom_id, coalesce((select price from public.item_suppliers where item_id = s.item_id and supplier_id = sup), it.last_purchase_cost, 0), it.vat_rate);
    update public.mrp_suggestions set status = 'converted', converted_ref_type = 'purchase_order', converted_ref_id = ref where id = p_id;
  else
    perform public._require(s.organization_id, 'production.write');
    insert into public.production_orders (organization_id, item_id, quantity, warehouse_id, planned_end, source) values (s.organization_id, s.item_id, s.suggested_qty, p_warehouse, s.need_date, 'mrp') returning id into ref;
    update public.mrp_suggestions set status = 'converted', converted_ref_type = 'production_order', converted_ref_id = ref where id = p_id;
  end if;
  return ref;
end $$;

revoke execute on function public.guard_bom_line(), public.compute_subcontract_total(), public._po_costs(text), public._consume_material(text, text, numeric, text, boolean),
  public._stop_op_clock(text), public._snapshot_po_cost(text), public.flag_late_production_orders() from public, anon, authenticated;
revoke execute on function public.activate_bom_version(text), public.new_bom_version(text, text), public.release_production_order(text), public.start_production_operation(text, text),
  public.pause_production_operation(text, text, text, text), public.resume_production_operation(text), public.post_production_output(text, numeric, text, text, text, text),
  public.report_production(text, numeric, numeric, text, text, text), public.complete_production_operation(text), public.consume_material(text, text, numeric, text),
  public.start_downtime(text, text, text, text, text, text), public.end_downtime(text), public.complete_production_order(text), public.close_production_order(text),
  public.request_production_close_approval(text), public.convert_mrp_suggestion(text, text, text) from public, anon;
grant execute on function public.activate_bom_version(text), public.new_bom_version(text, text), public.release_production_order(text), public.start_production_operation(text, text),
  public.pause_production_operation(text, text, text, text), public.resume_production_operation(text), public.post_production_output(text, numeric, text, text, text, text),
  public.report_production(text, numeric, numeric, text, text, text), public.complete_production_operation(text), public.consume_material(text, text, numeric, text),
  public.start_downtime(text, text, text, text, text, text), public.end_downtime(text), public.complete_production_order(text), public.close_production_order(text),
  public.request_production_close_approval(text), public.convert_mrp_suggestion(text, text, text) to authenticated;
