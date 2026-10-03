-- Finance-lite (payments, expenses, cash, cost centers) and WMS (picking, waves, packing).

-- ───────── finance ─────────
create table public.cost_centers (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null default 'department' check (kind in ('department', 'project', 'site', 'other')),
  department_id text references public.departments (id) on delete set null,
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('cost_centers', 'finance.write');

create table public.payments (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  direction text not null check (direction in ('in', 'out')),
  partner_id text not null references public.partners (id),
  sales_invoice_id text references public.sales_invoices (id) on delete set null,
  supplier_invoice_id text references public.supplier_invoices (id) on delete set null,
  amount numeric(18, 2) not null check (amount > 0),
  total_amount numeric(18, 2) generated always as (amount) stored,
  method text not null default 'bank_transfer' check (method in ('cash', 'bank_transfer', 'cheque', 'card', 'bill_of_exchange')),
  paid_on date not null default current_date,
  reference text,
  cost_center_id text references public.cost_centers (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'posted', 'reversed', 'cancelled')),
  reversed_at timestamptz, reversal_reason text,
  notes text,
  check ((direction = 'in' and supplier_invoice_id is null) or (direction = 'out' and sales_invoice_id is null))
);
create unique index payments_number_key on public.payments (organization_id, number);
create index payments_partner_idx on public.payments (organization_id, partner_id);
select public._secure('payments', 'finance.write');
create trigger assign_number before insert on public.payments for each row execute function public.assign_document_number('payment');
create trigger lock_posted before update or delete on public.payments for each row execute function public.lock_posted_document();

create table public.expenses (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  category text not null default 'other' check (category in ('raw_materials', 'transport', 'energy', 'maintenance', 'salaries', 'rent', 'taxes', 'supplies', 'other')),
  description text not null,
  amount numeric(18, 2) not null check (amount > 0),
  total_amount numeric(18, 2) generated always as (amount) stored,
  spent_on date not null default current_date,
  partner_id text references public.partners (id) on delete set null,
  cost_center_id text references public.cost_centers (id) on delete set null,
  paid boolean not null default false,
  method text not null default 'cash' check (method in ('cash', 'bank_transfer', 'cheque', 'card', 'bill_of_exchange')),
  status text not null default 'draft' check (status in ('draft', 'pending_approval', 'approved', 'posted', 'reversed', 'cancelled')),
  receipt_path text,
  reversed_at timestamptz, reversal_reason text,
  notes text
);
create unique index expenses_number_key on public.expenses (organization_id, number);
select public._secure('expenses', 'finance.write');
create trigger assign_number before insert on public.expenses for each row execute function public.assign_document_number('expense');
create trigger lock_posted before update or delete on public.expenses for each row execute function public.lock_posted_document();

create table public.cash_movements (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('in', 'out')),
  account text not null default 'bank' check (account in ('cash', 'bank')),
  amount numeric(18, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  label text not null,
  source_type text,
  source_id text,
  cost_center_id text references public.cost_centers (id) on delete set null
);
create index cash_movements_idx on public.cash_movements (organization_id, occurred_on desc);
select public._secure('cash_movements', 'finance.write');

