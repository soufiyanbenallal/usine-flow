-- UsineFlow Starter Schema: Multi-tenant operations foundation
-- Organization, Profiles, Memberships, Invitations, Settings, and CUID ids with RLS.

create extension if not exists pgcrypto;

-- ───────── cuid generator ─────────
-- Format-compatible with cuid2: 24-char lowercase text id.
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

-- ───────── Enums ─────────
create type public.org_role as enum ('owner', 'admin', 'site_manager', 'accountant', 'viewer');

-- ───────── Profiles ─────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  locale text not null default 'fr' check (locale in ('fr', 'ar', 'en')),
  created_at timestamptz not null default now()
);

-- ───────── Slug helpers ─────────
create or replace function public.slugify(input text)
returns text language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(
    lower(translate(coalesce(input, ''),
      'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuy')),
      '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.is_reserved_slug(slug text)
returns boolean language sql immutable set search_path = '' as $$
  select slug = any (array[
    'app','api','admin','login','signup','logout','forgot-password','reset-password','auth',
    'settings','parametres','dashboard','help','support','pricing','blog','docs','legal',
    'privacy','terms','static','assets','public','_next','favicon','robots','sitemap','buildo','usineflow','usine-flow','www'
  ]);
$$;

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

-- ───────── Organizations ─────────
create table public.organizations (
  id text primary key default public.cuid(),
  name text not null,
  slug text not null,
  legal_form text,
  ice text,
  if_number text,
  rc text,
  patente text,
  cnss text,
  address text,
  city text,
  phone text,
  email text,
  currency text not null default 'MAD',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 40),
  constraint organizations_slug_not_reserved check (not public.is_reserved_slug(slug))
);
create unique index organizations_slug_key on public.organizations (slug);

-- ───────── Memberships ─────────
create table public.memberships (
  organization_id text not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);
create unique index memberships_one_org_per_user on public.memberships (user_id);

-- ───────── Invitations ─────────
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

-- ───────── RLS Helpers (SECURITY DEFINER + empty search_path) ─────────
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

create or replace function public.shares_org(target_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.memberships mine
      join public.memberships theirs on theirs.organization_id = mine.organization_id
     where mine.user_id = (select auth.uid())
       and theirs.user_id = target_user
  );
$$;

create or replace function public.get_invitation(invite_token uuid)
returns table (organization_name text, email text, role public.org_role)
language sql stable security definer set search_path = '' as $$
  select o.name, i.email, i.role
    from public.invitations i join public.organizations o on o.id = i.organization_id
   where i.token = invite_token and i.accepted_at is null and i.expires_at > now();
$$;

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
  return new_org.slug;
end $$;

-- On sign-up: profile + organization (with slug) + owner membership (or join via invitation)
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── Row Level Security (RLS) ─────────
alter table public.profiles enable row level security;
create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "orgmates read profiles" on public.profiles for select to authenticated using (public.shares_org(id));

alter table public.organizations enable row level security;
create policy "members read own organization" on public.organizations for select to authenticated using (public.is_member(id));
create policy "admins update own organization" on public.organizations for update to authenticated using (public.is_admin(id)) with check (public.is_admin(id));

alter table public.memberships enable row level security;
create policy "members read own organization memberships" on public.memberships for select to authenticated using (public.is_member(organization_id));
create policy "admins change roles" on public.memberships for update to authenticated
  using (public.is_admin(organization_id) and role <> 'owner')
  with check (public.is_admin(organization_id) and role <> 'owner');
create policy "admins remove members" on public.memberships for delete to authenticated
  using (public.is_admin(organization_id) and role <> 'owner');

alter table public.invitations enable row level security;
create policy "admins read invitations" on public.invitations for select to authenticated using (public.is_admin(organization_id));
create policy "admins create invitations" on public.invitations for insert to authenticated with check (public.is_admin(organization_id));
create policy "admins delete invitations" on public.invitations for delete to authenticated using (public.is_admin(organization_id));

-- ───────── Storage ─────────
insert into storage.buckets (id, name, public) values ('usine-flow-files', 'usine-flow-files', false)
on conflict (id) do nothing;

create policy "members read files" on storage.objects for select to authenticated
  using (bucket_id = 'usine-flow-files' and public.is_member((storage.foldername(name))[1]));
create policy "writers upload files" on storage.objects for insert to authenticated
  with check (bucket_id = 'usine-flow-files' and public.can_write((storage.foldername(name))[1]));
create policy "admins delete files" on storage.objects for delete to authenticated
  using (bucket_id = 'usine-flow-files' and public.is_admin((storage.foldername(name))[1]));

-- ───────── Permissions & Grants ─────────
revoke execute on function public.can_write(text), public.is_member(text), public.is_admin(text), public.shares_org(uuid) from public, anon;
grant execute on function public.can_write(text), public.is_member(text), public.is_admin(text), public.shares_org(uuid) to authenticated;

grant execute on function public.get_invitation(uuid) to anon, authenticated;

revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

revoke execute on function public.generate_org_slug(text), public.handle_new_user() from public, anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, update (role), delete on public.memberships to authenticated;
grant select, insert, delete on public.invitations to authenticated;
