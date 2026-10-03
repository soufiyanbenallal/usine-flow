-- Quality: reason codes, inspection plans/points, inspections, NCR, CAPA, certificates, lot genealogy.

create table public.reason_codes (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('downtime', 'scrap', 'failure', 'defect', 'return', 'adjustment')),
  code text not null,
  label text not null,
  active boolean not null default true,
  unique (organization_id, kind, code)
);
select public._secure('reason_codes', 'quality.manage');

create table public.inspection_plans (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null default 'incoming' check (kind in ('incoming', 'in_process', 'final')),
  item_id text references public.items (id) on delete cascade,
  category_id text references public.item_categories (id) on delete set null,
  sampling_method text not null default 'all' check (sampling_method in ('all', 'percent', 'fixed', 'aql')),
  sample_percent numeric(5, 2),
  sample_size int,
  aql numeric(5, 2),
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('inspection_plans', 'quality.manage');

create table public.inspection_points (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  plan_id text not null references public.inspection_plans (id) on delete cascade,
  seq int not null default 10,
  name text not null,
  kind text not null default 'pass_fail' check (kind in ('pass_fail', 'measurement', 'visual')),
  unit text,
  target numeric(18, 4),
  min_value numeric(18, 4),
  max_value numeric(18, 4),
  required boolean not null default true,
  instructions text
);
create index inspection_points_plan_idx on public.inspection_points (plan_id, seq);
select public._secure('inspection_points', 'quality.manage');

create table public.inspections (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  kind text not null default 'incoming' check (kind in ('incoming', 'in_process', 'final')),
  plan_id text references public.inspection_plans (id) on delete set null,
  source_type text,
  source_id text,
  item_id text not null references public.items (id),
  lot_id text references public.lots (id) on delete set null,
  warehouse_id text references public.warehouses (id),
  location_id text references public.locations (id),
  supplier_id text references public.partners (id) on delete set null,
  quantity numeric(18, 4) not null default 0,
  sample_qty numeric(18, 4),
  accepted_qty numeric(18, 4) not null default 0,
  rejected_qty numeric(18, 4) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'passed', 'failed', 'accepted_with_deviation', 'cancelled')),
  decision text check (decision in ('accept', 'reject', 'quarantine', 'partial')),
  inspector_id uuid,
  inspected_at timestamptz,
  comment text,
  notes text
);
create unique index inspections_number_key on public.inspections (organization_id, number);
create index inspections_source_idx on public.inspections (organization_id, source_type, source_id);
create index inspections_status_idx on public.inspections (organization_id, status);
select public._secure('inspections', 'quality.inspect');
create trigger assign_number before insert on public.inspections for each row execute function public.assign_document_number('inspection');

create table public.inspection_results (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  inspection_id text not null references public.inspections (id) on delete cascade,
  point_id text references public.inspection_points (id) on delete set null,
  point_name text,
  measured_value numeric(18, 4),
  result text not null default 'pending' check (result in ('pending', 'pass', 'fail', 'na')),
  defect_code text,
  comment text,
  photo_path text
);
create index inspection_results_doc_idx on public.inspection_results (inspection_id);
select public._secure('inspection_results', 'quality.inspect');

-- measurement results are judged against the tolerance range of their point
create or replace function public.judge_inspection_result()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.inspection_points;
begin
  if new.point_id is not null and new.measured_value is not null then
    select * into p from public.inspection_points where id = new.point_id;
    if p.kind = 'measurement' then
      new.result := case when (p.min_value is null or new.measured_value >= p.min_value) and (p.max_value is null or new.measured_value <= p.max_value) then 'pass' else 'fail' end;
    end if;
  end if;
  return new;
end $$;
create trigger judge_result before insert or update on public.inspection_results for each row execute function public.judge_inspection_result();

create table public.non_conformances (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  inspection_id text references public.inspections (id) on delete set null,
  item_id text references public.items (id) on delete set null,
  lot_id text references public.lots (id) on delete set null,
  supplier_id text references public.partners (id) on delete set null,
  production_order_id text,
  source_type text,
  source_id text,
  defect_code text,
  severity text not null default 'minor' check (severity in ('minor', 'major', 'critical')),
  quantity_affected numeric(18, 4) not null default 0,
  description text not null,
  root_cause text,
  containment text,
  quarantine boolean not null default false,
  status text not null default 'open' check (status in ('open', 'investigating', 'contained', 'closed', 'cancelled')),
  closed_at timestamptz
);
create unique index non_conformances_number_key on public.non_conformances (organization_id, number);
create index non_conformances_status_idx on public.non_conformances (organization_id, status);
select public._secure('non_conformances', 'quality.inspect');
create trigger assign_number before insert on public.non_conformances for each row execute function public.assign_document_number('ncr');

