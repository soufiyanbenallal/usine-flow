-- Sales: quotes, sales orders, deliveries (with picking/packing/dispatch stages), returns, invoices.

create table public.quotes (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  customer_id text not null references public.partners (id),
  quote_date date not null default current_date,
  valid_until date,
  currency text not null default 'MAD',
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled')),
  subtotal numeric(18, 2) not null default 0, tax_amount numeric(18, 2) not null default 0, total_amount numeric(18, 2) not null default 0,
  notes text
);
create unique index quotes_number_key on public.quotes (organization_id, number);
select public._secure('quotes', 'sales.write');
create trigger assign_number before insert on public.quotes for each row execute function public.assign_document_number('quote');

create table public.quote_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  quote_id text not null references public.quotes (id) on delete cascade,
  item_id text not null references public.items (id),
  description text,
  quantity numeric(18, 4) not null check (quantity > 0),
  uom_id text references public.uoms (id),
  base_quantity numeric(18, 4),
  unit_price numeric(18, 4) not null default 0 check (unit_price >= 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  vat_rate numeric(5, 2) not null default 20,
  line_total numeric(18, 2) not null default 0
);
create index quote_lines_doc_idx on public.quote_lines (quote_id);
select public._secure('quote_lines', 'sales.write');
create trigger base_qty before insert or update on public.quote_lines for each row execute function public.set_base_quantity();
create trigger line_total before insert or update on public.quote_lines for each row execute function public.set_line_total();
create trigger lock_lines before insert or update or delete on public.quote_lines for each row execute function public.lock_lines_unless_draft('quotes', 'quote_id');
create trigger totals after insert or update or delete on public.quote_lines for each row execute function public.recalc_document_totals('quotes', 'quote_id');

create table public.sales_orders (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  customer_id text not null references public.partners (id),
  quote_id text references public.quotes (id) on delete set null,
  warehouse_id text references public.warehouses (id),
  delivery_address_id text references public.partner_addresses (id) on delete set null,
  order_date date not null default current_date,
  requested_date date,
  currency text not null default 'MAD',
  payment_terms_days int not null default 30,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'confirmed', 'partially_delivered', 'delivered', 'invoiced', 'closed', 'cancelled')),
  subtotal numeric(18, 2) not null default 0, tax_amount numeric(18, 2) not null default 0, total_amount numeric(18, 2) not null default 0,
  cost_amount numeric(18, 2) not null default 0,
  notes text
);
create unique index sales_orders_number_key on public.sales_orders (organization_id, number);
create index sales_orders_customer_idx on public.sales_orders (organization_id, customer_id);
create index sales_orders_status_idx on public.sales_orders (organization_id, status);
select public._secure('sales_orders', 'sales.write');
create trigger assign_number before insert on public.sales_orders for each row execute function public.assign_document_number('sales_order');

create table public.sales_order_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  so_id text not null references public.sales_orders (id) on delete cascade,
  item_id text not null references public.items (id),
  description text,
  quantity numeric(18, 4) not null check (quantity > 0),
  uom_id text references public.uoms (id),
  base_quantity numeric(18, 4),
  unit_price numeric(18, 4) not null default 0 check (unit_price >= 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  vat_rate numeric(5, 2) not null default 20,
  line_total numeric(18, 2) not null default 0,
  delivered_qty numeric(18, 4) not null default 0,
  invoiced_qty numeric(18, 4) not null default 0,
  cost_amount numeric(18, 4) not null default 0,
  requested_date date
);
create index sales_order_lines_doc_idx on public.sales_order_lines (so_id);
create index sales_order_lines_item_idx on public.sales_order_lines (organization_id, item_id);
select public._secure('sales_order_lines', 'sales.write');
create trigger base_qty before insert or update on public.sales_order_lines for each row execute function public.set_base_quantity();
create trigger line_total before insert or update on public.sales_order_lines for each row execute function public.set_line_total();
create trigger lock_lines before insert or update or delete on public.sales_order_lines for each row execute function public.lock_lines_unless_draft('sales_orders', 'so_id');
create trigger totals after insert or update or delete on public.sales_order_lines for each row execute function public.recalc_document_totals('sales_orders', 'so_id');

