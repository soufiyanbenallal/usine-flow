-- Workforce (operators) and maintenance (GMAO).

-- ───────── workforce ─────────
create table public.shifts (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  break_minutes int not null default 60 check (break_minutes >= 0),
  days int[] not null default '{1,2,3,4,5}',
  active boolean not null default true,
  unique (organization_id, name)
);
select public._secure('shifts', 'workforce.write');

create table public.employees (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  code text not null,
  full_name text not null,
  department_id text references public.departments (id) on delete set null,
  team_id text references public.teams (id) on delete set null,
  shift_id text references public.shifts (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  position text,
  hire_date date,
  phone text, email text, cnss_number text, cin text,
  hourly_cost numeric(12, 2) not null default 0 check (hourly_cost >= 0),
  status text not null default 'active' check (status in ('active', 'on_leave', 'inactive')),
  is_operator boolean not null default true,
  notes text,
  unique (organization_id, code)
);
create index employees_dept_idx on public.employees (department_id);
select public._secure('employees', 'workforce.write');

create table public.skills (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  unique (organization_id, name)
);
select public._secure('skills', 'workforce.write');

create table public.employee_skills (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  employee_id text not null references public.employees (id) on delete cascade,
  skill_id text not null references public.skills (id) on delete cascade,
  level int not null default 1 check (level between 1 and 5),
  unique (employee_id, skill_id)
);
select public._secure('employee_skills', 'workforce.write');

create table public.employee_certifications (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  employee_id text not null references public.employees (id) on delete cascade,
  name text not null,
  issuer text,
  issued_on date,
  expires_on date,
  file_path text
);
create index employee_certifications_exp_idx on public.employee_certifications (organization_id, expires_on);
select public._secure('employee_certifications', 'workforce.write');

create table public.shift_assignments (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  employee_id text not null references public.employees (id) on delete cascade,
  shift_id text not null references public.shifts (id) on delete cascade,
  work_date date not null,
  unique (employee_id, work_date)
);
select public._secure('shift_assignments', 'workforce.write');

create table public.attendance (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  employee_id text not null references public.employees (id) on delete cascade,
  work_date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present' check (status in ('present', 'absent', 'late', 'leave', 'holiday')),
  worked_minutes int not null default 0,
  overtime_minutes int not null default 0,
  approved boolean not null default false,
  notes text,
  unique (employee_id, work_date)
);
select public._secure('attendance', 'workforce.write');

create or replace function public.compute_attendance()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sh public.shifts; planned int;
begin
  if new.check_in is not null and new.check_out is not null and new.check_out > new.check_in then
    select s.* into sh from public.shifts s
      where s.id = coalesce((select shift_id from public.shift_assignments a where a.employee_id = new.employee_id and a.work_date = new.work_date),
                            (select shift_id from public.employees e where e.id = new.employee_id));
    new.worked_minutes := greatest(round(extract(epoch from (new.check_out - new.check_in)) / 60)::int - coalesce(sh.break_minutes, 0), 0);
    planned := case when sh.id is null then 480 else (extract(epoch from (sh.end_time - sh.start_time))::int / 60 + case when sh.end_time <= sh.start_time then 1440 else 0 end) - sh.break_minutes end;
    new.overtime_minutes := greatest(new.worked_minutes - planned, 0);
  end if;
  return new;
end $$;
create trigger compute before insert or update on public.attendance for each row execute function public.compute_attendance();

create table public.absences (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  employee_id text not null references public.employees (id) on delete cascade,
  kind text not null default 'leave' check (kind in ('leave', 'sick', 'unpaid', 'training', 'other')),
  from_date date not null,
  to_date date not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'cancelled')),
  reason text,
  check (to_date >= from_date)
);
select public._secure('absences', 'workforce.write');