create table public.capa_actions (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  ncr_id text references public.non_conformances (id) on delete cascade,
  kind text not null default 'corrective' check (kind in ('corrective', 'preventive')),
  title text not null,
  description text,
  owner_name text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'verified', 'cancelled')),
  completed_at timestamptz,
  verified_at timestamptz,
  effectiveness text
);
create unique index capa_actions_number_key on public.capa_actions (organization_id, number);
create index capa_actions_status_idx on public.capa_actions (organization_id, status, due_date);
select public._secure('capa_actions', 'quality.manage');
create trigger assign_number before insert on public.capa_actions for each row execute function public.assign_document_number('capa');

create table public.quality_certificates (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text not null,
  title text not null,
  item_id text references public.items (id) on delete set null,
  lot_id text references public.lots (id) on delete set null,
  supplier_id text references public.partners (id) on delete set null,
  issuer text,
  issued_on date,
  expires_on date,
  file_path text,
  notes text
);
select public._secure('quality_certificates', 'quality.manage');

create table public.lot_genealogy (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  parent_lot_id text not null references public.lots (id) on delete cascade,
  child_lot_id text not null references public.lots (id) on delete cascade,
  production_order_id text,
  quantity numeric(18, 4) not null default 0,
  created_at timestamptz not null default now(),
  unique (parent_lot_id, child_lot_id, production_order_id)
);
create index lot_genealogy_parent_idx on public.lot_genealogy (parent_lot_id);
create index lot_genealogy_child_idx on public.lot_genealogy (child_lot_id);
select public._readonly('lot_genealogy');

