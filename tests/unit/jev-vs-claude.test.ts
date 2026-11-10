// Every way Jev's fast verdict and the Claude reading (rules verdict + lists) can disagree, through
// combine() (what the screen shows) and readJevResponse() (where MIN_CONFIDENCE is applied). Pure: no network.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MIN_CONFIDENCE, readJevResponse } from '../../supabase/functions/_shared/jev.ts';
import { combine, quickHeadline, UNCLEAR } from '../../src/lib/combine.ts';
import type { JevVerdict, ScanResult, Verdict } from '../../src/types.ts';

const VERDICTS: Verdict[] = ['CLEAN', 'OKAY', 'BAD'];
const NOT_A_LABEL = "That doesn't look like a food label. Fit the ingredient list in the box.";
const READ_FAILED = "Couldn't read the label. Try again.";

const READINGS: Record<Verdict, ScanResult> = {
  CLEAN: { verdict: 'CLEAN', headline: 'No added sugar', naturalSugars: ['Milk'], addedSugars: [], sweeteners: [], note: 'Great pick, no added sugar' },
  OKAY: { verdict: 'OKAY', headline: 'Gentler sweetener', naturalSugars: [], addedSugars: [], sweeteners: ['Stevia'], note: 'The gentlest option, but still a sweetener' },
  BAD: { verdict: 'BAD', headline: 'Added sugar', naturalSugars: [], addedSugars: ['Cane Sugar'], sweeteners: [], note: 'Scan the nutrition panel to see the grams' },
};

const decided = (verdict: Verdict, confidence = 0.9): JevVerdict => ({ status: 'decided', verdict, confidence, model: 'jev' });

/** Jev outcomes where the rules verdict should decide instead. */
const JEV_NOT_DECIDING: { name: string; jev: JevVerdict }[] = [
  ...VERDICTS.map((v) => ({ name: `unsure (leaning ${v})`, jev: { status: 'unsure', verdict: v, confidence: 0.3, model: 'jev' } as JevVerdict })),
  { name: 'unsure (no confidence)', jev: { status: 'unsure', verdict: null, confidence: null, model: 'jev' } },
  { name: 'unavailable', jev: { status: 'unavailable', reason: 'HTTP 503' } },
  { name: 'not a label', jev: { status: 'not_a_label', model: 'jev' } },
  { name: 'unreadable', jev: { status: 'unreadable', model: 'jev' } },
];

function done(u: ReturnType<typeof combine>) {
  assert.equal(u?.status, 'done', `expected a result, got ${JSON.stringify(u)}`);
  if (u?.status !== 'done') throw new Error('unreachable');
  return u;
}

function error(u: ReturnType<typeof combine>) {
  assert.equal(u?.status, 'error', `expected an error, got ${JSON.stringify(u)}`);
  if (u?.status !== 'error') throw new Error('unreachable');
  return u.message;
}

describe('Jev decided, Claude read the label', () => {
  for (const j of VERDICTS) {
    for (const r of VERDICTS) {
      // Safety floor: the rules BAD reading has added sugar, so Jev's CLEAN can't stand.
      const shown = j === 'CLEAN' && r === 'BAD' ? r : j;
      const rulesWin = shown === r;
      test(`Jev ${j} vs rules ${r}: ${shown} shows${rulesWin ? ' with the rules headline' : ', lists kept, rules headline and note dropped'}`, () => {
        const u = done(combine(decided(j), READINGS[r], false));
        assert.equal(u.result.verdict, shown);
        assert.equal(u.listsPending, false);
        assert.equal(u.listsRetry, undefined);
        assert.deepEqual(u.result.naturalSugars, READINGS[r].naturalSugars);
        assert.deepEqual(u.result.addedSugars, READINGS[r].addedSugars);
        assert.deepEqual(u.result.sweeteners, READINGS[r].sweeteners);
        assert.equal(u.result.headline, rulesWin ? READINGS[r].headline : quickHeadline[shown]);
        assert.equal(u.result.note, rulesWin ? READINGS[r].note : undefined);
      });
    }
  }
});

describe('Jev not deciding, Claude read the label: the rules verdict shows', () => {
  for (const { name, jev } of JEV_NOT_DECIDING) {
    for (const r of VERDICTS) {
      test(`Jev ${name} vs rules ${r}`, () => {
        const u = done(combine(jev, READINGS[r], false));
        assert.deepEqual(u.result, READINGS[r]);
        assert.equal(u.listsPending, false);
      });
    }
  }

  test('Jev has not answered and its 6 s have passed: the reading shows on its own', () => {
    assert.deepEqual(done(combine(null, READINGS.BAD, false, false, false, true)).result, READINGS.BAD);
  });
});

describe('Jev decided, Claude has not read the label (yet)', () => {
  for (const j of VERDICTS) {
    test(`Jev ${j}, reading still running: keep the loading state`, () => {
      assert.equal(combine(decided(j), null, false), null);
    });

    test(`Jev ${j}, reading timed out: Jev's verdict, Retry offered`, () => {
      const u = done(combine(decided(j), null, true, false, true));
      assert.equal(u.result.verdict, j);
      assert.equal(u.result.headline, quickHeadline[j]);
      assert.equal(u.listsPending, false);
      assert.equal(u.listsRetry, true);
      assert.equal(u.result.note, undefined);
    });

    test(`Jev ${j}, reading failed for good: Jev's verdict, no Retry`, () => {
      const u = done(combine(decided(j), null, true, false, false));
      assert.equal(u.result.verdict, j);
      assert.equal(u.listsRetry, undefined);
      assert.equal(u.result.note, "Couldn't list the sugars this time");
    });

    test(`Jev ${j}, Claude says unreadable: no verdict at all`, () => {
      assert.equal(error(combine(decided(j), null, true, true)), UNCLEAR);
    });
  }
});

