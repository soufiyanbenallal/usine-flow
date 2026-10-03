-- Organization bootstrap (defaults), realtime broadcasts and scheduled jobs.

create or replace function public.bootstrap_organization(p_org text)
returns void language plpgsql security definer set search_path = '' as $$
declare po_prefix text; uid text; kg text; g text; t text; l text; ml text; m text; cm text; pc text; carton text; pallet text; site text; wh text; zone text; mod text;
begin
  perform set_config('app.source', 'bootstrap', true);
  select coalesce(nullif(settings ->> 'po_prefix', ''), 'BC') into po_prefix from public.organizations where id = p_org;

  -- units of measure
  insert into public.uoms (organization_id, code, name, category, decimals) values
    (p_org, 'pc', 'Pièce', 'count', 0), (p_org, 'kg', 'Kilogramme', 'weight', 3), (p_org, 'g', 'Gramme', 'weight', 1), (p_org, 't', 'Tonne', 'weight', 3),
    (p_org, 'L', 'Litre', 'volume', 3), (p_org, 'ml', 'Millilitre', 'volume', 0), (p_org, 'm', 'Mètre', 'length', 3), (p_org, 'cm', 'Centimètre', 'length', 1),
    (p_org, 'm2', 'Mètre carré', 'area', 3), (p_org, 'm3', 'Mètre cube', 'volume', 3), (p_org, 'box', 'Boîte', 'packaging', 0), (p_org, 'carton', 'Carton', 'packaging', 0),
    (p_org, 'pallet', 'Palette', 'packaging', 0), (p_org, 'roll', 'Rouleau', 'packaging', 0), (p_org, 'sheet', 'Feuille', 'count', 0), (p_org, 'h', 'Heure', 'time', 2)
  on conflict (organization_id, code) do nothing;
  insert into public.uom_conversions (organization_id, from_uom_id, to_uom_id, factor)
  select p_org, a.id, b.id, f.factor from (values ('t', 'kg', 1000), ('kg', 'g', 1000), ('L', 'ml', 1000), ('m', 'cm', 100), ('m3', 'L', 1000)) as f (fa, fb, factor)
    join public.uoms a on a.organization_id = p_org and a.code = f.fa join public.uoms b on b.organization_id = p_org and b.code = f.fb
  on conflict do nothing;

  insert into public.item_categories (organization_id, code, name) values
    (p_org, 'MP', 'Matières premières'), (p_org, 'CMP', 'Composants'), (p_org, 'EMB', 'Emballages'), (p_org, 'PF', 'Produits finis'),
    (p_org, 'CONS', 'Consommables'), (p_org, 'PDR', 'Pièces de rechange'), (p_org, 'OUT', 'Outillage'), (p_org, 'SRV', 'Services')
  on conflict (organization_id, code) do nothing;

  -- numbering
  insert into public.document_sequences (organization_id, doc_type, prefix)
  select p_org, d.doc_type, d.prefix from (values
    ('purchase_request', 'DA'), ('rfq', 'RFQ'), ('purchase_order', po_prefix), ('purchase_receipt', 'BR'), ('purchase_agreement', 'CA'), ('supplier_return', 'RF'),
    ('supplier_invoice', 'FF'), ('quote', 'DV'), ('sales_order', 'CV'), ('delivery', 'BL'), ('customer_return', 'RC'), ('sales_invoice', 'FC'),
    ('stock_adjustment', 'AJ'), ('stock_transfer', 'TR'), ('inventory_count', 'INV'), ('production_order', 'OF'), ('subcontract_order', 'ST'),
    ('inspection', 'INS'), ('ncr', 'NC'), ('capa', 'CAPA'), ('maintenance_work_order', 'OT'), ('payment', 'PAI'), ('expense', 'DEP'),
    ('pick_list', 'PL'), ('pick_wave', 'VG'), ('recall', 'RAP')) as d (doc_type, prefix)
  on conflict (organization_id, doc_type) do nothing;

  -- reason codes
  insert into public.reason_codes (organization_id, kind, code, label) values
    (p_org, 'downtime', 'PANNE', 'Panne machine'), (p_org, 'downtime', 'CHGT', 'Changement de série'), (p_org, 'downtime', 'MANQ_MAT', 'Manque de matière'),
    (p_org, 'downtime', 'NETT', 'Nettoyage / réglage'), (p_org, 'downtime', 'PLAN', 'Arrêt planifié'), (p_org, 'downtime', 'ABS', 'Absence opérateur'),
    (p_org, 'scrap', 'MAT', 'Défaut matière'), (p_org, 'scrap', 'OPE', 'Erreur opérateur'), (p_org, 'scrap', 'REG', 'Réglage machine'), (p_org, 'scrap', 'DIM', 'Hors tolérance'),
    (p_org, 'failure', 'ELEC', 'Défaut électrique'), (p_org, 'failure', 'MECA', 'Défaut mécanique'), (p_org, 'failure', 'HYDR', 'Défaut hydraulique'), (p_org, 'failure', 'USURE', 'Usure'),
    (p_org, 'defect', 'DIM', 'Dimension'), (p_org, 'defect', 'ASPECT', 'Aspect'), (p_org, 'defect', 'FONCT', 'Fonctionnel'), (p_org, 'defect', 'EMB', 'Emballage'),
    (p_org, 'return', 'DEFAUT', 'Produit défectueux'), (p_org, 'return', 'ERREUR', 'Erreur de commande'), (p_org, 'adjustment', 'CASSE', 'Casse'), (p_org, 'adjustment', 'PERTE', 'Perte / vol')
  on conflict (organization_id, kind, code) do nothing;

  -- modules, subscription, shifts
  foreach mod in array array['inventory', 'warehouse', 'procurement', 'sales', 'manufacturing', 'shopfloor', 'quality', 'maintenance', 'workforce', 'finance', 'analytics', 'documents', 'ai'] loop
    insert into public.org_modules (organization_id, module, enabled) values (p_org, mod, true) on conflict do nothing;
  end loop;
  insert into public.subscriptions (organization_id) values (p_org) on conflict do nothing;
  insert into public.shifts (organization_id, name, start_time, end_time, break_minutes) values
    (p_org, 'Matin', '06:00', '14:00', 30), (p_org, 'Après-midi', '14:00', '22:00', 30), (p_org, 'Nuit', '22:00', '06:00', 30)
  on conflict (organization_id, name) do nothing;

  -- sample (inactive) approval policies, ready to be switched on
  insert into public.approval_policies (organization_id, entity_type, name, min_amount, steps, active) values
    (p_org, 'purchase_order', 'Achats > 50 000 DH', 50000, '[{"role": "purchasing_manager", "label": "Responsable achats"}, {"role": "accountant", "label": "Finance"}]'::jsonb, false),
    (p_org, 'stock_adjustment', 'Ajustements > 10 000 DH', 10000, '[{"role": "warehouse_manager", "label": "Responsable entrepôt"}]'::jsonb, false),
    (p_org, 'payment', 'Paiements > 20 000 DH', 20000, '[{"role": "accountant", "label": "Finance"}]'::jsonb, false)
  on conflict do nothing;

  -- default site / warehouse so the app is usable immediately
  if not exists (select 1 from public.sites where organization_id = p_org) then
    insert into public.sites (organization_id, code, name, kind) values (p_org, 'SITE-01', 'Site principal', 'factory') returning id into site;
    insert into public.warehouses (organization_id, site_id, code, name, kind) values (p_org, site, 'WH-01', 'Entrepôt principal', 'standard') returning id into wh;
    insert into public.warehouse_zones (organization_id, warehouse_id, code, name, kind) values (p_org, wh, 'REC', 'Réception', 'receiving') returning id into zone;
    insert into public.locations (organization_id, warehouse_id, zone_id, code, kind) values (p_org, wh, zone, 'REC-01', 'dock');
    insert into public.warehouse_zones (organization_id, warehouse_id, code, name, kind) values (p_org, wh, 'STK', 'Stockage', 'bulk') returning id into zone;
    insert into public.locations (organization_id, warehouse_id, zone_id, code, kind) values (p_org, wh, zone, 'A-01-01', 'bin'), (p_org, wh, zone, 'A-01-02', 'bin');
  end if;
