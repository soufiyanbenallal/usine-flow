-- Procurement: purchase requests, RFQs, purchase orders, receipts, returns, supplier invoices, agreements.

-- Generic line helpers (shared with sales)
create or replace function public.set_line_total()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.line_total := round(new.quantity * new.unit_price * (1 - coalesce(new.discount_pct, 0) / 100), 2);
  return new;
end $$;

create or replace function public.recalc_document_totals()
returns trigger language plpgsql security definer set search_path = '' as $$
declare hid text := coalesce(to_jsonb(new) ->> tg_argv[1], to_jsonb(old) ->> tg_argv[1]);
begin
  execute format('update public.%I h set subtotal = s.sub, tax_amount = s.tax, total_amount = s.sub + s.tax
                    from (select round(coalesce(sum(line_total), 0), 2) as sub, round(coalesce(sum(line_total * vat_rate / 100), 0), 2) as tax from public.%I where %I = $1) s
                   where h.id = $1', tg_argv[0], tg_table_name, tg_argv[1]) using hid;
  return null;
end $$;

-- Lines can only change while the parent document is a draft.
create or replace function public.lock_lines_unless_draft()
returns trigger language plpgsql set search_path = '' as $$
declare parent_id text; parent_status text;
begin
  if coalesce(current_setting('app.bypass_lock', true), '') = 'on' then return coalesce(new, old); end if;
  parent_id := coalesce(to_jsonb(new) ->> tg_argv[1], to_jsonb(old) ->> tg_argv[1]);
  execute format('select status from public.%I where id = $1', tg_argv[0]) into parent_status using parent_id;
  if parent_status is not null and parent_status <> 'draft' then
    raise exception 'Les lignes ne sont modifiables que lorsque le document est en brouillon.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
revoke execute on function public.set_line_total(), public.recalc_document_totals(), public.lock_lines_unless_draft() from public, anon, authenticated;

-- ───────── purchase requests ─────────
create table public.purchase_requests (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  department_id text references public.departments (id) on delete set null,
  requested_by_name text,
  needed_on date,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'converted', 'cancelled')),
  subtotal numeric(18, 2) not null default 0, tax_amount numeric(18, 2) not null default 0, total_amount numeric(18, 2) not null default 0,
  notes text
);
create unique index purchase_requests_number_key on public.purchase_requests (organization_id, number);
select public._secure('purchase_requests', 'purchase.write');
create trigger assign_number before insert on public.purchase_requests for each row execute function public.assign_document_number('purchase_request');

create table public.purchase_request_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  request_id text not null references public.purchase_requests (id) on delete cascade,
  item_id text not null references public.items (id),
  description text,
  quantity numeric(18, 4) not null check (quantity > 0),
  uom_id text references public.uoms (id),
  base_quantity numeric(18, 4),
  unit_price numeric(18, 4) not null default 0,
  discount_pct numeric(5, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 20,
  line_total numeric(18, 2) not null default 0,
  supplier_id text references public.partners (id) on delete set null
);
create index purchase_request_lines_doc_idx on public.purchase_request_lines (request_id);
select public._secure('purchase_request_lines', 'purchase.write');
create trigger base_qty before insert or update on public.purchase_request_lines for each row execute function public.set_base_quantity();
create trigger line_total before insert or update on public.purchase_request_lines for each row execute function public.set_line_total();
create trigger lock_lines before insert or update or delete on public.purchase_request_lines for each row execute function public.lock_lines_unless_draft('purchase_requests', 'request_id');
create trigger totals after insert or update or delete on public.purchase_request_lines for each row execute function public.recalc_document_totals('purchase_requests', 'request_id');

-- ───────── purchase agreements ─────────
create table public.purchase_agreements (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  supplier_id text not null references public.partners (id),
  valid_from date not null default current_date,
  valid_to date,
  status text not null default 'draft' check (status in ('draft', 'active', 'expired', 'cancelled')),
  notes text
);
create unique index purchase_agreements_number_key on public.purchase_agreements (organization_id, number);
select public._secure('purchase_agreements', 'purchase.write');
create trigger assign_number before insert on public.purchase_agreements for each row execute function public.assign_document_number('purchase_agreement');

