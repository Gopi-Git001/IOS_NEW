/**
 * Google sign-in flow helpers: a single-flight guard (no second sign-in while one is running) and
 * secret-free descriptions of auth redirect URLs for dev logs. Pure (no React Native imports) so
 * they can be unit-tested.
 */

export type SingleFlight = {
  /** True while a task started by run() has not settled yet. */
  readonly running: boolean;
  /**
   * Runs `task` unless one is already running. A call that arrives while one is running returns
   * `whenBusy` at once (the task is not started) and calls `onBusy`. The guard is released when
   * the task settles, whether it resolved or threw.
   */
  run<T>(task: () => Promise<T>, whenBusy: T, onBusy?: () => void): Promise<T>;
  /** Resolves once no task is running (at once when idle). Never rejects. */
  whenIdle(): Promise<void>;
};

export function createSingleFlight(): SingleFlight {
  let running: Promise<unknown> | null = null;
  return {
    get running() {
      return running !== null;
    },
    async run<T>(task: () => Promise<T>, whenBusy: T, onBusy?: () => void): Promise<T> {
      if (running) {
        onBusy?.();
        return whenBusy;
      }
      const current = task();
      running = current;
      try {
        return await current;
      } finally {
        if (running === current) running = null;
      }
    },
    async whenIdle() {
      while (running) {
        try {
          await running;
        } catch {}
      }
    },
  };
}

export type ExchangeResult =
  | { status: 'ok'; duplicate?: boolean }
  | { status: 'failed'; message: string; duplicate?: boolean }
  | { status: 'skipped'; reason: string };

/** Remembers which codes were already sent (survives a JS reload when given AsyncStorage). */
export type UsedCodeStore = {
  has(fingerprint: string): Promise<boolean>;
  add(fingerprint: string): Promise<void>;
};

export type CodeExchanger = {
  /** True while an exchange is in flight. */
  readonly running: boolean;
  /**
   * Trades a PKCE code for a session exactly once. The same code while its exchange is in flight
   * gets that exchange's result (marked duplicate, no second request); a code already used (in
   * this run or, with a store, before a reload) is skipped. A different code while one is in
   * flight is skipped too: both would read the same stored verifier.
   */
  exchange(code: string): Promise<ExchangeResult>;
};

/**
 * Short non-reversible tag for a one-time code (FNV-1a, 32 bit), so "already used" can be stored
 * without storing the code itself.
 */
