begin;
do $$
declare owner_id uuid; org text; tok uuid; viewer uuid;
begin
  owner_id := tests.new_user('owner@x.test', '{"company_name":"Atlas"}');
  org := tests.org_of(owner_id);

  -- only admins create / read invitations
  perform tests.act_as(owner_id);
  insert into public.invitations (organization_id, email, role) values (org, 'Guest@X.test', 'site_manager') returning token into tok;
  assert (select count(*) from public.invitations) = 1, 'owner reads invitations';
  assert tests.fails(format($q$insert into public.invitations (organization_id, email, role) values (%L, 'o@x.test', 'owner')$q$, org)), 'cannot invite as owner';
  assert tests.fails(format($q$insert into public.invitations (organization_id, email, role) values (%L, 'guest@x.test', 'viewer')$q$, org)), 'one open invitation per e-mail';
  perform tests.reset();

  -- public preview works for anon with the token only
  perform tests.act_as_anon();
  assert (select organization_name from public.get_invitation(tok)) = 'Atlas', 'anon preview';
  assert (select count(*) from public.get_invitation(gen_random_uuid())) = 0, 'unknown token reveals nothing';
  assert tests.fails('select * from public.invitations'), 'anon cannot read the invitations table';
  perform tests.reset();

  -- sign-up with the token joins the organization with the invited role (e-mail match is case-insensitive)
  viewer := tests.new_user('guest@x.test', jsonb_build_object('full_name', 'Guest', 'invite_token', tok));
  assert tests.org_of(viewer) = org, 'invitee joined the inviting org';
  assert (select role from public.memberships where user_id = viewer) = 'site_manager', 'invited role applied';
  assert (select count(*) from public.organizations) = 1, 'no extra organization created for the invitee';
  assert (select accepted_at is not null from public.invitations where token = tok), 'invitation marked accepted';

  -- the token cannot be reused, nor used with another e-mail, nor garbage
  assert tests.fails(format($q$select tests.new_user('other@x.test', jsonb_build_object('invite_token', %L))$q$, tok)), 'token single-use';
  insert into public.invitations (organization_id, email, role) values (org, 'wanted@x.test', 'viewer');
  assert tests.fails(format($q$select tests.new_user('thief@x.test', jsonb_build_object('invite_token', %L))$q$, (select token from public.invitations where email = 'wanted@x.test'))), 'wrong e-mail rejected';
  assert tests.fails($q$select tests.new_user('g@x.test', '{"invite_token":"not-a-uuid"}')$q$), 'garbage token rejected';
  update public.invitations set expires_at = now() - interval '1 day' where email = 'wanted@x.test';
  assert tests.fails(format($q$select tests.new_user('wanted@x.test', jsonb_build_object('invite_token', %L))$q$, (select token from public.invitations where email = 'wanted@x.test'))), 'expired token rejected';
end $$;
rollback;
