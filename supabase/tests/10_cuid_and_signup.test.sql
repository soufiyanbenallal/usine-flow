begin;
do $$
declare a uuid; b uuid; c uuid; d uuid; e uuid; org text; n int; slug_a text;
begin
  -- cuid
  assert public.cuid() ~ '^[a-z][a-z0-9]{23}$', 'cuid format';
  select count(distinct public.cuid()) into n from generate_series(1, 5000);
  assert n = 5000, 'cuid uniqueness';

  -- sign-up creates profile + organization (slug) + owner membership, ids are cuid text
  a := tests.new_user('a@x.test', '{"full_name":"Alice","company_name":"Société Atlas Béton"}');
  select o.id, o.slug into org, slug_a from public.organizations o join public.memberships m on m.organization_id = o.id where m.user_id = a;
  assert org ~ '^[a-z][a-z0-9]{23}$', 'organization id is a cuid';
  assert slug_a = 'societe-atlas-beton', 'slug generated without accents: ' || slug_a;
  assert (select role from public.memberships where user_id = a) = 'owner', 'signup owner';
  assert (select email from public.profiles where id = a) = 'a@x.test', 'profile email';

  -- slug collisions, reserved words and junk names
  b := tests.new_user('b@x.test', '{"company_name":"Société Atlas Béton"}');
  assert (select o.slug from public.organizations o join public.memberships m on m.organization_id = o.id where m.user_id = b) = 'societe-atlas-beton-2', 'collision suffix';
  c := tests.new_user('c@x.test', '{"company_name":"App"}');
  assert (select o.slug from public.organizations o join public.memberships m on m.organization_id = o.id where m.user_id = c) = 'app-2', 'reserved slug avoided';
  d := tests.new_user('d@x.test', '{"company_name":"!!"}');
  assert (select o.slug from public.organizations o join public.memberships m on m.organization_id = o.id where m.user_id = d) = 'entreprise', 'fallback slug';
  assert tests.fails($q$ update public.organizations set slug = 'login' where id = '$q$ || org || $q$' $q$), 'reserved slug rejected by constraint';
  assert tests.fails($q$ update public.organizations set slug = 'Bad Slug' where id = '$q$ || org || $q$' $q$), 'slug format enforced';

  -- one organization per user
  assert tests.fails(format('insert into public.memberships (organization_id, user_id) values (%L, %L)', org, b)), 'one org per user';

  -- default org when no company is given
  e := tests.new_user('e@x.test');
  assert (select o.name from public.organizations o join public.memberships m on m.organization_id = o.id where m.user_id = e) = 'Mon entreprise', 'default org name';
end $$;
rollback;
