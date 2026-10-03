begin;
do $$
declare uid uuid; org text; mat text; po text; sup text; stock numeric;
begin
  uid := tests.new_user('po@x.test', '{"company_name":"PO Co"}'); org := tests.org_of(uid);
  perform tests.act_as(uid);
  insert into public.materials (organization_id, name, unit, stock_qty) values (org, 'Ciment', 'sac', 10) returning id into mat;
  insert into public.purchase_orders (organization_id, reference) values (org, 'BC-1') returning id into po;
  insert into public.purchase_order_lines (organization_id, purchase_order_id, material_id, label, qty, unit_price) values (org, po, mat, 'Ciment', 5, 70);
  insert into public.purchase_order_lines (organization_id, purchase_order_id, label, qty, unit_price) values (org, po, 'Transport', 1, 200);
  assert (select total_ht from public.purchase_orders where id = po) = 550, 'total from lines';

  update public.purchase_order_lines set qty = 6 where label = 'Ciment';
  assert (select total_ht from public.purchase_orders where id = po) = 620, 'total follows line updates';
  delete from public.purchase_order_lines where label = 'Transport';
  assert (select total_ht from public.purchase_orders where id = po) = 420, 'total follows line deletes';

  -- delivery books stock once, invoicing does not book again, reverting un-books
  update public.purchase_orders set status = 'ordered' where id = po;
  assert (select stock_qty from public.materials where id = mat) = 10, 'ordered does not move stock';
  update public.purchase_orders set status = 'delivered' where id = po;
  assert (select stock_qty from public.materials where id = mat) = 16, 'delivery adds stock';
  update public.purchase_orders set status = 'invoiced' where id = po;
  assert (select stock_qty from public.materials where id = mat) = 16, 'invoicing keeps stock';
  assert tests.fails(format($q$insert into public.purchase_order_lines (organization_id, purchase_order_id, label, qty, unit_price) values (%L, %L, 'late', 1, 1)$q$, org, po)), 'lines locked after delivery';
  assert tests.fails(format($q$update public.purchase_order_lines set qty = 1 where purchase_order_id = %L$q$, po)), 'line edits locked after delivery';
  assert tests.fails(format($q$delete from public.purchase_order_lines where purchase_order_id = %L$q$, po)), 'line deletes locked after delivery';
  update public.purchase_orders set status = 'draft' where id = po;
  assert (select stock_qty from public.materials where id = mat) = 10, 'reverting removes the booked stock';

  -- constraints
  assert tests.fails(format($q$insert into public.purchase_order_lines (organization_id, purchase_order_id, label, qty, unit_price) values (%L, %L, 'x', 0, 1)$q$, org, po)), 'qty must be positive';
  assert tests.fails(format($q$insert into public.purchase_orders (organization_id, reference, vat_rate) values (%L, 'BC-2', 21)$q$, org)), 'VAT rate must be a Moroccan rate';
  assert tests.fails(format($q$insert into public.purchase_orders (organization_id, reference) values (%L, 'BC-1')$q$, org)), 'reference unique per organization';

  -- attendance: one row per worker per day
  declare w text; c text;
  begin
    insert into public.workers (organization_id, full_name, daily_rate) values (org, 'Hassan', 250) returning id into w;
    insert into public.chantiers (organization_id, name) values (org, 'C') returning id into c;
    insert into public.attendance (organization_id, worker_id, chantier_id, day, status) values (org, w, c, '2026-10-02', 'present')
      on conflict (worker_id, day) do update set status = excluded.status;
    insert into public.attendance (organization_id, worker_id, chantier_id, day, status) values (org, w, c, '2026-10-02', 'half_day')
      on conflict (worker_id, day) do update set status = excluded.status;
    assert (select count(*) from public.attendance) = 1 and (select status from public.attendance) = 'half_day', 'attendance upsert keeps one row per day';
  end;

  -- deleting a PO cascades its lines (admins/owner only)
  update public.purchase_orders set status = 'delivered' where id = po;
  perform tests.reset();
  perform tests.act_as(uid);
  delete from public.purchase_orders where id = po;
  assert (select count(*) from public.purchase_order_lines) = 0, 'cascade delete of lines';
  perform tests.reset();
end $$;
rollback;