describe('neither side has a verdict', () => {
  test('Jev not deciding and the reading still running: keep waiting', () => {
    for (const { jev } of JEV_NOT_DECIDING) assert.equal(combine(jev, null, false), null);
    assert.equal(combine(null, null, false), null);
    assert.equal(combine(null, null, false, false, false, true), null);
  });

  test('Jev says not a label and the reading failed: "not a food label"', () => {
    assert.equal(error(combine({ status: 'not_a_label', model: 'jev' }, null, true)), NOT_A_LABEL);
  });

  test('Jev says unreadable and the reading failed: ask for a clearer photo', () => {
    assert.equal(error(combine({ status: 'unreadable', model: 'jev' }, null, true)), UNCLEAR);
  });

  test('Jev unsure or down and the reading failed: generic read failure', () => {
    for (const jev of JEV_NOT_DECIDING.filter((j) => j.jev.status === 'unsure' || j.jev.status === 'unavailable')) {
      assert.equal(error(combine(jev.jev, null, true)), READ_FAILED, jev.name);
    }
  });

  test('Claude says unreadable overrides every Jev outcome', () => {
    for (const { jev } of JEV_NOT_DECIDING) assert.equal(error(combine(jev, null, true, true)), UNCLEAR);
    assert.equal(error(combine(null, null, true, true)), UNCLEAR);
  });

  test('reading failed before Jev answered: keep waiting for Jev, then fail once its 6 s pass', () => {
    assert.equal(combine(null, null, true, false, true), null);
    assert.equal(error(combine(null, null, true, false, true, true)), READ_FAILED);
  });
});

describe('arrival order: one verdict, never changed', () => {
  test('Jev first, then a disagreeing reading: nothing shows until both are in, then one verdict', () => {
    assert.equal(combine(decided('OKAY'), null, false), null);
    assert.equal(done(combine(decided('OKAY'), READINGS.BAD, false)).result.verdict, 'OKAY');
  });

  test('reading first, Jev still pending: no rules verdict is shown yet', () => {
    assert.equal(combine(null, READINGS.BAD, false), null);
  });

  test('Jev CLEAN + Cane Sugar in the reading: shows BAD, not CLEAN', () => {
    assert.equal(done(combine(decided('CLEAN'), READINGS.BAD, false)).result.verdict, 'BAD');
  });
});

describe('MIN_CONFIDENCE boundary (server reply -> combine)', () => {
  const reply = (choice: Verdict, confidence: number | undefined) => ({
    model: 'jev-latest',
    answers: { is_food_label: { noul: 0.99 }, is_legible: { noul: 0.99 }, verdict: { choice, confidence } },
  });

  test(`Jev at exactly ${MIN_CONFIDENCE} decides, even against the rules`, () => {
    const jev = readJevResponse(reply('BAD', MIN_CONFIDENCE));
    assert.equal(jev.status, 'decided');
    assert.equal(done(combine(jev, READINGS.CLEAN, false)).result.verdict, 'BAD');
  });

  test(`Jev just under ${MIN_CONFIDENCE} is unsure: the rules verdict wins`, () => {
    const jev = readJevResponse(reply('CLEAN', MIN_CONFIDENCE - 0.001));
    assert.equal(jev.status, 'unsure');
    assert.equal(done(combine(jev, READINGS.OKAY, false)).result.verdict, 'OKAY');
  });

  test('Jev with no confidence is unsure: the rules verdict wins', () => {
    const jev = readJevResponse(reply('BAD', undefined));
    assert.equal(jev.status, 'unsure');
    assert.equal(done(combine(jev, READINGS.CLEAN, false)).result.verdict, 'CLEAN');
  });

  test('Jev says not a label but Claude read one: the reading shows', () => {
    const jev = readJevResponse({ ...reply('CLEAN', 0.9), answers: { ...reply('CLEAN', 0.9).answers, is_food_label: { noul: 0.1 } } });
    assert.equal(jev.status, 'not_a_label');
    assert.equal(done(combine(jev, READINGS.OKAY, false)).result.verdict, 'OKAY');
  });

  test('Jev says illegible but Claude read it: the reading shows', () => {
    const jev = readJevResponse({ ...reply('CLEAN', 0.9), answers: { ...reply('CLEAN', 0.9).answers, is_legible: { noul: 0.2 } } });
    assert.equal(jev.status, 'unreadable');
    assert.equal(done(combine(jev, READINGS.BAD, false)).result.verdict, 'BAD');
  });

  test('a malformed Jev reply (old UGLY, or junk) is unavailable: the rules verdict wins', () => {
    for (const choice of ['GOOD', 'UGLY']) {
      const jev = readJevResponse({ answers: { verdict: { choice, confidence: 0.99 } } });
      assert.equal(jev.status, 'unavailable');
      assert.equal(done(combine(jev, READINGS.OKAY, false)).result.verdict, 'OKAY');
    }
  });
});
