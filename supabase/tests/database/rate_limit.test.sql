-- pgTAP: public.quickgob_rate_limits is reachable only by the service role (Edge Functions).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

select has_table('public', 'quickgob_rate_limits', 'rate limit table exists');
select is((select relrowsecurity from pg_class where oid = 'public.quickgob_rate_limits'::regclass), true, 'RLS is on');
select is((select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'quickgob_rate_limits'), 0, 'no policies, so RLS denies every API role');
select table_privs_are('public', 'quickgob_rate_limits', 'anon', array[]::text[], 'anon has no table privileges');
select table_privs_are('public', 'quickgob_rate_limits', 'authenticated', array[]::text[], 'authenticated has no table privileges');
select function_privs_are('public', 'quickgob_rate_limit', array['text', 'integer', 'integer'], 'anon', array[]::text[], 'anon cannot call the limiter');
select function_privs_are('public', 'quickgob_rate_limit', array['text', 'integer', 'integer'], 'authenticated', array[]::text[], 'authenticated cannot call the limiter');
select function_privs_are('public', 'quickgob_rate_limit', array['text', 'integer', 'integer'], 'service_role', array['EXECUTE'], 'service_role can call the limiter');
select is((select prosecdef from pg_proc where oid = 'public.quickgob_rate_limit(text,integer,integer)'::regprocedure), false, 'limiter is security invoker');
select is((select proconfig from pg_proc where oid = 'public.quickgob_rate_limit(text,integer,integer)'::regprocedure), array['search_path=""'], 'limiter pins an empty search_path');

-- A signed-in user cannot read the counters or bump them.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok('select * from public.quickgob_rate_limits', '42501', null, 'authenticated cannot read counters');
select throws_ok($$select public.quickgob_rate_limit('label:x', 60, 1)$$, '42501', null, 'authenticated cannot call the limiter');
reset role;

-- As the Edge Functions: hits up to the limit pass, the next one is refused, keys are independent.
set local role service_role;
select results_eq(
  $$select public.quickgob_rate_limit('test:a', 3600, 3) from generate_series(1, 3)$$,
  $$values (true), (true), (true)$$,
  'hits up to the limit are allowed'
);
select is(public.quickgob_rate_limit('test:a', 3600, 3), false, 'the hit over the limit is refused');
select is(public.quickgob_rate_limit('test:b', 3600, 3), true, 'another key has its own count');
select is((select hits from public.quickgob_rate_limits where key = 'test:a'), 4, 'refused hits are still counted');
reset role;

select * from finish();
rollback;