end $$;
revoke execute on function public.bootstrap_organization(text) from public, anon, authenticated;

-- bootstrap on organization creation (replaces the starter versions, adding the bootstrap call)
create or replace function public.create_organization(company text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  clean text := nullif(trim(company), '');
  new_org record;
begin
  if uid is null then raise exception 'Authentification requise.' using errcode = '28000'; end if;
  if clean is null or length(clean) < 2 then raise exception 'Nom d’entreprise requis.' using errcode = '22023'; end if;
  if exists (select 1 from public.memberships where user_id = uid) then
    raise exception 'Ce compte appartient déjà à une organisation.' using errcode = '23505';
  end if;
  insert into public.organizations (name, slug) values (clean, public.generate_org_slug(clean)) returning id, slug into new_org;
  insert into public.memberships (organization_id, user_id, role) values (new_org.id, uid, 'owner');
  perform public.bootstrap_organization(new_org.id);
  return new_org.slug;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  org text;
  inv public.invitations;
  token_text text := nullif(new.raw_user_meta_data ->> 'invite_token', '');
  company text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Mon entreprise');
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.email);

  if token_text is not null then
    begin
      select * into inv from public.invitations
       where token = token_text::uuid and accepted_at is null and expires_at > now() and lower(email) = lower(new.email)
       for update;
    exception when invalid_text_representation then
      inv := null;
    end;
    if inv.id is null then
      raise exception 'Invitation invalide, expirée ou destinée à une autre adresse e-mail.';
    end if;
    insert into public.memberships (organization_id, user_id, role) values (inv.organization_id, new.id, inv.role);
    update public.invitations set accepted_at = now() where id = inv.id;
    return new;
  end if;

  insert into public.organizations (name, slug) values (company, public.generate_org_slug(company)) returning id into org;
  insert into public.memberships (organization_id, user_id, role) values (org, new.id, 'owner');
  perform public.bootstrap_organization(org);
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- existing organizations
do $$ declare o record; begin for o in select id from public.organizations loop perform public.bootstrap_organization(o.id); end loop; end $$;

