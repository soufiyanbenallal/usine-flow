-- ============================================================================
-- UsineFlow — Seed Data
-- Industrial Operations OS (ERP/MES/WMS/GMAO) for Moroccan Industry
-- Organization: Atlas Métal & Industrie SARL (Casablanca, Maroc)
-- ============================================================================

do $$
declare
  -- Admin & team user IDs
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_prod_id  uuid := 'a0000000-0000-0000-0000-000000000002';
  v_qual_id  uuid := 'a0000000-0000-0000-0000-000000000003';
  v_wh_id    uuid := 'a0000000-0000-0000-0000-000000000004';
  v_buy_id   uuid := 'a0000000-0000-0000-0000-000000000005';
  v_op_id    uuid := 'a0000000-0000-0000-0000-000000000006';

  -- Organization and core hierarchy
  v_org text;
  v_site_casa text;
  v_site_tng text;
  v_fac_prod text;
  v_fac_mag text;
  v_dep_dir text;
  v_dep_prod text;
  v_dep_qual text;
  v_dep_log text;
  v_dep_maint text;
  v_dep_ach text;

  -- Warehouses and locations
  v_wh_casa text;
  v_wh_tng text;
  v_zone_rec text;
  v_zone_mp text;
  v_zone_pf text;
  v_zone_exp text;
  v_zone_quar text;
  v_loc_rec text;
  v_loc_mp1 text;
  v_loc_mp2 text;
  v_loc_mp3 text;
  v_loc_pf1 text;
  v_loc_pf2 text;
  v_loc_exp text;
  v_loc_quar text;
  v_loc_tng_rec text;
  v_loc_tng_stk text;

  -- Units of Measure
  v_uom_pc text;
  v_uom_kg text;
  v_uom_m text;
  v_uom_sheet text;
  v_uom_box text;
  v_uom_roll text;
  v_uom_pal text;
  v_uom_l text;
  v_uom_h text;

  -- Categories
  v_cat_mp text;
  v_cat_cmp text;
  v_cat_emb text;
  v_cat_sf text;
  v_cat_pf text;
  v_cat_pdr text;
  v_cat_cons text;

  -- Partners (Suppliers & Customers)
  v_sup_msteel text;
  v_sup_alu text;
  v_sup_akzo text;
  v_sup_cmcp text;
  v_sup_qgm text;
  v_sup_total text;
  v_cus_stella text;
  v_cus_renault text;
  v_cus_tgcc text;
  v_cus_schneider text;
  v_cus_marjane text;

  -- Partner contacts & addresses
  v_addr_stella text;
  v_addr_renault text;

  -- Items
  v_item_steel1 text;
  v_item_steel2 text;
  v_item_alu text;
  v_item_powder text;
  v_item_lock text;
  v_item_hinge text;
  v_item_screw text;
  v_item_seal text;
  v_item_box text;
  v_item_pallet text;
  v_item_frame text;
  v_item_door text;
  v_item_arm text;
  v_item_etab text;
  v_item_chart text;
  v_item_noz text;
  v_item_hydr text;

  -- Work Centers & Machines
  v_wc_laser text;
  v_wc_pli text;
  v_wc_soud text;
  v_wc_peint text;
  v_wc_assy text;
  v_asset_laser text;
  v_asset_presse text;
  v_asset_soud text;
  v_asset_four text;
  v_asset_chariot text;

  -- BOMs and Routings
  v_bom_arm text;
  v_bv_arm text;
  v_bom_frame text;
  v_bv_frame text;
  v_bom_door text;
  v_bv_door text;
  v_rout_arm text;
  v_rout_frame text;
  v_rout_door text;

  -- Documents
  v_adj text;
  v_po1 text;
  v_po1_line text;
  v_rc1 text;
  v_po2 text;
  v_po3 text;
  v_so1 text;
  v_so1_line text;
  v_so2 text;
  v_so3 text;
  v_dl1 text;
  v_inv_sales1 text;
  v_pay1 text;
  v_po_prod1 text;
  v_po_prod2 text;
  v_po_prod3 text;
  v_op_prod1_1 text;
  v_op_prod1_2 text;
  v_op_prod2_1 text;
  v_maint_plan text;
  v_plan_incoming text;
  v_plan_final text;
  v_insp1 text;
  v_ncr text;

  -- Employees
  v_emp_op text;
  v_emp_pli text;
  v_emp_soud text;
  v_emp_cariste text;

  -- Skills
  v_sk_laser text;
  v_sk_pli text;
  v_sk_soud text;
  v_sk_qual text;
  v_sk_elec text;
  v_sk_caces text;

  -- Cost Centers
  v_cc_prod1 text;
  v_cc_log text;
  v_cc_maint text;
  v_col text;
  v_all_tables text;