create table public.deliveries (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  so_id text references public.sales_orders (id) on delete set null,
  customer_id text not null references public.partners (id),
  warehouse_id text not null references public.warehouses (id),
  carrier_id text references public.partners (id) on delete set null,
  vehicle text,
  driver text,
  tracking_no text,
  delivery_date date not null default current_date,
  stage text not null default 'pending' check (stage in ('pending', 'picking', 'packed', 'loaded', 'dispatched')),
  status text not null default 'draft' check (status in ('draft', 'posted', 'reversed', 'cancelled')),
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index deliveries_number_key on public.deliveries (organization_id, number);
create index deliveries_so_idx on public.deliveries (so_id);
select public._secure('deliveries', 'warehouse.dispatch');
create trigger assign_number before insert on public.deliveries for each row execute function public.assign_document_number('delivery');
create trigger lock_posted before update or delete on public.deliveries for each row execute function public.lock_posted_document();

create table public.delivery_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  delivery_id text not null references public.deliveries (id) on delete cascade,
  so_line_id text references public.sales_order_lines (id) on delete set null,
  item_id text not null references public.items (id),
  quantity numeric(18, 4) not null check (quantity > 0),
  uom_id text references public.uoms (id),
  base_quantity numeric(18, 4),
  lot_id text references public.lots (id),
  location_id text references public.locations (id),
  serials text[]
);
create index delivery_lines_doc_idx on public.delivery_lines (delivery_id);
create index delivery_lines_lot_idx on public.delivery_lines (lot_id) where lot_id is not null;
select public._secure('delivery_lines', 'warehouse.dispatch');
create trigger base_qty before insert or update on public.delivery_lines for each row execute function public.set_base_quantity();
create trigger lock_lines before insert or update or delete on public.delivery_lines for each row execute function public.lock_document_lines('deliveries', 'delivery_id');

create table public.customer_returns (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  customer_id text not null references public.partners (id),
  delivery_id text references public.deliveries (id) on delete set null,
  warehouse_id text not null references public.warehouses (id),
  reason text,
  status text not null default 'draft' check (status in ('draft', 'posted', 'reversed', 'cancelled')),
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index customer_returns_number_key on public.customer_returns (organization_id, number);
select public._secure('customer_returns', 'warehouse.receive');
create trigger assign_number before insert on public.customer_returns for each row execute function public.assign_document_number('customer_return');
create trigger lock_posted before update or delete on public.customer_returns for each row execute function public.lock_posted_document();

create table public.customer_return_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  return_id text not null references public.customer_returns (id) on delete cascade,
  item_id text not null references public.items (id),
  lot_id text references public.lots (id),
  location_id text references public.locations (id),
  quantity numeric(18, 4) not null check (quantity > 0),
  condition text not null default 'good' check (condition in ('good', 'damaged', 'quarantine')),
  unit_cost numeric(18, 4)
);
select public._secure('customer_return_lines', 'warehouse.receive');
create trigger lock_lines before insert or update or delete on public.customer_return_lines for each row execute function public.lock_document_lines('customer_returns', 'return_id');

create table public.sales_invoices (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  customer_id text not null references public.partners (id),
  so_id text references public.sales_orders (id) on delete set null,
  delivery_id text references public.deliveries (id) on delete set null,
  invoice_date date not null default current_date,
  due_date date,
  currency text not null default 'MAD',
  subtotal numeric(18, 2) not null default 0, tax_amount numeric(18, 2) not null default 0, total_amount numeric(18, 2) not null default 0,
  paid_amount numeric(18, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'approved', 'posted', 'reversed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid')),
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index sales_invoices_number_key on public.sales_invoices (organization_id, number);
create index sales_invoices_customer_idx on public.sales_invoices (organization_id, customer_id);
select public._secure('sales_invoices', 'finance.write');
create trigger assign_number before insert on public.sales_invoices for each row execute function public.assign_document_number('sales_invoice');
create trigger lock_posted before update or delete on public.sales_invoices for each row execute function public.lock_posted_document();