create table public.purchase_agreement_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  agreement_id text not null references public.purchase_agreements (id) on delete cascade,
  item_id text not null references public.items (id),
  price numeric(18, 4) not null check (price >= 0),
  min_qty numeric(18, 4) not null default 0,
  max_qty numeric(18, 4)
);
select public._secure('purchase_agreement_lines', 'purchase.write');

-- ───────── RFQ ─────────
create table public.rfqs (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  request_id text references public.purchase_requests (id) on delete set null,
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'quoted', 'awarded', 'cancelled')),
  notes text
);
create unique index rfqs_number_key on public.rfqs (organization_id, number);
select public._secure('rfqs', 'purchase.write');
create trigger assign_number before insert on public.rfqs for each row execute function public.assign_document_number('rfq');

create table public.rfq_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  rfq_id text not null references public.rfqs (id) on delete cascade,
  item_id text not null references public.items (id),
  quantity numeric(18, 4) not null check (quantity > 0),
  uom_id text references public.uoms (id)
);
select public._secure('rfq_lines', 'purchase.write');

create table public.rfq_quotes (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  rfq_id text not null references public.rfqs (id) on delete cascade,
  supplier_id text not null references public.partners (id),
  status text not null default 'invited' check (status in ('invited', 'quoted', 'declined', 'selected')),
  lead_time_days int,
  valid_until date,
  total_amount numeric(18, 2) not null default 0,
  notes text,
  unique (rfq_id, supplier_id)
);
select public._secure('rfq_quotes', 'purchase.write');

create table public.rfq_quote_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  quote_id text not null references public.rfq_quotes (id) on delete cascade,
  rfq_line_id text not null references public.rfq_lines (id) on delete cascade,
  unit_price numeric(18, 4) not null check (unit_price >= 0),
  unique (quote_id, rfq_line_id)
);
select public._secure('rfq_quote_lines', 'purchase.write');

create or replace function public.recalc_quote_total()
returns trigger language plpgsql security definer set search_path = '' as $$
declare qid text := coalesce(new.quote_id, old.quote_id);
begin
  update public.rfq_quotes q set total_amount = coalesce((
    select round(sum(ql.unit_price * l.quantity), 2) from public.rfq_quote_lines ql join public.rfq_lines l on l.id = ql.rfq_line_id where ql.quote_id = qid), 0),
    status = case when q.status = 'invited' then 'quoted' else q.status end where q.id = qid;
  return null;
end $$;
create trigger totals after insert or update or delete on public.rfq_quote_lines for each row execute function public.recalc_quote_total();
revoke execute on function public.recalc_quote_total() from public, anon, authenticated;

-- ───────── purchase orders ─────────
create table public.purchase_orders (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  supplier_id text not null references public.partners (id),
  warehouse_id text references public.warehouses (id),
  request_id text references public.purchase_requests (id) on delete set null,
  agreement_id text references public.purchase_agreements (id) on delete set null,
  rfq_id text references public.rfqs (id) on delete set null,
  order_date date not null default current_date,
  expected_date date,
  currency text not null default 'MAD',
  payment_terms_days int not null default 30,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'ordered', 'partially_received', 'received', 'closed', 'cancelled')),
  subtotal numeric(18, 2) not null default 0, tax_amount numeric(18, 2) not null default 0, total_amount numeric(18, 2) not null default 0,
  notes text
);
create unique index purchase_orders_number_key on public.purchase_orders (organization_id, number);
create index purchase_orders_supplier_idx on public.purchase_orders (organization_id, supplier_id);
create index purchase_orders_status_idx on public.purchase_orders (organization_id, status);
select public._secure('purchase_orders', 'purchase.write');
create trigger assign_number before insert on public.purchase_orders for each row execute function public.assign_document_number('purchase_order');

