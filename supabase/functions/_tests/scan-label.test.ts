// quickgob-scan-label against the local stack, with a fake Claude (ANTHROPIC_BASE_URL in .env.test).
import { assert, assertEquals, assertMatch } from 'jsr:@std/assert@1';
import { call, dropUser, exhaustLimit, FAKE_CLAUDE_PORT, JPEG, makeUser } from './helpers.ts';

const SLUG = 'quickgob-scan-label';

type Mode =
  | { kind: 'reading'; reading: Record<string, unknown> }
  | { kind: 'refusal' }
  | { kind: 'error'; status: number }
  | { kind: 'hang' };

const reading = (over: Record<string, unknown> = {}) => ({
  is_food_label: true,
  is_readable: true,
  ingredients_text: 'Carbonated Water, Cane Sugar, Citric Acid',
  ingredients_complete: true,
  total_sugars_g: 39,
  added_sugars_g: 39,
  quantity_basis: 'per_serving',
  serving_size_text: '1 can (355 mL)',
  abv_text: null,
  ...over,
});

let mode: Mode = { kind: 'reading', reading: reading() };
let claudeCalls = 0;

function message(text: string, stop_reason = 'end_turn') {
  return Response.json({
    id: 'msg_test', type: 'message', role: 'assistant', model: 'test-model',
    content: stop_reason === 'refusal' ? [] : [{ type: 'text', text }],
    stop_reason, stop_sequence: null, usage: { input_tokens: 1200, output_tokens: 80 },
  });
}

async function fakeClaude(req: Request): Promise<Response> {
  claudeCalls++;
  await req.text();
  switch (mode.kind) {
    case 'reading':
      return message(JSON.stringify(mode.reading));
    case 'refusal':
      return message('', 'refusal');
    case 'error':
      return Response.json({ type: 'error', error: { type: 'invalid_request_error', message: 'test error' } }, { status: mode.status });
    case 'hang':
      // Never answers; returns once the function gives up and drops the connection.
      await new Promise<void>((resolve) => {
        req.signal.addEventListener('abort', () => resolve());
        setTimeout(resolve, 30_000);
      });
      return new Response(null, { status: 504 });
    default: {
      const never: never = mode;
      throw new Error(`unknown mode ${JSON.stringify(never)}`);
    }
  }
}

Deno.test('quickgob-scan-label', async (t) => {
  const server = Deno.serve({ hostname: '0.0.0.0', port: FAKE_CLAUDE_PORT, onListen: () => {} }, fakeClaude);
  const user = await makeUser();
  try {
    await t.step('rejects GET', async () => {
      assertEquals((await call(SLUG, { method: 'GET', token: user.token })).status, 405);
    });

    await t.step('rejects a caller with no token', async () => {
      assertEquals((await call(SLUG, { body: { image: JPEG } })).status, 401);
    });

    await t.step('bad image: body is not JSON', async () => {
      const r = await call(SLUG, { token: user.token, rawBody: 'not json' });
      assertEquals(r.status, 400);
      assertEquals(r.json?.error, 'Body must be JSON');
    });

    for (const [name, image] of [
      ['missing', undefined],
      ['not a string', 12345],
      ['too short', '/9j/AAAA'],
      ['a PNG', 'iVBORw0KGgo' + 'A'.repeat(200)],
      ['not base64', '/9j/' + '!@#$%^&*'.repeat(30)],
      ['over the size cap', '/9j/' + 'A'.repeat(6_000_000)],
    ] as const) {
      await t.step(`bad image: ${name} -> 400, Claude never called`, async () => {
        const before = claudeCalls;
        const r = await call(SLUG, { token: user.token, body: { image } });
        assertEquals(r.status, 400);
        assertEquals(r.json?.error, 'Send a JPEG photo as base64 in "image"');
        assertEquals(claudeCalls, before);
      });
    }

    await t.step('a readable label comes back with the rules verdict and lists', async () => {
      mode = { kind: 'reading', reading: reading() };
      const r = await call(SLUG, { token: user.token, body: { image: JPEG, scan_id: 'fn-test' } });
      assertEquals(r.status, 200, r.text);
      const result = r.json?.result as Record<string, unknown>;
      assertEquals(result.verdict, 'UGLY');
      assertEquals(result.addedSugars, ['Cane Sugar', '39 g added per serving']);
      assertEquals(result.sweeteners, []);
      assert(r.json?.timing, 'timing is echoed back');
    });

    await t.step('not a food label -> 422', async () => {
      mode = { kind: 'reading', reading: reading({ is_food_label: false, ingredients_text: null }) };
      const r = await call(SLUG, { token: user.token, body: { image: JPEG } });
      assertEquals(r.status, 422);
      assertMatch(String(r.json?.error), /doesn't look like a food label/);
    });

    await t.step('unreadable label -> 422 with code "unreadable"', async () => {
      mode = { kind: 'reading', reading: reading({ is_readable: false }) };
      const r = await call(SLUG, { token: user.token, body: { image: JPEG } });
      assertEquals(r.status, 422);
      assertEquals(r.json?.code, 'unreadable');
    });

    await t.step('cut-off list with nothing sweet seen -> 422 "unreadable" (retake)', async () => {
      mode = { kind: 'reading', reading: reading({ ingredients_text: 'Water, Salt', ingredients_complete: false, added_sugars_g: null }) };
      const r = await call(SLUG, { token: user.token, body: { image: JPEG } });
      assertEquals(r.status, 422);
      assertEquals(r.json?.code, 'unreadable');
    });

    await t.step('Claude refuses -> 422', async () => {
      mode = { kind: 'refusal' };
      const r = await call(SLUG, { token: user.token, body: { image: JPEG } });
      assertEquals(r.status, 422);
    });

    await t.step('Claude errors -> 502 "reader_unavailable"', async () => {
      mode = { kind: 'error', status: 400 };
      const r = await call(SLUG, { token: user.token, body: { image: JPEG } });
      assertEquals(r.status, 502);
      assertEquals(r.json?.code, 'reader_unavailable');
    });

    await t.step('Claude hangs -> 504 "reader_timeout" within the 10 s deadline (before the app gives up at 12 s)', async () => {
      mode = { kind: 'hang' };
      const started = Date.now();
      const r = await call(SLUG, { token: user.token, body: { image: JPEG } });
      const ms = Date.now() - started;
      assertEquals(r.status, 504, r.text);
      assertEquals(r.json?.code, 'reader_timeout');
      assert(ms >= 9_000 && ms < 12_000, `answered after ${ms} ms`);
    });

    await t.step('over the daily limit -> 429, Claude never called', async () => {
      mode = { kind: 'reading', reading: reading() };
      await exhaustLimit(`label:${user.id}`);
      const before = claudeCalls;
      const r = await call(SLUG, { token: user.token, body: { image: JPEG } });
      assertEquals(r.status, 429);
      assertEquals(r.json?.code, 'rate_limited');
      assertEquals(claudeCalls, before);
    });
  } finally {
    await dropUser(user);
    await server.shutdown();
  }
});
