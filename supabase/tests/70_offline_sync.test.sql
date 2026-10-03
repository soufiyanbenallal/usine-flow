begin;
do $$
declare
  owner_a uuid; owner_b uuid; org_a text; org_b text; uom text; wh text; loc text; it text; cnt text; cl text; r jsonb;
begin
  owner_a := tests.new_user('sync-a@x.test', '{"company_name":"Sync Alpha"}'); org_a := tests.org_of(owner_a);
  owner_b := tests.new_user('sync-b@x.test', '{"company_name":"Sync Beta"}');  org_b := tests.org_of(owner_b);
  perform tests.act_as(owner_a);

  -- unknown operation types are rejected (and recorded), not raised
  r := public.apply_client_operation(org_a, 'k-unknown', 'nope', '{}'::jsonb, 'dev1');
  assert r ->> 'status' = 'rejected', 'unknown op rejected';
  -- replay returns the stored outcome without re-applying
  r := public.apply_client_operation(org_a, 'k-unknown', 'nope', '{}'::jsonb, 'dev1');
  assert (r ->> 'duplicate')::boolean, 'replay is a duplicate';
  assert (select count(*) from public.client_operations where organization_id = org_a and idempotency_key = 'k-unknown') = 1, 'one row per key';

  -- a failing operation (missing line) is rejected, not raised
  r := public.apply_client_operation(org_a, 'k-bad', 'count_line', '{"line":"missing","counted":3}'::jsonb);
  assert r ->> 'status' = 'rejected', 'bad count rejected';

  -- tenant isolation: another organization's members cannot push into org_a
  perform tests.act_as(owner_b);
  assert tests.fails(format('select public.apply_client_operation(%L, %L, %L, %L::jsonb)', org_a, 'k-x', 'count_line', '{}')), 'cross-tenant sync denied';
end $$;
rollback;