export function codeFingerprint(code: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < code.length; i++) {
    hash ^= code.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${code.length}-${hash.toString(16)}`;
}

/** `run` returns an error message, or null when the session was set. */
export function createCodeExchanger(run: (code: string) => Promise<string | null>, store?: UsedCodeStore): CodeExchanger {
  const used = new Set<string>();
  let inFlight: { fingerprint: string; result: Promise<ExchangeResult> } | null = null;
  const start = async (fingerprint: string, code: string): Promise<ExchangeResult> => {
    try {
      if (store && (await store.has(fingerprint).catch(() => false))) return { status: 'skipped', reason: 'code already used' };
      await store?.add(fingerprint).catch(() => {});
      const error = await run(code);
      return error ? { status: 'failed', message: error } : { status: 'ok' };
    } catch (e) {
      return { status: 'failed', message: safeMessage(e) };
    }
  };
  return {
    get running() {
      return inFlight !== null;
    },
    async exchange(code: string): Promise<ExchangeResult> {
      const fingerprint = codeFingerprint(code);
      if (inFlight) {
        if (inFlight.fingerprint !== fingerprint) return { status: 'skipped', reason: 'another exchange in progress' };
        const shared = await inFlight.result;
        return shared.status === 'skipped' ? shared : { ...shared, duplicate: true };
      }
      if (used.has(fingerprint)) return { status: 'skipped', reason: 'code already used' };
      used.add(fingerprint);
      const current = { fingerprint, result: start(fingerprint, code) };
      inFlight = current;
      try {
        return await current.result;
      } finally {
        if (inFlight === current) inFlight = null;
      }
    },
  };
}

/** "incoming link exchange ok|failed: <message>|skipped (<reason>)" — never the code itself. */
export function describeIncomingExchange(result: ExchangeResult): string {
  if (result.status === 'ok') return `incoming link exchange ok${result.duplicate ? ' (shared with the running flow)' : ''}`;
  if (result.status === 'failed') return `incoming link exchange failed: ${safeMessage(result.message)}`;
  return `incoming link exchange skipped (${cleanText(result.reason) ?? 'unknown'})`;
}

export type IncomingLinkAction =
  | { kind: 'ignore' }
  | { kind: 'error'; message: string; detail: string }
  | { kind: 'no-code' }
  | { kind: 'code'; code: string };

/**
 * What to do with a link that opened the app (Android Expo Go reloads the app when the sign-in
 * return link arrives, so the running flow never sees it). Not a sign-in link: ignore. ?error=:
 * show it (access_denied reads as cancelled). ?code=: exchange it.
 */
export function incomingLinkAction(url: string | null | undefined): IncomingLinkAction {
  if (!isAuthLink(url)) return { kind: 'ignore' };
  const params = paramsOf(url as string);
  const error = params.get('error') || params.get('error_code');
  if (error) {
    const detail = cleanText(params.get('error_description')) ?? cleanText(error) ?? 'unknown';
    return {
      kind: 'error',
      message: error === 'access_denied' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Try again.',
      detail,
    };
  }
  const code = params.get('code');
  return code ? { kind: 'code', code } : { kind: 'no-code' };
}

/** What App.tsx has applied so far: whether any auth event arrived, and whether a session is set. */
export type SessionGate = { eventSeen: boolean; hasSession: boolean | undefined };

export type SessionDecision = { apply: true } | { apply: false; reason: string };

/**
 * Whether a session update may replace the app's session. getSession() and INITIAL_SESSION report
 * the state at start-up; a SIGNED_IN from a code exchange can land before them. They must never
 * overwrite a newer session with a stale "no session" (that showed the sign-in page again).
 * - initial-getSession: only while no auth event has been applied.
 * - INITIAL_SESSION without a session: not when a session is already set.
 * - Every other event (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED…) applies.
 */
export function sessionDecision(gate: SessionGate, path: SessionPath, hasSession: boolean): SessionDecision {
  if (path === 'initial-getSession' && gate.eventSeen) return { apply: false, reason: 'an auth event already set it' };
  if (path === 'auth-event:INITIAL_SESSION' && !hasSession && gate.hasSession === true) {
    return { apply: false, reason: 'stale no-session' };
  }
  return { apply: true };
}

/** The gate after an update on `path` was applied. */
export function nextGate(gate: SessionGate, path: SessionPath, hasSession: boolean): SessionGate {
  return { eventSeen: gate.eventSeen || path.startsWith('auth-event:'), hasSession };
}

/** "kept app session (initial-getSession): ignored no (an auth event already set it)". */
export function describeSessionKept(path: SessionPath, session: unknown, reason: string): string {
  return `kept app session (${safeSessionPath(path)}): ignored ${yesNo(session)} (${cleanText(reason) ?? 'unknown'})`;
}

export type AuthUrlInfo = {
  /** A ?code= / #code= value is present (the value itself is never kept). */
  code: boolean;
  /** #access_token= (implicit-style tokens) is present (the value itself is never kept). */
  tokens: boolean;
  /** error or error_code text, or null. */
  error: string | null;
  /** error_description text, or null. */
  errorDescription: string | null;
};

const MAX_TEXT = 200;

/**
 * Error text safe for a log line: one line, no long blobs, and any URL inside it cut before its
 * query / fragment (they can hold a code or tokens).
 */
export function safeMessage(value: unknown): string {
  const raw = value instanceof Error ? value.message : typeof value === 'string' ? value : 'unknown';
  return cleanText(raw) ?? 'unknown';
}

function cleanText(value: string | null): string | null {
  if (value == null) return null;
  const text = value
    .replace(/([a-z][a-z0-9+.-]*:\/\/[^\s?#]*)[?#]\S*/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

function paramsOf(url: string): URLSearchParams {
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : url.slice(hashAt + 1);
  const queryAt = beforeHash.indexOf('?');
  const query = queryAt < 0 ? '' : beforeHash.slice(queryAt + 1);
  try {
    return new URLSearchParams([query, hash].filter(Boolean).join('&'));
  } catch {
    return new URLSearchParams();
  }
}

/** What an auth redirect URL carries, from its query AND #fragment. Never keeps the code or tokens. */
export function classifyAuthUrl(url: string | null | undefined): AuthUrlInfo {
  const params = paramsOf(typeof url === 'string' ? url : '');
  return {
    code: !!params.get('code'),
    tokens: !!params.get('access_token'),
    error: cleanText(params.get('error') || params.get('error_code')),
    errorDescription: cleanText(params.get('error_description')),
  };
}

/** "code=yes|no error=<text|none> error_description=<text|none>[ tokens=yes]" for the [auth] logs. */
export function describeAuthUrl(url: string | null | undefined): string {
  const info = classifyAuthUrl(url);
  const parts = [
    `code=${info.code ? 'yes' : 'no'}`,
    `error=${info.error ?? 'none'}`,
    `error_description=${info.errorDescription ?? 'none'}`,
  ];
  if (info.tokens) parts.push('tokens=yes');
  return parts.join(' ');
}

/**
 * True for the sign-in return link: path /--/auth (Expo Go: exp(s)://<host>/--/auth) or the app
 * scheme's auth (reallabel://auth). Query and fragment are ignored.
 */
export function isAuthLink(url: string | null | undefined): boolean {
  if (typeof url !== 'string') return false;
  const bare = url.trim().split(/[?#]/)[0];
  const rest = bare.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '');
  return rest === 'auth' || rest.startsWith('auth/') || /\/--\/auth(\/|$)/.test(rest);
}

const yesNo = (value: unknown) => (value ? 'yes' : 'no');

/** A Supabase auth event name (SIGNED_IN, TOKEN_REFRESHED…) safe for a log line; anything else is "unknown". */
export function authEventName(event: unknown): string {
  return typeof event === 'string' && /^[A-Z_]{1,40}$/.test(event) ? event : 'unknown';
}

/** "getSession result: session yes|no[ error=<text>]" — presence only, never tokens or ids. */
export function describeGetSession(session: unknown, error?: unknown): string {
  return `getSession result: session ${yesNo(session)}${error ? ` error=${safeMessage(error)}` : ''}`;
}

/** "auth event SIGNED_IN session: yes|no" — the event name and presence only. */
export function describeAuthEvent(event: unknown, session: unknown): string {
  return `auth event ${authEventName(event)} session: ${yesNo(session)}`;
}

/** Code paths that set the app's session state (App.tsx). */
export type SessionPath = 'initial-getSession' | `auth-event:${string}` | 'sign-out' | 'delete' | 'other';

/** "set app session (auth-event:SIGNED_IN): yes|no" — which code path and presence only. */
export function describeSessionSet(path: SessionPath, session: unknown): string {
  return `set app session (${safeSessionPath(path)}): ${yesNo(session)}`;
}

function safeSessionPath(path: SessionPath): string {
  return path.startsWith('auth-event:') ? `auth-event:${authEventName(path.slice('auth-event:'.length))}` : path;
}

export type FlowOutcome = 'signed-in' | 'cancelled' | 'error' | 'no-session';

/**
 * Outcome for "[auth] flow end <outcome>". `step` is how far the flow got: the sheet was closed,
 * something failed, or the session was set without an error. A set session is only "signed-in"
 * when getSession() then has a session.
 */
export function flowOutcome(step: 'cancel' | 'error' | 'session-set', hasSession: boolean): FlowOutcome {
  if (step === 'cancel') return 'cancelled';
  if (step === 'error') return 'error';
  return hasSession ? 'signed-in' : 'no-session';
}