create table public.time_logs (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  employee_id text not null references public.employees (id) on delete cascade,
  production_order_id text,
  operation_id text,
  work_order_id text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes numeric(12, 2) not null default 0,
  hourly_cost numeric(12, 2) not null default 0,
  cost numeric(14, 2) not null default 0,
  approved boolean not null default false,
  notes text,
  check (ended_at is null or ended_at >= started_at)
);
create index time_logs_po_idx on public.time_logs (organization_id, production_order_id) where production_order_id is not null;
create index time_logs_emp_idx on public.time_logs (employee_id, started_at desc);
select public._secure('time_logs', 'production.report');

create or replace function public.compute_time_log()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.hourly_cost = 0 then select coalesce(hourly_cost, 0) into new.hourly_cost from public.employees where id = new.employee_id; end if;
  if new.ended_at is not null then
    new.minutes := round(extract(epoch from (new.ended_at - new.started_at)) / 60, 2);
    new.cost := round(new.minutes / 60 * new.hourly_cost, 2);
  end if;
  return new;
end $$;
create trigger compute before insert or update on public.time_logs for each row execute function public.compute_time_log();
revoke execute on function public.compute_attendance(), public.compute_time_log() from public, anon, authenticated;

-- ───────── maintenance ─────────
create table public.assets (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null default 'machine' check (kind in ('line', 'machine', 'equipment', 'component', 'vehicle', 'building')),
  parent_id text references public.assets (id) on delete set null,
  site_id text references public.sites (id) on delete set null,
  facility_id text references public.facilities (id) on delete set null,
  work_center_id text,
  manufacturer text, model text, serial_number text,
  installed_on date,
  status text not null default 'running' check (status in ('running', 'stopped', 'maintenance', 'standby', 'retired')),
  criticality text not null default 'medium' check (criticality in ('low', 'medium', 'high', 'critical')),
  meter_unit text not null default 'hours' check (meter_unit in ('hours', 'cycles', 'km', 'units')),
  meter_reading numeric(14, 2) not null default 0,
  hourly_cost numeric(12, 2) not null default 0,
  notes text,
  active boolean not null default true,
  unique (organization_id, code)
);
create index assets_parent_idx on public.assets (parent_id);
create index assets_status_idx on public.assets (organization_id, status);
select public._secure('assets', 'maintenance.write');

create table public.maintenance_plans (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  asset_id text not null references public.assets (id) on delete cascade,
  name text not null,
  kind text not null default 'preventive' check (kind in ('preventive', 'predictive', 'inspection')),
  trigger_type text not null default 'time' check (trigger_type in ('time', 'meter')),
  interval_days int check (interval_days is null or interval_days > 0),
  interval_meter numeric(14, 2) check (interval_meter is null or interval_meter > 0),
  lead_days int not null default 7,
  last_done_at date,
  last_meter numeric(14, 2) not null default 0,
  next_due_date date,
  estimated_minutes int not null default 60,
  checklist text[] not null default '{}',
  active boolean not null default true,
  check ((trigger_type = 'time' and interval_days is not null) or (trigger_type = 'meter' and interval_meter is not null))
);
create index maintenance_plans_due_idx on public.maintenance_plans (organization_id, next_due_date) where active;
select public._secure('maintenance_plans', 'maintenance.write');

create or replace function public.compute_plan_due()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.trigger_type = 'time' then
    new.next_due_date := coalesce(new.last_done_at, current_date) + coalesce(new.interval_days, 30);
  else
    new.next_due_date := null;
  end if;
  return new;
end $$;
create trigger compute_due before insert or update on public.maintenance_plans for each row execute function public.compute_plan_due();
revoke execute on function public.compute_plan_due() from public, anon, authenticated;

