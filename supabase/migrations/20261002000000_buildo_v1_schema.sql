-- Buildo V1 schema: multi-tenant (organization_id on every row), RLS everywhere.
-- Replaces the sample "instruments" migrations.

create extension if not exists pgcrypto;

-- ───────── Enums ─────────
create type public.org_role as enum ('owner', 'admin', 'site_manager', 'accountant', 'viewer');
create type public.chantier_status as enum ('planned', 'in_progress', 'paused', 'done');
create type public.payment_direction as enum ('in', 'out');
create type public.payment_method as enum ('cash', 'transfer', 'cheque', 'effet', 'card');
create type public.payment_status as enum ('pending', 'paid', 'overdue');
create type public.po_status as enum ('draft', 'ordered', 'delivered', 'invoiced');
create type public.attendance_status as enum ('present', 'absent', 'half_day');

-- ───────── Tenancy ─────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  locale text not null default 'fr' check (locale in ('fr', 'ar', 'en')),
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_form text,
  ice text, if_number text, rc text, patente text, cnss text,
  address text, city text, phone text, email text,
  currency text not null default 'MAD',
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- Helpers used by RLS. security definer + fixed search_path avoids recursive policies.
create or replace function public.is_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.organization_id = org and m.user_id = (select auth.uid()));
$$;

create or replace function public.can_write(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'site_manager', 'accountant')
  );
$$;

create or replace function public.is_admin(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
  );
$$;

-- On sign-up: create profile + first organization + owner membership.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare org uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.organizations (name)
  values (coalesce(nullif(new.raw_user_meta_data ->> 'company_name', ''), 'Mon entreprise'))
  returning id into org;

  insert into public.memberships (organization_id, user_id, role) values (org, new.id, 'owner');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── Business tables ─────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null, ice text, phone text, email text, address text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  name text not null,
  contract_amount numeric(14, 2) not null default 0 check (contract_amount >= 0),
  status text not null default 'in_progress',
  created_at timestamptz not null default now()
);

create table public.chantiers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  name text not null,
  city text, address text, lat double precision, lng double precision,
  status public.chantier_status not null default 'planned',
  budget numeric(14, 2) not null default 0 check (budget >= 0),
  progress smallint not null default 0 check (progress between 0 and 100),
  start_date date, end_date date,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null, category text, ice text, phone text, email text, city text,
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  name text not null, category text, unit text not null default 'u',
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  stock_qty numeric(14, 3) not null default 0,
  min_stock numeric(14, 3) not null default 0,
  created_at timestamptz not null default now()
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null, trade text, phone text, cin text,
  daily_rate numeric(10, 2) not null default 0 check (daily_rate >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  worker_id uuid not null references public.workers (id) on delete cascade,
  chantier_id uuid not null references public.chantiers (id) on delete cascade,
  day date not null,
  status public.attendance_status not null default 'present',
  unique (worker_id, day)
);