create table public.purchase_order_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  po_id text not null references public.purchase_orders (id) on delete cascade,
  item_id text not null references public.items (id),
  description text,
  quantity numeric(18, 4) not null check (quantity > 0),
  uom_id text references public.uoms (id),
  base_quantity numeric(18, 4),
  unit_price numeric(18, 4) not null default 0 check (unit_price >= 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 100),
  vat_rate numeric(5, 2) not null default 20,
  line_total numeric(18, 2) not null default 0,
  received_qty numeric(18, 4) not null default 0,
  expected_date date
);
create index purchase_order_lines_doc_idx on public.purchase_order_lines (po_id);
create index purchase_order_lines_item_idx on public.purchase_order_lines (organization_id, item_id);
select public._secure('purchase_order_lines', 'purchase.write');
create trigger base_qty before insert or update on public.purchase_order_lines for each row execute function public.set_base_quantity();
create trigger line_total before insert or update on public.purchase_order_lines for each row execute function public.set_line_total();
create trigger lock_lines before insert or update or delete on public.purchase_order_lines for each row execute function public.lock_lines_unless_draft('purchase_orders', 'po_id');
create trigger totals after insert or update or delete on public.purchase_order_lines for each row execute function public.recalc_document_totals('purchase_orders', 'po_id');

-- ───────── receipts ─────────
create table public.purchase_receipts (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  po_id text references public.purchase_orders (id) on delete set null,
  supplier_id text not null references public.partners (id),
  warehouse_id text not null references public.warehouses (id),
  location_id text references public.locations (id),
  supplier_delivery_note text,
  received_on date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'posted', 'reversed', 'cancelled')),
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index purchase_receipts_number_key on public.purchase_receipts (organization_id, number);
create index purchase_receipts_po_idx on public.purchase_receipts (po_id);
select public._secure('purchase_receipts', 'warehouse.receive');
create trigger assign_number before insert on public.purchase_receipts for each row execute function public.assign_document_number('purchase_receipt');
create trigger lock_posted before update or delete on public.purchase_receipts for each row execute function public.lock_posted_document();

create table public.purchase_receipt_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  receipt_id text not null references public.purchase_receipts (id) on delete cascade,
  po_line_id text references public.purchase_order_lines (id) on delete set null,
  item_id text not null references public.items (id),
  quantity numeric(18, 4) not null check (quantity > 0),
  uom_id text references public.uoms (id),
  base_quantity numeric(18, 4),
  unit_cost numeric(18, 4),
  lot_number text,
  expires_on date,
  manufactured_on date,
  location_id text references public.locations (id),
  lot_id text references public.lots (id),
  serials text[],
  discrepancy_note text
);
create index purchase_receipt_lines_doc_idx on public.purchase_receipt_lines (receipt_id);
select public._secure('purchase_receipt_lines', 'warehouse.receive');
create trigger base_qty before insert or update on public.purchase_receipt_lines for each row execute function public.set_base_quantity();
create trigger lock_lines before insert or update or delete on public.purchase_receipt_lines for each row execute function public.lock_document_lines('purchase_receipts', 'receipt_id');

-- ───────── supplier returns ─────────
create table public.supplier_returns (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  supplier_id text not null references public.partners (id),
  receipt_id text references public.purchase_receipts (id) on delete set null,
  warehouse_id text not null references public.warehouses (id),
  reason text,
  status text not null default 'draft' check (status in ('draft', 'posted', 'reversed', 'cancelled')),
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index supplier_returns_number_key on public.supplier_returns (organization_id, number);
select public._secure('supplier_returns', 'warehouse.dispatch');
create trigger assign_number before insert on public.supplier_returns for each row execute function public.assign_document_number('supplier_return');
create trigger lock_posted before update or delete on public.supplier_returns for each row execute function public.lock_posted_document();

create table public.supplier_return_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  return_id text not null references public.supplier_returns (id) on delete cascade,
  item_id text not null references public.items (id),
  lot_id text references public.lots (id),
  location_id text references public.locations (id),
  bucket public.stock_bucket not null default 'damaged',
  quantity numeric(18, 4) not null check (quantity > 0),
  unit_cost numeric(18, 4)
);
select public._secure('supplier_return_lines', 'warehouse.dispatch');
create trigger lock_lines before insert or update or delete on public.supplier_return_lines for each row execute function public.lock_document_lines('supplier_returns', 'return_id');

