begin;
do $$
declare
  owner uuid; operator uuid; viewer uuid; org text; uom_pc text; uom_kg text; wh text; loc text;
  rm text; pk text; fg text; sup text; bom text; bv text; wc text; routing text; po text; op1 text; op2 text; adj text; asset text; wo text; rc text; insp text; rm_lot text;
  rep numeric; fg_lot text; q numeric; pol text; ppo text; req text; qi text; cnt int; rc2 text; n numeric;
begin
  owner := tests.new_user('prod-owner@x.test', '{"company_name":"Prod Alpha"}'); org := tests.org_of(owner);
  perform tests.act_as(owner);
  insert into public.invitations (organization_id, email, role) values (org, 'op@x.test', 'operator'), (org, 'vw@x.test', 'viewer');
  perform tests.reset();
  operator := tests.new_user('op@x.test', jsonb_build_object('invite_token', (select token from public.invitations where email = 'op@x.test')));
  viewer := tests.new_user('vw@x.test', jsonb_build_object('invite_token', (select token from public.invitations where email = 'vw@x.test')));

  perform tests.act_as(owner);
  select id into uom_pc from public.uoms where organization_id = org and code = 'pc';
  select id into uom_kg from public.uoms where organization_id = org and code = 'kg';
  select id into wh from public.warehouses where organization_id = org limit 1;
  select id into loc from public.locations where warehouse_id = wh and code = 'A-01-01';
  insert into public.items (organization_id, sku, name, base_uom_id, item_type, tracking, valuation_method) values (org, 'RM-S', 'Acier', uom_kg, 'raw_material', 'lot', 'average') returning id into rm;
  insert into public.items (organization_id, sku, name, base_uom_id, item_type, valuation_method) values (org, 'PK-1', 'Emballage', uom_pc, 'packaging', 'average') returning id into pk;
  insert into public.items (organization_id, sku, name, base_uom_id, item_type, tracking, valuation_method, is_manufactured, standard_cost) values (org, 'FG-T', 'Table', uom_pc, 'finished_product', 'lot', 'average', true, 12) returning id into fg;

  -- opening stock through an adjustment document
  insert into public.stock_adjustments (organization_id, warehouse_id, kind) values (org, wh, 'opening') returning id into adj;
  insert into public.stock_adjustment_lines (organization_id, adjustment_id, item_id, location_id, quantity_delta, unit_cost, lot_number) values (org, adj, rm, loc, 200, 5, 'RML1');
  insert into public.stock_adjustment_lines (organization_id, adjustment_id, item_id, location_id, quantity_delta, unit_cost) values (org, adj, pk, loc, 100, 1);
  perform public.post_stock_adjustment(adj);
  assert (select total_value from public.stock_adjustments where id = adj) = 1100, 'opening value';

  -- BOM + routing
  insert into public.boms (organization_id, item_id, code, name) values (org, fg, 'BOM-T', 'Table') returning id into bom;
  insert into public.bom_versions (organization_id, bom_id, version) values (org, bom, 1) returning id into bv;
  insert into public.bom_lines (organization_id, version_id, component_item_id, quantity, uom_id) values (org, bv, rm, 2, uom_kg), (org, bv, pk, 1, uom_pc);
  assert tests.fails(format('insert into public.bom_lines (organization_id, version_id, component_item_id, quantity) values (%L, %L, %L, 1)', org, bv, fg)), 'item cannot be its own component';
  perform public.activate_bom_version(bv);
  assert tests.fails(format('insert into public.bom_lines (organization_id, version_id, component_item_id, quantity) values (%L, %L, %L, 1)', org, bv, pk)), 'active BOM version is frozen';
  insert into public.work_centers (organization_id, code, name, hourly_machine_cost, hourly_labor_cost) values (org, 'WC1', 'Assemblage', 60, 30) returning id into wc;
  insert into public.routings (organization_id, item_id, code, name) values (org, fg, 'R-1', 'Gamme table') returning id into routing;
  insert into public.routing_operations (organization_id, routing_id, seq, name, work_center_id, run_minutes_per_unit) values (org, routing, 10, 'Découpe', wc, 2), (org, routing, 20, 'Assemblage', wc, 3);
  insert into public.assets (organization_id, code, name, work_center_id, kind) values (org, 'M-04', 'Presse', wc, 'machine') returning id into asset;

  -- production order
  insert into public.production_orders (organization_id, item_id, quantity, warehouse_id, output_location_id) values (org, fg, 10, wh, loc) returning id into po;
  assert (select number from public.production_orders where id = po) like 'OF-%', 'OF number';
  perform public.release_production_order(po);
  assert (select required_qty from public.production_order_materials where production_order_id = po and item_id = rm) = 20, 'BOM explosion 2 kg x 10';
  assert (select count(*) from public.production_order_operations where production_order_id = po) = 2, 'routing operations created';
  assert (select coalesce(sum(quantity), 0) from public.inventory_reservations where source_id = po and status = 'active') = 30, 'materials reserved';
  select id into op1 from public.production_order_operations where production_order_id = po and seq = 10;
  select id into op2 from public.production_order_operations where production_order_id = po and seq = 20;

  -- machine stopped blocks start
  update public.assets set status = 'stopped' where id = asset;
  assert tests.fails(format('select public.start_production_operation(%L)', op1)), 'cannot start on a stopped machine';
  update public.assets set status = 'running' where id = asset;

  -- operator can run the shop floor but cannot adjust stock
  perform tests.reset(); perform tests.act_as(operator);
  perform public.start_production_operation(op1);
  perform public.report_production(op1, 10, 0);
  perform public.complete_production_operation(op1);
  perform public.start_production_operation(op2);
  perform public.report_production(op2, 9, 1, null, 'FGL1');
  assert (select produced_qty from public.production_orders where id = po) = 9, 'finished output posted on last operation';
  assert (select sum(quantity) from public.inventory_balances where item_id = fg and bucket = 'available') = 9, 'finished goods in stock';
  assert tests.fails(format('insert into public.stock_adjustments (organization_id, warehouse_id) values (%L, %L)', org, wh)), 'operator cannot create adjustments';
  assert tests.fails(format('select public.post_stock_adjustment(%L)', adj)), 'operator cannot post adjustments';
  assert tests.fails(format('select public.complete_production_order(%L)', po)), 'operator cannot complete orders';
  perform tests.reset(); perform tests.act_as(owner);

  -- backflush consumption (9 of 10 finished => 18 kg, 9 pcs) + genealogy
  assert (select coalesce(sum(quantity), 0) from public.production_consumptions where production_order_id = po and item_id = rm) = 18, 'backflush consumption';
  assert (select count(*) from public.lot_genealogy where production_order_id = po) = 1, 'lot genealogy recorded';
  select id into fg_lot from public.lots where item_id = fg and lot_number = 'FGL1';
  select id into rm_lot from public.lots where item_id = rm and lot_number = 'RML1';
  assert exists (select 1 from public.trace_backward(fg_lot) where node_type = 'lot' and node_id = rm_lot), 'backward trace reaches raw material lot';
  assert exists (select 1 from public.trace_forward(rm_lot) where node_type = 'lot' and node_id = fg_lot), 'forward trace reaches finished lot';

  perform public.complete_production_order(po);
  assert (select status from public.production_orders where id = po) = 'completed', 'order completed';
  assert (select material_cost from public.production_cost_snapshots where production_order_id = po) = 18 * 5 + 9 * 1, 'actual material cost';
  assert (select count(*) from public.inventory_reservations where source_id = po and status = 'active') = 0, 'reservations released';
  assert (select variance from public.production_cost_snapshots where production_order_id = po) is not null, 'variance computed';
  perform public.close_production_order(po);
  assert (select status from public.production_orders where id = po) = 'closed', 'order closed';

  -- ── maintenance ──
  wo := public.report_breakdown(asset, 'Moteur bloqué', 'Surchauffe');
  assert (select status from public.assets where id = asset) = 'stopped', 'breakdown stops machine';
  assert (select count(*) from public.production_downtime where asset_id = asset and ended_at is null) >= 1, 'downtime opened';
  assert tests.fails(format('select public.report_breakdown(%L, ''encore'')', asset)), 'duplicate breakdown refused';
  insert into public.maintenance_parts (organization_id, work_order_id, item_id, warehouse_id, quantity) values (org, wo, pk, wh, 2);
  perform public.start_maintenance_work_order(wo);
  perform public.complete_maintenance_work_order(wo, 'Moteur remplacé', 90);
  assert (select status from public.assets where id = asset) = 'running', 'machine restored';
  assert (select parts_cost from public.maintenance_work_orders where id = wo) = 2, 'spare parts consumed and costed';
  assert (select count(*) from public.production_downtime where asset_id = asset and ended_at is null) = 0, 'downtime closed';
  insert into public.maintenance_plans (organization_id, asset_id, name, trigger_type, interval_meter) values (org, asset, 'Graissage', 'meter', 100);
  perform public.record_meter_reading(asset, 150, 'hours');
  assert (select count(*) from public.maintenance_work_orders where asset_id = asset and kind = 'preventive') = 1, 'meter threshold opens a preventive work order';

  -- ── quality: incoming inspection with partial rejection ──
  update public.items set requires_inspection = true where id = rm;
  insert into public.partners (organization_id, code, name, kinds) values (org, 'S1', 'Atlas Steel', '{supplier}') returning id into sup;
  insert into public.inspection_plans (organization_id, code, name, kind) values (org, 'IP-1', 'Réception acier', 'incoming') returning id into qi;
  insert into public.inspection_points (organization_id, plan_id, name, kind, min_value, max_value) values (org, qi, 'Épaisseur', 'measurement', 1.9, 2.1);
  insert into public.purchase_receipts (organization_id, supplier_id, warehouse_id, location_id) values (org, sup, wh, loc) returning id into rc2;
  insert into public.purchase_receipt_lines (organization_id, receipt_id, item_id, quantity, uom_id, unit_cost, lot_number) values (org, rc2, rm, 40, uom_kg, 6, 'RML2');
  perform public.post_purchase_receipt(rc2);
  select id into insp from public.inspections where source_id = rc2;
  assert insp is not null, 'inspection auto-created for quarantined receipt';
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and bucket = 'quarantine') = 40, 'received in quarantine';
  assert tests.fails(format('select public.decide_inspection(%L, 40, 0)', insp)), 'mandatory points must be filled';
  update public.inspection_results set measured_value = 2.5 where inspection_id = insp;
  assert (select result from public.inspection_results where inspection_id = insp) = 'fail', 'measurement out of tolerance fails';
  assert public.decide_inspection(insp, 30, 10, 'damaged', 'Épaisseur hors tolérance') = 'failed', 'inspection failed';
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and bucket = 'available' and lot_id = (select id from public.lots where lot_number = 'RML2')) = 30, 'accepted quantity released';
  assert (select sum(quantity) from public.inventory_balances where item_id = rm and bucket = 'damaged') = 10, 'rejected quantity moved to damaged';
  assert (select count(*) from public.non_conformances where inspection_id = insp) = 1, 'NCR opened automatically';
  assert (select count(*) from public.notifications where user_id = owner and event_type = 'quality.inspection.failed') = 1, 'quality alert notified';
  assert public.open_recall(rm_lot, 'Lot suspect') is not null, 'recall opened';
  assert (select status from public.lots where id = rm_lot) = 'blocked', 'recalled lot blocked';

  -- ── approvals ──
  update public.approval_policies set active = true, min_amount = 100 where organization_id = org and entity_type = 'purchase_order';
  insert into public.purchase_orders (organization_id, supplier_id, warehouse_id) values (org, sup, wh) returning id into ppo;
  insert into public.purchase_order_lines (organization_id, po_id, item_id, quantity, uom_id, unit_price) values (org, ppo, rm, 100, uom_kg, 10);
  assert public.submit_document('purchase_order', ppo) = 'pending_approval', 'approval requested';
  assert tests.fails(format('select public.send_purchase_order(%L)', ppo)), 'cannot send before approval';
  perform tests.reset(); perform tests.act_as(operator);
  select id into req from public.approval_requests where entity_id = ppo;
  assert tests.fails(format('select public.decide_approval(%L, true)', req)), 'operator cannot approve';
  perform tests.reset(); perform tests.act_as(owner);
  assert public.decide_approval(req, true) = 'pending', 'first step approved';
  assert public.decide_approval(req, true) = 'approved', 'second step approved';
  assert (select status from public.purchase_orders where id = ppo) = 'approved', 'PO approved';
  perform public.send_purchase_order(ppo);
  assert (select status from public.purchase_orders where id = ppo) = 'ordered', 'PO sent';

  -- viewer: read only
  perform tests.reset(); perform tests.act_as(viewer);
  assert tests.count('select 1 from public.items') = 3, 'viewer reads items';
  assert tests.fails(format('insert into public.items (organization_id, sku, name, base_uom_id) values (%L, ''V'', ''V'', %L)', org, uom_pc)), 'viewer cannot write';
  assert tests.fails(format('select public.post_purchase_receipt(%L)', rc2)), 'viewer cannot post';
  assert tests.count('select 1 from public.audit_logs') = 0, 'viewer cannot read audit logs';
  perform tests.reset();
end $$;
rollback;
