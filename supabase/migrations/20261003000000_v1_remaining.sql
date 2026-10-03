-- V1 remaining: function grants hardening, PO lines totals + stock, member profiles, invitations, member management.

-- ───────── 1. Harden SECURITY DEFINER functions (advisor 0028/0029) ─────────
-- RLS helpers are evaluated as the calling role, so `authenticated` keeps EXECUTE; `anon` never needs it.
revoke execute on function public.can_write(uuid), public.is_member(uuid), public.is_admin(uuid) from public, anon;
grant execute on function public.can_write(uuid), public.is_member(uuid), public.is_admin(uuid) to authenticated;
-- Sign-up internals: only the trigger uses them.
revoke execute on function public.generate_org_slug(text), public.handle_new_user() from public, anon, authenticated;

-- ───────── 2. Purchase orders: total from lines, stock on delivery, lock after delivery ─────────
create or replace function public.sync_po_total()
returns trigger language plpgsql set search_path = '' as $$
declare po uuid := coalesce(new.purchase_order_id, old.purchase_order_id);
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
declare po uuid := coalesce(new.purchase_order_id, old.purchase_order_id);
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
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
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
  org uuid;
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