create table public.sales_invoice_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  invoice_id text not null references public.sales_invoices (id) on delete cascade,
  so_line_id text references public.sales_order_lines (id) on delete set null,
  item_id text references public.items (id),
  description text not null,
  quantity numeric(18, 4) not null default 1,
  unit_price numeric(18, 4) not null default 0,
  discount_pct numeric(5, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 20,
  line_total numeric(18, 2) not null default 0
);
select public._secure('sales_invoice_lines', 'finance.write');
create trigger line_total before insert or update on public.sales_invoice_lines for each row execute function public.set_line_total();
create trigger lock_lines before insert or update or delete on public.sales_invoice_lines for each row execute function public.lock_document_lines('sales_invoices', 'invoice_id');
create trigger totals after insert or update or delete on public.sales_invoice_lines for each row execute function public.recalc_document_totals('sales_invoices', 'invoice_id');

-- ───────── sales functions ─────────
create or replace function public.customer_exposure(p_org text, p_customer text)
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce((select sum(total_amount - paid_amount) from public.sales_invoices where organization_id = p_org and customer_id = p_customer and status = 'posted'), 0)
       + coalesce((select sum(total_amount) from public.sales_orders so where so.organization_id = p_org and so.customer_id = p_customer and so.status in ('confirmed', 'partially_delivered', 'delivered')
                    and not exists (select 1 from public.sales_invoices i where i.so_id = so.id and i.status = 'posted')), 0);
$$;

