-- pgTAP: deleting an auth user (what quickgob-delete-account does) succeeds and leaves nothing behind.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email, aud, role)
values ('00000000-0000-0000-0000-0000000000d1', 'delete-me@test.local', 'authenticated', 'authenticated');

-- Every public table that points at auth.users must cascade, or deleteUser() fails / orphans rows.
select is(
  (select count(*)::int
     from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and n.nspname = 'public' and c.confdeltype <> 'c'),
  0,
  'every public foreign key to auth.users is ON DELETE CASCADE'
);

select lives_ok($$delete from auth.users where id = '00000000-0000-0000-0000-0000000000d1'$$, 'the user can be deleted');
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-0000000000d1'), 0, 'the user is gone');
select is((select count(*)::int from auth.identities where user_id = '00000000-0000-0000-0000-0000000000d1'), 0, 'no identities are left');

select * from finish();
rollback;