begin
  -- --------------------------------------------------------------------------
  -- 0. Reset Database Data (Clean Slate before Seeding)
  -- --------------------------------------------------------------------------
  -- Truncate all application tables in public (CASCADE avoids FK order issues and does not fire row triggers)
  select string_agg('public.' || quote_ident(table_name), ', ')
  into v_all_tables
  from information_schema.tables
  where table_schema = 'public'
    and table_type = 'BASE TABLE'
    and table_name not in ('spatial_ref_sys');

  if v_all_tables is not null then
    execute 'truncate table ' || v_all_tables || ' cascade';
  end if;

  -- Delete previous test auth identities, sessions and users
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'identities') then
    delete from auth.identities
    where user_id in (
      select id from auth.users where email in (
        'admin@usineflow.ma', 'production@usineflow.ma', 'qualite@usineflow.ma',
        'logistique@usineflow.ma', 'achats@usineflow.ma', 'operateur@usineflow.ma'
      )
    )
    or user_id in (
      v_admin_id, v_prod_id, v_qual_id, v_wh_id, v_buy_id, v_op_id,
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
      v_admin_id, v_prod_id, v_qual_id, v_wh_id, v_buy_id, v_op_id,
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
      v_admin_id, v_prod_id, v_qual_id, v_wh_id, v_buy_id, v_op_id,
      '00000000-0000-0000-0000-000000000001'::uuid,
      '00000000-0000-0000-0000-000000000002'::uuid,
      '00000000-0000-0000-0000-000000000003'::uuid,
      '00000000-0000-0000-0000-000000000004'::uuid,
      '00000000-0000-0000-0000-000000000005'::uuid,
      '00000000-0000-0000-0000-000000000006'::uuid
    );
  end if;

  -- --------------------------------------------------------------------------
  -- 1. Create or ensure Auth Users & Identities
  -- --------------------------------------------------------------------------
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'encrypted_password') then
      -- Full Supabase Auth schema
      insert into auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        created_at, updated_at
      )
      values
        (v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@usineflow.ma', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mehdi Benkirane","company_name":"Atlas Métal & Industrie SARL"}', '', '', '', '', now(), now()),
        (v_prod_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'production@usineflow.ma', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rachid El Amrani","company_name":"Atlas Métal & Industrie SARL"}', '', '', '', '', now(), now()),
        (v_qual_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qualite@usineflow.ma', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Nadia Chraibi","company_name":"Atlas Métal & Industrie SARL"}', '', '', '', '', now(), now()),
        (v_wh_id,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'logistique@usineflow.ma', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Youssef Berrada","company_name":"Atlas Métal & Industrie SARL"}', '', '', '', '', now(), now()),
        (v_buy_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'achats@usineflow.ma', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Fatima Zahra Tazi","company_name":"Atlas Métal & Industrie SARL"}', '', '', '', '', now(), now()),
        (v_op_id,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'operateur@usineflow.ma', extensions.crypt('Password123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Hassan Moutawakkil","company_name":"Atlas Métal & Industrie SARL"}', '', '', '', '', now(), now())
      on conflict (id) do update set
        encrypted_password = excluded.encrypted_password,
        email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
        raw_app_meta_data = excluded.raw_app_meta_data,
        raw_user_meta_data = excluded.raw_user_meta_data,
        confirmation_token = '',
        recovery_token = '',
        email_change_token_new = '',
        email_change = '',
        updated_at = now();

      -- Sanitize all token and change columns in auth.users so GoTrue scanner never receives NULL
      for v_col in
        select column_name
        from information_schema.columns
        where table_schema = 'auth'
          and table_name = 'users'
          and column_name in (
            'confirmation_token',
            'recovery_token',
            'email_change_token_new',
            'email_change',
            'email_change_token_current',
            'phone_change',
            'phone_change_token',
            'reauthentication_token'
          )
      loop
        execute format('update auth.users set %I = coalesce(%I, '''') where %I is null and id in (%L, %L, %L, %L, %L, %L)',
          v_col, v_col, v_col, v_admin_id, v_prod_id, v_qual_id, v_wh_id, v_buy_id, v_op_id);
      end loop;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_sso_user') then
        execute format('update auth.users set is_sso_user = coalesce(is_sso_user, false) where is_sso_user is null and id in (%L, %L, %L, %L, %L, %L)',
          v_admin_id, v_prod_id, v_qual_id, v_wh_id, v_buy_id, v_op_id);
      end if;

      if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'is_anonymous') then
        execute format('update auth.users set is_anonymous = coalesce(is_anonymous, false) where is_anonymous is null and id in (%L, %L, %L, %L, %L, %L)',
          v_admin_id, v_prod_id, v_qual_id, v_wh_id, v_buy_id, v_op_id);
      end if;

    else
      -- Test stub schema
      insert into auth.users (id, email, raw_user_meta_data)
      values
        (v_admin_id, 'admin@usineflow.ma', '{"full_name":"Mehdi Benkirane","company_name":"Atlas Métal & Industrie SARL"}'),
        (v_prod_id,  'production@usineflow.ma', '{"full_name":"Rachid El Amrani","company_name":"Atlas Métal & Industrie SARL"}'),
        (v_qual_id,  'qualite@usineflow.ma', '{"full_name":"Nadia Chraibi","company_name":"Atlas Métal & Industrie SARL"}'),
        (v_wh_id,    'logistique@usineflow.ma', '{"full_name":"Youssef Berrada","company_name":"Atlas Métal & Industrie SARL"}'),
        (v_buy_id,   'achats@usineflow.ma', '{"full_name":"Fatima Zahra Tazi","company_name":"Atlas Métal & Industrie SARL"}'),
        (v_op_id,    'operateur@usineflow.ma', '{"full_name":"Hassan Moutawakkil","company_name":"Atlas Métal & Industrie SARL"}')
      on conflict (id) do nothing;
    end if;

    if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'identities') then
      delete from auth.identities where user_id in (
        v_admin_id, v_prod_id, v_qual_id, v_wh_id, v_buy_id, v_op_id
      );

      insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
      values
        (v_admin_id, v_admin_id, jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@usineflow.ma', 'email_verified', true), 'email', v_admin_id::text, now(), now(), now()),
        (v_prod_id,  v_prod_id,  jsonb_build_object('sub', v_prod_id::text,  'email', 'production@usineflow.ma', 'email_verified', true), 'email', v_prod_id::text,  now(), now(), now()),
        (v_qual_id,  v_qual_id,  jsonb_build_object('sub', v_qual_id::text,  'email', 'qualite@usineflow.ma', 'email_verified', true), 'email', v_qual_id::text,  now(), now(), now()),
        (v_wh_id,    v_wh_id,    jsonb_build_object('sub', v_wh_id::text,    'email', 'logistique@usineflow.ma', 'email_verified', true), 'email', v_wh_id::text,    now(), now(), now()),
        (v_buy_id,   v_buy_id,   jsonb_build_object('sub', v_buy_id::text,   'email', 'achats@usineflow.ma', 'email_verified', true), 'email', v_buy_id::text,   now(), now(), now()),
        (v_op_id,    v_op_id,    jsonb_build_object('sub', v_op_id::text,    'email', 'operateur@usineflow.ma', 'email_verified', true), 'email', v_op_id::text,    now(), now(), now());
    end if;
  end if;

  -- --------------------------------------------------------------------------
  -- 2. Organization, Profiles & Memberships Setup
  -- --------------------------------------------------------------------------
  select organization_id into v_org from public.memberships where user_id = v_admin_id limit 1;

  if v_org is null then
    insert into public.organizations (name, slug)
    values ('Atlas Métal & Industrie SARL', 'atlas-metal-industrie')
    returning id into v_org;

    insert into public.memberships (organization_id, user_id, role)
    values (v_org, v_admin_id, 'owner')
    on conflict (user_id) do update set organization_id = excluded.organization_id, role = 'owner';
  end if;

  -- Update profiles
  insert into public.profiles (id, full_name, email, locale)
  values
    (v_admin_id, 'Mehdi Benkirane', 'admin@usineflow.ma', 'fr'),
    (v_prod_id,  'Rachid El Amrani', 'production@usineflow.ma', 'fr'),
    (v_qual_id,  'Nadia Chraibi', 'qualite@usineflow.ma', 'fr'),
    (v_wh_id,    'Youssef Berrada', 'logistique@usineflow.ma', 'fr'),
    (v_buy_id,   'Fatima Zahra Tazi', 'achats@usineflow.ma', 'fr'),
    (v_op_id,    'Hassan Moutawakkil', 'operateur@usineflow.ma', 'fr')
  on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;

  -- Ensure team memberships in the same organization
  insert into public.memberships (organization_id, user_id, role)
  values
    (v_org, v_prod_id, 'production_manager'),
    (v_org, v_qual_id, 'quality_manager'),
    (v_org, v_wh_id,   'warehouse_manager'),
    (v_org, v_buy_id,  'purchasing_manager'),
    (v_org, v_op_id,   'operator')
  on conflict (user_id) do update set organization_id = excluded.organization_id, role = excluded.role;

  -- Run organization defaults bootstrap
  perform public.bootstrap_organization(v_org);

  -- Enrich organization with legal & contact info for Morocco
  update public.organizations set
    legal_form = 'SARL-AU',
    ice = '001982736000045',
    if_number = '40192837',
    rc = '124890 Casablanca',
    patente = '34190821',
    cnss = '7891234',
    address = 'Lot n° 42, Allée des Usines, Zone Industrielle Sidi Bernoussi',
    city = 'Casablanca',
    phone = '+212 522 60 70 80',
    email = 'contact@atlas-industrie.ma',
    currency = 'MAD',
    settings = jsonb_build_object(
      'po_prefix', 'BC',
      'currency', 'MAD',
      'default_vat_rate', 20,
      'fiscal_year_start', '01-01',
      'industry', 'Sheet Metal & Industrial Equipment Manufacturing',
      'capital_mad', 2500000
    )
  where id = v_org;

  -- Set session claim so subsequent security checks (auth.uid() & has_permission) pass as owner
  perform set_config('request.jwt.claim.sub', v_admin_id::text, true);
  perform set_config('app.bypass_lock', 'on', true);

  -- --------------------------------------------------------------------------
  -- 3. Units of Measure
  -- --------------------------------------------------------------------------
  select id into v_uom_pc    from public.uoms where organization_id = v_org and code = 'pc';
  select id into v_uom_kg    from public.uoms where organization_id = v_org and code = 'kg';
  select id into v_uom_m     from public.uoms where organization_id = v_org and code = 'm';
  select id into v_uom_sheet from public.uoms where organization_id = v_org and code = 'sheet';
  select id into v_uom_box   from public.uoms where organization_id = v_org and code = 'box';
  select id into v_uom_roll  from public.uoms where organization_id = v_org and code = 'roll';
  select id into v_uom_pal   from public.uoms where organization_id = v_org and code = 'pallet';
  select id into v_uom_l     from public.uoms where organization_id = v_org and code = 'L';
  select id into v_uom_h     from public.uoms where organization_id = v_org and code = 'h';

  -- --------------------------------------------------------------------------
  -- 4. Sites & Facilities & Departments
  -- --------------------------------------------------------------------------
  select id into v_site_casa from public.sites where organization_id = v_org and code = 'SITE-01';
  if v_site_casa is null then
    insert into public.sites (organization_id, code, name, kind, address, city)
    values (v_org, 'SITE-01', 'Usine Principale Sidi Bernoussi', 'factory', 'Allée des Usines', 'Casablanca')
    returning id into v_site_casa;
  else
    update public.sites set name = 'Usine Principale Sidi Bernoussi', city = 'Casablanca' where id = v_site_casa;
  end if;

  insert into public.sites (organization_id, code, name, kind, address, city)
  values (v_org, 'SITE-02', 'Plateforme Logistique Tanger Med', 'warehouse', 'Zone Franche Tanger Med, Ksar El Majaz', 'Tanger')
  on conflict (organization_id, code) do update set name = excluded.name
  returning id into v_site_tng;

  insert into public.facilities (organization_id, site_id, code, name, kind)
  values
    (v_org, v_site_casa, 'FAC-01', 'Hangar de Production & Tôlerie', 'production'),
    (v_org, v_site_casa, 'FAC-02', 'Magasin Central & Expéditions', 'storage')
  on conflict (organization_id, code) do update set name = excluded.name, kind = excluded.kind;

  select id into v_fac_prod from public.facilities where organization_id = v_org and code = 'FAC-01';
  select id into v_fac_mag  from public.facilities where organization_id = v_org and code = 'FAC-02';

  insert into public.departments (organization_id, site_id, code, name)
  values
    (v_org, v_site_casa, 'DIR',   'Direction Générale'),
    (v_org, v_site_casa, 'PROD',  'Production & Usinage'),
    (v_org, v_site_casa, 'QUAL',  'Qualité & Métrologie'),
    (v_org, v_site_casa, 'LOG',   'Supply Chain & Entreposage'),
    (v_org, v_site_casa, 'MAINT', 'Maintenance Industrielle'),
    (v_org, v_site_casa, 'ACH',   'Achats & Approvisionnements')
  on conflict (organization_id, code) do update set name = excluded.name;

  select id into v_dep_dir   from public.departments where organization_id = v_org and code = 'DIR';
  select id into v_dep_prod  from public.departments where organization_id = v_org and code = 'PROD';
  select id into v_dep_qual  from public.departments where organization_id = v_org and code = 'QUAL';
  select id into v_dep_log   from public.departments where organization_id = v_org and code = 'LOG';
  select id into v_dep_maint from public.departments where organization_id = v_org and code = 'MAINT';
  select id into v_dep_ach   from public.departments where organization_id = v_org and code = 'ACH';

  insert into public.teams (organization_id, department_id, name)
  values
    (v_org, v_dep_prod, 'Équipe Découpe Laser CNC'),
    (v_org, v_dep_prod, 'Équipe Pliage & Assemblage'),
    (v_org, v_dep_prod, 'Équipe Peinture Époxy'),
    (v_org, v_dep_qual, 'Équipe Contrôle Réception & Audit')
  on conflict (organization_id, name) do nothing;

  -- --------------------------------------------------------------------------
  -- 5. Warehouses, Zones & Locations
  -- --------------------------------------------------------------------------
  select id into v_wh_casa from public.warehouses where organization_id = v_org and code = 'WH-01';
  if v_wh_casa is null then
    insert into public.warehouses (organization_id, site_id, facility_id, code, name, kind, address)
    values (v_org, v_site_casa, v_fac_mag, 'WH-01', 'Entrepôt Central Sidi Bernoussi', 'standard', 'Casablanca')
    returning id into v_wh_casa;
  else
    update public.warehouses set name = 'Entrepôt Central Sidi Bernoussi', site_id = v_site_casa, facility_id = v_fac_mag where id = v_wh_casa;
  end if;

  insert into public.warehouses (organization_id, site_id, code, name, kind, address)
  values (v_org, v_site_tng, 'WH-02', 'Dépôt Régional Tanger Med', 'finished_goods', 'Zone Franche Tanger Med')
  on conflict (organization_id, code) do update set name = excluded.name
  returning id into v_wh_tng;

  -- Zones in Central Warehouse
  insert into public.warehouse_zones (organization_id, warehouse_id, code, name, kind)
  values
    (v_org, v_wh_casa, 'REC',     'Quai de Réception', 'receiving'),
    (v_org, v_wh_casa, 'STK-MP',  'Stockage Matières & Bobines', 'bulk'),
    (v_org, v_wh_casa, 'STK-PF',  'Rayonnage Produits Finis', 'picking'),
    (v_org, v_wh_casa, 'EXP',     'Zone de Préparation & Quai Expédition', 'dispatch'),
    (v_org, v_wh_casa, 'QUAR',    'Zone de Quarantaine Qualité', 'quarantine')
  on conflict (warehouse_id, code) do update set name = excluded.name, kind = excluded.kind;

  select id into v_zone_rec  from public.warehouse_zones where organization_id = v_org and warehouse_id = v_wh_casa and code = 'REC';
  select id into v_zone_mp   from public.warehouse_zones where organization_id = v_org and warehouse_id = v_wh_casa and code = 'STK-MP';
  select id into v_zone_pf   from public.warehouse_zones where organization_id = v_org and warehouse_id = v_wh_casa and code = 'STK-PF';
  select id into v_zone_exp  from public.warehouse_zones where organization_id = v_org and warehouse_id = v_wh_casa and code = 'EXP';
  select id into v_zone_quar from public.warehouse_zones where organization_id = v_org and warehouse_id = v_wh_casa and code = 'QUAR';

  -- Locations in Central Warehouse
  insert into public.locations (organization_id, warehouse_id, zone_id, code, kind)
  values
    (v_org, v_wh_casa, v_zone_rec,  'REC-01',   'dock'),
    (v_org, v_wh_casa, v_zone_mp,   'A-01-01',  'bin'),
    (v_org, v_wh_casa, v_zone_mp,   'A-01-02',  'bin'),
    (v_org, v_wh_casa, v_zone_mp,   'A-02-01',  'bin'),
    (v_org, v_wh_casa, v_zone_pf,   'B-01-01',  'rack'),
    (v_org, v_wh_casa, v_zone_pf,   'B-01-02',  'rack'),
    (v_org, v_wh_casa, v_zone_exp,  'EXP-01',   'dock'),
    (v_org, v_wh_casa, v_zone_quar, 'QUAR-01',  'floor')
  on conflict (warehouse_id, code) do update set zone_id = excluded.zone_id, kind = excluded.kind;

  select id into v_loc_rec  from public.locations where warehouse_id = v_wh_casa and code = 'REC-01';
  select id into v_loc_mp1  from public.locations where warehouse_id = v_wh_casa and code = 'A-01-01';
  select id into v_loc_mp2  from public.locations where warehouse_id = v_wh_casa and code = 'A-01-02';
  select id into v_loc_mp3  from public.locations where warehouse_id = v_wh_casa and code = 'A-02-01';
  select id into v_loc_pf1  from public.locations where warehouse_id = v_wh_casa and code = 'B-01-01';
  select id into v_loc_pf2  from public.locations where warehouse_id = v_wh_casa and code = 'B-01-02';
  select id into v_loc_exp  from public.locations where warehouse_id = v_wh_casa and code = 'EXP-01';
  select id into v_loc_quar from public.locations where warehouse_id = v_wh_casa and code = 'QUAR-01';

  -- Tanger Warehouse Zones & Locations
  insert into public.warehouse_zones (organization_id, warehouse_id, code, name, kind)
  values
    (v_org, v_wh_tng, 'TNG-Z1', 'Stock Avancé Fournisseur (VMI)', 'bulk')
  on conflict (warehouse_id, code) do update set name = excluded.name;

  insert into public.locations (organization_id, warehouse_id, code, kind)
  values
    (v_org, v_wh_tng, 'TNG-LOC-01', 'dock'),
    (v_org, v_wh_tng, 'TNG-LOC-02', 'rack')
  on conflict (warehouse_id, code) do update set kind = excluded.kind;

  -- --------------------------------------------------------------------------
  -- 6. Categories
  -- --------------------------------------------------------------------------
  select id into v_cat_mp   from public.item_categories where organization_id = v_org and code = 'MP';
  select id into v_cat_cmp  from public.item_categories where organization_id = v_org and code = 'CMP';
  select id into v_cat_emb  from public.item_categories where organization_id = v_org and code = 'EMB';
  select id into v_cat_pf   from public.item_categories where organization_id = v_org and code = 'PF';
  select id into v_cat_pdr  from public.item_categories where organization_id = v_org and code = 'PDR';
  select id into v_cat_cons from public.item_categories where organization_id = v_org and code = 'CONS';

  insert into public.item_categories (organization_id, code, name)
  values (v_org, 'SF', 'Sous-ensembles & Semi-finis')
  on conflict (organization_id, code) do nothing;
  select id into v_cat_sf from public.item_categories where organization_id = v_org and code = 'SF';

  -- --------------------------------------------------------------------------
  -- 7. Partners (Suppliers & Customers in Morocco)
  -- --------------------------------------------------------------------------
  -- Suppliers
  insert into public.partners (organization_id, code, name, kinds, ice, if_number, rc, phone, email, payment_terms_days, credit_limit, rating, notes)
  values
    (v_org, 'SUP-001', 'Maghreb Steel SA', '{supplier}', '001524318000089', '1004820', '45612 Casablanca', '+212 522 76 20 00', 'commercial@maghrebsteel.ma', 45, 0, 4.8, 'Producteur national d’acier plat laminé à chaud et galvanisé.'),
    (v_org, 'SUP-002', 'Aluminium du Maroc SA', '{supplier}', '001637281000072', '2019482', '1289 Tanger', '+212 539 34 20 00', 'contact@aluminiumdumaroc.com', 30, 0, 4.6, 'Extrusion et anodisation de profilés aluminium industriels.'),
    (v_org, 'SUP-003', 'AkzoNobel Coatings Maroc SA', '{supplier}', '001748291000067', '3419021', '67891 Casablanca', '+212 522 33 44 55', 'industriecoatings.ma@akzonobel.com', 30, 0, 4.9, 'Peintures poudres thermolaquage époxy polyester haute durabilité.'),
    (v_org, 'SUP-004', 'CMCP - International Paper', '{supplier}', '001829304000051', '1409210', '1823 Kénitra', '+212 537 36 70 00', 'service.emballages@cmcp.co.ma', 30, 0, 4.7, 'Fournisseur d’emballages cartons double et triple cannelure.'),
    (v_org, 'SUP-005', 'Quincaillerie Générale Moderne (QGM)', '{supplier}', '002049182000034', '5029182', '89102 Casablanca', '+212 522 40 10 20', 'ventes@qgm-maroc.com', 30, 0, 4.5, 'Visserie, boulonnerie classe 8.8 / Inox A2 et quincaillerie industrielle.'),
    (v_org, 'SUP-006', 'TotalEnergies Lubrifiants Maroc', '{supplier}', '001692810000055', '4021980', '23450 Casablanca', '+212 522 97 70 00', 'lubrifiants.industriels@totalenergies.ma', 45, 0, 4.8, 'Huiles hydrauliques ISO VG 46 et lubrifiants de compresseurs.')
  on conflict (organization_id, code) do update set name = excluded.name;

  select id into v_sup_msteel from public.partners where organization_id = v_org and code = 'SUP-001';
  select id into v_sup_alu    from public.partners where organization_id = v_org and code = 'SUP-002';
  select id into v_sup_akzo   from public.partners where organization_id = v_org and code = 'SUP-003';
  select id into v_sup_cmcp   from public.partners where organization_id = v_org and code = 'SUP-004';
  select id into v_sup_qgm    from public.partners where organization_id = v_org and code = 'SUP-005';
  select id into v_sup_total  from public.partners where organization_id = v_org and code = 'SUP-006';

  -- Customers
  insert into public.partners (organization_id, code, name, kinds, ice, if_number, rc, phone, email, payment_terms_days, credit_limit, rating, notes)
  values
    (v_org, 'CUS-001', 'Stellantis Auto Maroc SARL', '{customer}', '002194820000012', '3349182', '5678 Kénitra', '+212 537 32 90 00', 'procurement.kenitra@stellantis.com', 60, 600000, 5.0, 'Usine automobile Kénitra — Armoires électriques de lignes de ferrage.'),
    (v_org, 'CUS-002', 'Renault Group Tanger Méditerranée SA', '{customer}', '001928374000099', '2940192', '4589 Tanger', '+212 539 39 80 00', 'fournisseurs.maroc@renault.com', 60, 850000, 5.0, 'Zone Franche Melloussa — Bâtis métalliques et dessertes de bord de chaîne.'),
    (v_org, 'CUS-003', 'TGCC Immobilier & Travaux SA', '{customer}', '001648291000088', '1920381', '78912 Casablanca', '+212 522 95 60 00', 'achats.chantiers@tgcc.ma', 45, 350000, 4.4, 'Grand donneur d’ordre BTP — Tableaux généraux basse tension et coffrets de chantier.'),
    (v_org, 'CUS-004', 'Schneider Electric Maroc', '{customer}', '001883921000021', '4019280', '99120 Nouaceur', '+212 522 53 80 00', 'oem.maroc@se.com', 60, 500000, 4.9, 'Midparc Casablanca — Enceintes métalliques IP65 nues pour intégration.'),
    (v_org, 'CUS-005', 'Marjane Holding SA', '{customer}', '001559201000044', '1092831', '34567 Casablanca', '+212 522 67 80 00', 'supplychain@marjane.co.ma', 30, 250000, 4.7, 'Chariots de manutention logistique pour entrepôts centraux Sapino.')
  on conflict (organization_id, code) do update set name = excluded.name;

  select id into v_cus_stella    from public.partners where organization_id = v_org and code = 'CUS-001';
  select id into v_cus_renault   from public.partners where organization_id = v_org and code = 'CUS-002';
  select id into v_cus_tgcc      from public.partners where organization_id = v_org and code = 'CUS-003';
  select id into v_cus_schneider from public.partners where organization_id = v_org and code = 'CUS-004';
  select id into v_cus_marjane   from public.partners where organization_id = v_org and code = 'CUS-005';

  -- Addresses for top customers
  insert into public.partner_addresses (organization_id, partner_id, kind, line1, line2, city, postal_code, is_default)
  values
    (v_org, v_cus_stella,  'delivery', 'Atlantic Free Zone, RN 4', 'Usine Automobile Stellantis', 'Kénitra', '14000', true),
    (v_org, v_cus_stella,  'billing',  'Boulevard Khalid Ibn Oualid', 'Siège Administratif', 'Casablanca', '20250', false),
    (v_org, v_cus_renault, 'delivery', 'Zone Franche Melloussa', 'Plateforme Logistique Fournisseurs', 'Tanger', '90000', true),
    (v_org, v_cus_tgcc,    'delivery', 'Chantier Extension Gare TGV Casa Port', 'Zone Travaux', 'Casablanca', '20000', true)
  on conflict do nothing;

  select id into v_addr_stella  from public.partner_addresses where partner_id = v_cus_stella and kind = 'delivery' limit 1;
  select id into v_addr_renault from public.partner_addresses where partner_id = v_cus_renault and kind = 'delivery' limit 1;

  -- --------------------------------------------------------------------------
  -- 8. Items & Barcodes
  -- --------------------------------------------------------------------------
  -- Raw Materials
  insert into public.items (
    organization_id, sku, name, description, item_type, category_id, base_uom_id,
    tracking, valuation_method, standard_cost, avg_cost, sale_price, min_stock, safety_stock, reorder_point, reorder_qty,
    is_purchasable, is_sellable, is_manufactured, requires_inspection
  ) values
    (v_org, 'MP-STEEL-01', 'Tôle Acier Galvanisé 1.5mm (2000x1000mm)', 'Tôle électrozinguée nuance DC01+ZE qualité emboutissage/pliage', 'raw_material', v_cat_mp, v_uom_sheet, 'lot', 'fifo', 240, 240, 0, 30, 15, 40, 100, true, false, false, true),
    (v_org, 'MP-STEEL-02', 'Tôle Acier Inox 304L Brossé 2.0mm (2500x1250mm)', 'Tôle inox grain 220 avec film de protection laser', 'raw_material', v_cat_mp, v_uom_sheet, 'lot', 'fifo', 680, 680, 0, 15, 5, 20, 40, true, false, false, true),
    (v_org, 'MP-ALU-01',   'Profilé Aluminium Rainuré 40x40 (Barre 6m)', 'Profilé modulaire aluminium anodisé naturel avec 4 rainures 8mm', 'raw_material', v_cat_mp, v_uom_m, 'lot', 'fifo', 45, 45, 0, 60, 30, 80, 120, true, false, false, false),
    (v_org, 'MP-POWDER-01','Poudre Époxy-Polyester RAL 7016 Gris Anthracite', 'Peinture poudre thermodurcissable industrielle AkzoNobel Interpon', 'raw_material', v_cat_mp, v_uom_kg, 'lot', 'fifo', 65, 65, 0, 80, 40, 100, 200, true, false, false, true)
  on conflict (organization_id, sku) do update set name = excluded.name;

  -- Components
  insert into public.items (
    organization_id, sku, name, description, item_type, category_id, base_uom_id,
    tracking, valuation_method, standard_cost, avg_cost, sale_price, min_stock, safety_stock, reorder_point, reorder_qty,
    is_purchasable, is_sellable, is_manufactured, requires_inspection
  ) values
    (v_org, 'CMP-LOCK-01', 'Crémone 3 Points avec Poignée Escamotable', 'Système de fermeture verrouillable à clé DIN pour armoires électriques', 'component', v_cat_cmp, v_uom_pc, 'none', 'average', 145, 145, 0, 25, 10, 30, 50, true, false, false, false),
    (v_org, 'CMP-HINGE-01','Charnière Industrielle Renforcée 120° Zamak', 'Charnière invisible zamak noir pour montage affleurant', 'component', v_cat_cmp, v_uom_pc, 'none', 'average', 28, 28, 0, 80, 30, 100, 200, true, false, false, false),
    (v_org, 'CMP-SCREW-M6','Boîte de 500 Vis Tête Bombée Inox M6x16', 'Vis métaux ISO 7380 acier inoxydable A2 empreinte six pans creux', 'component', v_cat_cmp, v_uom_box, 'none', 'average', 95, 95, 0, 20, 10, 25, 50, true, false, false, false),
    (v_org, 'CMP-SEAL-01', 'Joint d''Étanchéité Caoutchouc EPDM (Rouleau 50m)', 'Joint armé à lèvre pour étanchéité IP65 sur porte d''armoire', 'component', v_cat_cmp, v_uom_roll, 'none', 'average', 185, 185, 0, 10, 5, 12, 20, true, false, false, false)
  on conflict (organization_id, sku) do update set name = excluded.name;

  -- Packaging
  insert into public.items (
    organization_id, sku, name, description, item_type, category_id, base_uom_id,
    tracking, valuation_method, standard_cost, avg_cost, sale_price, min_stock,
    is_purchasable, is_sellable, is_manufactured
  ) values
    (v_org, 'EMB-BOX-01', 'Caisse Carton Double Cannelure 1850x850x550mm', 'Carton lourd avec renforts d''angle pour armoire électrique', 'packaging', v_cat_emb, v_uom_pc, 'none', 'average', 48, 48, 0, 40, true, false, false),
    (v_org, 'EMB-PAL-01', 'Palette Bois Lourde 1200x800mm NIMP15', 'Palette traitée thermique pour export et logistique industrielle', 'packaging', v_cat_emb, v_uom_pal, 'none', 'average', 90, 90, 0, 30, true, false, false)
  on conflict (organization_id, sku) do update set name = excluded.name;

  -- Semi-Finished Sub-Assemblies
  insert into public.items (
    organization_id, sku, name, description, item_type, category_id, base_uom_id,
    tracking, valuation_method, standard_cost, avg_cost, sale_price,
    is_purchasable, is_sellable, is_manufactured
  ) values
    (v_org, 'SF-FRAME-01', 'Corps d''Armoire Soudé & Dégraissé 1800x800x500', 'Châssis monobloc mécano-soudé avec goujons de mise à la terre', 'semi_finished', v_cat_sf, v_uom_pc, 'lot', 'average', 980, 980, 0, false, false, true),
    (v_org, 'SF-DOOR-01',  'Porte d''Armoire Pliée avec Renforts Oméga', 'Vantail renforcé pré-percé pour serrure et charnières', 'semi_finished', v_cat_sf, v_uom_pc, 'lot', 'average', 320, 320, 0, false, false, true)
  on conflict (organization_id, sku) do update set name = excluded.name;

  -- Finished Products
  insert into public.items (
    organization_id, sku, name, description, item_type, category_id, base_uom_id,
    tracking, valuation_method, standard_cost, avg_cost, sale_price, vat_rate, min_stock, safety_stock,
    is_purchasable, is_sellable, is_manufactured, requires_inspection
  ) values
    (v_org, 'PF-ARM-01',  'Armoire Électrique Industrielle IP65 1800x800x500 RAL 7016', 'Enveloppe métallique étanche conforme norme IEC 62208 avec platine de montage galvanisée', 'finished_product', v_cat_pf, v_uom_pc, 'lot', 'average', 2850, 2850, 4850, 20, 10, 5, false, true, true, true),
    (v_org, 'PF-ETAB-01', 'Établi d''Atelier Industriel 2000x800mm avec Tiroirs & Panneau', 'Poste de travail ergonomique charge 800kg plateau hêtre multiplis 40mm', 'finished_product', v_cat_pf, v_uom_pc, 'lot', 'average', 3900, 3900, 6400, 20, 5, 2, false, true, true, true),
    (v_org, 'PF-CHART-01','Desserte / Chariot de Manutention 3 Plateaux 500kg', 'Chariot roulant mécano-soudé 4 roues bandage polyuréthane dont 2 pivotantes à frein', 'finished_product', v_cat_pf, v_uom_pc, 'lot', 'average', 1550, 1550, 2650, 20, 8, 4, false, true, true, false)
  on conflict (organization_id, sku) do update set name = excluded.name;

  -- Spare Parts
  insert into public.items (
    organization_id, sku, name, description, item_type, category_id, base_uom_id,
    tracking, valuation_method, standard_cost, avg_cost, sale_price, min_stock,
    is_purchasable, is_sellable, is_manufactured
  ) values
    (v_org, 'PDR-LASER-NOZ', 'Buse Cuivre Chromé Découpe Laser Ø 1.5mm', 'Buse double conique haute précision pour tête de découpe fibre Bystronic', 'spare_part', v_cat_pdr, v_uom_pc, 'none', 'average', 85, 85, 0, 15, true, false, false),
    (v_org, 'PDR-HYDR-46',   'Bidon 20L Huile Hydraulique ISO VG 46', 'Huile anti-usure haute pression pour presse plieuse Trumpf', 'spare_part', v_cat_pdr, v_uom_l, 'none', 'average', 42, 42, 0, 40, true, false, false)
  on conflict (organization_id, sku) do update set name = excluded.name;

  -- Select Item IDs
  select id into v_item_steel1 from public.items where organization_id = v_org and sku = 'MP-STEEL-01';
  select id into v_item_steel2 from public.items where organization_id = v_org and sku = 'MP-STEEL-02';
  select id into v_item_alu    from public.items where organization_id = v_org and sku = 'MP-ALU-01';
  select id into v_item_powder from public.items where organization_id = v_org and sku = 'MP-POWDER-01';
  select id into v_item_lock   from public.items where organization_id = v_org and sku = 'CMP-LOCK-01';
  select id into v_item_hinge  from public.items where organization_id = v_org and sku = 'CMP-HINGE-01';
  select id into v_item_screw  from public.items where organization_id = v_org and sku = 'CMP-SCREW-M6';
  select id into v_item_seal   from public.items where organization_id = v_org and sku = 'CMP-SEAL-01';
  select id into v_item_box    from public.items where organization_id = v_org and sku = 'EMB-BOX-01';
  select id into v_item_pallet from public.items where organization_id = v_org and sku = 'EMB-PAL-01';
  select id into v_item_frame  from public.items where organization_id = v_org and sku = 'SF-FRAME-01';
  select id into v_item_door   from public.items where organization_id = v_org and sku = 'SF-DOOR-01';
  select id into v_item_arm    from public.items where organization_id = v_org and sku = 'PF-ARM-01';
  select id into v_item_etab   from public.items where organization_id = v_org and sku = 'PF-ETAB-01';
  select id into v_item_chart  from public.items where organization_id = v_org and sku = 'PF-CHART-01';
  select id into v_item_noz    from public.items where organization_id = v_org and sku = 'PDR-LASER-NOZ';
  select id into v_item_hydr   from public.items where organization_id = v_org and sku = 'PDR-HYDR-46';

  -- Barcodes
  insert into public.item_barcodes (organization_id, item_id, barcode, kind, is_primary)
  values
    (v_org, v_item_arm,    '6111234560018', 'ean13', true),
    (v_org, v_item_etab,   '6111234560025', 'ean13', true),
    (v_org, v_item_chart,  '6111234560032', 'ean13', true),
    (v_org, v_item_steel1, 'MP-STEEL-01',   'code128', true),
    (v_org, v_item_steel2, 'MP-STEEL-02',   'code128', true),
    (v_org, v_item_powder, 'MP-POWDER-01',  'code128', true)
  on conflict (organization_id, barcode) do nothing;

  -- Item Supplier Relationships
  insert into public.item_suppliers (organization_id, item_id, supplier_id, price, lead_time_days, preferred)
  values
    (v_org, v_item_steel1, v_sup_msteel, 240, 7,  true),
    (v_org, v_item_steel2, v_sup_msteel, 680, 10, true),
    (v_org, v_item_alu,    v_sup_alu,    45,  5,  true),
    (v_org, v_item_powder, v_sup_akzo,   65,  4,  true),
    (v_org, v_item_screw,  v_sup_qgm,    95,  2,  true),
    (v_org, v_item_hinge,  v_sup_qgm,    28,  2,  true),
    (v_org, v_item_box,    v_sup_cmcp,   48,  5,  true),
    (v_org, v_item_hydr,   v_sup_total,  42,  3,  true)
  on conflict (item_id, supplier_id) do nothing;

  -- --------------------------------------------------------------------------
  -- 9. Work Centers & Machines (GMAO / MES)
  -- --------------------------------------------------------------------------
  insert into public.work_centers (organization_id, facility_id, code, name, kind, hourly_machine_cost, hourly_labor_cost, capacity_hours_per_day)
  values
    (v_org, v_fac_prod, 'WC-LASER', 'Centre Découpe Laser Fibre CNC',      'machine',  280, 65, 16),
    (v_org, v_fac_prod, 'WC-PLI',   'Centre Pliage Presse Plieuse CNC',    'machine',  190, 55, 16),
    (v_org, v_fac_prod, 'WC-SOUD',  'Atelier Soudure TIG/MIG & Meulage',   'manual',   110, 65, 24),
    (v_org, v_fac_prod, 'WC-PEINT', 'Chaîne Poudrage Époxy & Cuisson',     'machine',  320, 45, 8),
    (v_org, v_fac_prod, 'WC-ASSY',  'Cellule Montage, Serrurerie & Fini',   'assembly',  40, 55, 32)
  on conflict (organization_id, code) do update set name = excluded.name, hourly_machine_cost = excluded.hourly_machine_cost;

  select id into v_wc_laser from public.work_centers where organization_id = v_org and code = 'WC-LASER';
  select id into v_wc_pli   from public.work_centers where organization_id = v_org and code = 'WC-PLI';
  select id into v_wc_soud  from public.work_centers where organization_id = v_org and code = 'WC-SOUD';
  select id into v_wc_peint from public.work_centers where organization_id = v_org and code = 'WC-PEINT';
  select id into v_wc_assy  from public.work_centers where organization_id = v_org and code = 'WC-ASSY';

  -- Industrial Assets
  insert into public.assets (organization_id, code, name, work_center_id, site_id, facility_id, kind, status, serial_number, meter_reading, meter_unit)
  values
    (v_org, 'M-LASER-01',  'Machine Laser Fibre Bystronic ByStar 6kW', v_wc_laser, v_site_casa, v_fac_prod, 'machine', 'running', 'BY-6000-2024-MA', 2450, 'hours'),
    (v_org, 'M-PRESSE-01', 'Presse Plieuse CNC Trumpf TruBend 5170',   v_wc_pli,   v_site_casa, v_fac_prod, 'machine', 'running', 'TR-5170-8910-MA', 4120, 'hours'),
    (v_org, 'M-SOUD-01',   'Générateur Soudure Fronius TPS/i 400',     v_wc_soud,  v_site_casa, v_fac_prod, 'machine', 'running', 'FR-400-2023-01',  1890, 'hours'),
    (v_org, 'M-FOUR-01',   'Four Continu Thermolaquage 220°C Gaz',     v_wc_peint, v_site_casa, v_fac_prod, 'machine', 'running', 'TH-FOUR-2022-01', 3200, 'hours'),
    (v_org, 'CH-TOYOTA-01','Chariot Élévateur Électrique Toyota 2.5T', null,       v_site_casa, v_fac_mag,  'vehicle', 'running', 'TY-25-ELEC-4401', 1540, 'hours')
  on conflict (organization_id, code) do update set name = excluded.name;

  select id into v_asset_laser   from public.assets where organization_id = v_org and code = 'M-LASER-01';
  select id into v_asset_presse  from public.assets where organization_id = v_org and code = 'M-PRESSE-01';
  select id into v_asset_soud    from public.assets where organization_id = v_org and code = 'M-SOUD-01';
  select id into v_asset_four    from public.assets where organization_id = v_org and code = 'M-FOUR-01';
  select id into v_asset_chariot from public.assets where organization_id = v_org and code = 'CH-TOYOTA-01';

  -- --------------------------------------------------------------------------
  -- 10. Bills of Materials (BOM) & Routings
  -- --------------------------------------------------------------------------
  -- Sub-assembly 1: SF-FRAME-01
  insert into public.boms (organization_id, item_id, code, name)
  values (v_org, v_item_frame, 'BOM-FRAME-01', 'BOM Corps Armoire 1800x800x500')
  on conflict (organization_id, code) do update set name = excluded.name
  returning id into v_bom_frame;

  insert into public.bom_versions (organization_id, bom_id, version, status)
  values (v_org, v_bom_frame, 1, 'draft')
  on conflict (bom_id, version) do nothing
  returning id into v_bv_frame;

  if v_bv_frame is not null then
    insert into public.bom_lines (organization_id, version_id, component_item_id, quantity, uom_id)
    values
      (v_org, v_bv_frame, v_item_steel1, 3, v_uom_sheet),
      (v_org, v_bv_frame, v_item_alu,    2, v_uom_m)
    on conflict do nothing;
    perform public.activate_bom_version(v_bv_frame);
  else
    select id into v_bv_frame from public.bom_versions where bom_id = v_bom_frame and version = 1;
  end if;

  -- Sub-assembly 2: SF-DOOR-01
  insert into public.boms (organization_id, item_id, code, name)
  values (v_org, v_item_door, 'BOM-DOOR-01', 'BOM Vantail Porte Armoire')
  on conflict (organization_id, code) do update set name = excluded.name
  returning id into v_bom_door;

  insert into public.bom_versions (organization_id, bom_id, version, status)
  values (v_org, v_bom_door, 1, 'draft')
  on conflict (bom_id, version) do nothing
  returning id into v_bv_door;

  if v_bv_door is not null then
    insert into public.bom_lines (organization_id, version_id, component_item_id, quantity, uom_id)
    values
      (v_org, v_bv_door, v_item_steel1, 1, v_uom_sheet)
    on conflict do nothing;
    perform public.activate_bom_version(v_bv_door);
  else
    select id into v_bv_door from public.bom_versions where bom_id = v_bom_door and version = 1;
  end if;

  -- Finished Product: PF-ARM-01
  insert into public.boms (organization_id, item_id, code, name)
  values (v_org, v_item_arm, 'BOM-ARM-01', 'Nomenclature Complète Armoire IP65 RAL 7016')
  on conflict (organization_id, code) do update set name = excluded.name
  returning id into v_bom_arm;

  insert into public.bom_versions (organization_id, bom_id, version, status)
  values (v_org, v_bom_arm, 1, 'draft')
  on conflict (bom_id, version) do nothing
  returning id into v_bv_arm;

  if v_bv_arm is not null then
    insert into public.bom_lines (organization_id, version_id, component_item_id, quantity, uom_id)
    values
      (v_org, v_bv_arm, v_item_frame,  1,    v_uom_pc),
      (v_org, v_bv_arm, v_item_door,   1,    v_uom_pc),
      (v_org, v_bv_arm, v_item_lock,   1,    v_uom_pc),
      (v_org, v_bv_arm, v_item_hinge,  3,    v_uom_pc),
      (v_org, v_bv_arm, v_item_screw,  0.05, v_uom_box),
      (v_org, v_bv_arm, v_item_seal,   0.1,  v_uom_roll),
      (v_org, v_bv_arm, v_item_powder, 3.5,  v_uom_kg),
      (v_org, v_bv_arm, v_item_box,    1,    v_uom_pc),
      (v_org, v_bv_arm, v_item_pallet, 1,    v_uom_pal)
    on conflict do nothing;
    perform public.activate_bom_version(v_bv_arm);
  else
    select id into v_bv_arm from public.bom_versions where bom_id = v_bom_arm and version = 1;
  end if;

  -- Routings
  insert into public.routings (organization_id, item_id, code, name)
  values (v_org, v_item_arm, 'ROUT-ARM-01', 'Gamme de Montage Armoire IP65')
  on conflict (organization_id, code) do update set name = excluded.name
  returning id into v_rout_arm;

  insert into public.routing_operations (organization_id, routing_id, seq, name, work_center_id, run_minutes_per_unit)
  values
    (v_org, v_rout_arm, 10, 'Montage Serrurerie, Charnières & Joint EPDM', v_wc_assy, 25),
    (v_org, v_rout_arm, 20, 'Contrôle Électrique Continuité Masse & Emballage', v_wc_assy, 15)
  on conflict (routing_id, seq) do nothing;

  -- --------------------------------------------------------------------------
  -- 11. Initial Stock via Stock Adjustment (Opening Stock)
  -- --------------------------------------------------------------------------
  if not exists (select 1 from public.stock_adjustments where organization_id = v_org and reason = 'Stock Initial d''Ouverture UsineFlow') then
    insert into public.stock_adjustments (organization_id, warehouse_id, kind, reason)
    values (v_org, v_wh_casa, 'opening', 'Stock Initial d''Ouverture UsineFlow')
    returning id into v_adj;

    insert into public.stock_adjustment_lines (organization_id, adjustment_id, item_id, location_id, quantity_delta, unit_cost, lot_number)
    values
      (v_org, v_adj, v_item_steel1, v_loc_mp1,  180,  240,  'LOT-STEEL-26A'),
      (v_org, v_adj, v_item_steel2, v_loc_mp2,  45,   680,  'LOT-INOX-26B'),
      (v_org, v_adj, v_item_alu,    v_loc_mp3,  200,  45,   'LOT-ALU-26C'),
      (v_org, v_adj, v_item_powder, v_loc_mp3,  350,  65,   'LOT-EPOXY-26D'),
      (v_org, v_adj, v_item_lock,   v_loc_mp1,  90,   145,  null),
      (v_org, v_adj, v_item_hinge,  v_loc_mp1,  400,  28,   null),
      (v_org, v_adj, v_item_screw,  v_loc_mp1,  60,   95,   null),
      (v_org, v_adj, v_item_seal,   v_loc_mp1,  25,   185,  null),
      (v_org, v_adj, v_item_box,    v_loc_mp2,  150,  48,   null),
      (v_org, v_adj, v_item_pallet, v_loc_mp2,  80,   90,   null),
      (v_org, v_adj, v_item_frame,  v_loc_mp2,  30,   850,  'LOT-SF-FR-2601'),
      (v_org, v_adj, v_item_door,   v_loc_mp2,  30,   380,  'LOT-SF-DR-2601'),
      (v_org, v_adj, v_item_arm,    v_loc_pf1,  16,   2850, 'PF-ARM-2601'),
      (v_org, v_adj, v_item_etab,   v_loc_pf2,  8,    3900, 'PF-ETAB-2601'),
      (v_org, v_adj, v_item_chart,  v_loc_pf2,  18,   1550, 'PF-CHART-2601'),
      (v_org, v_adj, v_item_noz,    v_loc_mp3,  30,   85,   null),
      (v_org, v_adj, v_item_hydr,   v_loc_mp3,  160,  42,   null);

    perform public.post_stock_adjustment(v_adj);
  end if;

  -- --------------------------------------------------------------------------
  -- 12. Procurement: Purchase Orders & Receipt
  -- --------------------------------------------------------------------------
  if not exists (select 1 from public.purchase_orders where organization_id = v_org and notes = 'Approvisionnement Tôles Acier Maghreb Steel') then
    -- PO 1: Maghreb Steel (Initially ordered, received & updated to 'received' via post_purchase_receipt)
    insert into public.purchase_orders (organization_id, supplier_id, warehouse_id, order_date, status, notes)
    values (v_org, v_sup_msteel, v_wh_casa, current_date - interval '14 days', 'ordered', 'Approvisionnement Tôles Acier Maghreb Steel')
    returning id into v_po1;

    insert into public.purchase_order_lines (organization_id, po_id, item_id, quantity, uom_id, unit_price, received_qty)
    values (v_org, v_po1, v_item_steel1, 100, v_uom_sheet, 240, 0)
    returning id into v_po1_line;

    -- Receipt BR
    insert into public.purchase_receipts (organization_id, po_id, supplier_id, warehouse_id, location_id, supplier_delivery_note, received_on)
    values (v_org, v_po1, v_sup_msteel, v_wh_casa, v_loc_rec, 'BL-MS-2026-90412', current_date - interval '10 days')
    returning id into v_rc1;

    insert into public.purchase_receipt_lines (organization_id, receipt_id, po_line_id, item_id, quantity, uom_id, unit_cost, lot_number)
    values (v_org, v_rc1, v_po1_line, v_item_steel1, 100, v_uom_sheet, 240, 'LOT-MS-2603');

    perform public.post_purchase_receipt(v_rc1);

    -- PO 2: AkzoNobel (Ordered / In Transit)
    insert into public.purchase_orders (organization_id, supplier_id, warehouse_id, order_date, expected_date, status, notes)
    values (v_org, v_sup_akzo, v_wh_casa, current_date - interval '4 days', current_date + interval '3 days', 'ordered', 'Poudre Thermolaquage Gris Anthracite RAL 7016')
    returning id into v_po2;

    insert into public.purchase_order_lines (organization_id, po_id, item_id, quantity, uom_id, unit_price)
    values (v_org, v_po2, v_item_powder, 150, v_uom_kg, 65);

    -- PO 3: QGM (Approved)
    insert into public.purchase_orders (organization_id, supplier_id, warehouse_id, order_date, status, notes)
    values (v_org, v_sup_qgm, v_wh_casa, current_date - interval '1 day', 'approved', 'Réapprovisionnement Visserie Inox & Charnières')
    returning id into v_po3;

    insert into public.purchase_order_lines (organization_id, po_id, item_id, quantity, uom_id, unit_price)
    values
      (v_org, v_po3, v_item_screw, 40,  v_uom_box, 95),
      (v_org, v_po3, v_item_hinge, 120, v_uom_pc,  28);
  end if;

  -- --------------------------------------------------------------------------
  -- 13. Sales: Orders, Delivery & Invoice
  -- --------------------------------------------------------------------------
  if not exists (select 1 from public.sales_orders where organization_id = v_org and notes = 'Commande Cadre Stellantis Kénitra — Ligne de Montage') then
    -- SO 1: Stellantis Auto Maroc (Delivered & Invoiced)
    insert into public.sales_orders (organization_id, customer_id, warehouse_id, delivery_address_id, order_date, status, notes)
    values (v_org, v_cus_stella, v_wh_casa, v_addr_stella, current_date - interval '12 days', 'delivered', 'Commande Cadre Stellantis Kénitra — Ligne de Montage')
    returning id into v_so1;

    insert into public.sales_order_lines (organization_id, so_id, item_id, quantity, uom_id, unit_price, delivered_qty, invoiced_qty)
    values (v_org, v_so1, v_item_arm, 10, v_uom_pc, 4850, 10, 0)
    returning id into v_so1_line;

    -- Delivery BL
    insert into public.deliveries (organization_id, so_id, customer_id, warehouse_id, vehicle, driver, tracking_no, delivery_date, stage, status)
    values (v_org, v_so1, v_cus_stella, v_wh_casa, 'Camion Isuzu 7.5T (Matricule 14-A-78901)', 'Omar Filali', 'BL-2026-STELLA-01', current_date - interval '7 days', 'dispatched', 'posted')
    returning id into v_dl1;

    insert into public.delivery_lines (organization_id, delivery_id, so_line_id, item_id, quantity, uom_id, base_quantity)
    values (v_org, v_dl1, v_so1_line, v_item_arm, 10, v_uom_pc, 10);

    -- Sales Invoice FC (inserted as draft, lines added, then posted via post_sales_invoice)
    insert into public.sales_invoices (organization_id, so_id, customer_id, invoice_date, due_date, status, notes)
    values (v_org, v_so1, v_cus_stella, current_date - interval '7 days', current_date + interval '53 days', 'draft', 'Facture conforme ICE Stellantis Auto Maroc')
    returning id into v_inv_sales1;

    insert into public.sales_invoice_lines (organization_id, invoice_id, so_line_id, item_id, description, quantity, unit_price, vat_rate)
    values (v_org, v_inv_sales1, v_so1_line, v_item_arm, 'Armoire Électrique Industrielle IP65 1800x800x500 RAL 7016', 10, 4850, 20);

    perform public.post_sales_invoice(v_inv_sales1);

    -- Payment PAI (inserted as draft, then posted via post_payment which records cash movements and updates invoice payment status)
    insert into public.payments (organization_id, direction, partner_id, sales_invoice_id, amount, method, paid_on, reference, status)
    values (v_org, 'in', v_cus_stella, v_inv_sales1, 58200, 'bank_transfer', current_date - interval '2 days', 'VIR-BP-STELLA-9912', 'draft')
    returning id into v_pay1;

    perform public.post_payment(v_pay1);

    -- SO 2: Renault Tanger Méditerranée (Confirmed)
    insert into public.sales_orders (organization_id, customer_id, warehouse_id, delivery_address_id, order_date, requested_date, status, notes)
    values (v_org, v_cus_renault, v_wh_casa, v_addr_renault, current_date - interval '3 days', current_date + interval '10 days', 'confirmed', 'Enceintes & Établis Zone Franche Melloussa')
    returning id into v_so2;

    insert into public.sales_order_lines (organization_id, so_id, item_id, quantity, uom_id, unit_price)
    values
      (v_org, v_so2, v_item_arm,  8, v_uom_pc, 4850),
      (v_org, v_so2, v_item_etab, 4, v_uom_pc, 6400);

    -- SO 3: TGCC Construction (Draft)
    insert into public.sales_orders (organization_id, customer_id, warehouse_id, order_date, status, notes)
    values (v_org, v_cus_tgcc, v_wh_casa, current_date, 'draft', 'Devis Chariots de Manutention Chantier Casa-Port')
    returning id into v_so3;

    insert into public.sales_order_lines (organization_id, so_id, item_id, quantity, uom_id, unit_price)
    values (v_org, v_so3, v_item_chart, 6, v_uom_pc, 2650);
  end if;

  -- --------------------------------------------------------------------------
  -- 14. Manufacturing: Production Orders
  -- --------------------------------------------------------------------------
  if not exists (select 1 from public.production_orders where organization_id = v_org and notes = 'OF Série Armoires IP65 — Lot Février') then
    -- OF 1: Completed production order
    insert into public.production_orders (
      organization_id, item_id, quantity, bom_version_id, routing_id, warehouse_id, output_location_id,
      planned_start, planned_end, status, lot_number, notes
    ) values (
      v_org, v_item_arm, 10, v_bv_arm, v_rout_arm, v_wh_casa, v_loc_pf1,
      current_date - interval '10 days', current_date - interval '5 days', 'draft', 'PF-ARM-2602',
      'OF Série Armoires IP65 — Lot Février'
    ) returning id into v_po_prod1;

    perform public.release_production_order(v_po_prod1);

    select id into v_op_prod1_1 from public.production_order_operations where production_order_id = v_po_prod1 and seq = 10;
    select id into v_op_prod1_2 from public.production_order_operations where production_order_id = v_po_prod1 and seq = 20;

    perform public.start_production_operation(v_op_prod1_1);
    perform public.report_production(v_op_prod1_1, 10, 0);
    perform public.complete_production_operation(v_op_prod1_1);

    perform public.start_production_operation(v_op_prod1_2);
    perform public.report_production(v_op_prod1_2, 10, 0, null, 'PF-ARM-2602');
    perform public.complete_production_operation(v_op_prod1_2);

    perform public.complete_production_order(v_po_prod1);
    perform public.close_production_order(v_po_prod1);

    -- OF 2: In-Progress production order
    insert into public.production_orders (
      organization_id, item_id, quantity, bom_version_id, routing_id, warehouse_id, output_location_id,
      planned_start, planned_end, status, lot_number, notes
    ) values (
      v_org, v_item_arm, 12, v_bv_arm, v_rout_arm, v_wh_casa, v_loc_pf1,
      current_date - interval '2 days', current_date + interval '4 days', 'draft', 'PF-ARM-2603',
      'OF Réassort Stock Tampon & Commande Renault'
    ) returning id into v_po_prod2;

    perform public.release_production_order(v_po_prod2);
    select id into v_op_prod2_1 from public.production_order_operations where production_order_id = v_po_prod2 and seq = 10;
    perform public.start_production_operation(v_op_prod2_1);
    perform public.report_production(v_op_prod2_1, 8, 0);

    -- OF 3: Planned production order
    insert into public.production_orders (
      organization_id, item_id, quantity, bom_version_id, routing_id, warehouse_id, output_location_id,
      planned_start, planned_end, status, notes
    ) values (
      v_org, v_item_etab, 6, null, null, v_wh_casa, v_loc_pf2,
      current_date + interval '2 days', current_date + interval '7 days', 'planned',
      'OF Planifié Établis Industriels Charge Lourde'
    ) returning id into v_po_prod3;
  end if;

  -- --------------------------------------------------------------------------
  -- 15. Maintenance (GMAO): Plans & Work Orders
  -- --------------------------------------------------------------------------
  insert into public.maintenance_plans (organization_id, asset_id, name, trigger_type, interval_meter, active)
  values
    (v_org, v_asset_presse, 'Vidange Circuit Hydraulique & Filtres 500h', 'meter', 500, true),
    (v_org, v_asset_laser,  'Calibration Optique & Nettoyage Résonateur',  'meter', 800, true)
  on conflict do nothing;

  select id into v_maint_plan from public.maintenance_plans where organization_id = v_org and asset_id = v_asset_presse limit 1;

  if not exists (select 1 from public.maintenance_work_orders where organization_id = v_org and title = 'Remplacement flexible haute pression fuyant') then
    insert into public.maintenance_work_orders (
      organization_id, asset_id, plan_id, kind, priority, status, breakdown,
      title, description, downtime_minutes, labor_minutes, labor_cost, parts_cost, total_cost, resolution
    ) values (
      v_org, v_asset_presse, v_maint_plan, 'corrective', 'high', 'completed', true,
      'Remplacement flexible haute pression fuyant',
      'Fuite d''huile constatée sur le raccord du vérin principal gauche pendant le pliage.',
      75, 90, 150, 420, 570,
      'Flexible hydraulique 250 bars remplacé, niveau d''huile complété avec 10L ISO VG 46.'
    );
  end if;

  -- --------------------------------------------------------------------------
  -- 16. Quality & Inspections
  -- --------------------------------------------------------------------------
  insert into public.inspection_plans (organization_id, code, name, kind)
  values
    (v_org, 'PLAN-INCOMING', 'Contrôle Réception Métallurgie & Matières Premières', 'incoming'),
    (v_org, 'PLAN-FINAL',    'Audit Qualité Final Armoires & Enceintes IP65',       'final')
  on conflict (organization_id, code) do update set name = excluded.name;

  select id into v_plan_incoming from public.inspection_plans where organization_id = v_org and code = 'PLAN-INCOMING';
  select id into v_plan_final    from public.inspection_plans where organization_id = v_org and code = 'PLAN-FINAL';

  if not exists (select 1 from public.inspection_points where plan_id = v_plan_incoming) then
    insert into public.inspection_points (organization_id, plan_id, seq, name, kind, unit, target, min_value, max_value)
    values
      (v_org, v_plan_incoming, 10, 'Épaisseur nominale tôle (mm)', 'measurement', 'mm', 1.50, 1.45, 1.55),
      (v_org, v_plan_incoming, 20, 'Aspect de surface & absence de rayures', 'visual', null, null, null, null);
  end if;

  if not exists (select 1 from public.inspection_points where plan_id = v_plan_final) then
    insert into public.inspection_points (organization_id, plan_id, seq, name, kind, unit, target, min_value, max_value)
    values
      (v_org, v_plan_final,    10, 'Continuité masse de terre (< 0.1 ohm)', 'measurement', 'ohm', 0.05, 0.0, 0.10),
      (v_org, v_plan_final,    20, 'Étanchéité joint EPDM porte (Test feuille)', 'pass_fail', null, null, null, null);
  end if;

  -- Inspection record
  if not exists (select 1 from public.inspections where organization_id = v_org and comment = 'Contrôle conforme réception Maghreb Steel') then
    insert into public.inspections (
      organization_id, kind, plan_id, item_id, warehouse_id, supplier_id, quantity, accepted_qty, status, decision, comment
    ) values (
      v_org, 'incoming', v_plan_incoming, v_item_steel1, v_wh_casa, v_sup_msteel, 100, 100, 'passed', 'accept',
      'Contrôle conforme réception Maghreb Steel'
    ) returning id into v_insp1;

    -- Non-Conformance & CAPA
    insert into public.non_conformances (
      organization_id, inspection_id, item_id, supplier_id, severity, quantity_affected,
      description, root_cause, containment, status
    ) values (
      v_org, v_insp1, v_item_steel2, v_sup_msteel, 'minor', 2,
      'Légère rayure sur le film protecteur de 2 tôles inox en extrémité de palette',
      'Frottement contre ridelle de camion pendant le transport',
      'Marquage et déclassement pour pièces internes non visibles',
      'contained'
    ) returning id into v_ncr;

    insert into public.capa_actions (organization_id, ncr_id, kind, title, description, status)
    values (
      v_org, v_ncr, 'corrective',
      'Exiger cornières de protection carton épaisses sur livraisons inox',
      'Courrier officiel envoyé au service logistique Maghreb Steel avec photos à l''appui.',
      'done'
    );
  end if;

  -- --------------------------------------------------------------------------
  -- 17. Workforce, Skills & Attendance
  -- --------------------------------------------------------------------------
  insert into public.skills (organization_id, name, description)
  values
    (v_org, 'Opérateur Découpe Laser Fibre CNC', 'Programmation FAO et conduite laser Bystronic ByStar'),
    (v_org, 'Pliage Numérique & Programmation Delem', 'Réglage butées et outillages presses plieuses CNC'),
    (v_org, 'Soudure TIG Aciers Inoxydables', 'Qualification soudure procédé 141 tôles fines inox'),
    (v_org, 'Contrôle Dimensionnel & Métrologie', 'Utilisation bras 3D, micromètres et étalons de mesure'),
    (v_org, 'Maintenance Électromécanique & Automates', 'Diagnostic variateurs, automate Siemens et pneumatique'),
    (v_org, 'Conduite Chariot Élévateur CACES Cat 3', 'Certificat d’aptitude à la conduite en sécurité R489')
  on conflict (organization_id, name) do update set description = excluded.description;

  select id into v_sk_laser from public.skills where organization_id = v_org and name = 'Opérateur Découpe Laser Fibre CNC';
  select id into v_sk_pli   from public.skills where organization_id = v_org and name = 'Pliage Numérique & Programmation Delem';
  select id into v_sk_soud  from public.skills where organization_id = v_org and name = 'Soudure TIG Aciers Inoxydables';
  select id into v_sk_qual  from public.skills where organization_id = v_org and name = 'Contrôle Dimensionnel & Métrologie';
  select id into v_sk_elec  from public.skills where organization_id = v_org and name = 'Maintenance Électromécanique & Automates';
  select id into v_sk_caces from public.skills where organization_id = v_org and name = 'Conduite Chariot Élévateur CACES Cat 3';

  -- Employees
  insert into public.employees (organization_id, code, full_name, department_id, user_id, position, hourly_cost, status, phone, email, cin, cnss_number)
  values
    (v_org, 'EMP-001', 'Mehdi Benkirane',    v_dep_dir,   v_admin_id, 'Directeur Général', 120, 'active', '+212 661 10 20 30', 'admin@usineflow.ma',        'BE456123', '10982734'),
    (v_org, 'EMP-002', 'Rachid El Amrani',   v_dep_prod,  v_prod_id,  'Responsable de Production', 85, 'active', '+212 661 20 30 40', 'production@usineflow.ma',   'BK234567', '20194821'),
    (v_org, 'EMP-003', 'Nadia Chraibi',      v_dep_qual,  v_qual_id,  'Responsable Contrôle Qualité', 75, 'active', '+212 661 30 40 50', 'qualite@usineflow.ma',      'BW891023', '34190283'),
    (v_org, 'EMP-004', 'Youssef Berrada',    v_dep_log,   v_wh_id,    'Responsable Entrepôt & Flux', 70, 'active', '+212 661 40 50 60', 'logistique@usineflow.ma',   'BL567890', '40192837'),
    (v_org, 'EMP-005', 'Fatima Zahra Tazi',  v_dep_ach,   v_buy_id,   'Responsable Achats & Sourcing', 75, 'active', '+212 661 50 60 70', 'achats@usineflow.ma',       'BB901234', '50291823'),
    (v_org, 'EMP-006', 'Hassan Moutawakkil', v_dep_prod,  v_op_id,    'Chef d''Équipe Laser & Tôlerie', 50, 'active', '+212 661 60 70 80', 'operateur@usineflow.ma',    'BH123456', '60192834'),
    (v_org, 'EMP-007', 'Karim Saidi',        v_dep_prod,  null,       'Opérateur Presse Plieuse CNC', 42, 'active', '+212 661 70 80 90', 'k.saidi@atlas-industrie.ma', 'BA345678', '70291845'),
    (v_org, 'EMP-008', 'Amina Benali',       v_dep_prod,  null,       'Soudeuse TIG & Assemblage', 45, 'active', '+212 661 80 90 01', 'a.benali@atlas-industrie.ma', 'BF678901', '80192856'),
    (v_org, 'EMP-009', 'Omar Filali',        v_dep_log,   null,       'Cariste & Préparateur Flux', 38, 'active', '+212 661 90 01 12', 'o.filali@atlas-industrie.ma', 'BM234567', '90291867')
  on conflict (organization_id, code) do update set full_name = excluded.full_name, position = excluded.position, hourly_cost = excluded.hourly_cost;

  select id into v_emp_op      from public.employees where organization_id = v_org and code = 'EMP-006';
  select id into v_emp_pli     from public.employees where organization_id = v_org and code = 'EMP-007';
  select id into v_emp_soud    from public.employees where organization_id = v_org and code = 'EMP-008';
  select id into v_emp_cariste from public.employees where organization_id = v_org and code = 'EMP-009';

  -- Employee Skills
  insert into public.employee_skills (organization_id, employee_id, skill_id, level)
  values
    (v_org, v_emp_op,      v_sk_laser, 5),
    (v_org, v_emp_op,      v_sk_pli,   4),
    (v_org, v_emp_pli,     v_sk_pli,   5),
    (v_org, v_emp_soud,    v_sk_soud,  5),
    (v_org, v_emp_cariste, v_sk_caces, 5)
  on conflict (employee_id, skill_id) do update set level = excluded.level;

  -- --------------------------------------------------------------------------
  -- 18. Finance: Cost Centers & Expenses
  -- --------------------------------------------------------------------------
  insert into public.cost_centers (organization_id, code, name, kind, department_id)
  values
    (v_org, 'CC-PROD-01', 'Atelier Découpe & Tôlerie Industrielle', 'department', v_dep_prod),
    (v_org, 'CC-PROD-02', 'Ligne Peinture Époxy & Finition',       'department', v_dep_prod),
    (v_org, 'CC-LOG',     'Logistique, Expédition & Magasin',       'department', v_dep_log),
    (v_org, 'CC-MAINT',   'Maintenance & Consommables Énergie',    'department', v_dep_maint),
    (v_org, 'CC-ADMIN',   'Direction & Frais Généraux',             'department', v_dep_dir)
  on conflict (organization_id, code) do update set name = excluded.name;

  select id into v_cc_prod1 from public.cost_centers where organization_id = v_org and code = 'CC-PROD-01';
  select id into v_cc_log   from public.cost_centers where organization_id = v_org and code = 'CC-LOG';
  select id into v_cc_maint from public.cost_centers where organization_id = v_org and code = 'CC-MAINT';

  if not exists (select 1 from public.expenses where organization_id = v_org and description = 'Transport express navette Casablanca - Tanger Med') then
    insert into public.expenses (organization_id, category, description, amount, spent_on, partner_id, cost_center_id, paid, method, status)
    values
      (v_org, 'transport',   'Transport express navette Casablanca - Tanger Med', 1450, current_date - interval '5 days', v_sup_msteel, v_cc_log,   true, 'bank_transfer', 'posted'),
      (v_org, 'supplies',    'Recharge bouteilles gaz Argon pur soudure TIG (Air Liquide)', 2800, current_date - interval '3 days', v_sup_qgm,    v_cc_prod1, true, 'bank_transfer', 'posted'),
      (v_org, 'maintenance', 'Contrôle réglementaire périodique Bureau Veritas ponts roulants', 4500, current_date - interval '1 day',  null,         v_cc_maint, true, 'cheque',        'posted');
  end if;

  -- Reset bypass and jwt session
  perform set_config('app.bypass_lock', 'off', true);
  perform set_config('request.jwt.claim.sub', '', true);

end $$;