-- ───────── supplier invoices ─────────
create table public.supplier_invoices (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  supplier_invoice_no text not null,
  supplier_id text not null references public.partners (id),
  po_id text references public.purchase_orders (id) on delete set null,
  receipt_id text references public.purchase_receipts (id) on delete set null,
  invoice_date date not null default current_date,
  due_date date,
  currency text not null default 'MAD',
  subtotal numeric(18, 2) not null default 0,
  tax_amount numeric(18, 2) not null default 0,
  total_amount numeric(18, 2) not null default 0,
  paid_amount numeric(18, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'posted', 'reversed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid')),
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index supplier_invoices_number_key on public.supplier_invoices (organization_id, number);
create unique index supplier_invoices_supplier_ref_key on public.supplier_invoices (organization_id, supplier_id, supplier_invoice_no);
select public._secure('supplier_invoices', 'finance.write');
create trigger assign_number before insert on public.supplier_invoices for each row execute function public.assign_document_number('supplier_invoice');

create table public.supplier_invoice_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  invoice_id text not null references public.supplier_invoices (id) on delete cascade,
  item_id text references public.items (id),
  description text not null,
  quantity numeric(18, 4) not null default 1,
  unit_price numeric(18, 4) not null default 0,
  discount_pct numeric(5, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 20,
  line_total numeric(18, 2) not null default 0
);
select public._secure('supplier_invoice_lines', 'finance.write');
create trigger line_total before insert or update on public.supplier_invoice_lines for each row execute function public.set_line_total();
create trigger totals after insert or update or delete on public.supplier_invoice_lines for each row execute function public.recalc_document_totals('supplier_invoices', 'invoice_id');

