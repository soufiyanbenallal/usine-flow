-- CUID ids: every app entity id becomes a 24-char lowercase cuid2-style text id (public.cuid()).
-- Unchanged on purpose: Supabase Auth user ids (uuid, owned by auth.users) and invitations.token (uuid secret).
-- NOTE: auth.users / storage.objects belong to Supabase roles, so this migration never drops objects on them:
-- the auth trigger is kept (handle_new_user is replaced in place) and storage policies go away via DROP FUNCTION ... CASCADE.
-- Pre-launch rebuild: the app schema from the three previous migrations is dropped and recreated with text ids
-- (all app tables were empty). The sample public.instruments table (bigint identity) is removed too.

drop view if exists public.chantier_financials;
drop table if exists public.instruments;
drop table if exists
  public.invitations, public.attendance, public.purchase_order_lines, public.expenses, public.payments, public.documents,
  public.purchase_orders, public.subcontractors, public.materials, public.workers, public.chantiers, public.projects,
  public.suppliers, public.clients, public.memberships, public.profiles, public.organizations cascade;
drop function if exists public.generate_org_slug(text), public.is_reserved_slug(text), public.slugify(text),
  public.is_member(uuid), public.can_write(uuid), public.is_admin(uuid), public.shares_org(uuid), public.get_invitation(uuid),
  public.sync_po_total(), public.lock_received_po_lines(), public.po_book_stock() cascade;
drop type if exists public.org_role, public.chantier_status, public.payment_direction, public.payment_method,
  public.payment_status, public.po_status, public.attendance_status;

-- ───────── cuid generator ─────────
-- Format-compatible with cuid2: first char a-z, then base36 of a SHA-256 over time + random + backend entropy; 24 chars.
create or replace function public.cuid()
returns text language plpgsql volatile set search_path = '' as $$
declare
  digits constant text := '0123456789abcdefghijklmnopqrstuvwxyz';
  digest bytea := sha256(convert_to(clock_timestamp()::text || gen_random_uuid()::text || random()::text || txid_current()::text || pg_backend_pid()::text, 'utf8'));
  n numeric := 0;
  body text := '';
  i int;
begin
  for i in 0..15 loop n := n * 256 + get_byte(digest, i); end loop;
  while length(body) < 23 loop
    body := substr(digits, (n % 36)::int + 1, 1) || body;
    n := trunc(n / 36);
  end loop;
  return chr(97 + floor(random() * 26)::int) || body;
end $$;

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
  id text primary key default public.cuid(),
  name text not null,
  legal_form text,
  ice text, if_number text, rc text, patente text, cnss text,
  address text, city text, phone text, email text,
  currency text not null default 'MAD',
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id text not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

-- Helpers used by RLS. security definer + fixed search_path avoids recursive policies.
create or replace function public.is_member(org text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships m where m.organization_id = org and m.user_id = (select auth.uid()));
$$;

create or replace function public.can_write(org text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
      and m.role in ('owner', 'admin', 'site_manager', 'accountant')
  );
$$;

create or replace function public.is_admin(org text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')
  );
$$;

-- On sign-up: create profile + first organization + owner membership.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare org text;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.organizations (name)
  values (coalesce(nullif(new.raw_user_meta_data ->> 'company_name', ''), 'Mon entreprise'))
  returning id into org;

  insert into public.memberships (organization_id, user_id, role) values (org, new.id, 'owner');
  return new;
end $$;


-- ───────── Business tables ─────────
create table public.clients (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  name text not null, ice text, phone text, email text, address text,
  created_at timestamptz not null default now()
);

create table public.projects (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  client_id text references public.clients (id) on delete set null,
  name text not null,
  contract_amount numeric(14, 2) not null default 0 check (contract_amount >= 0),
  status text not null default 'in_progress',
  created_at timestamptz not null default now()
);

