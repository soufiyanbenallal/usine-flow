-- Platform: permissions, structure (sites/departments), audit, domain events, approvals, notifications,
-- numbering, attachments, imports, integrations, modules, subscriptions.

-- ───────── permissions ─────────
create table public.role_permissions (
  role public.org_role not null,
  permission text not null,
  primary key (role, permission)
);
create table public.org_role_permissions (
  organization_id text not null references public.organizations (id) on delete cascade,
  role public.org_role not null,
  permission text not null,
  granted boolean not null,
  primary key (organization_id, role, permission)
);

do $$
declare
  all_ops text[] := array[
    'audit.view','approvals.decide','documents.write','catalog.write','partners.write','warehouse.manage','warehouse.receive','warehouse.pick',
    'warehouse.dispatch','inventory.adjust','inventory.transfer','inventory.count','purchase.write','purchase.approve','sales.write','sales.approve',
    'production.write','production.start','production.report','production.complete','quality.manage','quality.inspect','maintenance.write',
    'maintenance.report','maintenance.complete','workforce.write','finance.write','planning.run'];
  matrix jsonb := jsonb_build_object(
    'site_manager', to_jsonb(all_ops),
    'accountant', '["audit.view","partners.write","purchase.write","sales.write","finance.write","approvals.decide","purchase.approve","documents.write"]'::jsonb,
    'warehouse_manager', '["catalog.write","partners.write","warehouse.manage","warehouse.receive","warehouse.pick","warehouse.dispatch","inventory.adjust","inventory.transfer","inventory.count","documents.write","maintenance.report","quality.inspect"]'::jsonb,
    'purchasing_manager', '["catalog.write","partners.write","purchase.write","purchase.approve","warehouse.receive","approvals.decide","documents.write","planning.run"]'::jsonb,
    'sales_manager', '["catalog.write","partners.write","sales.write","sales.approve","approvals.decide","documents.write","warehouse.dispatch"]'::jsonb,
    'production_manager', '["catalog.write","production.write","production.start","production.report","production.complete","inventory.transfer","planning.run","workforce.write","approvals.decide","documents.write","maintenance.report","quality.inspect"]'::jsonb,
    'quality_manager', '["quality.manage","quality.inspect","documents.write","approvals.decide","audit.view"]'::jsonb,
    'maintenance_manager', '["maintenance.write","maintenance.report","maintenance.complete","inventory.transfer","documents.write","approvals.decide"]'::jsonb,
    'operator', '["production.report","warehouse.pick","warehouse.receive","inventory.count","quality.inspect","maintenance.report"]'::jsonb
  );
  r text; p text;
begin
  for r in select jsonb_object_keys(matrix) loop
    for p in select jsonb_array_elements_text(matrix -> r) loop
      insert into public.role_permissions (role, permission) values (r::public.org_role, p) on conflict do nothing;
    end loop;
  end loop;
end $$;

create or replace function public.has_permission(org text, perm text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case
      when m.role in ('owner', 'admin') then true
      else coalesce(
        (select o.granted from public.org_role_permissions o where o.organization_id = org and o.role = m.role and o.permission = perm),
        exists (select 1 from public.role_permissions r where r.role = m.role and r.permission = perm))
    end
    from public.memberships m where m.organization_id = org and m.user_id = (select auth.uid())
  ), false);
$$;

-- can_write: any role that can write anything operational (kept for storage/legacy policies)
create or replace function public.can_write(org text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid()) and m.role not in ('viewer', 'operator')
  );
$$;

create or replace function public.my_role(org text)
returns public.org_role language sql stable security definer set search_path = '' as $$
  select m.role from public.memberships m where m.organization_id = org and m.user_id = (select auth.uid());
$$;

create or replace function public.my_permissions(org text)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct p.permission), '{}') from (
    select unnest(array['audit.view','approvals.decide','documents.write','catalog.write','partners.write','warehouse.manage','warehouse.receive','warehouse.pick',
      'warehouse.dispatch','inventory.adjust','inventory.transfer','inventory.count','purchase.write','purchase.approve','sales.write','sales.approve',
      'production.write','production.start','production.report','production.complete','quality.manage','quality.inspect','maintenance.write',
      'maintenance.report','maintenance.complete','workforce.write','finance.write','planning.run','platform.manage','users.manage','integrations.manage']) as permission
  ) p where public.has_permission(org, p.permission);
