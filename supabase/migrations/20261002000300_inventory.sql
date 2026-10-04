-- Warehouses, locations, lots, serials and the immutable inventory ledger with atomic posting functions.

create type public.stock_bucket as enum ('available', 'quarantine', 'damaged', 'scrap', 'consignment', 'in_transit');
create type public.movement_type as enum (
  'opening', 'receipt', 'issue', 'transfer_in', 'transfer_out', 'adjustment', 'count_adjustment', 'production_consume', 'production_output',
  'sale', 'return_in', 'return_out', 'scrap', 'reversal', 'maintenance_consume', 'quality_move');

create or replace function public._require(p_org text, p_perm text)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then raise exception 'Authentification requise.' using errcode = '28000'; end if;
  if not public.has_permission(p_org, p_perm) then raise exception 'Droits insuffisants pour cette action.' using errcode = '42501'; end if;
end $$;

-- ───────── warehouses ─────────
create table public.warehouses (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  site_id text references public.sites (id) on delete set null,
  facility_id text references public.facilities (id) on delete set null,
  code text not null,
  name text not null,
  kind text not null default 'standard' check (kind in ('standard', 'raw_materials', 'finished_goods', 'quarantine', 'scrap', 'transit', 'spare_parts')),
  address text,
  allow_negative boolean not null default false,
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('warehouses', 'warehouse.manage');

create table public.warehouse_zones (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  warehouse_id text not null references public.warehouses (id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null default 'bulk' check (kind in ('receiving', 'quality', 'bulk', 'picking', 'packing', 'dispatch', 'quarantine', 'scrap')),
  active boolean not null default true,
  unique (warehouse_id, code)
);
select public._secure('warehouse_zones', 'warehouse.manage');

create table public.locations (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  warehouse_id text not null references public.warehouses (id) on delete cascade,
  zone_id text references public.warehouse_zones (id) on delete set null,
  code text not null,
  barcode text,
  kind text not null default 'bin' check (kind in ('bin', 'rack', 'floor', 'dock', 'shelf')),
  capacity numeric(18, 4),
  active boolean not null default true,
  unique (warehouse_id, code)
);
create index locations_zone_idx on public.locations (zone_id);
create unique index locations_barcode_key on public.locations (organization_id, barcode) where barcode is not null;
select public._secure('locations', 'warehouse.manage');

-- Users restricted by warehouse access only see (and move) stock of their warehouses. No restriction rows = unrestricted.
create or replace function public.can_access_warehouse(org text, wh text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_member(org) and (
    public.is_admin(org)
    or not exists (select 1 from public.user_warehouse_access a where a.organization_id = org and a.user_id = (select auth.uid()))
    or exists (select 1 from public.user_warehouse_access a where a.organization_id = org and a.user_id = (select auth.uid()) and a.warehouse_id = wh)
  );
$$;
revoke execute on function public.can_access_warehouse(text, text) from public, anon;
grant execute on function public.can_access_warehouse(text, text) to authenticated;

-- ───────── lots & serials ─────────
create table public.lots (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  lot_number text not null,
  supplier_id text references public.partners (id) on delete set null,
  supplier_lot text,
  manufactured_on date,
  received_on date default current_date,
  expires_on date,
  status text not null default 'available' check (status in ('available', 'quarantine', 'blocked', 'expired', 'consumed')),
  source_type text,
  source_id text,
  notes text,
  unique (organization_id, item_id, lot_number)
);
create index lots_item_idx on public.lots (item_id);
create index lots_expiry_idx on public.lots (organization_id, expires_on) where expires_on is not null;
select public._secure('lots', 'warehouse.receive');

create table public.serials (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  serial_number text not null,
  lot_id text references public.lots (id) on delete set null,
  warehouse_id text references public.warehouses (id) on delete set null,
  location_id text references public.locations (id) on delete set null,
  status text not null default 'in_stock' check (status in ('in_stock', 'reserved', 'shipped', 'consumed', 'scrapped', 'returned')),
  source_type text,
  source_id text,
  unique (organization_id, item_id, serial_number)
);
create index serials_item_idx on public.serials (item_id, status);
select public._secure('serials', 'warehouse.receive');

-- ───────── ledger + balances ─────────
create table public.inventory_movements (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  movement_type public.movement_type not null,
  item_id text not null references public.items (id),
  warehouse_id text not null references public.warehouses (id),
  location_id text references public.locations (id),
  lot_id text references public.lots (id),
  bucket public.stock_bucket not null default 'available',
  quantity numeric(18, 4) not null check (quantity <> 0),
  unit_cost numeric(18, 4) not null default 0,
  value numeric(18, 4) not null default 0,
  source_type text not null default 'manual',
  source_id text,
  source_line_id text,
  idempotency_key text,
  reverses_id text references public.inventory_movements (id),
  reason text,
  occurred_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index inventory_movements_idem_key on public.inventory_movements (organization_id, idempotency_key) where idempotency_key is not null;
create unique index inventory_movements_reversal_key on public.inventory_movements (reverses_id) where reverses_id is not null;
create index inventory_movements_item_idx on public.inventory_movements (organization_id, item_id, occurred_at desc);
create index inventory_movements_wh_idx on public.inventory_movements (organization_id, warehouse_id, occurred_at desc);
create index inventory_movements_source_idx on public.inventory_movements (organization_id, source_type, source_id);
create index inventory_movements_lot_idx on public.inventory_movements (lot_id) where lot_id is not null;
create index inventory_movements_time_brin on public.inventory_movements using brin (occurred_at);
create trigger inventory_movements_immutable before update or delete on public.inventory_movements for each row execute function public.forbid_mutation();

create table public.inventory_balances (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  warehouse_id text not null references public.warehouses (id) on delete cascade,
  location_id text references public.locations (id) on delete cascade,
  lot_id text references public.lots (id) on delete cascade,
  bucket public.stock_bucket not null default 'available',
  quantity numeric(18, 4) not null default 0,
  loc_key text generated always as (coalesce(location_id, '')) stored,
  lot_key text generated always as (coalesce(lot_id, '')) stored,
  updated_at timestamptz not null default now(),
  constraint inventory_balances_key unique (organization_id, item_id, warehouse_id, loc_key, lot_key, bucket)
);
create index inventory_balances_item_idx on public.inventory_balances (organization_id, item_id);
create index inventory_balances_wh_idx on public.inventory_balances (organization_id, warehouse_id);

create table public.stock_valuation_layers (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  movement_id text references public.inventory_movements (id),
  received_at timestamptz not null default clock_timestamp(),
  initial_qty numeric(18, 4) not null,
  remaining_qty numeric(18, 4) not null,
  unit_cost numeric(18, 4) not null default 0
);
create index stock_valuation_layers_open_idx on public.stock_valuation_layers (item_id, received_at) where remaining_qty > 0;

alter table public.inventory_movements enable row level security;
create policy "members read movements" on public.inventory_movements for select to authenticated using (public.can_access_warehouse(organization_id, warehouse_id));
alter table public.inventory_balances enable row level security;
create policy "members read balances" on public.inventory_balances for select to authenticated using (public.can_access_warehouse(organization_id, warehouse_id));
alter table public.stock_valuation_layers enable row level security;
create policy "members read layers" on public.stock_valuation_layers for select to authenticated using (public.is_member(organization_id));
grant select on public.inventory_movements, public.inventory_balances, public.stock_valuation_layers to authenticated;

create table public.inventory_reservations (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  warehouse_id text not null references public.warehouses (id) on delete cascade,
  lot_id text references public.lots (id) on delete set null,
  quantity numeric(18, 4) not null check (quantity > 0),
  source_type text not null,
  source_id text not null,
  source_line_id text,
  status text not null default 'active' check (status in ('active', 'fulfilled', 'released')),
  expires_on date,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index inventory_reservations_item_idx on public.inventory_reservations (organization_id, item_id, warehouse_id) where status = 'active';
create index inventory_reservations_source_idx on public.inventory_reservations (organization_id, source_type, source_id);
select public._readonly('inventory_reservations');

-- ───────── core posting function (internal) ─────────
create or replace function public.post_stock_movement(
  p_org text, p_type public.movement_type, p_item text, p_warehouse text, p_qty numeric,
  p_location text default null, p_lot text default null, p_bucket public.stock_bucket default 'available',
  p_unit_cost numeric default null, p_source_type text default 'manual', p_source_id text default null, p_source_line_id text default null,
  p_idempotency_key text default null, p_reason text default null, p_skip_valuation boolean default false, p_reverses text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  it public.items; wh public.warehouses; lt public.lots; existing text; new_qty numeric; cost numeric := 0; consumed_val numeric := 0;
  layer record; take numeric; remaining numeric; mid text; allow_neg boolean; on_hand numeric;
begin
  if p_qty is null or p_qty = 0 then raise exception 'Quantité invalide.' using errcode = '22023'; end if;
  if p_idempotency_key is not null then
    select id into existing from public.inventory_movements where organization_id = p_org and idempotency_key = p_idempotency_key;
    if existing is not null then return existing; end if;
  end if;
  select * into it from public.items where id = p_item and organization_id = p_org;
  if not found then raise exception 'Article introuvable.' using errcode = '22023'; end if;
  if it.item_type = 'service' then raise exception 'Un article de type service n’a pas de stock.' using errcode = '22023'; end if;
  select * into wh from public.warehouses where id = p_warehouse and organization_id = p_org;
  if not found then raise exception 'Entrepôt introuvable.' using errcode = '22023'; end if;
  if not public.can_access_warehouse(p_org, p_warehouse) then raise exception 'Accès à cet entrepôt refusé.' using errcode = '42501'; end if;
  if p_location is not null and not exists (select 1 from public.locations l where l.id = p_location and l.warehouse_id = p_warehouse) then
    raise exception 'Emplacement invalide pour cet entrepôt.' using errcode = '22023';
  end if;
  if it.tracking = 'lot' and p_lot is null then raise exception 'Numéro de lot requis pour l’article %.', it.sku using errcode = '22023'; end if;
  if it.tracking = 'serial' and p_qty <> trunc(p_qty) then raise exception 'Quantité entière requise pour un article sérialisé (%).', it.sku using errcode = '22023'; end if;
  if p_lot is not null then
    select * into lt from public.lots where id = p_lot and organization_id = p_org and item_id = p_item;
    if not found then raise exception 'Lot introuvable pour cet article.' using errcode = '22023'; end if;
    if p_qty < 0 and p_bucket = 'available' and lt.status = 'blocked' and p_type not in ('scrap', 'return_out', 'reversal', 'quality_move') then
      raise exception 'Le lot % est bloqué.', lt.lot_number using errcode = '22023';
    end if;
    if p_qty < 0 and p_bucket = 'available' and lt.expires_on is not null and lt.expires_on < current_date and p_type in ('sale', 'production_consume', 'issue') then
      raise exception 'Le lot % est périmé.', lt.lot_number using errcode = '22023';
    end if;
  end if;

  insert into public.inventory_balances (organization_id, item_id, warehouse_id, location_id, lot_id, bucket, quantity)
  values (p_org, p_item, p_warehouse, p_location, p_lot, p_bucket, p_qty)
  on conflict (organization_id, item_id, warehouse_id, loc_key, lot_key, bucket)
  do update set quantity = public.inventory_balances.quantity + excluded.quantity, updated_at = now()
  returning quantity into new_qty;

  allow_neg := wh.allow_negative or coalesce((select (settings ->> 'allow_negative_stock')::boolean from public.organizations where id = p_org), false);
  if new_qty < 0 and not allow_neg then
    raise exception 'Stock insuffisant pour % (solde après opération : %).', it.sku, new_qty using errcode = 'P0001';
  end if;

  -- valuation
  if p_skip_valuation then
    cost := coalesce(p_unit_cost, nullif(it.avg_cost, 0), it.standard_cost, 0);
  elsif p_qty > 0 then
    cost := case when it.valuation_method = 'standard' and it.standard_cost > 0 then it.standard_cost
                 else coalesce(p_unit_cost, nullif(it.avg_cost, 0), nullif(it.standard_cost, 0), 0) end;
  else
    remaining := -p_qty;
    for layer in select * from public.stock_valuation_layers where item_id = p_item and remaining_qty > 0 order by received_at, id for update loop
      exit when remaining <= 0;
      take := least(layer.remaining_qty, remaining);
      update public.stock_valuation_layers set remaining_qty = remaining_qty - take where id = layer.id;
      consumed_val := consumed_val + take * layer.unit_cost;
      remaining := remaining - take;
    end loop;
    if remaining > 0 then consumed_val := consumed_val + remaining * coalesce(nullif(it.avg_cost, 0), it.standard_cost, 0); end if;
    cost := case when it.valuation_method = 'fifo' then consumed_val / (-p_qty)
                 when it.valuation_method = 'standard' and it.standard_cost > 0 then it.standard_cost
                 else coalesce(nullif(it.avg_cost, 0), consumed_val / (-p_qty)) end;
    if p_unit_cost is not null and p_type in ('reversal') then cost := p_unit_cost; end if;
  end if;

  insert into public.inventory_movements (organization_id, movement_type, item_id, warehouse_id, location_id, lot_id, bucket, quantity, unit_cost, value,
    source_type, source_id, source_line_id, idempotency_key, reverses_id, reason)
  values (p_org, p_type, p_item, p_warehouse, p_location, p_lot, p_bucket, p_qty, round(cost, 4), round(p_qty * cost, 4),
    p_source_type, p_source_id, p_source_line_id, p_idempotency_key, p_reverses, p_reason)
  returning id into mid;

  if not p_skip_valuation then
    if p_qty > 0 then
      insert into public.stock_valuation_layers (organization_id, item_id, movement_id, initial_qty, remaining_qty, unit_cost)
      values (p_org, p_item, mid, p_qty, p_qty, cost);
    end if;
    update public.items set
      avg_cost = coalesce((select round(sum(remaining_qty * unit_cost) / nullif(sum(remaining_qty), 0), 4) from public.stock_valuation_layers where item_id = p_item and remaining_qty > 0), avg_cost),
      last_purchase_cost = case when p_type = 'receipt' and p_qty > 0 then cost else last_purchase_cost end
    where id = p_item;
  end if;

  perform public.bump_usage(p_org, 'movements', 1);

  -- low stock alert when crossing the reorder point
  if p_qty < 0 and it.reorder_point > 0 and p_bucket = 'available' then
    select coalesce(sum(quantity), 0) into on_hand from public.inventory_balances where item_id = p_item and bucket = 'available';
    if on_hand <= it.reorder_point and on_hand - p_qty > it.reorder_point then
      perform public.notify(p_org, 'inventory.low_stock', 'Stock bas : ' || it.sku, it.name || ' — disponible : ' || on_hand, 'inventaire/stock', 'warning',
                            array['warehouse_manager', 'purchasing_manager']::public.org_role[]);
      perform public.emit_event(p_org, 'inventory.low_stock', 'item', p_item, jsonb_build_object('on_hand', on_hand, 'reorder_point', it.reorder_point));
    end if;
  end if;
  return mid;
end $$;

-- FEFO/FIFO allocation of an outbound quantity across balances. Locks the chosen balances.
create or replace function public.allocate_stock(p_org text, p_item text, p_warehouse text, p_qty numeric,
  p_lot text default null, p_location text default null, p_bucket public.stock_bucket default 'available')
returns table (location_id text, lot_id text, qty numeric) language plpgsql security definer set search_path = '' as $$
declare b record; need numeric := p_qty; take numeric; tracking text;
begin
  select i.tracking into tracking from public.items i where i.id = p_item and i.organization_id = p_org;
  if tracking is null then raise exception 'Article introuvable.' using errcode = '22023'; end if;
  for b in
    select ib.id, ib.location_id as loc, ib.lot_id as lot, ib.quantity
      from public.inventory_balances ib left join public.lots l on l.id = ib.lot_id
     where ib.organization_id = p_org and ib.item_id = p_item and ib.warehouse_id = p_warehouse and ib.bucket = p_bucket and ib.quantity > 0
       and (p_lot is null or ib.lot_id = p_lot) and (p_location is null or ib.location_id = p_location)
       and (l.id is null or l.status not in ('blocked', 'expired', 'consumed'))
     order by l.expires_on nulls last, l.received_on nulls last, l.created_at, l.lot_number, ib.updated_at, ib.id
       for update of ib
  loop
    exit when need <= 0;
    take := least(b.quantity, need);
    location_id := b.loc; lot_id := b.lot; qty := take;
    return next;
    need := need - take;
  end loop;
  if need > 0 then
    if (select coalesce(w.allow_negative, false) from public.warehouses w where w.id = p_warehouse) then
      location_id := p_location; lot_id := p_lot; qty := need; return next;
    else
      raise exception 'Stock insuffisant : il manque % unités.', need using errcode = 'P0001';
    end if;
  end if;
end $$;

-- Issues stock using allocation; returns the total value (positive).
create or replace function public.issue_stock(p_org text, p_type public.movement_type, p_item text, p_warehouse text, p_qty numeric,
  p_source_type text, p_source_id text, p_source_line_id text default null, p_lot text default null, p_location text default null,
  p_bucket public.stock_bucket default 'available', p_key text default null, p_reason text default null)
returns numeric language plpgsql security definer set search_path = '' as $$
declare a record; mid text; total numeric := 0; n int := 0; v numeric;
begin
  for a in select * from public.allocate_stock(p_org, p_item, p_warehouse, p_qty, p_lot, p_location, p_bucket) loop
    n := n + 1;
    mid := public.post_stock_movement(p_org, p_type, p_item, p_warehouse, -a.qty, a.location_id, a.lot_id, p_bucket, null,
             p_source_type, p_source_id, p_source_line_id, case when p_key is null then null else p_key || ':' || n end, p_reason);
    select -value into v from public.inventory_movements where id = mid;
    total := total + coalesce(v, 0);
  end loop;
  return total;
end $$;

-- serial numbers bookkeeping. direction: 'in' or 'out'
create or replace function public._apply_serials(p_org text, p_item text, p_wh text, p_loc text, p_lot text, p_dir text, p_serials text[], p_qty numeric,
                                                 p_source_type text, p_source_id text, p_out_status text default 'shipped')
returns void language plpgsql security definer set search_path = '' as $$
declare s text; cnt int := coalesce(cardinality(p_serials), 0);
begin
  if not exists (select 1 from public.items where id = p_item and tracking = 'serial') then return; end if;
  if cnt <> abs(p_qty) then raise exception 'Il faut exactement % numéro(s) de série (reçu : %).', abs(p_qty), cnt using errcode = '22023'; end if;
  foreach s in array p_serials loop
    if p_dir = 'in' then
      insert into public.serials (organization_id, item_id, serial_number, lot_id, warehouse_id, location_id, status, source_type, source_id)
      values (p_org, p_item, trim(s), p_lot, p_wh, p_loc, 'in_stock', p_source_type, p_source_id)
      on conflict (organization_id, item_id, serial_number) do update
        set status = 'in_stock', warehouse_id = excluded.warehouse_id, location_id = excluded.location_id, lot_id = excluded.lot_id
        where public.serials.status in ('shipped', 'consumed', 'returned');
      if not found then null; end if;
    else
      update public.serials set status = p_out_status, warehouse_id = null, location_id = null
       where organization_id = p_org and item_id = p_item and serial_number = trim(s) and status = 'in_stock';
      if not found then raise exception 'Numéro de série % introuvable en stock.', s using errcode = '22023'; end if;
    end if;
  end loop;
end $$;

-- create-or-get a lot
create or replace function public._ensure_lot(p_org text, p_item text, p_lot_number text, p_supplier text default null, p_expires date default null,
                                              p_manufactured date default null, p_status text default 'available', p_source_type text default null, p_source_id text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare lid text; trk text;
begin
  select i.tracking into trk from public.items i where i.id = p_item and i.organization_id = p_org;
  if trk is null then raise exception 'Article introuvable.' using errcode = '22023'; end if;
  if trk = 'none' and coalesce(p_lot_number, '') = '' then return null; end if;
  if coalesce(p_lot_number, '') = '' then raise exception 'Numéro de lot requis.' using errcode = '22023'; end if;
  insert into public.lots (organization_id, item_id, lot_number, supplier_id, expires_on, manufactured_on, status, source_type, source_id)
  values (p_org, p_item, trim(p_lot_number), p_supplier, p_expires, p_manufactured, p_status, p_source_type, p_source_id)
  on conflict (organization_id, item_id, lot_number) do update set expires_on = coalesce(public.lots.expires_on, excluded.expires_on)
  returning id into lid;
  return lid;
end $$;

-- ───────── reservations ─────────
create or replace function public.available_to_promise(p_org text, p_item text, p_warehouse text default null)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(quantity) from public.inventory_balances where organization_id = p_org and item_id = p_item and bucket = 'available'
                   and (p_warehouse is null or warehouse_id = p_warehouse)), 0)
       - coalesce((select sum(quantity) from public.inventory_reservations where organization_id = p_org and item_id = p_item and status = 'active'
                   and (p_warehouse is null or warehouse_id = p_warehouse)), 0);
$$;

create or replace function public.reserve_stock(p_org text, p_item text, p_warehouse text, p_qty numeric, p_source_type text, p_source_id text,
                                                p_source_line_id text default null, p_lot text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare avail numeric; rid text;
begin
  if not (public.has_permission(p_org, 'sales.write') or public.has_permission(p_org, 'production.write') or public.has_permission(p_org, 'warehouse.manage')
          or public.has_permission(p_org, 'inventory.transfer')) then
    raise exception 'Droits insuffisants pour réserver du stock.' using errcode = '42501';
  end if;
  if p_qty <= 0 then raise exception 'Quantité invalide.' using errcode = '22023'; end if;
  perform 1 from public.items where id = p_item and organization_id = p_org for update;
  avail := public.available_to_promise(p_org, p_item, p_warehouse);
  if avail < p_qty then raise exception 'Stock disponible insuffisant pour réserver (disponible : %).', avail using errcode = 'P0001'; end if;
  insert into public.inventory_reservations (organization_id, item_id, warehouse_id, lot_id, quantity, source_type, source_id, source_line_id)
  values (p_org, p_item, p_warehouse, p_lot, p_qty, p_source_type, p_source_id, p_source_line_id) returning id into rid;
  return rid;
end $$;

create or replace function public.release_reservations(p_org text, p_source_type text, p_source_id text, p_status text default 'released')
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.is_member(p_org) then raise exception 'Accès refusé.' using errcode = '42501'; end if;
  update public.inventory_reservations set status = p_status where organization_id = p_org and source_type = p_source_type and source_id = p_source_id and status = 'active';
  get diagnostics n = row_count;
  return n;
end $$;

-- ───────── stock adjustments ─────────
create table public.stock_adjustments (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  warehouse_id text not null references public.warehouses (id),
  kind text not null default 'adjustment' check (kind in ('adjustment', 'scrap', 'damage', 'found', 'opening')),
  reason text,
  adjusted_on date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'posted', 'reversed', 'cancelled')),
  total_value numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null default 0,
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index stock_adjustments_number_key on public.stock_adjustments (organization_id, number);
select public._secure('stock_adjustments', 'inventory.adjust');
create trigger assign_number before insert on public.stock_adjustments for each row execute function public.assign_document_number('stock_adjustment');
create trigger lock_posted before update or delete on public.stock_adjustments for each row execute function public.lock_posted_document();

create table public.stock_adjustment_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  adjustment_id text not null references public.stock_adjustments (id) on delete cascade,
  item_id text not null references public.items (id),
  location_id text references public.locations (id),
  lot_id text references public.lots (id),
  lot_number text,
  expires_on date,
  bucket public.stock_bucket not null default 'available',
  quantity_delta numeric(18, 4) not null check (quantity_delta <> 0),
  unit_cost numeric(18, 4),
  serials text[],
  reason text
);
create index stock_adjustment_lines_doc_idx on public.stock_adjustment_lines (adjustment_id);
select public._secure('stock_adjustment_lines', 'inventory.adjust');
create trigger lock_lines before insert or update or delete on public.stock_adjustment_lines for each row execute function public.lock_document_lines('stock_adjustments', 'adjustment_id');

-- ───────── stock transfers ─────────
create table public.stock_transfers (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  from_warehouse_id text not null references public.warehouses (id),
  to_warehouse_id text not null references public.warehouses (id),
  transfer_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'approved', 'posted', 'reversed', 'cancelled')),
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index stock_transfers_number_key on public.stock_transfers (organization_id, number);
select public._secure('stock_transfers', 'inventory.transfer');
create trigger assign_number before insert on public.stock_transfers for each row execute function public.assign_document_number('stock_transfer');
create trigger lock_posted before update or delete on public.stock_transfers for each row execute function public.lock_posted_document();

create table public.stock_transfer_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  transfer_id text not null references public.stock_transfers (id) on delete cascade,
  item_id text not null references public.items (id),
  from_location_id text references public.locations (id),
  to_location_id text references public.locations (id),
  lot_id text references public.lots (id),
  quantity numeric(18, 4) not null check (quantity > 0)
);
create index stock_transfer_lines_doc_idx on public.stock_transfer_lines (transfer_id);
select public._secure('stock_transfer_lines', 'inventory.transfer');
create trigger lock_lines before insert or update or delete on public.stock_transfer_lines for each row execute function public.lock_document_lines('stock_transfers', 'transfer_id');

-- ───────── cycle counts / stocktakes ─────────
create table public.inventory_counts (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  warehouse_id text not null references public.warehouses (id),
  zone_id text references public.warehouse_zones (id) on delete set null,
  kind text not null default 'cycle' check (kind in ('cycle', 'full')),
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'review', 'posted', 'reversed', 'cancelled')),
  scheduled_on date default current_date,
  total_variance_value numeric(18, 2) not null default 0,
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index inventory_counts_number_key on public.inventory_counts (organization_id, number);
select public._secure('inventory_counts', 'inventory.count');
create trigger assign_number before insert on public.inventory_counts for each row execute function public.assign_document_number('inventory_count');
create trigger lock_posted before update or delete on public.inventory_counts for each row execute function public.lock_posted_document();

create table public.inventory_count_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  count_id text not null references public.inventory_counts (id) on delete cascade,
  item_id text not null references public.items (id),
  location_id text references public.locations (id),
  lot_id text references public.lots (id),
  expected_qty numeric(18, 4) not null default 0,
  counted_qty numeric(18, 4) check (counted_qty is null or counted_qty >= 0),
  counted_by uuid,
  counted_at timestamptz,
  recount boolean not null default false,
  notes text
);
create index inventory_count_lines_doc_idx on public.inventory_count_lines (count_id);
select public._secure('inventory_count_lines', 'inventory.count');