create table public.maintenance_work_orders (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  number text,
  asset_id text not null references public.assets (id),
  plan_id text references public.maintenance_plans (id) on delete set null,
  kind text not null default 'corrective' check (kind in ('preventive', 'corrective', 'inspection', 'improvement')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'open' check (status in ('draft', 'open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  breakdown boolean not null default false,
  title text not null,
  description text,
  failure_reason_id text references public.reason_codes (id) on delete set null,
  reported_by uuid default auth.uid(),
  assigned_to text references public.employees (id) on delete set null,
  scheduled_for date,
  started_at timestamptz,
  completed_at timestamptz,
  downtime_minutes int not null default 0,
  labor_minutes int not null default 0,
  labor_cost numeric(14, 2) not null default 0,
  parts_cost numeric(14, 2) not null default 0,
  total_cost numeric(14, 2) not null default 0,
  resolution text,
  notes text
);
create unique index maintenance_work_orders_number_key on public.maintenance_work_orders (organization_id, number);
create index maintenance_work_orders_asset_idx on public.maintenance_work_orders (asset_id, status);
create index maintenance_work_orders_status_idx on public.maintenance_work_orders (organization_id, status, scheduled_for);
select public._secure('maintenance_work_orders', 'maintenance.report');
create trigger assign_number before insert on public.maintenance_work_orders for each row execute function public.assign_document_number('maintenance_work_order');

create table public.maintenance_parts (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  work_order_id text not null references public.maintenance_work_orders (id) on delete cascade,
  item_id text not null references public.items (id),
  warehouse_id text not null references public.warehouses (id),
  quantity numeric(18, 4) not null check (quantity > 0),
  unit_cost numeric(18, 4) not null default 0,
  consumed boolean not null default false
);
select public._secure('maintenance_parts', 'maintenance.write');

create table public.maintenance_readings (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  asset_id text not null references public.assets (id) on delete cascade,
  kind text not null default 'hours' check (kind in ('hours', 'cycles', 'km', 'temperature', 'vibration', 'pressure', 'other')),
  value numeric(14, 2) not null,
  read_at timestamptz not null default now(),
  read_by uuid default auth.uid(),
  notes text
);
create index maintenance_readings_asset_idx on public.maintenance_readings (asset_id, read_at desc);
select public._secure('maintenance_readings', 'maintenance.report');

-- ───────── maintenance functions ─────────
create or replace function public._open_preventive_wo(p_plan public.maintenance_plans, p_scheduled date)
returns text language plpgsql security definer set search_path = '' as $$
declare wid text; a public.assets;
begin
  if exists (select 1 from public.maintenance_work_orders where plan_id = p_plan.id and status in ('draft', 'open', 'assigned', 'in_progress')) then return null; end if;
  select * into a from public.assets where id = p_plan.asset_id;
  insert into public.maintenance_work_orders (organization_id, asset_id, plan_id, kind, priority, status, title, description, scheduled_for)
  values (p_plan.organization_id, p_plan.asset_id, p_plan.id, 'preventive', 'medium', 'open', p_plan.name || ' — ' || a.name,
          array_to_string(p_plan.checklist, E'\n'), p_scheduled) returning id into wid;
  perform public.notify(p_plan.organization_id, 'maintenance.due', 'Maintenance préventive à planifier', p_plan.name || ' — ' || a.name, 'maintenance/ordres', 'warning',
                        array['maintenance_manager']::public.org_role[]);
  perform public.emit_event(p_plan.organization_id, 'maintenance.preventive.generated', 'maintenance_work_order', wid, jsonb_build_object('plan_id', p_plan.id));
  return wid;
end $$;

create or replace function public.generate_preventive_work_orders(p_org text)
returns int language plpgsql security definer set search_path = '' as $$
declare p public.maintenance_plans; n int := 0; wid text;
begin
  perform public._require(p_org, 'maintenance.write');
  for p in select * from public.maintenance_plans where organization_id = p_org and active and trigger_type = 'time' and next_due_date <= current_date + lead_days loop
    wid := public._open_preventive_wo(p, p.next_due_date);
    if wid is not null then n := n + 1; end if;
  end loop;
  for p in select mp.* from public.maintenance_plans mp join public.assets a on a.id = mp.asset_id
            where mp.organization_id = p_org and mp.active and mp.trigger_type = 'meter' and a.meter_reading - mp.last_meter >= mp.interval_meter loop
    wid := public._open_preventive_wo(p, current_date);
    if wid is not null then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- Cron entry point (all organizations), not exposed to the API.
create or replace function public.cron_generate_preventive_work_orders()
returns int language plpgsql security definer set search_path = '' as $$
declare p public.maintenance_plans; n int := 0; wid text;
begin
  for p in select mp.* from public.maintenance_plans mp left join public.assets a on a.id = mp.asset_id
            where mp.active and ((mp.trigger_type = 'time' and mp.next_due_date <= current_date + mp.lead_days)
                              or (mp.trigger_type = 'meter' and a.meter_reading - mp.last_meter >= mp.interval_meter)) loop
    wid := public._open_preventive_wo(p, coalesce(p.next_due_date, current_date));
    if wid is not null then n := n + 1; end if;
  end loop;
  return n;
end $$;

create or replace function public.record_meter_reading(p_asset text, p_value numeric, p_kind text default 'hours', p_notes text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare a public.assets; p public.maintenance_plans;
begin
  select * into a from public.assets where id = p_asset for update;
  if not found then raise exception 'Équipement introuvable.' using errcode = '22023'; end if;
  perform public._require(a.organization_id, 'maintenance.report');
  insert into public.maintenance_readings (organization_id, asset_id, kind, value, notes) values (a.organization_id, p_asset, p_kind, p_value, p_notes);
  if p_kind in ('hours', 'cycles', 'km') then
    update public.assets set meter_reading = greatest(meter_reading, p_value) where id = p_asset;
    for p in select * from public.maintenance_plans where asset_id = p_asset and active and trigger_type = 'meter' and p_value - last_meter >= interval_meter loop
      perform public._open_preventive_wo(p, current_date);
    end loop;
  end if;
end $$;

create or replace function public.report_breakdown(p_asset text, p_title text, p_description text default null, p_reason text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare a public.assets; wid text; open_ops record;
begin
  select * into a from public.assets where id = p_asset for update;
  if not found then raise exception 'Équipement introuvable.' using errcode = '22023'; end if;
  perform public._require(a.organization_id, 'maintenance.report');
  if a.status = 'stopped' and exists (select 1 from public.maintenance_work_orders where asset_id = p_asset and breakdown and status in ('open', 'assigned', 'in_progress')) then
    raise exception 'Une panne est déjà déclarée sur cet équipement.' using errcode = '22023';
  end if;
  insert into public.maintenance_work_orders (organization_id, asset_id, kind, priority, status, breakdown, title, description, failure_reason_id, scheduled_for)
  values (a.organization_id, p_asset, 'corrective', case a.criticality when 'critical' then 'urgent' when 'high' then 'high' else 'medium' end, 'open', true,
          p_title, p_description, p_reason, current_date) returning id into wid;
  update public.assets set status = 'stopped' where id = p_asset;
  -- stop the running operations of the machine's work center and open a downtime record
  insert into public.production_downtime (organization_id, production_order_id, operation_id, work_center_id, asset_id, category, reason_id, started_at, maintenance_work_order_id, notes)
  select a.organization_id, op.production_order_id, op.id, op.work_center_id, p_asset, 'breakdown', p_reason, now(), wid, p_title
    from public.production_order_operations op where op.work_center_id = a.work_center_id and op.status = 'running';
  if not found then
    insert into public.production_downtime (organization_id, work_center_id, asset_id, category, reason_id, started_at, maintenance_work_order_id, notes)
    values (a.organization_id, a.work_center_id, p_asset, 'breakdown', p_reason, now(), wid, p_title);
  end if;
  update public.production_order_operations set status = 'paused' where work_center_id = a.work_center_id and status = 'running' and organization_id = a.organization_id;
  perform public.notify(a.organization_id, 'machine.breakdown', 'Panne : ' || a.name, p_title, 'maintenance/ordres', 'critical', array['maintenance_manager', 'production_manager']::public.org_role[]);
  perform public.emit_event(a.organization_id, 'machine.breakdown.reported', 'asset', p_asset, jsonb_build_object('work_order_id', wid, 'title', p_title));
  return wid;
end $$;

create or replace function public.start_maintenance_work_order(p_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.maintenance_work_orders;
begin
  select * into w from public.maintenance_work_orders where id = p_id for update;
  if not found then raise exception 'Ordre introuvable.' using errcode = '22023'; end if;
  perform public._require(w.organization_id, 'maintenance.complete');
  if w.status not in ('open', 'assigned') then raise exception 'Cet ordre ne peut pas être démarré.' using errcode = '22023'; end if;
  update public.maintenance_work_orders set status = 'in_progress', started_at = now() where id = p_id;
  update public.assets set status = 'maintenance' where id = w.asset_id and status <> 'retired';
end $$;

create or replace function public.complete_maintenance_work_order(p_id text, p_resolution text default null, p_labor_minutes int default null)
returns void language plpgsql security definer set search_path = '' as $$
declare w public.maintenance_work_orders; pt record; parts numeric := 0; v numeric; labor numeric := 0; rate numeric; dt record; mins int; pl public.maintenance_plans; a public.assets; downtime int := 0;
begin
  select * into w from public.maintenance_work_orders where id = p_id for update;
  if not found then raise exception 'Ordre introuvable.' using errcode = '22023'; end if;
  perform public._require(w.organization_id, 'maintenance.complete');
  if w.status not in ('open', 'assigned', 'in_progress') then raise exception 'Cet ordre est déjà clôturé.' using errcode = '22023'; end if;
  select * into a from public.assets where id = w.asset_id for update;
  for pt in select * from public.maintenance_parts where work_order_id = p_id and not consumed loop
    v := public.issue_stock(w.organization_id, 'maintenance_consume', pt.item_id, pt.warehouse_id, pt.quantity, 'maintenance_work_orders', p_id, pt.id, null, null, 'available', 'mnt:' || pt.id, w.title);
    update public.maintenance_parts set consumed = true, unit_cost = v / pt.quantity where id = pt.id;
    parts := parts + v;
  end loop;
  mins := coalesce(p_labor_minutes, w.labor_minutes, 0);
  select coalesce(nullif(e.hourly_cost, 0), 0) into rate from public.employees e where e.id = w.assigned_to;
  labor := round(mins / 60.0 * coalesce(nullif(rate, 0), a.hourly_cost, 0), 2);
  -- close open downtime of this work order
  for dt in select * from public.production_downtime where maintenance_work_order_id = p_id and ended_at is null loop
    update public.production_downtime set ended_at = now(), minutes = greatest(round(extract(epoch from (now() - dt.started_at)) / 60)::int, 0) where id = dt.id;
    downtime := downtime + greatest(round(extract(epoch from (now() - dt.started_at)) / 60)::int, 0);
  end loop;
  update public.maintenance_work_orders set status = 'completed', completed_at = now(), resolution = coalesce(p_resolution, resolution), labor_minutes = mins,
         labor_cost = labor, parts_cost = round(parts, 2), total_cost = round(parts + labor, 2), downtime_minutes = case when downtime > 0 then downtime else downtime_minutes end,
         started_at = coalesce(started_at, now()) where id = p_id;
  update public.assets set status = 'running' where id = w.asset_id and status in ('stopped', 'maintenance');
  if w.plan_id is not null then
    select * into pl from public.maintenance_plans where id = w.plan_id;
    update public.maintenance_plans set last_done_at = current_date, last_meter = greatest(last_meter, a.meter_reading) where id = w.plan_id;
  end if;
  perform public.emit_event(w.organization_id, 'maintenance.work_order.completed', 'maintenance_work_order', p_id, jsonb_build_object('asset_id', w.asset_id, 'cost', parts + labor));
end $$;

revoke execute on function public._open_preventive_wo(public.maintenance_plans, date), public.cron_generate_preventive_work_orders() from public, anon, authenticated;
revoke execute on function public.generate_preventive_work_orders(text), public.record_meter_reading(text, numeric, text, text), public.report_breakdown(text, text, text, text),
  public.start_maintenance_work_order(text), public.complete_maintenance_work_order(text, text, int) from public, anon;
grant execute on function public.generate_preventive_work_orders(text), public.record_meter_reading(text, numeric, text, text), public.report_breakdown(text, text, text, text),
  public.start_maintenance_work_order(text), public.complete_maintenance_work_order(text, text, int) to authenticated;
