begin;
do $$
declare
  owner_a uuid; owner_b uuid; sm uuid; acc uuid; viewer uuid; admin_u uuid;
  org_a text; ch text; t text; n bigint; exp text;
  tenant_tables text[] := array['clients','projects','chantiers','suppliers','materials','workers','attendance','subcontractors','purchase_orders','purchase_order_lines','expenses','payments','documents'];
  tok uuid;
begin
  owner_a := tests.new_user('owner-a@x.test', '{"company_name":"Alpha"}'); org_a := tests.org_of(owner_a);
  owner_b := tests.new_user('owner-b@x.test', '{"company_name":"Beta"}');

  -- members of every role join org A through invitations
  perform tests.act_as(owner_a);
  insert into public.invitations (organization_id, email, role) values (org_a, 'admin@x.test', 'admin'), (org_a, 'sm@x.test', 'site_manager'), (org_a, 'acc@x.test', 'accountant'), (org_a, 'viewer@x.test', 'viewer');
  perform tests.reset();
  admin_u := tests.new_user('admin@x.test', jsonb_build_object('invite_token', (select token from public.invitations where email = 'admin@x.test')));
  sm      := tests.new_user('sm@x.test',    jsonb_build_object('invite_token', (select token from public.invitations where email = 'sm@x.test')));
  acc     := tests.new_user('acc@x.test',   jsonb_build_object('invite_token', (select token from public.invitations where email = 'acc@x.test')));
  viewer  := tests.new_user('viewer@x.test',jsonb_build_object('invite_token', (select token from public.invitations where email = 'viewer@x.test')));

  -- seed org A as owner
  perform tests.act_as(owner_a);
  insert into public.chantiers (organization_id, name, budget) values (org_a, 'Chantier A', 1000) returning id into ch;
  insert into public.suppliers (organization_id, name) values (org_a, 'Fournisseur A');
  insert into public.workers (organization_id, full_name) values (org_a, 'Ouvrier A');
  insert into public.expenses (organization_id, chantier_id, label, amount) values (org_a, ch, 'Gasoil', 100);
  insert into public.payments (organization_id, direction, label, amount) values (org_a, 'in', 'Avance', 500);
  assert (select spent from public.chantier_financials) = 100, 'financial view as owner';
  perform tests.reset();

  -- ── tenant isolation: org B sees and changes nothing of org A ──
  perform tests.act_as(owner_b);
  foreach t in array tenant_tables loop
    assert tests.count(format('select 1 from public.%I', t)) = 0, 'tenant B sees rows of ' || t;
    assert tests.fails(format('insert into public.%I (organization_id) values (%L)', t, org_a)), 'tenant B inserted into ' || t;
  end loop;
  assert tests.count('select 1 from public.chantier_financials') = 0, 'financial view leaks across tenants';
  assert tests.count('select 1 from public.organizations') = 1, 'tenant B sees only its own organization';
  assert tests.count('select 1 from public.memberships') = 1, 'tenant B sees only its own membership';
  assert tests.count('select 1 from public.profiles') = 1, 'tenant B sees only its own profile';
  assert tests.count('select 1 from public.invitations') = 0, 'tenant B sees invitations of A';
  update public.chantiers set name = 'hacked'; get diagnostics n = row_count; assert n = 0, 'tenant B updated foreign rows';
  delete from public.chantiers; get diagnostics n = row_count; assert n = 0, 'tenant B deleted foreign rows';
  perform tests.reset();

  -- ── viewer: read-only ──
  perform tests.act_as(viewer);
  assert tests.count('select 1 from public.chantiers') = 1, 'viewer reads';
  assert tests.fails(format($q$insert into public.expenses (organization_id, label, amount) values (%L, 'x', 1)$q$, org_a)), 'viewer cannot insert';
  update public.chantiers set name = 'x'; get diagnostics n = row_count; assert n = 0, 'viewer cannot update';
  assert tests.count('select 1 from public.invitations') = 0, 'viewer cannot read invitations';
  perform tests.reset();

  -- ── site manager & accountant: write, but no deletes and no member/invitation management ──
  foreach exp in array array[sm::text, acc::text] loop
    perform tests.act_as(exp::uuid);
    insert into public.expenses (organization_id, chantier_id, label, amount) values (org_a, ch, 'par ' || exp, 10);
    update public.chantiers set progress = 50; get diagnostics n = row_count; assert n = 1, 'writer can update';
    delete from public.expenses; get diagnostics n = row_count; assert n = 0, 'writer cannot delete';
    assert tests.count('select 1 from public.invitations') = 0, 'writer cannot read invitations';
    assert tests.fails(format($q$insert into public.invitations (organization_id, email, role) values (%L, 'z@x.test', 'viewer')$q$, org_a)), 'writer cannot invite';
    update public.memberships set role = 'viewer' where user_id = viewer; get diagnostics n = row_count; assert n = 0, 'writer cannot change roles';
    delete from public.memberships where user_id = viewer; get diagnostics n = row_count; assert n = 0, 'writer cannot remove members';
    update public.organizations set city = 'x'; get diagnostics n = row_count; assert n = 0, 'writer cannot edit the organization';
    perform tests.reset();
  end loop;
  -- they can see their org mates' names (members list)
  perform tests.act_as(sm);
  assert tests.count('select 1 from public.profiles') = 5, 'org mates readable (and only them)';
  perform tests.reset();

  -- ── admin: delete, manage members, but never touch the owner ──
  perform tests.act_as(admin_u);
  delete from public.expenses; get diagnostics n = row_count; assert n > 0, 'admin can delete';
  update public.memberships set role = 'accountant' where user_id = viewer; get diagnostics n = row_count; assert n = 1, 'admin changes a role';
  update public.memberships set role = 'viewer' where user_id = owner_a; get diagnostics n = row_count; assert n = 0, 'admin cannot demote the owner';
  delete from public.memberships where user_id = owner_a; get diagnostics n = row_count; assert n = 0, 'admin cannot remove the owner';
  assert tests.fails(format($q$update public.memberships set role = 'owner' where user_id = %L$q$, sm)), 'cannot promote to owner';
  update public.organizations set city = 'Casablanca'; get diagnostics n = row_count; assert n = 1, 'admin edits the organization';
  delete from public.memberships where user_id = viewer; get diagnostics n = row_count; assert n = 1, 'admin removes a member';
  perform tests.reset();

  -- ── anonymous role ──
  perform tests.act_as_anon();
  assert tests.fails('select 1 from public.chantiers'), 'anon has no table access';
  assert not has_function_privilege('anon', 'public.is_member(text)', 'execute'), 'anon can call is_member';
  assert not has_function_privilege('anon', 'public.can_write(text)', 'execute'), 'anon can call can_write';
  assert not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'), 'handle_new_user callable';
  assert has_function_privilege('anon', 'public.get_invitation(uuid)', 'execute'), 'invitation preview must stay public';
  perform tests.reset();
end $$;
rollback;
