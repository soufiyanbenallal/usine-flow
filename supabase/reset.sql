-- ============================================================================
-- UsineFlow — Database Reset Script
-- Cleans all application tables and previous test accounts
-- ============================================================================

do $$
declare
  v_all_tables text;
begin
  -- 1. Truncate all application tables in public (CASCADE avoids FK order issues and does not fire row triggers)
  select string_agg('public.' || quote_ident(table_name), ', ')
  into v_all_tables
  from information_schema.tables
  where table_schema = 'public'
    and table_type = 'BASE TABLE'
    and table_name not in ('spatial_ref_sys');

  if v_all_tables is not null then
    execute 'truncate table ' || v_all_tables || ' cascade';
  end if;

  -- 2. Delete previous test auth identities, sessions and users
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'identities') then
    delete from auth.identities
    where user_id in (
      select id from auth.users where email in (
        'admin@usineflow.ma', 'production@usineflow.ma', 'qualite@usineflow.ma',
        'logistique@usineflow.ma', 'achats@usineflow.ma', 'operateur@usineflow.ma'
      )
    )
    or user_id in (
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'a0000000-0000-0000-0000-000000000002'::uuid,
      'a0000000-0000-0000-0000-000000000003'::uuid,
      'a0000000-0000-0000-0000-000000000004'::uuid,
      'a0000000-0000-0000-0000-000000000005'::uuid,
      'a0000000-0000-0000-0000-000000000006'::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000003'::uuid,
      '00000000-0000-0000-0000-000000000004'::uuid,
      '00000000-0000-0000-0000-000000000005'::uuid,
      '00000000-0000-0000-0000-000000000006'::uuid
    );
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'sessions') then
    delete from auth.sessions
    where user_id in (
      select id from auth.users where email in (
        'admin@usineflow.ma', 'production@usineflow.ma', 'qualite@usineflow.ma',
        'logistique@usineflow.ma', 'achats@usineflow.ma', 'operateur@usineflow.ma'
      )
    )
    or user_id in (
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'a0000000-0000-0000-0000-000000000002'::uuid,
      'a0000000-0000-0000-0000-000000000003'::uuid,
      'a0000000-0000-0000-0000-000000000004'::uuid,
      'a0000000-0000-0000-0000-000000000005'::uuid,
      'a0000000-0000-0000-0000-000000000006'::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000003'::uuid,
      '00000000-0000-0000-0000-000000000004'::uuid,
      '00000000-0000-0000-0000-000000000005'::uuid,
      '00000000-0000-0000-0000-000000000006'::uuid
    );
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    delete from auth.users
    where email in (
      'admin@usineflow.ma', 'production@usineflow.ma', 'qualite@usineflow.ma',
      'logistique@usineflow.ma', 'achats@usineflow.ma', 'operateur@usineflow.ma'
    )
    or id in (
      'a0000000-0000-0000-0000-000000000001'::uuid,
      'a0000000-0000-0000-0000-000000000002'::uuid,
      'a0000000-0000-0000-0000-000000000003'::uuid,
      'a0000000-0000-0000-0000-000000000004'::uuid,
      'a0000000-0000-0000-0000-000000000005'::uuid,
      'a0000000-0000-0000-0000-000000000006'::uuid,
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000003'::uuid,
      '00000000-0000-0000-0000-000000000004'::uuid,
      '00000000-0000-0000-0000-000000000005'::uuid,
      '00000000-0000-0000-0000-000000000006'::uuid
    );
  end if;
end $$;
