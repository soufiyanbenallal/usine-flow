-- Organization settings (preferences, notification toggles…) + self-service organization creation.
-- Additive and id-type agnostic (works before and after the CUID migration).

alter table public.organizations add column if not exists settings jsonb not null default '{}'::jsonb;

-- For a signed-in user who has no organization (e.g. removed from a team): create one and become its owner.
-- Returns the new organization's slug. Fails if the user already belongs to an organization.
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
revoke execute on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
