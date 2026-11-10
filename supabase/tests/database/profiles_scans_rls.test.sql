-- pgTAP: the contract for public.profiles and public.scans once they exist. Today there are no such
-- tables (name, settings and history live on the device; see src/lib/account.ts and AGENTS.md), so
-- these run as TODO: reported, never failing the run. Catalog checks only, so missing tables can't
-- abort the file. Add row-level isolation tests (user A can't see user B) when the tables land.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select todo('profiles and scans tables are not in any migration yet', 10);

select has_table('public', 'profiles', 'profiles table exists');
select is((select relrowsecurity from pg_class where oid = to_regclass('public.profiles')), true, 'profiles has RLS on');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'profiles' and qual like '%auth.uid()%'), 'profiles policies are scoped to auth.uid()');
select ok(exists(
  select 1 from pg_constraint
   where conrelid = to_regclass('public.profiles') and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c'
), 'profiles rows are deleted with their user');
select table_privs_are('public', 'profiles', 'anon', array[]::text[], 'anon has no access to profiles');

select has_table('public', 'scans', 'scans table exists');
select is((select relrowsecurity from pg_class where oid = to_regclass('public.scans')), true, 'scans has RLS on');
select ok((select count(*) > 0 from pg_policies where schemaname = 'public' and tablename = 'scans' and qual like '%auth.uid()%'), 'scans policies are scoped to auth.uid()');
select ok(exists(
  select 1 from pg_constraint
   where conrelid = to_regclass('public.scans') and contype = 'f' and confrelid = 'auth.users'::regclass and confdeltype = 'c'
), 'scans rows are deleted with their user');
select table_privs_are('public', 'scans', 'anon', array[]::text[], 'anon has no access to scans');

select * from finish();
rollback;
