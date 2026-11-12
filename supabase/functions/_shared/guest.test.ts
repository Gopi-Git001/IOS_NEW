import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';
import { guestIpKey, guestLimit, guestQuota, isGuest, reserveGuestCreation, reserveGuestModel, reserveScan } from './guest.ts';

const runtime = globalThis as unknown as { Deno?: unknown };
const previousDeno = runtime.Deno;
let settings: Record<string, string>;
beforeEach(() => {
  settings = { GUEST_SIGNIN: 'on', GUEST_IP_SALT: 'unit-fixture-only' };
  runtime.Deno = { env: { get: (key: string) => settings[key] } };
});
after(() => { runtime.Deno = previousDeno; });

function database(failed = false) {
  const rows = new Map<string, { key: string; window_start: string }>();
  const daily: string[] = [];
  const hits: Record<string, number> = {};
  const admin = {
    async rpc(_name: string, args: { p_key: string; p_limit: number }) {
      daily.push(args.p_key);
      hits[args.p_key] = (hits[args.p_key] ?? 0) + 1;
      return { data: hits[args.p_key] <= args.p_limit, error: failed ? {} : null };
    },
    from() {
      return {
        async insert(row: { key: string; window_start: string }) {
          if (failed) return { error: { code: '08006' } };
          const pk = `${row.key}|${row.window_start}`;
          if (rows.has(pk)) return { error: { code: '23505' } };
          rows.set(pk, row);
          return { error: null };
        },
        select() {
          return { async in(_field: string, keys: string[]) {
            return { data: [...rows.values()].filter((row) => keys.includes(row.key)), error: failed ? {} : null };
          } };
        },
      };
    },
  } as unknown as Parameters<typeof reserveScan>[0];
  return { admin, rows, daily };
}
const guest = { id: 'one', appMetadata: { guest: true } };

test('default is three; positive configurable limit is bounded to 100', () => {
  assert.equal(guestLimit(), 3);
  for (const bad of ['0', '-1', 'x', '1.5']) { settings.GUEST_SCAN_LIMIT = bad; assert.equal(guestLimit(), 3); }
  settings.GUEST_SCAN_LIMIT = '5'; assert.equal(guestLimit(), 5);
  settings.GUEST_SCAN_LIMIT = '999'; assert.equal(guestLimit(), 100);
});

test('only server-owned metadata or legacy reserved email classify a guest', () => {
  assert.equal(isGuest({ appMetadata: { guest: true } }), true);
  assert.equal(isGuest({ email: 'old@guest.sugarhunter.app' }), true);
  assert.equal(isGuest({ appMetadata: {}, email: 'user@gmail.com' }), false);
  assert.equal(isGuest({ userMetadata: { guest: false }, email: 'old@guest.sugarhunter.app' } as never), true);
});

test('three unified scans allowed, fourth denied before either paid call', async () => {
  const { admin, daily } = database();
  for (let i = 0; i < 3; i++) assert.equal(await reserveScan(admin, guest), null);
  const denial = await reserveScan(admin, guest);
  assert.equal(denial?.status, 403);
  assert.equal((await denial!.json()).code, 'guest_limit');
  assert.deepEqual(await guestQuota(admin, guest.id, 3), { limit: 3, remaining: 0 });
  assert.deepEqual(daily, []);
});

test('twenty concurrent scans cannot exceed three model pairs', async () => {
  const { admin, rows } = database();
  const allowed = (await Promise.all(Array.from({ length: 20 }, () => reserveScan(admin, guest)))).filter((r) => r === null);
  assert.equal(allowed.length, 3);
  assert.equal(rows.size, 6);
});

test('each legacy request spends a whole trial slot; all routes share a hard three-request ceiling', async () => {
  const { admin } = database();
  assert.equal(await reserveScan(admin, guest), null);
  assert.equal(await reserveScan(admin, guest, 'label'), null);
  assert.deepEqual(await guestQuota(admin, guest.id, 3), { limit: 3, remaining: 1 });
  assert.equal(await reserveScan(admin, guest, 'verdict'), null);
  assert.deepEqual(await guestQuota(admin, guest.id, 3), { limit: 3, remaining: 0 });
  assert.equal((await reserveScan(admin, guest))?.status, 403);
  assert.equal((await reserveScan(admin, guest, 'label'))?.status, 403);
  assert.equal((await reserveScan(admin, guest, 'verdict'))?.status, 403);
});

