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
  org uuid;
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
