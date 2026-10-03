begin;
do $$
declare owner_id uuid; viewer uuid; org text; lonely uuid; slug text; n bigint;
begin
  owner_id := tests.new_user('o@x.test', '{"company_name":"Atlas"}'); org := tests.org_of(owner_id);

  -- settings default to an empty object; admins can update them, others cannot
  assert (select settings from public.organizations where id = org) = '{}'::jsonb, 'settings default';
  perform tests.act_as(owner_id);
  update public.organizations set settings = '{"vat_default": 14}' where id = org; get diagnostics n = row_count;
  assert n = 1, 'owner updates settings';
  assert (select settings ->> 'vat_default' from public.organizations) = '14', 'settings persisted';
  insert into public.invitations (organization_id, email, role) values (org, 'v@x.test', 'viewer');
  perform tests.reset();
  viewer := tests.new_user('v@x.test', jsonb_build_object('invite_token', (select token from public.invitations where email = 'v@x.test')));
  perform tests.act_as(viewer);
  update public.organizations set settings = '{"vat_default": 0}'; get diagnostics n = row_count;
  assert n = 0, 'viewer cannot update settings';
  perform tests.reset();

  -- create_organization: only for signed-in users without an organization
  perform tests.act_as_anon();
  assert not has_function_privilege('anon', 'public.create_organization(text)', 'execute'), 'anon cannot create organizations';
  perform tests.reset();
  perform tests.act_as(owner_id);
  assert tests.fails($q$select public.create_organization('Second')$q$), 'user with an organization cannot create another';
  perform tests.reset();

  lonely := tests.new_user('lonely@x.test', '{"company_name":"Temp"}');
  delete from public.memberships where user_id = lonely; -- simulate removal from the team
  perform tests.act_as(lonely);
  slug := public.create_organization('  Société Neuve  ');
  assert slug = 'societe-neuve', 'slug returned: ' || slug;
  assert (select role from public.memberships) = 'owner', 'creator is owner';
  assert tests.fails($q$select public.create_organization('x')$q$), 'name must be at least 2 chars / already has org';
  perform tests.reset();
end $$;
rollback;