test('allowances are isolated by account and survive daily-window cleanup', async () => {
  const { admin, rows } = database();
  await reserveScan(admin, guest);
  for (const [pk, row] of rows) if (Date.parse(row.window_start) < Date.now() - 172_800_000) rows.delete(pk);
  assert.deepEqual(await guestQuota(admin, 'one', 3), { limit: 3, remaining: 2 });
  assert.deepEqual(await guestQuota(admin, 'other', 3), { limit: 3, remaining: 3 });
  assert.equal(rows.size, 2);
});

test('a disabled guest feature and a database failure both fail closed', async () => {
  const { admin, rows } = database();
  settings.GUEST_SIGNIN = 'off';
  assert.equal((await reserveScan(admin, guest))?.status, 403);
  assert.equal(rows.size, 0);
  settings.GUEST_SIGNIN = 'on';
  assert.equal((await reserveScan(database(true).admin, guest))?.status, 503);
  assert.equal(await guestQuota(database(true).admin, 'one', 3), null);
  await assert.rejects(reserveGuestModel(database(true).admin, 'one', 'label', 3));
});

test('normal Google accounts retain both existing daily counters', async () => {
  const { admin, daily, rows } = database();
  assert.equal(await reserveScan(admin, { id: 'google', email: 'user@gmail.com' }), null);
  assert.deepEqual(daily, ['label:google', 'verdict:google']);
  assert.equal(rows.size, 0);
});

test('normal legacy requests still debit only their requested daily model counter', async () => {
  const { admin, daily, rows } = database();
  const google = { id: 'google', email: 'user@gmail.com' };
  assert.equal(await reserveScan(admin, google, 'label'), null);
  assert.deepEqual(daily, ['label:google']);
  assert.equal(await reserveScan(admin, google, 'verdict'), null);
  assert.deepEqual(daily, ['label:google', 'verdict:google']);
  assert.equal(rows.size, 0);
});

test('status checks never reserve a scan', async () => {
  const { admin, rows, daily } = database();
  await guestQuota(admin, 'one', 3);
  await guestQuota(admin, 'one', 3);
  assert.equal(rows.size, 0);
  assert.deepEqual(daily, []);
});

test('IP key is keyed, normalized, contains no raw IP, and requires the ingress header', async () => {
  const header = (ip: string) => new Headers({ 'cf-connecting-ip': ip });
  const a = await guestIpKey(header('2001:db8::1'), 'unit-only');
  assert.equal(a, await guestIpKey(header('2001:0DB8:0:0:0:0:0:1'), 'unit-only'));
  assert.match(a!, /^guest:ip:[0-9a-f]{64}$/);
  assert.notEqual(a, await guestIpKey(header('2001:db8::1'), 'different-test-salt'));
  assert.equal(await guestIpKey(new Headers({ 'x-forwarded-for': '1.2.3.4' }), 'unit-only'), null);
  assert.equal(await guestIpKey(header('1.2.3.4'), undefined), null);
  assert.equal(await guestIpKey(header('malformed'), 'unit-only'), null);
});

test('IP creation limit short-circuits before spending the global allowance', async () => {
  const { admin, daily } = database();
  settings.GUEST_IP_HOURLY_LIMIT = '1';
  const headers = new Headers({ 'cf-connecting-ip': '192.0.2.1' });
  assert.equal(await reserveGuestCreation(admin, headers), null);
  assert.equal(await reserveGuestCreation(admin, headers), 'limited');
  assert.equal(daily.filter((key) => key === 'guest:create').length, 1);
  assert.equal(daily.filter((key) => key.startsWith('guest:ip:')).length, 2);
});

test('global guest cap spans IPs and creation fails closed without usable ingress or database', async () => {
  const { admin } = database();
  settings.GUEST_HOURLY_LIMIT = '1';
  assert.equal(await reserveGuestCreation(admin, new Headers({ 'cf-connecting-ip': '192.0.2.1' })), null);
  assert.equal(await reserveGuestCreation(admin, new Headers({ 'cf-connecting-ip': '192.0.2.2' })), 'limited');
  assert.equal(await reserveGuestCreation(admin, new Headers()), 'unavailable');
  assert.equal(await reserveGuestCreation(database(true).admin, new Headers({ 'cf-connecting-ip': '192.0.2.3' })), 'limited');
});