-- ───────── realtime (Broadcast, private channels per organization) ─────────
create or replace function public.broadcast_org_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare j jsonb := to_jsonb(coalesce(new, old));
begin
  if to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null then
    execute 'select realtime.send($1, $2, $3, true)'
      using jsonb_build_object('table', tg_table_name, 'op', tg_op, 'id', j ->> 'id'), tg_table_name || '.' || lower(tg_op), 'org:' || (j ->> 'organization_id');
  end if;
  return null;
exception when others then
  return null;
end $$;
revoke execute on function public.broadcast_org_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['production_orders', 'production_order_operations', 'production_downtime', 'assets', 'maintenance_work_orders', 'warehouse_tasks',
                           'approval_requests', 'inventory_balances', 'notifications', 'inspections', 'pick_lists'] loop
    execute format('create trigger broadcast_change after insert or update or delete on public.%I for each row execute function public.broadcast_org_change()', t);
  end loop;
  if to_regclass('realtime.messages') is not null then
    execute $p$create policy "members receive org broadcasts" on realtime.messages for select to authenticated
               using (realtime.topic() like 'org:%' and public.is_member(substr(realtime.topic(), 5)))$p$;
  end if;
exception when others then
  raise notice 'realtime policy skipped: %', sqlerrm;
end $$;

-- ───────── scheduled jobs (pg_cron when available) ─────────
do $$
begin
  begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron unavailable: %', sqlerrm; end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('usineflow-snapshot-inventory', '5 0 * * *', 'select public.snapshot_inventory()');
    perform cron.schedule('usineflow-preventive-maintenance', '10 5 * * *', 'select public.cron_generate_preventive_work_orders()');
    perform cron.schedule('usineflow-late-production', '15 6 * * *', 'select public.flag_late_production_orders()');
  end if;
exception when others then
  raise notice 'cron scheduling skipped: %', sqlerrm;
end $$;