create or replace function public.confirm_sales_order(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.sales_orders; c public.partners; exposure numeric; l record; avail numeric; take numeric;
begin
  select * into h from public.sales_orders where id = p_id for update;
  if not found then raise exception 'Commande introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'sales.write');
  if h.status not in ('draft', 'approved') then raise exception 'Cette commande ne peut pas être confirmée (statut : %).', h.status using errcode = '22023'; end if;
  if not public.approval_satisfied(h.organization_id, 'sales_order', p_id, h.total_amount) then raise exception 'Approbation requise avant confirmation.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.sales_order_lines where so_id = p_id) then raise exception 'La commande ne contient aucune ligne.' using errcode = '22023'; end if;
  select * into c from public.partners where id = h.customer_id;
  if c.credit_limit > 0 then
    exposure := public.customer_exposure(h.organization_id, h.customer_id);
    if exposure + h.total_amount > c.credit_limit then
      raise exception 'Plafond de crédit dépassé : encours % + commande % > limite %.', exposure, h.total_amount, c.credit_limit using errcode = 'P0001';
    end if;
  end if;
  if h.warehouse_id is not null then
    for l in select * from public.sales_order_lines where so_id = p_id loop
      avail := public.available_to_promise(h.organization_id, l.item_id, h.warehouse_id);
      take := least(greatest(avail, 0), l.base_quantity);
      if take > 0 then
        perform public.reserve_stock(h.organization_id, l.item_id, h.warehouse_id, take, 'sales_order', p_id, l.id);
      end if;
    end loop;
  end if;
  update public.sales_orders set status = 'confirmed' where id = p_id;
  perform public.emit_event(h.organization_id, 'sales.order.confirmed', 'sales_order', p_id, jsonb_build_object('number', h.number, 'total', h.total_amount));
end $$;

create or replace function public.convert_quote_to_order(p_quote text, p_warehouse text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare q public.quotes; sid text;
begin
  select * into q from public.quotes where id = p_quote for update;
  if not found then raise exception 'Devis introuvable.' using errcode = '22023'; end if;
  perform public._require(q.organization_id, 'sales.write');
  if q.status not in ('approved', 'sent', 'accepted') then raise exception 'Le devis doit être approuvé ou accepté (statut : %).', q.status using errcode = '22023'; end if;
  insert into public.sales_orders (organization_id, customer_id, quote_id, warehouse_id, currency, payment_terms_days, requested_date)
  values (q.organization_id, q.customer_id, p_quote, p_warehouse, q.currency, coalesce((select payment_terms_days from public.partners where id = q.customer_id), 30), null) returning id into sid;
  insert into public.sales_order_lines (organization_id, so_id, item_id, description, quantity, uom_id, unit_price, discount_pct, vat_rate)
  select organization_id, sid, item_id, description, quantity, uom_id, unit_price, discount_pct, vat_rate from public.quote_lines where quote_id = p_quote;
  update public.quotes set status = 'converted' where id = p_quote;
  return sid;
end $$;

create or replace function public.create_delivery_from_so(p_so text)
returns text language plpgsql security definer set search_path = '' as $$
declare h public.sales_orders; did text;
begin
  select * into h from public.sales_orders where id = p_so;
  if not found then raise exception 'Commande introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'warehouse.dispatch');
  if h.status not in ('confirmed', 'partially_delivered') then raise exception 'La commande doit être confirmée.' using errcode = '22023'; end if;
  if h.warehouse_id is null then raise exception 'Entrepôt de la commande requis.' using errcode = '22023'; end if;
  insert into public.deliveries (organization_id, so_id, customer_id, warehouse_id) values (h.organization_id, p_so, h.customer_id, h.warehouse_id) returning id into did;
  insert into public.delivery_lines (organization_id, delivery_id, so_line_id, item_id, quantity, uom_id)
  select organization_id, did, id, item_id, quantity - delivered_qty, uom_id from public.sales_order_lines where so_id = p_so and quantity - delivered_qty > 0;
  return did;
end $$;

create or replace function public.post_delivery(p_id text)
returns void language plpgsql security definer set search_path = '' set app.bypass_lock = 'on' as $$
declare h public.deliveries; l record; v numeric; open_lines int; res record; left_qty numeric; take numeric;
begin
  select * into h from public.deliveries where id = p_id for update;
  if not found then raise exception 'Livraison introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'warehouse.dispatch');
  if h.status <> 'draft' then raise exception 'Cette livraison est déjà traitée.' using errcode = '22023'; end if;
  if not exists (select 1 from public.delivery_lines where delivery_id = p_id) then raise exception 'La livraison ne contient aucune ligne.' using errcode = '22023'; end if;
  for l in select * from public.delivery_lines where delivery_id = p_id order by id loop
    -- free the reservation of this order line first so that its own stock is available
    if l.so_line_id is not null then
      left_qty := l.base_quantity;
      for res in select * from public.inventory_reservations where source_type = 'sales_order' and source_line_id = l.so_line_id and status = 'active' order by created_at for update loop
        exit when left_qty <= 0;
        take := least(res.quantity, left_qty);
        if take >= res.quantity then update public.inventory_reservations set status = 'fulfilled' where id = res.id;
        else update public.inventory_reservations set quantity = quantity - take where id = res.id; end if;
        left_qty := left_qty - take;
      end loop;
    end if;
    v := public.issue_stock(h.organization_id, 'sale', l.item_id, h.warehouse_id, l.base_quantity, 'deliveries', p_id, l.id, l.lot_id, l.location_id, 'available', 'dlv:' || l.id, h.number);
    if l.serials is not null then perform public._apply_serials(h.organization_id, l.item_id, h.warehouse_id, l.location_id, l.lot_id, 'out', l.serials, l.base_quantity, 'deliveries', p_id, 'shipped'); end if;
    if l.so_line_id is not null then
      update public.sales_order_lines set delivered_qty = delivered_qty + l.quantity, cost_amount = cost_amount + v where id = l.so_line_id;
    end if;
  end loop;
  if h.so_id is not null then
    select count(*) into open_lines from public.sales_order_lines where so_id = h.so_id and delivered_qty < quantity;
    update public.sales_orders set status = case when open_lines = 0 then 'delivered' else 'partially_delivered' end,
           cost_amount = (select coalesce(sum(cost_amount), 0) from public.sales_order_lines where so_id = h.so_id) where id = h.so_id;
  end if;
  update public.deliveries set status = 'posted', stage = 'dispatched' where id = p_id;
  perform public.emit_event(h.organization_id, 'delivery.completed', 'delivery', p_id, jsonb_build_object('number', h.number, 'so_id', h.so_id));
end $$;

create or replace function public.post_customer_return(p_id text)
returns void language plpgsql security definer set search_path = '' set app.bypass_lock = 'on' as $$
declare h public.customer_returns; l record; bucket public.stock_bucket;
begin
  select * into h from public.customer_returns where id = p_id for update;
  if not found then raise exception 'Retour introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'warehouse.receive');
  if h.status <> 'draft' then raise exception 'Ce retour est déjà traité.' using errcode = '22023'; end if;
  for l in select * from public.customer_return_lines where return_id = p_id order by id loop
    bucket := case l.condition when 'good' then 'available' when 'damaged' then 'damaged' else 'quarantine' end;
    perform public.post_stock_movement(h.organization_id, 'return_in', l.item_id, h.warehouse_id, l.quantity, l.location_id, l.lot_id, bucket, l.unit_cost,
              'customer_returns', p_id, l.id, 'cret:' || l.id, h.reason);
  end loop;
  update public.customer_returns set status = 'posted' where id = p_id;
  perform public.emit_event(h.organization_id, 'sales.return.posted', 'customer_return', p_id, jsonb_build_object('number', h.number));
end $$;

create or replace function public.create_invoice_from_so(p_so text, p_delivered_only boolean default true)
returns text language plpgsql security definer set search_path = '' set app.bypass_lock = 'on' as $$
declare h public.sales_orders; iid text; n int;
begin
  select * into h from public.sales_orders where id = p_so for update;
  if not found then raise exception 'Commande introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'finance.write');
  if h.status not in ('confirmed', 'partially_delivered', 'delivered', 'invoiced') then raise exception 'Cette commande n’est pas facturable.' using errcode = '22023'; end if;
  insert into public.sales_invoices (organization_id, customer_id, so_id, due_date, currency)
  values (h.organization_id, h.customer_id, p_so, current_date + h.payment_terms_days, h.currency) returning id into iid;
  insert into public.sales_invoice_lines (organization_id, invoice_id, so_line_id, item_id, description, quantity, unit_price, discount_pct, vat_rate)
  select l.organization_id, iid, l.id, l.item_id, coalesce(l.description, i.name),
         case when p_delivered_only then l.delivered_qty - l.invoiced_qty else l.quantity - l.invoiced_qty end, l.unit_price, l.discount_pct, l.vat_rate
    from public.sales_order_lines l join public.items i on i.id = l.item_id
   where l.so_id = p_so and (case when p_delivered_only then l.delivered_qty - l.invoiced_qty else l.quantity - l.invoiced_qty end) > 0;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Rien à facturer pour cette commande.' using errcode = '22023'; end if;
  return iid;
end $$;

create or replace function public.post_sales_invoice(p_id text)
returns void language plpgsql security definer set search_path = '' set app.bypass_lock = 'on' as $$
declare h public.sales_invoices; l record; open_lines int;
begin
  select * into h from public.sales_invoices where id = p_id for update;
  if not found then raise exception 'Facture introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'finance.write');
  if h.status not in ('draft', 'approved') then raise exception 'Cette facture est déjà comptabilisée.' using errcode = '22023'; end if;
  if not exists (select 1 from public.sales_invoice_lines where invoice_id = p_id) then raise exception 'La facture ne contient aucune ligne.' using errcode = '22023'; end if;
  for l in select * from public.sales_invoice_lines where invoice_id = p_id and so_line_id is not null loop
    update public.sales_order_lines set invoiced_qty = invoiced_qty + l.quantity where id = l.so_line_id;
  end loop;
  if h.so_id is not null then
    select count(*) into open_lines from public.sales_order_lines where so_id = h.so_id and invoiced_qty < quantity;
    if open_lines = 0 then update public.sales_orders set status = 'invoiced' where id = h.so_id and status in ('delivered', 'partially_delivered', 'confirmed'); end if;
  end if;
  update public.sales_invoices set status = 'posted', due_date = coalesce(due_date, invoice_date + coalesce((select payment_terms_days from public.partners where id = h.customer_id), 30)) where id = p_id;
  perform public.emit_event(h.organization_id, 'sales.invoice.posted', 'sales_invoice', p_id, jsonb_build_object('number', h.number, 'total', h.total_amount));
end $$;

revoke execute on function public.customer_exposure(text, text), public.confirm_sales_order(text), public.convert_quote_to_order(text, text), public.create_delivery_from_so(text),
  public.post_delivery(text), public.post_customer_return(text), public.create_invoice_from_so(text, boolean), public.post_sales_invoice(text) from public, anon;
grant execute on function public.customer_exposure(text, text), public.confirm_sales_order(text), public.convert_quote_to_order(text, text), public.create_delivery_from_so(text),
  public.post_delivery(text), public.post_customer_return(text), public.create_invoice_from_so(text, boolean), public.post_sales_invoice(text) to authenticated;
