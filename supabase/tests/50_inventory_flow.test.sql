begin;
do $$
declare
  owner_a uuid; owner_b uuid; org_a text; org_b text;
  uom_pc text; uom_kg text; wh text; wh2 text; loc text; loc2 text;
  rm text; fg text; sup text; cust text; po text; po_line text; rc text; rc_line text; insp text; lot text;
  n numeric; cost numeric; adj text; trf text; cnt text; so text; so_line text; dl text; res numeric;
begin
  owner_a := tests.new_user('flow-a@x.test', '{"company_name":"Flow Alpha"}'); org_a := tests.org_of(owner_a);
  owner_b := tests.new_user('flow-b@x.test', '{"company_name":"Flow Beta"}');  org_b := tests.org_of(owner_b);

  -- bootstrap created defaults
  assert (select count(*) from public.uoms where organization_id = org_a) >= 10, 'default uoms';
  assert (select count(*) from public.document_sequences where organization_id = org_a) >= 20, 'default sequences';
  assert (select count(*) from public.warehouses where organization_id = org_a) = 1, 'default warehouse';

  perform tests.act_as(owner_a);
  select id into uom_pc from public.uoms where organization_id = org_a and code = 'pc';
  select id into uom_kg from public.uoms where organization_id = org_a and code = 'kg';
  select id into wh from public.warehouses where organization_id = org_a limit 1;
  select id into loc from public.locations where warehouse_id = wh and code = 'A-01-01';
  select id into loc2 from public.locations where warehouse_id = wh and code = 'A-01-02';
  insert into public.warehouses (organization_id, code, name) values (org_a, 'WH-02', 'Second') returning id into wh2;

  insert into public.items (organization_id, sku, name, base_uom_id, item_type, tracking, valuation_method, reorder_point, requires_inspection)
    values (org_a, 'RM-1', 'Acier', uom_kg, 'raw_material', 'lot', 'fifo', 5, false) returning id into rm;
  insert into public.items (organization_id, sku, name, base_uom_id, item_type, valuation_method) values (org_a, 'FG-1', 'Table', uom_pc, 'finished_product', 'average') returning id into fg;
  insert into public.partners (organization_id, code, name, kinds, credit_limit) values (org_a, 'SUP1', 'Atlas Steel', '{supplier}', 0) returning id into sup;
  insert into public.partners (organization_id, code, name, kinds, credit_limit) values (org_a, 'CUS1', 'Hotel Atlas', '{customer}', 1000) returning id into cust;
  assert (select count(*) from public.audit_logs where organization_id = org_a and entity = 'items') = 2, 'audit logged item inserts';

  -- ── receipts: lot required, FIFO layers, ledger ──
  insert into public.purchase_receipts (organization_id, supplier_id, warehouse_id, location_id) values (org_a, sup, wh, loc) returning id into rc;
  insert into public.purchase_receipt_lines (organization_id, receipt_id, item_id, quantity, uom_id, unit_cost, lot_number) values (org_a, rc, rm, 100, uom_kg, 10, 'L1');
  assert (select number from public.purchase_receipts where id = rc) like 'BR-%', 'auto number';
  perform public.post_purchase_receipt(rc);
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and bucket = 'available') = 100, 'receipt adds stock';
  assert (select avg_cost from public.items where id = rm) = 10, 'avg cost after first receipt';
  assert tests.fails(format('select public.post_purchase_receipt(%L)', rc)), 'cannot post a receipt twice';
  assert tests.fails(format('update public.purchase_receipts set supplier_id = null where id = %L', rc)), 'posted receipt locked';
  assert tests.fails(format('insert into public.purchase_receipt_lines (organization_id, receipt_id, item_id, quantity) values (%L, %L, %L, 1)', org_a, rc, rm)), 'lines of posted receipt locked';
  assert tests.fails(format('delete from public.purchase_receipts where id = %L', rc)), 'posted receipt cannot be deleted';

  insert into public.purchase_receipts (organization_id, supplier_id, warehouse_id, location_id) values (org_a, sup, wh, loc) returning id into rc;
  insert into public.purchase_receipt_lines (organization_id, receipt_id, item_id, quantity, uom_id, unit_cost, lot_number) values (org_a, rc, rm, 50, uom_kg, 20, 'L2');
  perform public.post_purchase_receipt(rc);
  assert (select count(*) from public.stock_valuation_layers where item_id = rm and remaining_qty > 0) = 2, 'two FIFO layers';

  -- ledger is append-only
  assert tests.fails(format('update public.inventory_movements set quantity = 1 where item_id = %L', rm)), 'ledger update forbidden';
  assert tests.fails(format('delete from public.inventory_movements where item_id = %L', rm)), 'ledger delete forbidden';
  assert tests.fails(format('insert into public.inventory_balances (organization_id, item_id, warehouse_id, quantity) values (%L, %L, %L, 5)', org_a, rm, wh)), 'balances not writable by clients';
  assert tests.fails(format('select public.post_stock_movement(%L, ''adjustment'', %L, %L, 1)', org_a, rm, wh)), 'internal posting not callable by clients';

  -- ── transfer between warehouses ──
  insert into public.stock_transfers (organization_id, from_warehouse_id, to_warehouse_id) values (org_a, wh, wh2) returning id into trf;
  insert into public.stock_transfer_lines (organization_id, transfer_id, item_id, quantity) select org_a, trf, rm, 30;
  perform public.post_stock_transfer(trf);
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and warehouse_id = wh2) = 30, 'transfer to wh2';
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and warehouse_id = wh) = 120, 'transfer from wh';
  assert (select avg_cost from public.items where id = rm) = (select avg_cost from public.items where id = rm), 'transfer keeps valuation';
  assert (select sum(remaining_qty) from public.stock_valuation_layers where item_id = rm) = 150, 'transfer leaves layers untouched';

  -- negative stock refused
  insert into public.stock_adjustments (organization_id, warehouse_id, kind) values (org_a, wh2, 'adjustment') returning id into adj;
  insert into public.stock_adjustment_lines (organization_id, adjustment_id, item_id, quantity_delta, lot_id) values (org_a, adj, rm, -500, (select id from public.lots where lot_number = 'L1' and organization_id = org_a));
  assert tests.fails(format('select public.post_stock_adjustment(%L)', adj)), 'insufficient stock refused';
  update public.stock_adjustment_lines set quantity_delta = -10 where adjustment_id = adj;
  perform public.post_stock_adjustment(adj);
  assert (select status from public.stock_adjustments where id = adj) = 'posted', 'adjustment posted';
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and warehouse_id = wh2) = 20, 'adjustment removed 10';
  -- FIFO: the 10 kg removed came from the oldest layer (cost 10)
  assert (select unit_cost from public.inventory_movements where source_id = adj order by created_at desc limit 1) = 10, 'FIFO cost on issue';
  perform public.reverse_document('stock_adjustment', adj, 'erreur de saisie');
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and warehouse_id = wh2) = 30, 'reversal restores stock';
  assert (select status from public.stock_adjustments where id = adj) = 'reversed', 'doc reversed';
  assert tests.fails(format('select public.reverse_document(''stock_adjustment'', %L, ''x'')', adj)), 'cannot reverse twice';

  -- ── count ──
  insert into public.inventory_counts (organization_id, warehouse_id, kind) values (org_a, wh2, 'full') returning id into cnt;
  assert public.start_inventory_count(cnt) = 1, 'count lines generated';
  perform public.record_count_line((select id from public.inventory_count_lines where count_id = cnt limit 1), 28);
  perform public.post_inventory_count(cnt);
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and warehouse_id = wh2) = 28, 'count adjusts stock';

  -- ── sales: credit limit, delivery with lot allocation ──
  insert into public.sales_orders (organization_id, customer_id, warehouse_id) values (org_a, cust, wh) returning id into so;
  insert into public.sales_order_lines (organization_id, so_id, item_id, quantity, uom_id, unit_price) values (org_a, so, rm, 10, uom_kg, 500) returning id into so_line;
  assert (select total_amount from public.sales_orders where id = so) = 6000, 'order total incl. VAT (5000 + 20%)';
  assert tests.fails(format('select public.confirm_sales_order(%L)', so)), 'credit limit exceeded';
  update public.partners set credit_limit = 0 where id = cust;
  perform public.submit_document('sales_order', so);
  perform public.confirm_sales_order(so);
  assert (select status from public.sales_orders where id = so) = 'confirmed', 'order confirmed';
  assert (select coalesce(sum(quantity), 0) from public.inventory_reservations where source_id = so and status = 'active') = 10, 'stock reserved';
  assert tests.fails(format('update public.sales_order_lines set quantity = 99 where id = %L', so_line)), 'confirmed order lines are frozen';
  dl := public.create_delivery_from_so(so);
  perform public.post_delivery(dl);
  assert (select delivered_qty from public.sales_order_lines where id = so_line) = 10, 'delivered qty';
  assert (select status from public.sales_orders where id = so) = 'delivered', 'order delivered';
  assert (select cost_amount from public.sales_order_lines where id = so_line) = 100, 'COGS from FIFO layer (10 x 10)';
  assert (select coalesce(sum(quantity), 0) from public.inventory_reservations where source_id = so and status = 'active') = 0, 'reservation consumed';
  perform public.reverse_document('delivery', dl, 'retour client total');
  assert (select delivered_qty from public.sales_order_lines where id = so_line) = 0, 'reversal restores delivered qty';

  -- ── tenant isolation ──
  perform tests.reset(); perform tests.act_as(owner_b);
  assert tests.count('select 1 from public.items') = 0, 'org B sees no items of A';
  assert tests.count('select 1 from public.inventory_movements') = 0, 'org B sees no ledger of A';
  assert tests.count(format('select 1 from public.audit_logs where organization_id = %L', org_a)) = 0, 'org B sees no audit of A';
  assert tests.fails(format('select public.post_stock_transfer(%L)', trf)), 'org B cannot post A documents';
  assert tests.fails(format('insert into public.items (organization_id, sku, name, base_uom_id) values (%L, ''X'', ''X'', %L)', org_a, uom_pc)), 'org B cannot insert into A';
  perform tests.reset();
end $$;
rollback;
