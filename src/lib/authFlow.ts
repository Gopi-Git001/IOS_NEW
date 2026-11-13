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
};

export function createSingleFlight(): SingleFlight {
  let running = false;
  return {
    get running() {
      return running;
    },
    async run<T>(task: () => Promise<T>, whenBusy: T, onBusy?: () => void): Promise<T> {
      if (running) {
        onBusy?.();
        return whenBusy;
      }
      running = true;
      try {
        return await task();
      } finally {
        running = false;
      }
    },
  };
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