$$;

-- ───────── standard column / security helpers ─────────
create or replace function public.set_audit_columns()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, (select auth.uid()));
    new.updated_by := coalesce(new.updated_by, (select auth.uid()));
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := coalesce(new.updated_at, now());
  else
    new.organization_id := old.organization_id;      -- tenant can never be changed
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
    new.updated_by := (select auth.uid());
  end if;
  return new;
end $$;

-- audit_logs (append-only)
create table public.audit_logs (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  user_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  changed text[],
  ip text,
  device text,
  source text not null default 'api',
  correlation_id text,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (organization_id, entity, entity_id);
create index audit_logs_user_idx on public.audit_logs (organization_id, user_id, created_at desc);

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_j jsonb; new_j jsonb; org text; ent text; act text; keys text[]; hdrs jsonb; ip text; dev text;
begin
  if tg_op in ('UPDATE', 'DELETE') then old_j := to_jsonb(old); end if;
  if tg_op in ('UPDATE', 'INSERT') then new_j := to_jsonb(new); end if;
  if tg_op = 'UPDATE' then
    if (old_j - 'updated_at' - 'updated_by') = (new_j - 'updated_at' - 'updated_by') then return new; end if;
    select coalesce(array_agg(k), '{}') into keys from jsonb_object_keys(new_j) k
      where k not in ('updated_at', 'updated_by') and (old_j -> k) is distinct from (new_j -> k);
  end if;
  org := coalesce(new_j ->> 'organization_id', old_j ->> 'organization_id');
  ent := tg_table_name;
  act := case
    when tg_op = 'UPDATE' and (old_j ->> 'status') is distinct from (new_j ->> 'status') then 'status_change'
    else lower(tg_op) end;
  begin
    hdrs := nullif(current_setting('request.headers', true), '')::jsonb;
    ip := split_part(coalesce(hdrs ->> 'x-forwarded-for', hdrs ->> 'x-real-ip', ''), ',', 1);
    dev := left(hdrs ->> 'user-agent', 300);
  exception when others then ip := null; dev := null; end;
  insert into public.audit_logs (organization_id, user_id, action, entity, entity_id, before, after, changed, ip, device, source, correlation_id, reason)
  values (org, (select auth.uid()), act, ent, coalesce(new_j ->> 'id', old_j ->> 'id'), old_j, new_j, keys, nullif(ip, ''), dev,
          coalesce(nullif(current_setting('app.source', true), ''), 'api'), nullif(current_setting('app.correlation_id', true), ''),
          nullif(current_setting('app.reason', true), ''));
  return coalesce(new, old);
end $$;

create or replace function public.forbid_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'La table % est en ajout seul (historique immuable).', tg_table_name using errcode = '42501';
end $$;

create trigger audit_logs_immutable before update or delete on public.audit_logs for each row execute function public.forbid_mutation();

-- Posted documents cannot be silently edited: only status moves and note edits.
create or replace function public.lock_posted_document()
returns trigger language plpgsql set search_path = '' as $$
declare locked text[] := array['posted', 'reversed'];
begin
  if tg_op = 'DELETE' then
    if old.status = any (locked || array['completed', 'closed']) then
      raise exception 'Document comptabilisé : utilisez une correction, une annulation ou un document de remplacement.' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.status = any (locked) then
    if (to_jsonb(old) - 'status' - 'updated_at' - 'updated_by' - 'notes' - 'reversed_at' - 'reversal_reason' - 'paid_amount' - 'payment_status')
       is distinct from (to_jsonb(new) - 'status' - 'updated_at' - 'updated_by' - 'notes' - 'reversed_at' - 'reversal_reason' - 'paid_amount' - 'payment_status') then
      raise exception 'Document comptabilisé : utilisez une correction, une annulation ou un document de remplacement.' using errcode = '42501';
    end if;
    if new.status <> old.status and not (old.status = 'posted' and new.status = 'reversed') then
      raise exception 'Transition de statut interdite pour un document comptabilisé.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Lines of a posted document are frozen. TG_ARGV: parent table, fk column.
create or replace function public.lock_document_lines()
returns trigger language plpgsql set search_path = '' as $$
declare parent_id text; parent_status text;
begin
  parent_id := coalesce(to_jsonb(new) ->> tg_argv[1], to_jsonb(old) ->> tg_argv[1]);
  execute format('select status from public.%I where id = $1', tg_argv[0]) into parent_status using parent_id;
  if parent_status in ('posted', 'reversed', 'completed', 'closed', 'cancelled') and coalesce(current_setting('app.bypass_lock', true), '') <> 'on' then
    raise exception 'Les lignes d’un document comptabilisé ne peuvent pas être modifiées.' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;

-- Adds created_at/updated_at/created_by/updated_by + triggers + RLS policies to a business table.
create or replace function public._secure(t text, write_perm text, delete_perm text default null)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', t);
  execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', t);
  execute format('alter table public.%I add column if not exists created_by uuid default auth.uid()', t);
  execute format('alter table public.%I add column if not exists updated_by uuid default auth.uid()', t);
  execute format('create index if not exists %I on public.%I (organization_id)', t || '_org_idx', t);
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member(organization_id))', t);
  execute format('create policy "writers insert" on public.%I for insert to authenticated with check (public.has_permission(organization_id, %L))', t, write_perm);
  execute format('create policy "writers update" on public.%I for update to authenticated using (public.has_permission(organization_id, %L)) with check (public.has_permission(organization_id, %L))', t, write_perm, write_perm);
  execute format('create policy "writers delete" on public.%I for delete to authenticated using (public.has_permission(organization_id, %L))', t, coalesce(delete_perm, write_perm));
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  execute format('create trigger set_audit_columns before insert or update on public.%I for each row execute function public.set_audit_columns()', t);
  execute format('create trigger audit_row_change after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
end $$;

-- Read-only (for the API) tables: members read, nobody writes directly (writes go through SECURITY DEFINER functions).
create or replace function public._readonly(t text)
returns void language plpgsql set search_path = '' as $$
begin
  execute format('create index if not exists %I on public.%I (organization_id)', t || '_org_idx', t);
  execute format('alter table public.%I enable row level security', t);
  execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member(organization_id))', t);
  execute format('grant select on public.%I to authenticated', t);