-- ───────── procurement functions ─────────
create or replace function public.send_purchase_order(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.purchase_orders;
begin
  select * into h from public.purchase_orders where id = p_id for update;
  if not found then raise exception 'Commande introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'purchase.write');
  if h.status <> 'approved' then raise exception 'La commande doit être approuvée avant envoi au fournisseur.' using errcode = '22023'; end if;
  update public.purchase_orders set status = 'ordered' where id = p_id;
  perform public.emit_event(h.organization_id, 'purchase.order.sent', 'purchase_order', p_id, jsonb_build_object('number', h.number, 'supplier_id', h.supplier_id));
end $$;

create or replace function public.close_purchase_order(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.purchase_orders;
begin
  select * into h from public.purchase_orders where id = p_id for update;
  if not found then raise exception 'Commande introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'purchase.write');
  if h.status not in ('received', 'partially_received', 'ordered') then raise exception 'Cette commande ne peut pas être clôturée.' using errcode = '22023'; end if;
  update public.purchase_orders set status = 'closed' where id = p_id;
end $$;

create or replace function public.create_po_from_request(p_request text, p_supplier text, p_warehouse text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare r public.purchase_requests; pid text;
begin
  select * into r from public.purchase_requests where id = p_request for update;
  if not found then raise exception 'Demande introuvable.' using errcode = '22023'; end if;
  perform public._require(r.organization_id, 'purchase.write');
  if r.status <> 'approved' then raise exception 'La demande d’achat doit être approuvée.' using errcode = '22023'; end if;
  insert into public.purchase_orders (organization_id, supplier_id, warehouse_id, request_id, expected_date) values (r.organization_id, p_supplier, p_warehouse, p_request, r.needed_on) returning id into pid;
  insert into public.purchase_order_lines (organization_id, po_id, item_id, description, quantity, uom_id, unit_price, discount_pct, vat_rate)
  select organization_id, pid, item_id, description, quantity, uom_id,
         coalesce((select s.price from public.item_suppliers s where s.item_id = l.item_id and s.supplier_id = p_supplier), nullif(l.unit_price, 0), 0), 0, vat_rate
    from public.purchase_request_lines l where request_id = p_request;
  update public.purchase_requests set status = 'converted' where id = p_request;
  return pid;
end $$;

create or replace function public.award_rfq(p_quote text, p_warehouse text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare q public.rfq_quotes; pid text;
begin
  select * into q from public.rfq_quotes where id = p_quote for update;
  if not found then raise exception 'Offre introuvable.' using errcode = '22023'; end if;
  perform public._require(q.organization_id, 'purchase.write');
  insert into public.purchase_orders (organization_id, supplier_id, warehouse_id, rfq_id, expected_date)
  values (q.organization_id, q.supplier_id, p_warehouse, q.rfq_id, current_date + coalesce(q.lead_time_days, 0)) returning id into pid;
  insert into public.purchase_order_lines (organization_id, po_id, item_id, quantity, uom_id, unit_price)
  select q.organization_id, pid, l.item_id, l.quantity, l.uom_id, ql.unit_price
    from public.rfq_quote_lines ql join public.rfq_lines l on l.id = ql.rfq_line_id where ql.quote_id = p_quote;
  update public.rfq_quotes set status = case when id = p_quote then 'selected' else status end where rfq_id = q.rfq_id;
  update public.rfqs set status = 'awarded' where id = q.rfq_id;
  return pid;
end $$;

create or replace function public.create_receipt_from_po(p_po text, p_warehouse text default null, p_location text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare h public.purchase_orders; rid text; wh text;
begin
  select * into h from public.purchase_orders where id = p_po;
  if not found then raise exception 'Commande introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'warehouse.receive');
  if h.status not in ('approved', 'ordered', 'partially_received') then raise exception 'La commande n’est pas prête à être réceptionnée.' using errcode = '22023'; end if;
  wh := coalesce(p_warehouse, h.warehouse_id);
  if wh is null then raise exception 'Entrepôt requis.' using errcode = '22023'; end if;
  insert into public.purchase_receipts (organization_id, po_id, supplier_id, warehouse_id, location_id) values (h.organization_id, p_po, h.supplier_id, wh, p_location) returning id into rid;
  insert into public.purchase_receipt_lines (organization_id, receipt_id, po_line_id, item_id, quantity, uom_id, unit_cost)
  select organization_id, rid, id, item_id, quantity - received_qty, uom_id, unit_price * (1 - discount_pct / 100)
    from public.purchase_order_lines where po_id = p_po and quantity - received_qty > 0;
  return rid;
end $$;

create or replace function public.post_purchase_receipt(p_id text)
returns void language plpgsql security definer set search_path = '' set app.bypass_lock = 'on' as $$
declare h public.purchase_receipts; l record; it public.items; lid text; bucket public.stock_bucket; loc text; cost numeric; factor numeric; mid text; po public.purchase_orders;
        zone_kind text; open_lines int; new_status text; insp text;
begin
  select * into h from public.purchase_receipts where id = p_id for update;
  if not found then raise exception 'Réception introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'warehouse.receive');
  if h.status <> 'draft' then raise exception 'Cette réception est déjà comptabilisée ou annulée.' using errcode = '22023'; end if;
  if not exists (select 1 from public.purchase_receipt_lines where receipt_id = p_id) then raise exception 'La réception ne contient aucune ligne.' using errcode = '22023'; end if;
  if h.po_id is not null then
    select * into po from public.purchase_orders where id = h.po_id for update;
    if po.status not in ('approved', 'ordered', 'partially_received') then raise exception 'La commande liée n’est pas réceptionnable (statut : %).', po.status using errcode = '22023'; end if;
  end if;
  for l in select * from public.purchase_receipt_lines where receipt_id = p_id order by id loop
    select * into it from public.items where id = l.item_id;
    bucket := case when it.requires_inspection then 'quarantine' else 'available' end;
    lid := l.lot_id;
    if lid is null and (it.tracking = 'lot' or l.lot_number is not null) then
      lid := public._ensure_lot(h.organization_id, l.item_id, l.lot_number, h.supplier_id, l.expires_on, l.manufactured_on,
               case when bucket = 'quarantine' then 'quarantine' else 'available' end, 'purchase_receipts', p_id);
    end if;
    factor := public.item_uom_factor(l.item_id, l.uom_id);
    cost := case when l.unit_cost is null then null else l.unit_cost / factor end;
    loc := coalesce(l.location_id, h.location_id);
    mid := public.post_stock_movement(h.organization_id, 'receipt', l.item_id, h.warehouse_id, l.base_quantity, loc, lid, bucket, cost,
             'purchase_receipts', p_id, l.id, 'rcpt:' || l.id, h.supplier_delivery_note);
    perform public._apply_serials(h.organization_id, l.item_id, h.warehouse_id, loc, lid, 'in', l.serials, l.base_quantity, 'purchase_receipts', p_id);
    if l.po_line_id is not null then
      update public.purchase_order_lines set received_qty = received_qty + l.quantity where id = l.po_line_id;
    end if;
    if bucket = 'quarantine' then
      insp := public._create_inspection(h.organization_id, 'incoming', l.item_id, lid, l.base_quantity, 'purchase_receipts', p_id, h.warehouse_id, loc, h.supplier_id);
    elsif loc is not null then
      select z.kind into zone_kind from public.locations lc left join public.warehouse_zones z on z.id = lc.zone_id where lc.id = loc;
      if zone_kind = 'receiving' then
        insert into public.warehouse_tasks (organization_id, warehouse_id, task_type, item_id, lot_id, from_location_id, quantity, source_type, source_id, source_line_id, priority)
        values (h.organization_id, h.warehouse_id, 'putaway', l.item_id, lid, loc, l.base_quantity, 'purchase_receipts', p_id, l.id, 3);
      end if;
    end if;
  end loop;
  if h.po_id is not null then
    select count(*) into open_lines from public.purchase_order_lines where po_id = h.po_id and received_qty < quantity;
    new_status := case when open_lines = 0 then 'received' else 'partially_received' end;
    update public.purchase_orders set status = new_status where id = h.po_id;
  end if;
  update public.purchase_receipts set status = 'posted' where id = p_id;
  perform public.emit_event(h.organization_id, 'purchase.receipt.posted', 'purchase_receipt', p_id, jsonb_build_object('number', h.number, 'po_id', h.po_id));
  perform public.notify(h.organization_id, 'purchase.received', 'Réception comptabilisée ' || h.number, null, 'achats/receptions', 'info', array['purchasing_manager', 'warehouse_manager']::public.org_role[]);
end $$;

create or replace function public.post_supplier_return(p_id text)
returns void language plpgsql security definer set search_path = '' set app.bypass_lock = 'on' as $$
declare h public.supplier_returns; l record;
begin
  select * into h from public.supplier_returns where id = p_id for update;
  if not found then raise exception 'Retour introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'warehouse.dispatch');
  if h.status <> 'draft' then raise exception 'Ce retour est déjà traité.' using errcode = '22023'; end if;
  for l in select * from public.supplier_return_lines where return_id = p_id order by id loop
    perform public.issue_stock(h.organization_id, 'return_out', l.item_id, h.warehouse_id, l.quantity, 'supplier_returns', p_id, l.id, l.lot_id, l.location_id, l.bucket, 'sret:' || l.id, h.reason);
  end loop;
  update public.supplier_returns set status = 'posted' where id = p_id;
  perform public.emit_event(h.organization_id, 'purchase.return.posted', 'supplier_return', p_id, jsonb_build_object('number', h.number));
end $$;

create or replace function public.post_supplier_invoice(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.supplier_invoices;
begin
  select * into h from public.supplier_invoices where id = p_id for update;
  if not found then raise exception 'Facture introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'finance.write');
  perform public._assert_postable(h.organization_id, 'supplier_invoice', p_id, h.total_amount, h.status);
  if h.due_date is null then
    update public.supplier_invoices set due_date = h.invoice_date + coalesce((select payment_terms_days from public.partners where id = h.supplier_id), 30) where id = p_id;
  end if;
  update public.supplier_invoices set status = 'posted' where id = p_id;
  perform public.emit_event(h.organization_id, 'purchase.invoice.posted', 'supplier_invoice', p_id, jsonb_build_object('total', h.total_amount));
end $$;

-- Purchase approval convenience: purchase orders may only move to "ordered" after approval (handled in send_purchase_order).

revoke execute on function public.send_purchase_order(text), public.close_purchase_order(text), public.create_po_from_request(text, text, text), public.award_rfq(text, text),
  public.create_receipt_from_po(text, text, text), public.post_purchase_receipt(text), public.post_supplier_return(text), public.post_supplier_invoice(text) from public, anon;
grant execute on function public.send_purchase_order(text), public.close_purchase_order(text), public.create_po_from_request(text, text, text), public.award_rfq(text, text),
  public.create_receipt_from_po(text, text, text), public.post_purchase_receipt(text), public.post_supplier_return(text), public.post_supplier_invoice(text) to authenticated;