create table public.chantiers (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  project_id text references public.projects (id) on delete set null,
  name text not null,
  city text, address text, lat double precision, lng double precision,
  status public.chantier_status not null default 'planned',
  budget numeric(14, 2) not null default 0 check (budget >= 0),
  progress smallint not null default 0 check (progress between 0 and 100),
  start_date date, end_date date,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  name text not null, category text, ice text, phone text, email text, city text,
  created_at timestamptz not null default now()
);

create table public.materials (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  supplier_id text references public.suppliers (id) on delete set null,
  name text not null, category text, unit text not null default 'u',
  unit_price numeric(14, 2) not null default 0 check (unit_price >= 0),
  stock_qty numeric(14, 3) not null default 0,
  min_stock numeric(14, 3) not null default 0,
  created_at timestamptz not null default now()
);

create table public.workers (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  full_name text not null, trade text, phone text, cin text,
  daily_rate numeric(10, 2) not null default 0 check (daily_rate >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  worker_id text not null references public.workers (id) on delete cascade,
  chantier_id text not null references public.chantiers (id) on delete cascade,
  day date not null,
  status public.attendance_status not null default 'present',
  unique (worker_id, day)
);

create table public.subcontractors (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  chantier_id text references public.chantiers (id) on delete set null,
  name text not null, trade text, phone text,
  contract_amount numeric(14, 2) not null default 0 check (contract_amount >= 0),
  retention_pct numeric(4, 2) not null default 10 check (retention_pct between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.purchase_orders (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  supplier_id text references public.suppliers (id) on delete set null,
  chantier_id text references public.chantiers (id) on delete set null,
  reference text not null,
  status public.po_status not null default 'draft',
  order_date date not null default current_date,
  total_ht numeric(14, 2) not null default 0,
  vat_rate numeric(4, 2) not null default 20 check (vat_rate in (0, 7, 10, 14, 20)),
  created_at timestamptz not null default now(),
  unique (organization_id, reference)
);

create table public.purchase_order_lines (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  purchase_order_id text not null references public.purchase_orders (id) on delete cascade,
  material_id text references public.materials (id) on delete set null,
  label text not null,
  qty numeric(14, 3) not null check (qty > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0)
);

create table public.expenses (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  chantier_id text references public.chantiers (id) on delete set null,
  supplier_id text references public.suppliers (id) on delete set null,
  purchase_order_id text references public.purchase_orders (id) on delete set null,
  label text not null,
  category text not null default 'divers',
  amount numeric(14, 2) not null check (amount >= 0),
  spent_on date not null default current_date,
  receipt_path text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.payments (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  direction public.payment_direction not null,
  chantier_id text references public.chantiers (id) on delete set null,
  client_id text references public.clients (id) on delete set null,
  supplier_id text references public.suppliers (id) on delete set null,
  subcontractor_id text references public.subcontractors (id) on delete set null,
  label text not null,
  amount numeric(14, 2) not null check (amount > 0),
  due_date date,
  paid_on date,
  method public.payment_method not null default 'transfer',
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.documents (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  chantier_id text references public.chantiers (id) on delete set null,
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
  using (bucket_id = 'buildo-files' and public.is_member((storage.foldername(name))[1]));
create policy "writers upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'buildo-files' and public.can_write((storage.foldername(name))[1]));
create policy "admins delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'buildo-files' and public.is_admin((storage.foldername(name))[1]));

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

-- Organization slug (used in URLs: /<slug>/chantiers) + one organization per user (for now).

-- ───────── Slug helpers ─────────
create or replace function public.slugify(input text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(input, ''),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuy')),
    '[^a-z0-9]+', '-', 'g'));
$$;

-- Slugs that would collide with top-level routes of the app. Keep in sync with lib/routes.ts.
create or replace function public.is_reserved_slug(slug text)
returns boolean language sql immutable set search_path = '' as $$
  select slug = any (array[
    'app','api','admin','login','signup','logout','forgot-password','reset-password','auth',
    'settings','parametres','dashboard','help','support','pricing','blog','docs','legal',
    'privacy','terms','static','assets','public','_next','favicon','robots','sitemap','buildo','www'
  ]);
$$;

-- Unique slug from a company name: "Société Atlas Béton" → societe-atlas-beton, then -2, -3 …
create or replace function public.generate_org_slug(company text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  base text := left(public.slugify(company), 40);
  candidate text;
  n int := 1;
begin
  base := trim(both '-' from base);
  if length(base) < 3 then base := 'entreprise'; end if;
  candidate := base;
  while public.is_reserved_slug(candidate)
     or exists (select 1 from public.organizations o where o.slug = candidate) loop
    n := n + 1;
    candidate := left(base, 40 - length(n::text) - 1) || '-' || n;
  end loop;
  return candidate;
end $$;

-- ───────── organizations.slug ─────────
alter table public.organizations add column slug text;
update public.organizations set slug = public.generate_org_slug(name) where slug is null;
alter table public.organizations alter column slug set not null;
alter table public.organizations
  add constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40),
  add constraint organizations_slug_not_reserved check (not public.is_reserved_slug(slug));
create unique index organizations_slug_key on public.organizations (slug);

-- ───────── One organization per user (drop this index to allow several later) ─────────
create unique index memberships_one_org_per_user on public.memberships (user_id);

-- ───────── Sign-up: profile + organization (with slug) + owner membership ─────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  org text;
  company text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''), 'Mon entreprise');
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.organizations (name, slug)
  values (company, public.generate_org_slug(company))
  returning id into org;

  insert into public.memberships (organization_id, user_id, role) values (org, new.id, 'owner');
  return new;
end $$;

-- V1 remaining: function grants hardening, PO lines totals + stock, member profiles, invitations, member management.

-- ───────── 1. Harden SECURITY DEFINER functions (advisor 0028/0029) ─────────
-- RLS helpers are evaluated as the calling role, so `authenticated` keeps EXECUTE; `anon` never needs it.
revoke execute on function public.can_write(text), public.is_member(text), public.is_admin(text) from public, anon;
grant execute on function public.can_write(text), public.is_member(text), public.is_admin(text) to authenticated;
-- Sign-up internals: only the trigger uses them.
revoke execute on function public.generate_org_slug(text), public.handle_new_user() from public, anon, authenticated;

-- ───────── 2. Purchase orders: total from lines, stock on delivery, lock after delivery ─────────
create or replace function public.sync_po_total()
returns trigger language plpgsql set search_path = '' as $$
declare po text := coalesce(new.purchase_order_id, old.purchase_order_id);
begin
  update public.purchase_orders
     set total_ht = coalesce((select sum(l.qty * l.unit_price) from public.purchase_order_lines l where l.purchase_order_id = po), 0)
   where id = po;
  return null;
end $$;
create trigger purchase_order_lines_sync_total
  after insert or update or delete on public.purchase_order_lines
  for each row execute function public.sync_po_total();

-- "Received" = delivered or invoiced. Lines can't change once received (stock was already booked).
create or replace function public.lock_received_po_lines()
returns trigger language plpgsql set search_path = '' as $$
declare po text := coalesce(new.purchase_order_id, old.purchase_order_id);
begin
  if exists (select 1 from public.purchase_orders p where p.id = po and p.status in ('delivered', 'invoiced')) then
    raise exception 'Bon de commande déjà livré : les lignes ne sont plus modifiables.' using errcode = '23514';
  end if;
  return coalesce(new, old);
end $$;
create trigger purchase_order_lines_lock
  before insert or update or delete on public.purchase_order_lines
  for each row execute function public.lock_received_po_lines();

create or replace function public.po_book_stock()
returns trigger language plpgsql set search_path = '' as $$
declare
  was_received boolean := old.status in ('delivered', 'invoiced');
  is_received boolean := new.status in ('delivered', 'invoiced');
  sign int;
begin
  if was_received = is_received then return new; end if;
  sign := case when is_received then 1 else -1 end;
  update public.materials m
     set stock_qty = m.stock_qty + sign * l.q
    from (select material_id, sum(qty) as q from public.purchase_order_lines
           where purchase_order_id = new.id and material_id is not null group by material_id) l
   where m.id = l.material_id;
  return new;
end $$;
create trigger purchase_orders_book_stock
  after update of status on public.purchase_orders
  for each row when (old.status is distinct from new.status)
  execute function public.po_book_stock();

-- ───────── 3. Member profiles: email + visibility between org mates ─────────
alter table public.profiles add column email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id;

create or replace function public.shares_org(uid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.memberships a join public.memberships b on a.organization_id = b.organization_id
    where a.user_id = (select auth.uid()) and b.user_id = uid
  );
$$;
revoke execute on function public.shares_org(uuid) from public, anon;
grant execute on function public.shares_org(uuid) to authenticated;
create policy "orgmates read profiles" on public.profiles for select to authenticated using (public.shares_org(id));

-- ───────── 4. Invitations ─────────
create table public.invitations (
  id text primary key default public.cuid(),
  organization_id text not null references public.organizations (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.org_role not null default 'viewer' check (role <> 'owner'),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);
create index invitations_org_idx on public.invitations (organization_id);
create unique index invitations_open_email_key on public.invitations (organization_id, lower(email)) where accepted_at is null;
alter table public.invitations enable row level security;
create policy "admins read invitations" on public.invitations for select to authenticated using (public.is_admin(organization_id));
create policy "admins create invitations" on public.invitations for insert to authenticated with check (public.is_admin(organization_id));
create policy "admins delete invitations" on public.invitations for delete to authenticated using (public.is_admin(organization_id));
grant select, insert, delete on public.invitations to authenticated;

-- Lets the (signed-out) invitee see who invited them before signing up. Knowing the token is the credential.
create or replace function public.get_invitation(invite_token uuid)
returns table (organization_name text, email text, role public.org_role)
language sql stable security definer set search_path = '' as $$
  select o.name, i.email, i.role
    from public.invitations i join public.organizations o on o.id = i.organization_id
   where i.token = invite_token and i.accepted_at is null and i.expires_at > now();
$$;
grant execute on function public.get_invitation(uuid) to anon, authenticated;

-- Sign-up: with a valid invite token (and matching e-mail) join the inviting organization; otherwise create one.
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
  return new;
end $$;

-- ───────── 5. Member management (owners can't be changed or removed here) ─────────
create policy "admins change roles" on public.memberships for update to authenticated
  using (public.is_admin(organization_id) and role <> 'owner')
  with check (public.is_admin(organization_id) and role <> 'owner');
create policy "admins remove members" on public.memberships for delete to authenticated
  using (public.is_admin(organization_id) and role <> 'owner');
grant update (role), delete on public.memberships to authenticated;


-- ───────── Backfill: auth users that existed before the schema (no trigger ran for them) ─────────
do $$
declare u record; org text; company text;
begin
  for u in select id, email, raw_user_meta_data from auth.users loop
    company := coalesce(nullif(trim(u.raw_user_meta_data ->> 'company_name'), ''), nullif(split_part(u.email, '@', 1), ''), 'Mon entreprise');
    insert into public.profiles (id, full_name, email) values (u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), u.email) on conflict do nothing;
    if not exists (select 1 from public.memberships where user_id = u.id) then
      insert into public.organizations (name, slug) values (company, public.generate_org_slug(company)) returning id into org;
      insert into public.memberships (organization_id, user_id, role) values (org, u.id, 'owner');
    end if;
  end loop;
end $$;

-- The on_auth_user_created trigger (created in the first migration) keeps pointing at public.handle_new_user().