-- ───────── warehouse tasks ─────────
create table public.warehouse_tasks (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  warehouse_id text not null references public.warehouses (id) on delete cascade,
  task_type text not null check (task_type in ('receive', 'putaway', 'pick', 'pack', 'dispatch', 'count', 'replenish', 'move')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  priority int not null default 3 check (priority between 1 and 5),
  assignee_id uuid,
  item_id text references public.items (id) on delete cascade,
  lot_id text references public.lots (id) on delete set null,
  from_location_id text references public.locations (id) on delete set null,
  to_location_id text references public.locations (id) on delete set null,
  quantity numeric(18, 4),
  source_type text,
  source_id text,
  source_line_id text,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  notes text
);
create index warehouse_tasks_open_idx on public.warehouse_tasks (organization_id, status, priority) where status in ('open', 'in_progress');
select public._secure('warehouse_tasks', 'warehouse.pick');

-- ───────── document helpers ─────────
create or replace function public._assert_postable(p_org text, p_type text, p_id text, p_amount numeric, p_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_status not in ('draft', 'approved') then raise exception 'Ce document ne peut plus être comptabilisé (statut : %).', p_status using errcode = '22023'; end if;
  if not public.approval_satisfied(p_org, p_type, p_id, p_amount) then
    raise exception 'Approbation requise avant la comptabilisation de ce document.' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.submit_document(p_type text, p_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare tbl text; perm text; j jsonb; org text; amount numeric; rid text; new_status text;
begin
  select m.tbl, m.perm into tbl, perm from (values
    ('purchase_request', 'purchase_requests', 'purchase.write'), ('purchase_order', 'purchase_orders', 'purchase.write'),
    ('supplier_invoice', 'supplier_invoices', 'finance.write'), ('quote', 'quotes', 'sales.write'), ('sales_order', 'sales_orders', 'sales.write'),
    ('stock_adjustment', 'stock_adjustments', 'inventory.adjust'), ('inventory_count', 'inventory_counts', 'inventory.count'),
    ('production_order', 'production_orders', 'production.write'), ('expense', 'expenses', 'finance.write'), ('payment', 'payments', 'finance.write')
  ) as m (typ, tbl, perm) where m.typ = p_type;
  if tbl is null then raise exception 'Type de document inconnu : %.', p_type using errcode = '22023'; end if;
  execute format('select to_jsonb(t) from public.%I t where id = $1', tbl) into j using p_id;
  if j is null then raise exception 'Document introuvable.' using errcode = '22023'; end if;
  org := j ->> 'organization_id';
  perform public._require(org, perm);
  if j ->> 'status' <> 'draft' then raise exception 'Seuls les brouillons peuvent être soumis.' using errcode = '22023'; end if;
  amount := coalesce((j ->> 'total_amount')::numeric, (j ->> 'amount')::numeric, 0);
  execute format('update public.%I set status = ''pending_approval'' where id = $1', tbl) using p_id;
  rid := public.request_approval(org, p_type, p_id, amount, coalesce(j ->> 'number', p_id));
  if rid is null then
    execute format('update public.%I set status = ''approved'' where id = $1', tbl) using p_id;
    new_status := 'approved';
  else
    select status into new_status from public.approval_requests where id = rid;
    new_status := case when new_status = 'approved' then 'approved' else 'pending_approval' end;
  end if;
  perform public.emit_event(org, p_type || '.submitted', p_type, p_id, jsonb_build_object('status', new_status, 'amount', amount));
  return new_status;
end $$;

create or replace function public.cancel_document(p_type text, p_id text, p_reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare tbl text; perm text; j jsonb; org text;
begin
  select m.tbl, m.perm into tbl, perm from (values
    ('purchase_request', 'purchase_requests', 'purchase.write'), ('purchase_order', 'purchase_orders', 'purchase.write'),
    ('supplier_invoice', 'supplier_invoices', 'finance.write'), ('quote', 'quotes', 'sales.write'), ('sales_order', 'sales_orders', 'sales.write'),
    ('stock_adjustment', 'stock_adjustments', 'inventory.adjust'), ('inventory_count', 'inventory_counts', 'inventory.count'),
    ('stock_transfer', 'stock_transfers', 'inventory.transfer'), ('purchase_receipt', 'purchase_receipts', 'warehouse.receive'),
    ('delivery', 'deliveries', 'warehouse.dispatch'), ('production_order', 'production_orders', 'production.write'),
    ('rfq', 'rfqs', 'purchase.write'), ('maintenance_work_order', 'maintenance_work_orders', 'maintenance.write'),
    ('sales_invoice', 'sales_invoices', 'finance.write'), ('expense', 'expenses', 'finance.write'), ('payment', 'payments', 'finance.write')
  ) as m (typ, tbl, perm) where m.typ = p_type;
  if tbl is null then raise exception 'Type de document inconnu : %.', p_type using errcode = '22023'; end if;
  execute format('select to_jsonb(t) from public.%I t where id = $1', tbl) into j using p_id;
  if j is null then raise exception 'Document introuvable.' using errcode = '22023'; end if;
  org := j ->> 'organization_id';
  perform public._require(org, perm);
  if j ->> 'status' in ('posted', 'reversed', 'completed', 'closed', 'cancelled') then
    raise exception 'Ce document ne peut pas être annulé (statut : %). Utilisez une annulation par contre-passation.', j ->> 'status' using errcode = '22023';
  end if;
  perform set_config('app.reason', coalesce(p_reason, ''), true);
  execute format('update public.%I set status = ''cancelled'' where id = $1', tbl) using p_id;
  perform public.release_reservations(org, p_type, p_id);
  update public.approval_requests set status = 'cancelled', decided_at = now() where organization_id = org and entity_type = p_type and entity_id = p_id and status = 'pending';
end $$;

-- ───────── posting: adjustments ─────────
create or replace function public.post_stock_adjustment(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.stock_adjustments; l record; lid text; total numeric := 0; mid text; v numeric; amount numeric;
begin
  perform set_config('app.bypass_lock', 'on', true);
  select * into h from public.stock_adjustments where id = p_id for update;
  if not found then raise exception 'Document introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'inventory.adjust');
  select coalesce(sum(abs(quantity_delta) * coalesce(unit_cost, i.avg_cost, 0)), 0) into amount
    from public.stock_adjustment_lines al join public.items i on i.id = al.item_id where al.adjustment_id = p_id;
  perform public._assert_postable(h.organization_id, case when h.kind = 'scrap' then 'stock_scrap' else 'stock_adjustment' end, p_id, amount, h.status);
  if not exists (select 1 from public.stock_adjustment_lines where adjustment_id = p_id) then raise exception 'Le document ne contient aucune ligne.' using errcode = '22023'; end if;
  for l in select * from public.stock_adjustment_lines where adjustment_id = p_id order by id loop
    lid := l.lot_id;
    if lid is null and l.lot_number is not null then lid := public._ensure_lot(h.organization_id, l.item_id, l.lot_number, null, l.expires_on, null, 'available', 'stock_adjustment', p_id); end if;
    if l.quantity_delta > 0 then
      mid := public.post_stock_movement(h.organization_id, (case when h.kind = 'opening' then 'opening' else 'adjustment' end)::public.movement_type, l.item_id, h.warehouse_id, l.quantity_delta,
               l.location_id, lid, l.bucket, l.unit_cost, 'stock_adjustments', p_id, l.id, 'adj:' || l.id, coalesce(l.reason, h.reason));
      perform public._apply_serials(h.organization_id, l.item_id, h.warehouse_id, l.location_id, lid, 'in', l.serials, l.quantity_delta, 'stock_adjustments', p_id);
      select value into v from public.inventory_movements where id = mid;
      total := total + coalesce(v, 0);
    else
      v := public.issue_stock(h.organization_id, (case when h.kind = 'scrap' then 'scrap' else 'adjustment' end)::public.movement_type, l.item_id, h.warehouse_id, -l.quantity_delta,
             'stock_adjustments', p_id, l.id, lid, l.location_id, l.bucket, 'adj:' || l.id, coalesce(l.reason, h.reason));
      if l.serials is not null then
        perform public._apply_serials(h.organization_id, l.item_id, h.warehouse_id, l.location_id, lid, 'out', l.serials, l.quantity_delta, 'stock_adjustments', p_id, 'scrapped');
      end if;
      total := total - coalesce(v, 0);
    end if;
  end loop;
  update public.stock_adjustments set status = 'posted', total_value = total where id = p_id;
  perform public.emit_event(h.organization_id, 'inventory.adjustment.posted', 'stock_adjustment', p_id, jsonb_build_object('number', h.number, 'value', total));
end $$;

-- ───────── posting: transfers ─────────
create or replace function public.post_stock_transfer(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.stock_transfers; l record; a record; n int;
begin
  select * into h from public.stock_transfers where id = p_id for update;
  if not found then raise exception 'Document introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'inventory.transfer');
  if h.status not in ('draft', 'approved') then raise exception 'Ce transfert est déjà traité.' using errcode = '22023'; end if;
  if not exists (select 1 from public.stock_transfer_lines where transfer_id = p_id) then raise exception 'Le transfert ne contient aucune ligne.' using errcode = '22023'; end if;
  for l in select * from public.stock_transfer_lines where transfer_id = p_id order by id loop
    n := 0;
    for a in select * from public.allocate_stock(h.organization_id, l.item_id, h.from_warehouse_id, l.quantity, l.lot_id, l.from_location_id) loop
      n := n + 1;
      perform public.post_stock_movement(h.organization_id, 'transfer_out', l.item_id, h.from_warehouse_id, -a.qty, a.location_id, a.lot_id, 'available', null,
                'stock_transfers', p_id, l.id, 'trf-out:' || l.id || ':' || n, null, true);
      perform public.post_stock_movement(h.organization_id, 'transfer_in', l.item_id, h.to_warehouse_id, a.qty, l.to_location_id, a.lot_id, 'available', null,
                'stock_transfers', p_id, l.id, 'trf-in:' || l.id || ':' || n, null, true);
    end loop;
  end loop;
  update public.stock_transfers set status = 'posted' where id = p_id;
  perform public.emit_event(h.organization_id, 'inventory.transfer.posted', 'stock_transfer', p_id, jsonb_build_object('number', h.number));
end $$;

-- ───────── counts ─────────
create or replace function public.start_inventory_count(p_id text)
returns int language plpgsql security definer set search_path = '' as $$
declare h public.inventory_counts; n int;
begin
  select * into h from public.inventory_counts where id = p_id for update;
  if not found then raise exception 'Inventaire introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'inventory.count');
  if h.status not in ('draft', 'in_progress') then raise exception 'Cet inventaire ne peut plus être démarré.' using errcode = '22023'; end if;
  insert into public.inventory_count_lines (organization_id, count_id, item_id, location_id, lot_id, expected_qty)
  select b.organization_id, p_id, b.item_id, b.location_id, b.lot_id, b.quantity
    from public.inventory_balances b
   where b.organization_id = h.organization_id and b.warehouse_id = h.warehouse_id and b.bucket = 'available' and b.quantity <> 0
     and (h.zone_id is null or b.location_id in (select l.id from public.locations l where l.zone_id = h.zone_id))
     and not exists (select 1 from public.inventory_count_lines c where c.count_id = p_id and c.item_id = b.item_id
                      and c.location_id is not distinct from b.location_id and c.lot_id is not distinct from b.lot_id);
  get diagnostics n = row_count;
  update public.inventory_count_lines c set expected_qty = coalesce((
      select b.quantity from public.inventory_balances b where b.organization_id = c.organization_id and b.item_id = c.item_id and b.warehouse_id = h.warehouse_id
         and b.location_id is not distinct from c.location_id and b.lot_id is not distinct from c.lot_id and b.bucket = 'available'), 0)
   where c.count_id = p_id and c.counted_qty is null;
  update public.inventory_counts set status = 'in_progress' where id = p_id;
  return n;
end $$;

create or replace function public.record_count_line(p_line text, p_counted numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare org text;
begin
  select organization_id into org from public.inventory_count_lines where id = p_line;
  if org is null then raise exception 'Ligne introuvable.' using errcode = '22023'; end if;
  perform public._require(org, 'inventory.count');
  if (select status from public.inventory_counts c join public.inventory_count_lines l on l.count_id = c.id where l.id = p_line) not in ('draft', 'in_progress', 'review') then
    raise exception 'Cet inventaire est clôturé.' using errcode = '22023';
  end if;
  update public.inventory_count_lines set counted_qty = p_counted, counted_by = (select auth.uid()), counted_at = now() where id = p_line;
end $$;

create or replace function public.post_inventory_count(p_id text)
returns numeric language plpgsql security definer set search_path = '' as $$
declare h public.inventory_counts; l record; cur numeric; delta numeric; total numeric := 0; amount numeric := 0; cost numeric; v numeric; mid text;
begin
  select * into h from public.inventory_counts where id = p_id for update;
  if not found then raise exception 'Inventaire introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'inventory.count');
  if h.status not in ('in_progress', 'review') then raise exception 'Cet inventaire n’est pas en cours.' using errcode = '22023'; end if;
  for l in select cl.*, i.avg_cost, i.standard_cost from public.inventory_count_lines cl join public.items i on i.id = cl.item_id where cl.count_id = p_id and cl.counted_qty is not null loop
    select coalesce(sum(quantity), 0) into cur from public.inventory_balances b
     where b.organization_id = h.organization_id and b.item_id = l.item_id and b.warehouse_id = h.warehouse_id and b.bucket = 'available'
       and b.location_id is not distinct from l.location_id and b.lot_id is not distinct from l.lot_id;
    amount := amount + abs(l.counted_qty - cur) * coalesce(nullif(l.avg_cost, 0), l.standard_cost, 0);
  end loop;
  if not public.approval_satisfied(h.organization_id, 'inventory_count', p_id, amount) then
    raise exception 'Approbation requise : écart d’inventaire supérieur au seuil.' using errcode = 'P0001';
  end if;
  for l in select * from public.inventory_count_lines where count_id = p_id and counted_qty is not null order by id loop
    select coalesce(sum(quantity), 0) into cur from public.inventory_balances b
     where b.organization_id = h.organization_id and b.item_id = l.item_id and b.warehouse_id = h.warehouse_id and b.bucket = 'available'
       and b.location_id is not distinct from l.location_id and b.lot_id is not distinct from l.lot_id;
    delta := l.counted_qty - cur;
    if delta > 0 then
      mid := public.post_stock_movement(h.organization_id, 'count_adjustment', l.item_id, h.warehouse_id, delta, l.location_id, l.lot_id, 'available', null,
               'inventory_counts', p_id, l.id, 'cnt:' || l.id, 'Écart d’inventaire');
      select value into v from public.inventory_movements where id = mid; total := total + coalesce(v, 0);
    elsif delta < 0 then
      v := public.issue_stock(h.organization_id, 'count_adjustment', l.item_id, h.warehouse_id, -delta, 'inventory_counts', p_id, l.id, l.lot_id, l.location_id,
             'available', 'cnt:' || l.id, 'Écart d’inventaire');
      total := total - coalesce(v, 0);
    end if;
  end loop;
  update public.inventory_counts set status = 'posted', total_variance_value = total where id = p_id;
  perform public.emit_event(h.organization_id, 'inventory.count.posted', 'inventory_count', p_id, jsonb_build_object('number', h.number, 'variance_value', total));
  return total;
end $$;

-- ───────── warehouse tasks ─────────
create or replace function public.complete_warehouse_task(p_id text, p_to_location text default null, p_qty numeric default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.warehouse_tasks; qty numeric; a record; n int := 0; dest text;
begin
  select * into t from public.warehouse_tasks where id = p_id for update;
  if not found then raise exception 'Tâche introuvable.' using errcode = '22023'; end if;
  perform public._require(t.organization_id, 'warehouse.pick');
  if t.status in ('done', 'cancelled') then raise exception 'Tâche déjà clôturée.' using errcode = '22023'; end if;
  qty := coalesce(p_qty, t.quantity);
  dest := coalesce(p_to_location, t.to_location_id);
  if t.task_type in ('putaway', 'move', 'replenish') and t.item_id is not null and qty > 0 then
    if dest is null then raise exception 'Emplacement de destination requis.' using errcode = '22023'; end if;
    for a in select * from public.allocate_stock(t.organization_id, t.item_id, t.warehouse_id, qty, t.lot_id, t.from_location_id) loop
      n := n + 1;
      perform public.post_stock_movement(t.organization_id, 'transfer_out', t.item_id, t.warehouse_id, -a.qty, a.location_id, a.lot_id, 'available', null, 'warehouse_tasks', p_id, null, 'task-out:' || p_id || ':' || n, null, true);
      perform public.post_stock_movement(t.organization_id, 'transfer_in', t.item_id, t.warehouse_id, a.qty, dest, a.lot_id, 'available', null, 'warehouse_tasks', p_id, null, 'task-in:' || p_id || ':' || n, null, true);
    end loop;
  end if;
  update public.warehouse_tasks set status = 'done', completed_at = now(), to_location_id = coalesce(dest, to_location_id), assignee_id = coalesce(assignee_id, (select auth.uid())) where id = p_id;
end $$;

-- ───────── reversal of posted documents (contre-passation) ─────────
create or replace function public.reverse_document(p_type text, p_id text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare tbl text; perm text; j jsonb; org text; m record; l record;
begin
  perform set_config('app.bypass_lock', 'on', true);
  if coalesce(trim(p_reason), '') = '' then raise exception 'Un motif est requis pour annuler un document comptabilisé.' using errcode = '22023'; end if;
  select x.tbl, x.perm into tbl, perm from (values
    ('stock_adjustment', 'stock_adjustments', 'inventory.adjust'), ('stock_transfer', 'stock_transfers', 'inventory.transfer'),
    ('purchase_receipt', 'purchase_receipts', 'warehouse.receive'), ('delivery', 'deliveries', 'warehouse.dispatch'),
    ('inventory_count', 'inventory_counts', 'inventory.count'), ('customer_return', 'customer_returns', 'warehouse.receive'),
    ('supplier_return', 'supplier_returns', 'warehouse.dispatch')
  ) as x (typ, tbl, perm) where x.typ = p_type;
  if tbl is null then raise exception 'Ce type de document ne peut pas être contre-passé.' using errcode = '22023'; end if;
  execute format('select to_jsonb(t) from public.%I t where id = $1 for update', tbl) into j using p_id;
  if j is null then raise exception 'Document introuvable.' using errcode = '22023'; end if;
  org := j ->> 'organization_id';
  perform public._require(org, perm);
  if j ->> 'status' <> 'posted' then raise exception 'Seuls les documents comptabilisés peuvent être contre-passés.' using errcode = '22023'; end if;
  for m in select * from public.inventory_movements where organization_id = org and source_type = tbl and source_id = p_id and reverses_id is null
             and not exists (select 1 from public.inventory_movements r where r.reverses_id = inventory_movements.id) order by created_at desc loop
    perform public.post_stock_movement(org, 'reversal', m.item_id, m.warehouse_id, -m.quantity, m.location_id, m.lot_id, m.bucket, m.unit_cost,
              m.source_type, m.source_id, m.source_line_id, 'rev:' || m.id, p_reason, m.movement_type in ('transfer_in', 'transfer_out'), m.id);
  end loop;
  if p_type = 'purchase_receipt' then
    for l in execute format('select * from public.purchase_receipt_lines where receipt_id = %L', p_id) loop
      if (to_jsonb(l) ->> 'po_line_id') is not null then
        update public.purchase_order_lines set received_qty = greatest(received_qty - (to_jsonb(l) ->> 'quantity')::numeric, 0) where id = (to_jsonb(l) ->> 'po_line_id');
      end if;
    end loop;
  elsif p_type = 'delivery' then
    for l in execute format('select * from public.delivery_lines where delivery_id = %L', p_id) loop
      if (to_jsonb(l) ->> 'so_line_id') is not null then
        update public.sales_order_lines set delivered_qty = greatest(delivered_qty - (to_jsonb(l) ->> 'quantity')::numeric, 0) where id = (to_jsonb(l) ->> 'so_line_id');
      end if;
    end loop;
  end if;
  execute format('update public.%I set status = ''reversed'', reversed_at = now(), reversal_reason = $2 where id = $1', tbl) using p_id, p_reason;
  perform public.emit_event(org, p_type || '.reversed', p_type, p_id, jsonb_build_object('reason', p_reason));
end $$;

-- ───────── grants ─────────
revoke execute on function public.post_stock_movement(text, public.movement_type, text, text, numeric, text, text, public.stock_bucket, numeric, text, text, text, text, text, boolean, text),
  public.allocate_stock(text, text, text, numeric, text, text, public.stock_bucket),
  public.issue_stock(text, public.movement_type, text, text, numeric, text, text, text, text, text, public.stock_bucket, text, text),
  public._apply_serials(text, text, text, text, text, text, text[], numeric, text, text, text),
  public._ensure_lot(text, text, text, text, date, date, text, text, text), public._assert_postable(text, text, text, numeric, text), public._require(text, text)
  from public, anon, authenticated;
revoke execute on function public.available_to_promise(text, text, text), public.reserve_stock(text, text, text, numeric, text, text, text, text),
  public.release_reservations(text, text, text, text), public.submit_document(text, text), public.cancel_document(text, text, text),
  public.post_stock_adjustment(text), public.post_stock_transfer(text), public.start_inventory_count(text), public.record_count_line(text, numeric),
  public.post_inventory_count(text), public.complete_warehouse_task(text, text, numeric), public.reverse_document(text, text, text) from public, anon;
grant execute on function public.available_to_promise(text, text, text), public.reserve_stock(text, text, text, numeric, text, text, text, text),
  public.release_reservations(text, text, text, text), public.submit_document(text, text), public.cancel_document(text, text, text),
  public.post_stock_adjustment(text), public.post_stock_transfer(text), public.start_inventory_count(text), public.record_count_line(text, numeric),
  public.post_inventory_count(text), public.complete_warehouse_task(text, text, numeric), public.reverse_document(text, text, text) to authenticated;