end $$;

-- ───────── document numbering ─────────
create table public.document_sequences (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  doc_type text not null,
  prefix text not null,
  padding int not null default 5 check (padding between 1 and 10),
  next_value bigint not null default 1,
  reset_yearly boolean not null default true,
  year int,
  unique (organization_id, doc_type)
);
select public._secure('document_sequences', 'platform.manage');

create or replace function public.has_platform_manage(org text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin(org);
$$;

create or replace function public.next_document_number(p_org text, p_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare seq public.document_sequences; yr int := extract(year from now())::int; n bigint;
begin
  select * into seq from public.document_sequences where organization_id = p_org and doc_type = p_type for update;
  if not found then
    insert into public.document_sequences (organization_id, doc_type, prefix) values (p_org, p_type, upper(left(p_type, 3)))
      on conflict (organization_id, doc_type) do nothing;
    select * into seq from public.document_sequences where organization_id = p_org and doc_type = p_type for update;
  end if;
  if seq.reset_yearly and coalesce(seq.year, yr) <> yr then seq.next_value := 1; end if;
  n := seq.next_value;
  update public.document_sequences set next_value = n + 1, year = yr where id = seq.id;
  return seq.prefix || case when seq.reset_yearly then '-' || yr::text else '' end || '-' || lpad(n::text, seq.padding, '0');
end $$;

-- before-insert trigger: TG_ARGV[0] = doc type. Assigns `number` when empty.
create or replace function public.assign_document_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.number, '') = '' then new.number := public.next_document_number(new.organization_id, tg_argv[0]); end if;
  return new;
end $$;

-- ───────── structure: sites, facilities, departments, teams ─────────
create table public.sites (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null default 'factory' check (kind in ('factory', 'workshop', 'warehouse', 'office')),
  address text, city text, phone text,
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('sites', 'platform.manage');

create table public.facilities (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  site_id text not null references public.sites (id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null default 'production' check (kind in ('production', 'storage', 'maintenance', 'quality', 'utility', 'office')),
  active boolean not null default true,
  unique (organization_id, code)
);
create index facilities_site_idx on public.facilities (site_id);
select public._secure('facilities', 'platform.manage');

create table public.departments (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  site_id text references public.sites (id) on delete set null,
  code text not null,
  name text not null,
  manager_name text,
  active boolean not null default true,
  unique (organization_id, code)
);
select public._secure('departments', 'workforce.write');

create table public.teams (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  department_id text references public.departments (id) on delete set null,
  name text not null,
  lead_name text,
  active boolean not null default true,
  unique (organization_id, name)
);
select public._secure('teams', 'workforce.write');

-- site / warehouse scoped access (no rows = unrestricted)
create table public.user_site_access (
  organization_id text not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  site_id text not null references public.sites (id) on delete cascade,
  primary key (organization_id, user_id, site_id)
);
create table public.user_warehouse_access (
  organization_id text not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  warehouse_id text not null,
  primary key (organization_id, user_id, warehouse_id)
);
alter table public.user_site_access enable row level security;
alter table public.user_warehouse_access enable row level security;
create policy "members read own site access" on public.user_site_access for select to authenticated using (public.is_member(organization_id) and (user_id = (select auth.uid()) or public.is_admin(organization_id)));
create policy "admins manage site access" on public.user_site_access for all to authenticated using (public.is_admin(organization_id)) with check (public.is_admin(organization_id));
create policy "members read own wh access" on public.user_warehouse_access for select to authenticated using (public.is_member(organization_id) and (user_id = (select auth.uid()) or public.is_admin(organization_id)));
create policy "admins manage wh access" on public.user_warehouse_access for all to authenticated using (public.is_admin(organization_id)) with check (public.is_admin(organization_id));
grant select, insert, update, delete on public.user_site_access, public.user_warehouse_access to authenticated;

alter table public.org_role_permissions enable row level security;
create policy "members read org permissions" on public.org_role_permissions for select to authenticated using (public.is_member(organization_id));
create policy "admins manage org permissions" on public.org_role_permissions for all to authenticated using (public.is_admin(organization_id)) with check (public.is_admin(organization_id));
grant select, insert, update, delete on public.org_role_permissions to authenticated;
alter table public.role_permissions enable row level security;
create policy "everyone reads default permissions" on public.role_permissions for select to authenticated using (true);
grant select on public.role_permissions to authenticated;

-- audit_logs / domain_events read access
alter table public.audit_logs enable row level security;
create policy "auditors read" on public.audit_logs for select to authenticated using (public.has_permission(organization_id, 'audit.view'));
grant select on public.audit_logs to authenticated;

-- ───────── domain events (outbox) ─────────
create table public.domain_events (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'processed', 'failed')),
  attempts int not null default 0,
  last_error text,
  actor_id uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index domain_events_pending_idx on public.domain_events (created_at) where status in ('pending', 'failed');
create index domain_events_org_idx on public.domain_events (organization_id, created_at desc);
create index domain_events_aggregate_idx on public.domain_events (organization_id, aggregate_type, aggregate_id);
select public._readonly('domain_events');

create or replace function public.emit_event(p_org text, p_type text, p_aggregate text, p_id text, p_payload jsonb default '{}'::jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare eid text;
begin
  insert into public.domain_events (organization_id, event_type, aggregate_type, aggregate_id, payload, actor_id)
  values (p_org, p_type, p_aggregate, p_id, coalesce(p_payload, '{}'::jsonb), (select auth.uid())) returning id into eid;
  return eid;
end $$;

-- Consumers claim events with SKIP LOCKED (service role / edge function).
create or replace function public.claim_domain_events(p_limit int default 50)
returns setof public.domain_events language plpgsql security definer set search_path = '' as $$
begin
  return query
  with c as (
    select id from public.domain_events where status in ('pending', 'failed') and attempts < 5
    order by created_at limit p_limit for update skip locked
  )
  update public.domain_events e set status = 'processing', attempts = e.attempts + 1 from c where e.id = c.id returning e.*;
end $$;

create or replace function public.complete_domain_event(p_id text, p_ok boolean, p_error text default null)
returns void language sql security definer set search_path = '' as $$
  update public.domain_events set status = case when p_ok then 'processed' else 'failed' end, processed_at = now(), last_error = p_error where id = p_id;
$$;

-- ───────── notifications ─────────
create table public.notifications (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "own notifications read" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "own notifications update" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own notifications delete" on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
grant select, update (read_at), delete on public.notifications to authenticated;

create table public.notification_preferences (
  organization_id text not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  in_app boolean not null default true,
  email boolean not null default false,
  whatsapp boolean not null default false,
  push boolean not null default false,
  primary key (organization_id, user_id, event_type)
);
alter table public.notification_preferences enable row level security;
create policy "own prefs" on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid()) and public.is_member(organization_id)) with check (user_id = (select auth.uid()) and public.is_member(organization_id));
grant select, insert, update, delete on public.notification_preferences to authenticated;

-- Outbox of external channel deliveries (email / WhatsApp / push) consumed by an edge function.
create table public.notification_deliveries (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  notification_id text not null references public.notifications (id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp', 'push')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_deliveries_pending_idx on public.notification_deliveries (created_at) where status = 'pending';
select public._readonly('notification_deliveries');

-- Fan-out a notification to organization members (by role list; null = owners/admins).
create or replace function public.notify(p_org text, p_event text, p_title text, p_body text default null, p_link text default null,
                                         p_severity text default 'info', p_roles public.org_role[] default null)
returns int language plpgsql security definer set search_path = '' as $$
declare m record; nid text; n int := 0; pref public.notification_preferences; ch text;
begin
  for m in select user_id, role from public.memberships where organization_id = p_org
           and (role = any (coalesce(p_roles, '{}'::public.org_role[])) or role in ('owner', 'admin')) loop
    select * into pref from public.notification_preferences where organization_id = p_org and user_id = m.user_id and event_type = p_event;
    if found and not (pref.in_app or pref.email or pref.whatsapp or pref.push) then continue; end if;
    if not found or pref.in_app then
      insert into public.notifications (organization_id, user_id, event_type, severity, title, body, link)
      values (p_org, m.user_id, p_event, p_severity, p_title, p_body, p_link) returning id into nid;
      n := n + 1;
      if found then
        foreach ch in array array['email', 'whatsapp', 'push'] loop
          if (ch = 'email' and pref.email) or (ch = 'whatsapp' and pref.whatsapp) or (ch = 'push' and pref.push) then
            insert into public.notification_deliveries (organization_id, notification_id, channel) values (p_org, nid, ch);
          end if;
        end loop;
      end if;
    end if;
  end loop;
  return n;
end $$;

-- ───────── approvals engine ─────────
create table public.approval_policies (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  name text not null,
  min_amount numeric(18, 2) not null default 0,
  steps jsonb not null default '[]'::jsonb,   -- [{ "role": "purchasing_manager", "label": "Manager" }, ...]
  active boolean not null default true,
  unique (organization_id, entity_type, name)
);
select public._secure('approval_policies', 'platform.manage');

create table public.approval_requests (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  summary text,
  amount numeric(18, 2) not null default 0,
  policy_id text references public.approval_policies (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  current_step int not null default 1,
  requested_by uuid default auth.uid(),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index approval_requests_entity_idx on public.approval_requests (organization_id, entity_type, entity_id);
create index approval_requests_status_idx on public.approval_requests (organization_id, status);
select public._readonly('approval_requests');

create table public.approval_steps (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  request_id text not null references public.approval_requests (id) on delete cascade,
  step_no int not null,
  role public.org_role not null,
  label text,
  status text not null default 'waiting' check (status in ('waiting', 'pending', 'approved', 'rejected', 'skipped')),
  decided_by uuid,
  decided_at timestamptz,
  unique (request_id, step_no)
);
select public._readonly('approval_steps');

create table public.approval_actions (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  request_id text not null references public.approval_requests (id) on delete cascade,
  step_no int not null,
  actor_id uuid default auth.uid(),
  action text not null check (action in ('requested', 'approved', 'rejected', 'cancelled', 'commented')),
  comment text,
  created_at timestamptz not null default now()
);
select public._readonly('approval_actions');

-- Final decision hook: moves the business document according to the outcome.
create or replace function public._apply_approval_outcome(p_org text, p_type text, p_id text, p_approved boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare tbl text;
begin
  tbl := case p_type
    when 'purchase_request' then 'purchase_requests' when 'purchase_order' then 'purchase_orders'
    when 'stock_adjustment' then 'stock_adjustments' when 'sales_order' then 'sales_orders' when 'quote' then 'quotes'
    when 'production_order' then 'production_orders' when 'inventory_count' then 'inventory_counts'
    when 'expense' then 'expenses' when 'payment' then 'payments' when 'supplier_invoice' then 'supplier_invoices'
    when 'stock_scrap' then 'stock_adjustments' else null end;
  if tbl is null then return; end if;
  if to_regclass('public.' || tbl) is null then return; end if;
  if p_approved then
    execute format('update public.%I set status = ''approved'' where id = $1 and organization_id = $2 and status = ''pending_approval''', tbl) using p_id, p_org;
  else
    execute format('update public.%I set status = ''draft'' where id = $1 and organization_id = $2 and status = ''pending_approval''', tbl) using p_id, p_org;
  end if;
end $$;

create or replace function public.request_approval(p_org text, p_type text, p_id text, p_amount numeric default 0, p_summary text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare pol public.approval_policies; rid text; s jsonb; i int := 0;
begin
  if not public.is_member(p_org) then raise exception 'Accès refusé.' using errcode = '42501'; end if;
  select * into pol from public.approval_policies
   where organization_id = p_org and entity_type = p_type and active and min_amount <= coalesce(p_amount, 0)
   order by min_amount desc limit 1;
  if not found then return null; end if;   -- no policy: no approval needed
  select id into rid from public.approval_requests where organization_id = p_org and entity_type = p_type and entity_id = p_id and status = 'pending';
  if rid is not null then return rid; end if;
  insert into public.approval_requests (organization_id, entity_type, entity_id, summary, amount, policy_id)
  values (p_org, p_type, p_id, p_summary, coalesce(p_amount, 0), pol.id) returning id into rid;
  for s in select * from jsonb_array_elements(pol.steps) loop
    i := i + 1;
    insert into public.approval_steps (organization_id, request_id, step_no, role, label, status)
    values (p_org, rid, i, (s ->> 'role')::public.org_role, s ->> 'label', case when i = 1 then 'pending' else 'waiting' end);
  end loop;
  if i = 0 then
    update public.approval_requests set status = 'approved', decided_at = now() where id = rid;
    perform public._apply_approval_outcome(p_org, p_type, p_id, true);
    return rid;
  end if;
  insert into public.approval_actions (organization_id, request_id, step_no, action) values (p_org, rid, 0, 'requested');
  perform public.notify(p_org, 'approval.pending', 'Approbation requise', coalesce(p_summary, p_type), 'approbations', 'warning',
                        array[(select role from public.approval_steps where request_id = rid and step_no = 1), 'owner', 'admin']::public.org_role[]);
  perform public.emit_event(p_org, 'approval.requested', p_type, p_id, jsonb_build_object('request_id', rid, 'amount', p_amount));
  return rid;
end $$;

create or replace function public.decide_approval(p_request text, p_approve boolean, p_comment text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare req public.approval_requests; st public.approval_steps; my public.org_role; last_no int;
begin
  select * into req from public.approval_requests where id = p_request for update;
  if not found or not public.is_member(req.organization_id) then raise exception 'Demande introuvable.' using errcode = '42501'; end if;
  if req.status <> 'pending' then raise exception 'Cette demande est déjà clôturée.'; end if;
  select * into st from public.approval_steps where request_id = req.id and step_no = req.current_step for update;
  my := public.my_role(req.organization_id);
  if not (my in ('owner', 'admin') or my = st.role) then raise exception 'Vous n’êtes pas habilité à décider de cette étape.' using errcode = '42501'; end if;
  if req.requested_by = (select auth.uid()) and my not in ('owner', 'admin') then raise exception 'Vous ne pouvez pas approuver votre propre demande.' using errcode = '42501'; end if;
  update public.approval_steps set status = case when p_approve then 'approved' else 'rejected' end, decided_by = (select auth.uid()), decided_at = now() where id = st.id;
  insert into public.approval_actions (organization_id, request_id, step_no, action, comment)
  values (req.organization_id, req.id, st.step_no, case when p_approve then 'approved' else 'rejected' end, p_comment);
  select max(step_no) into last_no from public.approval_steps where request_id = req.id;
  if not p_approve then
    update public.approval_requests set status = 'rejected', decided_at = now(), updated_at = now() where id = req.id;
    perform public._apply_approval_outcome(req.organization_id, req.entity_type, req.entity_id, false);
    perform public.emit_event(req.organization_id, 'approval.rejected', req.entity_type, req.entity_id, jsonb_build_object('request_id', req.id));
    return 'rejected';
  elsif st.step_no >= last_no then
    update public.approval_requests set status = 'approved', decided_at = now(), updated_at = now() where id = req.id;
    perform public._apply_approval_outcome(req.organization_id, req.entity_type, req.entity_id, true);
    perform public.emit_event(req.organization_id, 'approval.approved', req.entity_type, req.entity_id, jsonb_build_object('request_id', req.id));
    return 'approved';
  else
    update public.approval_requests set current_step = st.step_no + 1, updated_at = now() where id = req.id;
    update public.approval_steps set status = 'pending' where request_id = req.id and step_no = st.step_no + 1;
    return 'pending';
  end if;
end $$;

create or replace function public.cancel_approval(p_request text)
returns void language plpgsql security definer set search_path = '' as $$
declare req public.approval_requests;
begin
  select * into req from public.approval_requests where id = p_request for update;
  if not found or not public.is_member(req.organization_id) then raise exception 'Demande introuvable.' using errcode = '42501'; end if;
  if req.requested_by <> (select auth.uid()) and not public.is_admin(req.organization_id) then raise exception 'Accès refusé.' using errcode = '42501'; end if;
  update public.approval_requests set status = 'cancelled', decided_at = now() where id = req.id and status = 'pending';
  insert into public.approval_actions (organization_id, request_id, step_no, action) values (req.organization_id, req.id, req.current_step, 'cancelled');
  perform public._apply_approval_outcome(req.organization_id, req.entity_type, req.entity_id, false);
end $$;

-- True when no policy applies or the latest request for the document is approved.
create or replace function public.approval_satisfied(p_org text, p_type text, p_id text, p_amount numeric)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.approval_policies where organization_id = p_org and entity_type = p_type and active and min_amount <= coalesce(p_amount, 0)) then
    return true;
  end if;
  return exists (select 1 from public.approval_requests where organization_id = p_org and entity_type = p_type and entity_id = p_id and status = 'approved');
end $$;

-- ───────── attachments (documents library) ─────────
create table public.attachments (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  entity_type text not null,
  entity_id text,
  kind text not null default 'document' check (kind in ('document', 'certificate', 'image', 'technical', 'invoice', 'photo', 'other')),
  name text not null,
  path text not null,
  mime text,
  size_bytes bigint,
  expires_on date,
  notes text
);
create index attachments_entity_idx on public.attachments (organization_id, entity_type, entity_id);
select public._secure('attachments', 'documents.write');

-- ───────── import jobs ─────────
create table public.import_jobs (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  kind text not null,
  filename text,
  total_rows int not null default 0,
  valid_rows int not null default 0,
  warning_rows int not null default 0,
  error_rows int not null default 0,
  status text not null default 'completed' check (status in ('previewed', 'running', 'completed', 'failed')),
  mapping jsonb,
  report jsonb
);
select public._secure('import_jobs', 'platform.manage');

-- ───────── modules, feature flags, subscription, usage ─────────
create table public.org_modules (
  organization_id text not null references public.organizations (id) on delete cascade,
  module text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (organization_id, module)
);
alter table public.org_modules enable row level security;
create policy "members read modules" on public.org_modules for select to authenticated using (public.is_member(organization_id));
create policy "admins manage modules" on public.org_modules for all to authenticated using (public.is_admin(organization_id)) with check (public.is_admin(organization_id));
grant select, insert, update, delete on public.org_modules to authenticated;

create table public.feature_flags (
  organization_id text not null references public.organizations (id) on delete cascade,
  key text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  primary key (organization_id, key)
);
alter table public.feature_flags enable row level security;
create policy "members read flags" on public.feature_flags for select to authenticated using (public.is_member(organization_id));
create policy "admins manage flags" on public.feature_flags for all to authenticated using (public.is_admin(organization_id)) with check (public.is_admin(organization_id));
grant select, insert, update, delete on public.feature_flags to authenticated;

create table public.subscriptions (
  organization_id text primary key references public.organizations (id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial', 'starter', 'pro', 'enterprise')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  seats int not null default 5,
  max_items int not null default 500,
  max_warehouses int not null default 2,
  max_movements_per_month int not null default 5000,
  current_period_end date default (current_date + 30),
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "members read subscription" on public.subscriptions for select to authenticated using (public.is_member(organization_id));
grant select on public.subscriptions to authenticated;

create table public.usage_counters (
  organization_id text not null references public.organizations (id) on delete cascade,
  metric text not null,
  period text not null,          -- yyyy-mm
  value bigint not null default 0,
  primary key (organization_id, metric, period)
);
alter table public.usage_counters enable row level security;
create policy "members read usage" on public.usage_counters for select to authenticated using (public.is_member(organization_id));
grant select on public.usage_counters to authenticated;

create or replace function public.bump_usage(p_org text, p_metric text, p_by bigint default 1)
returns void language sql security definer set search_path = '' as $$
  insert into public.usage_counters (organization_id, metric, period, value) values (p_org, p_metric, to_char(now(), 'YYYY-MM'), p_by)
  on conflict (organization_id, metric, period) do update set value = public.usage_counters.value + p_by;
$$;

-- ───────── integrations ─────────
create table public.webhooks (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  name text not null,
  url text not null check (url ~ '^https://'),
  events text[] not null default '{}',
  secret text not null default encode(gen_random_bytes(24), 'hex'),
  active boolean not null default true
);
select public._secure('webhooks', 'integrations.manage');

create table public.webhook_deliveries (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  webhook_id text not null references public.webhooks (id) on delete cascade,
  event_id text references public.domain_events (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  response_status int,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index webhook_deliveries_pending_idx on public.webhook_deliveries (created_at) where status = 'pending';
select public._readonly('webhook_deliveries');

create table public.api_keys (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  name text not null,
  prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{read}',
  last_used_at timestamptz,
  revoked_at timestamptz
);
select public._secure('api_keys', 'integrations.manage');

-- Queue a webhook delivery for every subscribed webhook when an event is recorded.
create or replace function public.fanout_webhooks()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.webhook_deliveries (organization_id, webhook_id, event_id)
  select new.organization_id, w.id, new.id from public.webhooks w
   where w.organization_id = new.organization_id and w.active and (cardinality(w.events) = 0 or new.event_type = any (w.events));
  return new;
end $$;
create trigger domain_events_webhooks after insert on public.domain_events for each row execute function public.fanout_webhooks();

-- idempotent offline operations (PWA sync)
create table public.client_operations (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  idempotency_key text not null,
  device_id text,
  user_id uuid default auth.uid(),
  op_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'applied' check (status in ('applied', 'rejected')),
  result jsonb,
  client_created_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);
select public._readonly('client_operations');

-- ───────── grants ─────────
revoke execute on function public._secure(text, text, text), public._readonly(text), public.emit_event(text, text, text, text, jsonb),
  public.notify(text, text, text, text, text, text, public.org_role[]), public.bump_usage(text, text, bigint), public._apply_approval_outcome(text, text, text, boolean),
  public.claim_domain_events(int), public.complete_domain_event(text, boolean, text), public.next_document_number(text, text), public.set_audit_columns(),
  public.audit_row_change(), public.forbid_mutation(), public.lock_posted_document(), public.lock_document_lines(), public.assign_document_number(),
  public.fanout_webhooks(), public.has_platform_manage(text)
  from public, anon, authenticated;
revoke execute on function public.has_permission(text, text), public.my_role(text), public.my_permissions(text), public.request_approval(text, text, text, numeric, text),
  public.decide_approval(text, boolean, text), public.cancel_approval(text), public.approval_satisfied(text, text, text, numeric) from public, anon;
grant execute on function public.has_permission(text, text), public.my_role(text), public.my_permissions(text), public.request_approval(text, text, text, numeric, text),
  public.decide_approval(text, boolean, text), public.cancel_approval(text), public.approval_satisfied(text, text, text, numeric) to authenticated;
