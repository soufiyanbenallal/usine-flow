-- Minimal emulation of the Supabase pieces our migrations rely on (roles, auth.users/auth.uid(), storage), so the
-- schema can be tested on a vanilla Postgres. Not used on real Supabase projects.
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; grant usage on schema auth to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated;
create schema storage; grant usage on schema storage to anon, authenticated;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name, '/') $$;
-- default privileges like Supabase: new public objects are reachable by the API roles (migrations then revoke/grant explicitly)
alter default privileges in schema public grant execute on functions to anon, authenticated;

-- test helpers
create schema tests;
grant usage on schema tests to authenticated, anon;
create function tests.new_user(p_email text, p_meta jsonb default '{}') returns uuid language plpgsql as $$
declare uid uuid := gen_random_uuid();
begin insert into auth.users (id, email, raw_user_meta_data) values (uid, p_email, p_meta); return uid; end $$;
create function tests.act_as(uid uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', uid::text, true); execute 'set local role authenticated'; end $$;
create function tests.act_as_anon() returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', '', true); execute 'set local role anon'; end $$;
create function tests.reset() returns void language plpgsql as $$ begin execute 'reset role'; end $$;
create function tests.org_of(uid uuid) returns text language plpgsql as $$ declare r text; begin select organization_id into r from public.memberships where user_id = uid; return r; end $$;
-- true when `sql` raises (RLS / constraint / permission); false when it succeeds
create function tests.fails(sql text) returns boolean language plpgsql as $$
begin execute sql; return false; exception when others then return true; end $$;
-- number of rows `sql` affects/returns, as the current role
create function tests.count(sql text) returns bigint language plpgsql as $$
declare n bigint; begin execute 'select count(*) from (' || sql || ') t' into n; return n; end $$;
grant execute on all functions in schema tests to authenticated, anon;
