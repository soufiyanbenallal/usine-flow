-- Master data: units of measure, categories, items, barcodes, price lists, partners.

-- ───────── units of measure ─────────
create table public.uoms (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  category text not null default 'count' check (category in ('weight', 'volume', 'length', 'area', 'count', 'time', 'packaging')),
  decimals int not null default 3 check (decimals between 0 and 6),
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('uoms', 'catalog.write');

-- 1 from_uom = factor to_uom (e.g. 1 carton = 24 piece)
create table public.uom_conversions (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  from_uom_id text not null references public.uoms (id) on delete cascade,
  to_uom_id text not null references public.uoms (id) on delete cascade,
  factor numeric(24, 10) not null check (factor > 0),
  unique (organization_id, from_uom_id, to_uom_id),
  check (from_uom_id <> to_uom_id)
);
select public._secure('uom_conversions', 'catalog.write');

-- ───────── categories ─────────
create table public.item_categories (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  parent_id text references public.item_categories (id) on delete set null,
  code text not null,
  name text not null,
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('item_categories', 'catalog.write');

-- ───────── partners (customers, suppliers, …) ─────────
create table public.price_lists (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  name text not null,
  kind text not null default 'sales' check (kind in ('sales', 'purchase')),
  currency text not null default 'MAD',
  active boolean not null default true,
  unique (organization_id, name)
);
select public._secure('price_lists', 'catalog.write');

create table public.partners (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  name_ar text,
  kinds text[] not null default '{customer}' check (kinds <@ array['customer', 'supplier', 'subcontractor', 'transporter', 'other']),
  category text,
  ice text, if_number text, rc text, tax_profile text default 'standard',
  email text, phone text, website text,
  payment_terms_days int not null default 30 check (payment_terms_days >= 0),
  credit_limit numeric(18, 2) not null default 0 check (credit_limit >= 0),
  currency text not null default 'MAD',
  price_list_id text references public.price_lists (id) on delete set null,
  lead_time_days int not null default 0,
  rating numeric(3, 1),
  notes text,
  active boolean not null default true,
  unique (organization_id, code)
);
create index partners_name_idx on public.partners (organization_id, name);
select public._secure('partners', 'partners.write');

create table public.partner_contacts (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  partner_id text not null references public.partners (id) on delete cascade,
  name text not null,
  role text, email text, phone text,
  is_primary boolean not null default false
);
create index partner_contacts_partner_idx on public.partner_contacts (partner_id);
select public._secure('partner_contacts', 'partners.write');

create table public.partner_addresses (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  partner_id text not null references public.partners (id) on delete cascade,
  kind text not null default 'billing' check (kind in ('billing', 'delivery', 'other')),
  line1 text not null, line2 text, city text, postal_code text, country text not null default 'MA',
  is_default boolean not null default false
);
create index partner_addresses_partner_idx on public.partner_addresses (partner_id);
select public._secure('partner_addresses', 'partners.write');

-- ───────── items ─────────
create table public.items (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  sku text not null,
  internal_ref text,
  name text not null,
  name_ar text,
  name_fr text,
  description text,
  item_type text not null default 'raw_material' check (item_type in
    ('raw_material', 'component', 'consumable', 'packaging', 'semi_finished', 'finished_product', 'spare_part', 'service')),
  category_id text references public.item_categories (id) on delete set null,
  brand text,
  family text,
  base_uom_id text not null references public.uoms (id),
  purchase_uom_id text references public.uoms (id),
  sales_uom_id text references public.uoms (id),
  production_uom_id text references public.uoms (id),
  weight numeric(18, 4), volume numeric(18, 4), length numeric(18, 4), width numeric(18, 4), height numeric(18, 4),
  min_stock numeric(18, 4) not null default 0 check (min_stock >= 0),
  max_stock numeric(18, 4) check (max_stock is null or max_stock >= 0),
  safety_stock numeric(18, 4) not null default 0 check (safety_stock >= 0),
  reorder_point numeric(18, 4) not null default 0 check (reorder_point >= 0),
  reorder_qty numeric(18, 4) not null default 0 check (reorder_qty >= 0),
  lead_time_days int not null default 0 check (lead_time_days >= 0),
  manufacturer_ref text,
  tracking text not null default 'none' check (tracking in ('none', 'lot', 'serial')),
  expiry_tracking boolean not null default false,
  valuation_method text not null default 'average' check (valuation_method in ('fifo', 'average', 'standard')),
  standard_cost numeric(18, 4) not null default 0 check (standard_cost >= 0),
  last_purchase_cost numeric(18, 4) not null default 0,
  avg_cost numeric(18, 4) not null default 0,
  sale_price numeric(18, 4) not null default 0 check (sale_price >= 0),
  vat_rate numeric(5, 2) not null default 20,
  requires_inspection boolean not null default false,
  is_purchasable boolean not null default true,
  is_sellable boolean not null default false,
  is_manufactured boolean not null default false,
  image_path text,
  active boolean not null default true,
  unique (organization_id, sku)
);
create index items_name_idx on public.items (organization_id, name);
create index items_category_idx on public.items (category_id);
create index items_type_idx on public.items (organization_id, item_type);
select public._secure('items', 'catalog.write');

-- item specific unit conversion: 1 uom = factor_to_base base units
create table public.item_uoms (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  uom_id text not null references public.uoms (id),
  factor_to_base numeric(24, 10) not null check (factor_to_base > 0),
  purpose text not null default 'purchase' check (purpose in ('purchase', 'sales', 'production', 'storage')),
  unique (item_id, uom_id)
);
select public._secure('item_uoms', 'catalog.write');

create table public.item_barcodes (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  barcode text not null,
  kind text not null default 'ean13' check (kind in ('ean13', 'ean8', 'code128', 'code39', 'qr', 'internal')),
  uom_id text references public.uoms (id),
  is_primary boolean not null default false,
  unique (organization_id, barcode)
);
create index item_barcodes_item_idx on public.item_barcodes (item_id);
select public._secure('item_barcodes', 'catalog.write');

create table public.item_suppliers (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  supplier_id text not null references public.partners (id) on delete cascade,
  supplier_ref text,
  price numeric(18, 4) not null default 0 check (price >= 0),
  currency text not null default 'MAD',
  lead_time_days int not null default 0,
  min_order_qty numeric(18, 4) not null default 0,
  preferred boolean not null default false,
  unique (item_id, supplier_id)
);
select public._secure('item_suppliers', 'catalog.write');

create table public.item_prices (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  item_id text not null references public.items (id) on delete cascade,
  price_list_id text not null references public.price_lists (id) on delete cascade,
  price numeric(18, 4) not null check (price >= 0),
  min_qty numeric(18, 4) not null default 0,
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  valid_from date, valid_to date,
  unique (price_list_id, item_id, min_qty)
);
select public._secure('item_prices', 'catalog.write');

-- ───────── unit conversion helpers ─────────
-- Base units per 1 `uom` of the item. Item specific factor first, then organization conversions to the base unit.
create or replace function public.item_uom_factor(p_item text, p_uom text)
returns numeric language plpgsql stable security definer set search_path = '' as $$
declare base text; org text; f numeric;
begin
  select base_uom_id, organization_id into base, org from public.items where id = p_item;
  if base is null then raise exception 'Article introuvable.'; end if;
  if p_uom is null or p_uom = base then return 1; end if;
  select factor_to_base into f from public.item_uoms where item_id = p_item and uom_id = p_uom;
  if f is not null then return f; end if;
  select factor into f from public.uom_conversions where organization_id = org and from_uom_id = p_uom and to_uom_id = base;
  if f is not null then return f; end if;
  select 1 / factor into f from public.uom_conversions where organization_id = org and from_uom_id = base and to_uom_id = p_uom;
  if f is not null then return f; end if;
  raise exception 'Aucune conversion d’unité définie pour cet article.' using errcode = '22023';
end $$;

create or replace function public.convert_uom(p_item text, p_qty numeric, p_from text, p_to text)
returns numeric language sql stable security definer set search_path = '' as $$
  select p_qty * public.item_uom_factor(p_item, p_from) / public.item_uom_factor(p_item, p_to);
$$;

-- before insert/update trigger for document lines: fills base_quantity from quantity/uom_id.
create or replace function public.set_base_quantity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.base_quantity := round(new.quantity * public.item_uom_factor(new.item_id, new.uom_id), 4);
  return new;
end $$;

-- full-text/trigram search support
do $$ begin
  begin create extension if not exists pg_trgm; exception when others then null; end;
end $$;

revoke execute on function public.item_uom_factor(text, text), public.convert_uom(text, numeric, text, text), public.set_base_quantity() from public, anon;
grant execute on function public.item_uom_factor(text, text), public.convert_uom(text, numeric, text, text) to authenticated;
