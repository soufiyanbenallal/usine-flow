begin;
do $$
declare
  owner_a uuid; owner_b uuid; sm uuid; acc uuid; viewer uuid; admin_u uuid;
  org_a text; org_b text; n bigint;
begin
  owner_a := tests.new_user('owner-a@x.test', '{"company_name":"Usine Alpha"}'); org_a := tests.org_of(owner_a);
  owner_b := tests.new_user('owner-b@x.test', '{"company_name":"Usine Beta"}');  org_b := tests.org_of(owner_b);

  -- members of every role join org A through invitations
  perform tests.act_as(owner_a);
  insert into public.invitations (organization_id, email, role) values
    (org_a, 'admin@x.test', 'admin'),
    (org_a, 'sm@x.test', 'site_manager'),
    (org_a, 'acc@x.test', 'accountant'),
    (org_a, 'viewer@x.test', 'viewer');
  perform tests.reset();

  admin_u := tests.new_user('admin@x.test', jsonb_build_object('invite_token', (select token from public.invitations where email = 'admin@x.test')));
  sm      := tests.new_user('sm@x.test',    jsonb_build_object('invite_token', (select token from public.invitations where email = 'sm@x.test')));
  acc     := tests.new_user('acc@x.test',   jsonb_build_object('invite_token', (select token from public.invitations where email = 'acc@x.test')));
  viewer  := tests.new_user('viewer@x.test',jsonb_build_object('invite_token', (select token from public.invitations where email = 'viewer@x.test')));

  -- ── tenant isolation: org B sees and changes nothing of org A ──
  perform tests.act_as(owner_b);
  assert tests.count('select 1 from public.organizations') = 1, 'tenant B sees only its own organization';
  assert tests.count('select 1 from public.memberships') = 1, 'tenant B sees only its own membership';
  assert tests.count('select 1 from public.profiles') = 1, 'tenant B sees only its own profile';
  assert tests.count('select 1 from public.invitations') = 0, 'tenant B sees no invitations of A';
  update public.organizations set name = 'hacked' where id = org_a;
  get diagnostics n = row_count;
  assert n = 0, 'tenant B updated foreign org';
  perform tests.reset();

  -- ── profile sharing within same org ──
  perform tests.act_as(viewer);
  assert tests.count('select 1 from public.profiles') = 5, 'members of org A see profiles of all orgmates';
  assert (select count(*) from public.profiles where id = owner_b) = 0, 'cannot see profile of user from org B';
  perform tests.reset();

  -- ── admin role permissions ──
  perform tests.act_as(admin_u);
  assert tests.count('select 1 from public.invitations') = 4, 'admin reads invitations';
  update public.organizations set legal_form = 'SARL' where id = org_a;
  get diagnostics n = row_count;
  assert n = 1, 'admin updates own organization';
  perform tests.reset();

  -- ── viewer permissions: read-only on org & memberships, cannot read invitations ──
  perform tests.act_as(viewer);
  assert tests.count('select 1 from public.organizations') = 1, 'viewer reads own organization';
  assert tests.count('select 1 from public.invitations') = 0, 'viewer cannot read invitations';
  update public.organizations set name = 'viewer hacked' where id = org_a;
  get diagnostics n = row_count;
  assert n = 0, 'viewer cannot update organization';
  perform tests.reset();
end $$;
rollback;