create table public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  chantier_id uuid references public.chantiers (id) on delete set null,
  name text not null, trade text, phone text,
  contract_amount numeric(14, 2) not null default 0 check (contract_amount >= 0),
  retention_pct numeric(4, 2) not null default 10 check (retention_pct between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  chantier_id uuid references public.chantiers (id) on delete set null,
  reference text not null,
  status public.po_status not null default 'draft',
  order_date date not null default current_date,
  total_ht numeric(14, 2) not null default 0,
  vat_rate numeric(4, 2) not null default 20 check (vat_rate in (0, 7, 10, 14, 20)),
  created_at timestamptz not null default now(),
  unique (organization_id, reference)
);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  material_id uuid references public.materials (id) on delete set null,
  label text not null,
  qty numeric(14, 3) not null check (qty > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  chantier_id uuid references public.chantiers (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  purchase_order_id uuid references public.purchase_orders (id) on delete set null,
  label text not null,
  category text not null default 'divers',
  amount numeric(14, 2) not null check (amount >= 0),
  spent_on date not null default current_date,
  receipt_path text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  direction public.payment_direction not null,
  chantier_id uuid references public.chantiers (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  supplier_id uuid references public.suppliers (id) on delete set null,
  subcontractor_id uuid references public.subcontractors (id) on delete set null,
  label text not null,
  amount numeric(14, 2) not null check (amount > 0),
  due_date date,
  paid_on date,
  method public.payment_method not null default 'transfer',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  chantier_id uuid references public.chantiers (id) on delete set null,
  name text not null, doc_type text not null default 'autre',
  storage_path text not null, size_bytes bigint,
  uploaded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- FK + filter indexes
create index on public.clients (organization_id);
create index on public.projects (organization_id);
create index on public.chantiers (organization_id, status);
create index on public.chantiers (project_id);
create index on public.suppliers (organization_id);
create index on public.materials (organization_id);
create index on public.materials (supplier_id);
create index on public.workers (organization_id);
create index on public.attendance (organization_id, day);
create index on public.attendance (chantier_id);
create index on public.subcontractors (organization_id);
create index on public.subcontractors (chantier_id);
create index on public.purchase_orders (organization_id, status);
create index on public.purchase_orders (supplier_id);
create index on public.purchase_orders (chantier_id);
create index on public.purchase_order_lines (purchase_order_id);
create index on public.expenses (organization_id, spent_on desc);
create index on public.expenses (chantier_id);
create index on public.payments (organization_id, status, due_date);
create index on public.payments (chantier_id);
create index on public.documents (organization_id);
create index on public.documents (chantier_id);

-- ───────── Row Level Security ─────────
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "members read org" on public.organizations for select to authenticated using (public.is_member(id));
create policy "admins update org" on public.organizations for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));

create policy "members read memberships" on public.memberships for select to authenticated using (public.is_member(organization_id));

-- Tenant tables: members read, writers write, admins delete.
do $$
declare t text;
begin
  foreach t in array array[
    'clients','projects','chantiers','suppliers','materials','workers','attendance',
    'subcontractors','purchase_orders','purchase_order_lines','expenses','payments','documents'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.is_member(organization_id))', t);
    execute format('create policy "writers insert" on public.%I for insert to authenticated with check (public.can_write(organization_id))', t);
    execute format('create policy "writers update" on public.%I for update to authenticated using (public.can_write(organization_id)) with check (public.can_write(organization_id))', t);
    execute format('create policy "admins delete" on public.%I for delete to authenticated using (public.is_admin(organization_id))', t);
  end loop;
end $$;

-- ───────── Grants (explicit; nothing for anon) ─────────
grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select on public.memberships to authenticated;
grant select, insert, update, delete on
  public.clients, public.projects, public.chantiers, public.suppliers, public.materials, public.workers,
  public.attendance, public.subcontractors, public.purchase_orders, public.purchase_order_lines,
  public.expenses, public.payments, public.documents
to authenticated;

-- ───────── Storage: private bucket, files under <organization_id>/... ─────────
insert into storage.buckets (id, name, public) values ('buildo-files', 'buildo-files', false)
on conflict (id) do nothing;

create policy "members read files" on storage.objects for select to authenticated
  using (bucket_id = 'buildo-files' and public.is_member(((storage.foldername(name))[1])::uuid));
create policy "writers upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'buildo-files' and public.can_write(((storage.foldername(name))[1])::uuid));
create policy "admins delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'buildo-files' and public.is_admin(((storage.foldername(name))[1])::uuid));

-- ───────── Profitability view (security_invoker → respects the caller's RLS) ─────────
create view public.chantier_financials with (security_invoker = true) as
select
  c.id as chantier_id,
  c.organization_id,
  c.name,
  c.budget,
  coalesce((select sum(e.amount) from public.expenses e where e.chantier_id = c.id), 0) as spent,
  c.budget - coalesce((select sum(e.amount) from public.expenses e where e.chantier_id = c.id), 0) as remaining
from public.chantiers c;
grant select on public.chantier_financials to authenticated;