-- ───────── create inspection (internal + public) ─────────
create or replace function public._create_inspection(p_org text, p_kind text, p_item text, p_lot text, p_qty numeric, p_source_type text, p_source_id text,
                                                      p_warehouse text, p_location text, p_supplier text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare plan public.inspection_plans; it public.items; iid text; sample numeric;
begin
  select * into it from public.items where id = p_item and organization_id = p_org;
  select * into plan from public.inspection_plans
   where organization_id = p_org and kind = p_kind and active and (item_id = p_item or (item_id is null and category_id is not distinct from it.category_id) or (item_id is null and category_id is null))
   order by (item_id is not null) desc, (category_id is not null) desc limit 1;
  sample := case when plan.id is null or plan.sampling_method = 'all' then p_qty
                 when plan.sampling_method = 'percent' then ceil(p_qty * coalesce(plan.sample_percent, 100) / 100)
                 else least(p_qty, coalesce(plan.sample_size, p_qty)) end;
  insert into public.inspections (organization_id, kind, plan_id, source_type, source_id, item_id, lot_id, warehouse_id, location_id, supplier_id, quantity, sample_qty)
  values (p_org, p_kind, plan.id, p_source_type, p_source_id, p_item, p_lot, p_warehouse, p_location, p_supplier, p_qty, sample) returning id into iid;
  insert into public.inspection_results (organization_id, inspection_id, point_id, point_name)
  select p_org, iid, pt.id, pt.name from public.inspection_points pt where pt.plan_id = plan.id order by pt.seq;
  perform public.emit_event(p_org, 'quality.inspection.required', 'inspection', iid, jsonb_build_object('item_id', p_item, 'kind', p_kind));
  return iid;
end $$;

create or replace function public.create_inspection(p_kind text, p_item text, p_qty numeric, p_lot text default null, p_source_type text default null,
                                                    p_source_id text default null, p_warehouse text default null, p_location text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare org text;
begin
  select organization_id into org from public.items where id = p_item;
  if org is null then raise exception 'Article introuvable.' using errcode = '22023'; end if;
  perform public._require(org, 'quality.inspect');
  return public._create_inspection(org, p_kind, p_item, p_lot, p_qty, p_source_type, p_source_id, p_warehouse, p_location);
end $$;

-- Decision on an inspection: moves stock between buckets and opens a non-conformance when something is rejected.
create or replace function public.decide_inspection(p_id text, p_accepted numeric, p_rejected numeric, p_reject_bucket public.stock_bucket default 'damaged',
                                                    p_comment text default null, p_deviation boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare i public.inspections; src public.stock_bucket; n int := 0; a record; fail_cnt int; status_new text; ncr text; reject_dest public.stock_bucket := p_reject_bucket;
begin
  select * into i from public.inspections where id = p_id for update;
  if not found then raise exception 'Inspection introuvable.' using errcode = '22023'; end if;
  perform public._require(i.organization_id, 'quality.inspect');
  if i.status not in ('pending', 'in_progress') then raise exception 'Cette inspection est déjà clôturée.' using errcode = '22023'; end if;
  if p_accepted < 0 or p_rejected < 0 or p_accepted + p_rejected > i.quantity then raise exception 'Quantités acceptées/rejetées incohérentes avec la quantité inspectée.' using errcode = '22023'; end if;
  if exists (select 1 from public.inspection_results r where r.inspection_id = p_id and r.result = 'pending' and
             exists (select 1 from public.inspection_points pt where pt.id = r.point_id and pt.required)) then
    raise exception 'Tous les points de contrôle obligatoires doivent être renseignés.' using errcode = '22023';
  end if;
  select count(*) into fail_cnt from public.inspection_results where inspection_id = p_id and result = 'fail';
  src := case when i.kind = 'incoming' then 'quarantine' else 'available' end;

  if i.warehouse_id is not null then
    if p_accepted > 0 and src <> 'available' then
      for a in select * from public.allocate_stock(i.organization_id, i.item_id, i.warehouse_id, p_accepted, i.lot_id, i.location_id, src) loop
        n := n + 1;
        perform public.post_stock_movement(i.organization_id, 'quality_move', i.item_id, i.warehouse_id, -a.qty, a.location_id, a.lot_id, src, null, 'inspections', p_id, null, 'qc-a-out:' || p_id || ':' || n, null, true);
        perform public.post_stock_movement(i.organization_id, 'quality_move', i.item_id, i.warehouse_id, a.qty, a.location_id, a.lot_id, 'available', null, 'inspections', p_id, null, 'qc-a-in:' || p_id || ':' || n, null, true);
      end loop;
    end if;
    if p_rejected > 0 then
      n := 0;
      for a in select * from public.allocate_stock(i.organization_id, i.item_id, i.warehouse_id, p_rejected, i.lot_id, i.location_id, src) loop
        n := n + 1;
        perform public.post_stock_movement(i.organization_id, 'quality_move', i.item_id, i.warehouse_id, -a.qty, a.location_id, a.lot_id, src, null, 'inspections', p_id, null, 'qc-r-out:' || p_id || ':' || n, null, true);
        perform public.post_stock_movement(i.organization_id, 'quality_move', i.item_id, i.warehouse_id, a.qty, a.location_id, a.lot_id, reject_dest, null, 'inspections', p_id, null, 'qc-r-in:' || p_id || ':' || n, null, true);
      end loop;
    end if;
  end if;

  status_new := case when p_rejected = 0 and fail_cnt = 0 then 'passed' when p_accepted > 0 and p_deviation then 'accepted_with_deviation' when p_accepted = 0 and p_rejected = 0 then 'failed' else 'failed' end;
  update public.inspections set status = status_new, accepted_qty = p_accepted, rejected_qty = p_rejected, inspected_at = now(), inspector_id = (select auth.uid()),
         comment = p_comment, decision = case when p_rejected = 0 then 'accept' when p_accepted = 0 then 'reject' else 'partial' end where id = p_id;
  if i.lot_id is not null then
    if p_rejected >= i.quantity and p_rejected > 0 then update public.lots set status = 'blocked' where id = i.lot_id;
    elsif p_accepted > 0 then update public.lots set status = 'available' where id = i.lot_id and status = 'quarantine'; end if;
  end if;
  if p_rejected > 0 or fail_cnt > 0 then
    insert into public.non_conformances (organization_id, inspection_id, item_id, lot_id, supplier_id, source_type, source_id, severity, quantity_affected, description, quarantine, status)
    values (i.organization_id, p_id, i.item_id, i.lot_id, i.supplier_id, i.source_type, i.source_id, case when p_rejected >= i.quantity then 'major' else 'minor' end,
            p_rejected, coalesce(p_comment, 'Non-conformité détectée à l’inspection ' || i.number), true, 'open') returning id into ncr;
    perform public.notify(i.organization_id, 'quality.inspection.failed', 'Échec qualité : inspection ' || i.number, coalesce(p_comment, 'Quantité rejetée : ' || p_rejected), 'qualite/non-conformites', 'critical',
                          array['quality_manager']::public.org_role[]);
    perform public.emit_event(i.organization_id, 'quality.inspection.failed', 'inspection', p_id, jsonb_build_object('rejected', p_rejected, 'ncr_id', ncr));
  else
    perform public.emit_event(i.organization_id, 'quality.inspection.passed', 'inspection', p_id, jsonb_build_object('accepted', p_accepted));
  end if;
  return status_new;
end $$;

revoke execute on function public.judge_inspection_result(), public._create_inspection(text, text, text, text, numeric, text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.create_inspection(text, text, numeric, text, text, text, text, text),
  public.decide_inspection(text, numeric, numeric, public.stock_bucket, text, boolean) from public, anon;
grant execute on function public.create_inspection(text, text, numeric, text, text, text, text, text),
  public.decide_inspection(text, numeric, numeric, public.stock_bucket, text, boolean) to authenticated;