create or replace function public.post_payment(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.payments; inv record; remaining numeric;
begin
  select * into h from public.payments where id = p_id for update;
  if not found then raise exception 'Paiement introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'finance.write');
  perform public._assert_postable(h.organization_id, 'payment', p_id, h.amount, h.status);
  if h.direction = 'in' and h.sales_invoice_id is not null then
    select * into inv from public.sales_invoices where id = h.sales_invoice_id for update;
    if inv.status <> 'posted' then raise exception 'La facture doit être comptabilisée avant règlement.' using errcode = '22023'; end if;
    remaining := inv.total_amount - inv.paid_amount;
    if h.amount > remaining then raise exception 'Le paiement (%) dépasse le solde de la facture (%).', h.amount, remaining using errcode = '22023'; end if;
    update public.sales_invoices set paid_amount = paid_amount + h.amount, payment_status = case when paid_amount + h.amount >= total_amount then 'paid' else 'partial' end where id = inv.id;
  elsif h.direction = 'out' and h.supplier_invoice_id is not null then
    select * into inv from public.supplier_invoices where id = h.supplier_invoice_id for update;
    if inv.status <> 'posted' then raise exception 'La facture doit être comptabilisée avant règlement.' using errcode = '22023'; end if;
    remaining := inv.total_amount - inv.paid_amount;
    if h.amount > remaining then raise exception 'Le paiement (%) dépasse le solde de la facture (%).', h.amount, remaining using errcode = '22023'; end if;
    update public.supplier_invoices set paid_amount = paid_amount + h.amount, payment_status = case when paid_amount + h.amount >= total_amount then 'paid' else 'partial' end where id = inv.id;
  end if;
  insert into public.cash_movements (organization_id, kind, account, amount, occurred_on, label, source_type, source_id, cost_center_id)
  values (h.organization_id, h.direction, case when h.method = 'cash' then 'cash' else 'bank' end, h.amount, h.paid_on, 'Paiement ' || coalesce(h.number, ''), 'payments', p_id, h.cost_center_id);
  update public.payments set status = 'posted' where id = p_id;
  perform public.emit_event(h.organization_id, 'finance.payment.posted', 'payment', p_id, jsonb_build_object('amount', h.amount, 'direction', h.direction));
end $$;

create or replace function public.reverse_payment(p_id text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.payments;
begin
  if coalesce(trim(p_reason), '') = '' then raise exception 'Un motif est requis.' using errcode = '22023'; end if;
  select * into h from public.payments where id = p_id for update;
  if not found then raise exception 'Paiement introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'finance.write');
  if h.status <> 'posted' then raise exception 'Seul un paiement comptabilisé peut être contre-passé.' using errcode = '22023'; end if;
  if h.sales_invoice_id is not null then
    update public.sales_invoices set paid_amount = greatest(paid_amount - h.amount, 0), payment_status = case when paid_amount - h.amount <= 0 then 'unpaid' else 'partial' end where id = h.sales_invoice_id;
  elsif h.supplier_invoice_id is not null then
    update public.supplier_invoices set paid_amount = greatest(paid_amount - h.amount, 0), payment_status = case when paid_amount - h.amount <= 0 then 'unpaid' else 'partial' end where id = h.supplier_invoice_id;
  end if;
  insert into public.cash_movements (organization_id, kind, account, amount, occurred_on, label, source_type, source_id, cost_center_id)
  values (h.organization_id, case when h.direction = 'in' then 'out' else 'in' end, case when h.method = 'cash' then 'cash' else 'bank' end, h.amount, current_date, 'Contre-passation ' || coalesce(h.number, ''), 'payments', p_id, h.cost_center_id);
  update public.payments set status = 'reversed', reversed_at = now(), reversal_reason = p_reason where id = p_id;
end $$;

create or replace function public.post_expense(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.expenses;
begin
  select * into h from public.expenses where id = p_id for update;
  if not found then raise exception 'Dépense introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'finance.write');
  perform public._assert_postable(h.organization_id, 'expense', p_id, h.amount, h.status);
  if h.paid then
    insert into public.cash_movements (organization_id, kind, account, amount, occurred_on, label, source_type, source_id, cost_center_id)
    values (h.organization_id, 'out', case when h.method = 'cash' then 'cash' else 'bank' end, h.amount, h.spent_on, h.description, 'expenses', p_id, h.cost_center_id);
  end if;
  update public.expenses set status = 'posted' where id = p_id;
end $$;

-- ───────── WMS: pick waves / lists / packing ─────────
create table public.pick_waves (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  warehouse_id text not null references public.warehouses (id),
  status text not null default 'open' check (status in ('open', 'picking', 'done', 'cancelled')),
  notes text
);
create unique index pick_waves_number_key on public.pick_waves (organization_id, number);
select public._secure('pick_waves', 'warehouse.manage');
create trigger assign_number before insert on public.pick_waves for each row execute function public.assign_document_number('pick_wave');

create table public.pick_lists (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  warehouse_id text not null references public.warehouses (id),
  wave_id text references public.pick_waves (id) on delete set null,
  so_id text references public.sales_orders (id) on delete set null,
  delivery_id text references public.deliveries (id) on delete set null,
  assignee_id uuid,
  status text not null default 'open' check (status in ('open', 'picking', 'picked', 'packed', 'cancelled')),
  priority int not null default 3 check (priority between 1 and 5),
  notes text
);
create unique index pick_lists_number_key on public.pick_lists (organization_id, number);
create index pick_lists_status_idx on public.pick_lists (organization_id, status);
select public._secure('pick_lists', 'warehouse.pick');
create trigger assign_number before insert on public.pick_lists for each row execute function public.assign_document_number('pick_list');

create table public.pick_list_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  pick_list_id text not null references public.pick_lists (id) on delete cascade,
  so_line_id text references public.sales_order_lines (id) on delete set null,
  item_id text not null references public.items (id),
  location_id text references public.locations (id),
  lot_id text references public.lots (id),
  qty_required numeric(18, 4) not null check (qty_required > 0),
  qty_picked numeric(18, 4) not null default 0 check (qty_picked >= 0),
  status text not null default 'open' check (status in ('open', 'picked', 'short'))
);
create index pick_list_lines_doc_idx on public.pick_list_lines (pick_list_id);
select public._secure('pick_list_lines', 'warehouse.pick');

create table public.packages (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  delivery_id text references public.deliveries (id) on delete cascade,
  pick_list_id text references public.pick_lists (id) on delete set null,
  package_no text not null,
  kind text not null default 'carton' check (kind in ('carton', 'pallet', 'crate', 'bag', 'other')),
  weight numeric(12, 3),
  length numeric(10, 2), width numeric(10, 2), height numeric(10, 2),
  status text not null default 'open' check (status in ('open', 'closed', 'loaded')),
  unique (organization_id, package_no)
);
select public._secure('packages', 'warehouse.pick');

create table public.package_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  package_id text not null references public.packages (id) on delete cascade,
  item_id text not null references public.items (id),
  lot_id text references public.lots (id),
  quantity numeric(18, 4) not null check (quantity > 0)
);
select public._secure('package_lines', 'warehouse.pick');

create or replace function public.create_pick_list_from_so(p_so text, p_wave text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare h public.sales_orders; pid text; l record; a record; n int := 0;
begin
  select * into h from public.sales_orders where id = p_so;
  if not found then raise exception 'Commande introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'warehouse.pick');
  if h.status not in ('confirmed', 'partially_delivered') then raise exception 'La commande doit être confirmée.' using errcode = '22023'; end if;
  if h.warehouse_id is null then raise exception 'Entrepôt de la commande requis.' using errcode = '22023'; end if;
  insert into public.pick_lists (organization_id, warehouse_id, wave_id, so_id) values (h.organization_id, h.warehouse_id, p_wave, p_so) returning id into pid;
  for l in select * from public.sales_order_lines where so_id = p_so and base_quantity > 0 and quantity - delivered_qty > 0 loop
    for a in select * from public.allocate_stock(h.organization_id, l.item_id, h.warehouse_id, (l.quantity - l.delivered_qty) * l.base_quantity / l.quantity) loop
      n := n + 1;
      insert into public.pick_list_lines (organization_id, pick_list_id, so_line_id, item_id, location_id, lot_id, qty_required) values (h.organization_id, pid, l.id, l.item_id, a.location_id, a.lot_id, a.qty);
    end loop;
  end loop;
  if n = 0 then raise exception 'Aucun stock disponible à préparer.' using errcode = 'P0001'; end if;
  insert into public.warehouse_tasks (organization_id, warehouse_id, task_type, status, source_type, source_id, priority) values (h.organization_id, h.warehouse_id, 'pick', 'open', 'pick_lists', pid, 3);
  return pid;
end $$;

create or replace function public.create_pick_wave(p_warehouse text, p_pick_lists text[])
returns text language plpgsql security definer set search_path = '' as $$
declare org text; wid text;
begin
  select organization_id into org from public.warehouses where id = p_warehouse;
  if org is null then raise exception 'Entrepôt introuvable.' using errcode = '22023'; end if;
  perform public._require(org, 'warehouse.manage');
  insert into public.pick_waves (organization_id, warehouse_id) values (org, p_warehouse) returning id into wid;
  update public.pick_lists set wave_id = wid where id = any (p_pick_lists) and organization_id = org and status = 'open';
  return wid;
end $$;

create or replace function public.confirm_pick_line(p_line text, p_qty numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare l public.pick_list_lines; pl public.pick_lists; pending int;
begin
  select * into l from public.pick_list_lines where id = p_line for update;
  if not found then raise exception 'Ligne introuvable.' using errcode = '22023'; end if;
  perform public._require(l.organization_id, 'warehouse.pick');
  select * into pl from public.pick_lists where id = l.pick_list_id for update;
  if pl.status not in ('open', 'picking') then raise exception 'Cette liste est clôturée.' using errcode = '22023'; end if;
  if p_qty < 0 or p_qty > l.qty_required then raise exception 'Quantité préparée invalide.' using errcode = '22023'; end if;
  update public.pick_list_lines set qty_picked = p_qty, status = case when p_qty >= qty_required then 'picked' when p_qty = 0 then 'open' else 'short' end where id = p_line;
  update public.pick_lists set status = 'picking', assignee_id = coalesce(assignee_id, (select auth.uid())) where id = pl.id;
  select count(*) into pending from public.pick_list_lines where pick_list_id = pl.id and status = 'open';
  if pending = 0 then
    update public.pick_lists set status = 'picked' where id = pl.id;
    update public.warehouse_tasks set status = 'done', completed_at = now() where source_type = 'pick_lists' and source_id = pl.id and status in ('open', 'in_progress');
  end if;
end $$;

-- Builds the delivery from what was actually picked (lots / locations preserved).
create or replace function public.create_delivery_from_pick_list(p_pick_list text)
returns text language plpgsql security definer set search_path = '' as $$
declare pl public.pick_lists; so public.sales_orders; did text; n int;
begin
  select * into pl from public.pick_lists where id = p_pick_list for update;
  if not found then raise exception 'Liste introuvable.' using errcode = '22023'; end if;
  perform public._require(pl.organization_id, 'warehouse.dispatch');
  if pl.status not in ('picked', 'packed') then raise exception 'La préparation doit être terminée.' using errcode = '22023'; end if;
  if pl.delivery_id is not null then return pl.delivery_id; end if;
  select * into so from public.sales_orders where id = pl.so_id;
  insert into public.deliveries (organization_id, so_id, customer_id, warehouse_id, stage) values (pl.organization_id, pl.so_id, so.customer_id, pl.warehouse_id, 'packed') returning id into did;
  insert into public.delivery_lines (organization_id, delivery_id, so_line_id, item_id, quantity, uom_id, lot_id, location_id)
  select pll.organization_id, did, pll.so_line_id, pll.item_id, pll.qty_picked / coalesce(nullif(sol.base_quantity / sol.quantity, 0), 1), sol.uom_id, pll.lot_id, pll.location_id
    from public.pick_list_lines pll left join public.sales_order_lines sol on sol.id = pll.so_line_id where pll.pick_list_id = p_pick_list and pll.qty_picked > 0;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'Aucune quantité préparée.' using errcode = '22023'; end if;
  update public.pick_lists set delivery_id = did, status = 'packed' where id = p_pick_list;
  return did;
end $$;

create or replace function public.set_delivery_stage(p_id text, p_stage text)
returns void language plpgsql security definer set search_path = '' as $$
declare h public.deliveries;
begin
  select * into h from public.deliveries where id = p_id for update;
  if not found then raise exception 'Livraison introuvable.' using errcode = '22023'; end if;
  perform public._require(h.organization_id, 'warehouse.dispatch');
  if h.status <> 'draft' then raise exception 'Livraison déjà comptabilisée.' using errcode = '22023'; end if;
  if p_stage not in ('pending', 'picking', 'packed', 'loaded') then raise exception 'Étape invalide (la validation passe par la comptabilisation).' using errcode = '22023'; end if;
  update public.deliveries set stage = p_stage where id = p_id;
end $$;

revoke execute on function public.post_payment(text), public.reverse_payment(text, text), public.post_expense(text), public.create_pick_list_from_so(text, text),
  public.create_pick_wave(text, text[]), public.confirm_pick_line(text, numeric), public.create_delivery_from_pick_list(text), public.set_delivery_stage(text, text) from public, anon;
grant execute on function public.post_payment(text), public.reverse_payment(text, text), public.post_expense(text), public.create_pick_list_from_so(text, text),
  public.create_pick_wave(text, text[]), public.confirm_pick_line(text, numeric), public.create_delivery_from_pick_list(text), public.set_delivery_stage(text, text) to authenticated;
