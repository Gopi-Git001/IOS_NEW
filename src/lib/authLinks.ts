/**
 * App-wide handling of Google sign-in return links (exps://<host>/--/auth?…, reallabel://auth?…).
 * Pure (no React Native imports) so it can be unit-tested; api.ts feeds it every link from
 * Linking.getInitialURL() (once per JS start), every Linking 'url' event, and the
 * openAuthSessionAsync result. Doesn't depend on the sign-in screen being mounted.
 *
 * - Each new code is processed once. The same link from two sources (url event + auth session
 *   result) shares one exchange; a link that already signed in is not sent again.
 * - A link whose exchange failed is forgotten, so the same link can be tried again (a code is only
 *   "used" after exchangeCodeForSession succeeds, see createCodeExchanger).
 * - Any error in the link (bad_oauth_state, server_error, access_denied…): stay in the app and
 *   show SIGN_IN_EXPIRED.
 */
import { classifyAuthUrl, codeFingerprint, describeAuthUrl, describeIncomingExchange, type ExchangeResult, incomingLinkAction, safeMessage } from './authFlow';

export const SIGN_IN_EXPIRED = 'Sign-in expired, please try again';
export const LINK_SIGN_IN_FAILED = 'Could not sign you in. Try again.';

/** Google shows its account chooser every time (a fresh tap right before the redirect back to the app). */
export const GOOGLE_QUERY_PARAMS: Readonly<Record<string, string>> = { prompt: 'select_account' };

export type LinkSource = 'initial' | 'url event' | 'auth session result';

export type LinkOutcome =
  | { kind: 'ignored' } // no link, or not a sign-in link
  | { kind: 'no-code' } // a sign-in link without code or error (tokens are the caller's job)
  | { kind: 'error'; message: string } // the link carried an error
  | { kind: 'signed-in' } // this link's code was exchanged (by this or an earlier delivery)
  | { kind: 'already-signed-in' } // a session existed already; the code was not sent
  | { kind: 'failed'; message: string }; // the exchange failed

export type AuthLinkState = { busy: boolean; error: string | null };

export type AuthLinkDeps = {
  /** Trades the code for a session (createCodeExchanger().exchange). */
  exchange(code: string): Promise<ExchangeResult>;
  /** True when Supabase already has a session. */
  hasSession(): Promise<boolean>;
  /** Dev log line (without the "[auth]" tag). Never given a code or a full URL. */
  log(message: string): void;
};

export type AuthLinkHandler = {
  handle(url: string | null | undefined, source: LinkSource): Promise<LinkOutcome>;
  /** Called at once with the current state, then on every change. Returns an unsubscribe. */
  subscribe(listener: (state: AuthLinkState) => void): () => void;
  /** Clears the shown error (a new sign-in started). */
  clearError(): void;
  readonly state: AuthLinkState;
};

/** "link received (url event): code=yes error=none error_description=none" — never the URL or the code. */
export function describeLinkReceived(source: LinkSource, url: string | null | undefined, isSignInLink: boolean): string {
  if (!url) return `link received (${source}): none`;
  return `link received (${source}): ${describeAuthUrl(url)}${isSignInLink ? '' : ' (not a sign-in link)'}`;
}

/** error_code from the query or #fragment (Supabase: error=invalid_request&error_code=bad_oauth_state), log-safe. */
function errorCodeOf(url: string): string | null {
  const match = /[?#&]error_code=([^&#]*)/.exec(url);
  if (!match) return null;
  let value = match[1];
  try {
    value = decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {}
  return /^[A-Za-z0-9_.-]{1,60}$/.test(value) ? value : 'other';
}

export function createAuthLinkHandler(deps: AuthLinkDeps): AuthLinkHandler {
  // Links being handled or handled successfully, by code (or by the whole link for error links).
  const handled = new Map<string, Promise<LinkOutcome>>();
  const listeners = new Set<(state: AuthLinkState) => void>();
  let busyCount = 0;
  let state: AuthLinkState = { busy: false, error: null };

  const set = (next: Partial<AuthLinkState>) => {
    state = { ...state, ...next };
    for (const listener of listeners) listener(state);
  };
  const busy = (delta: number) => {
    busyCount = Math.max(0, busyCount + delta);
    if (state.busy !== busyCount > 0) set({ busy: busyCount > 0 });
  };

  const exchangeOnce = async (code: string, source: LinkSource): Promise<LinkOutcome> => {
    busy(1);
    try {
      let signedIn = false;
      try {
        signedIn = await deps.hasSession();
      } catch {}
      if (signedIn) {
        deps.log(describeIncomingExchange({ status: 'skipped', reason: 'already signed in' }));
        return { kind: 'already-signed-in' };
      }
      const result = await deps.exchange(code);
      deps.log(`${describeIncomingExchange(result)} (${source})`);
      if (result.status === 'ok') {
        set({ error: null });
        return { kind: 'signed-in' };
      }
      if (result.status === 'skipped') {
        // Used before a reload, or another code is being exchanged: signed in only if a session exists.
        let session = false;
        try {
          session = await deps.hasSession();
        } catch {}
        return session ? { kind: 'already-signed-in' } : { kind: 'ignored' };
      }
      set({ error: LINK_SIGN_IN_FAILED });
      return { kind: 'failed', message: LINK_SIGN_IN_FAILED };
    } catch (e) {
      deps.log(describeIncomingExchange({ status: 'failed', message: safeMessage(e) }));
      set({ error: LINK_SIGN_IN_FAILED });
      return { kind: 'failed', message: LINK_SIGN_IN_FAILED };
    } finally {
      busy(-1);
    }
  };

  const once = (key: string, run: () => Promise<LinkOutcome>, source: LinkSource): Promise<LinkOutcome> => {
    const earlier = handled.get(key);
    if (earlier) {
      deps.log(`link already handled (${source})`);
      return earlier;
    }
    const current = run().then((outcome) => {
      // Only a link that signed in (or carried an error) is spent; a failed or skipped one may be
      // delivered again and retried.
      const spent = outcome.kind === 'signed-in' || outcome.kind === 'already-signed-in' || outcome.kind === 'error';
      if (!spent && handled.get(key) === current) handled.delete(key);
      return outcome;
    });
    handled.set(key, current);
    return current;
  };

  return {
    get state() {
      return state;
    },
    clearError() {
      if (state.error !== null) set({ error: null });
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    async handle(url, source) {
      const action = incomingLinkAction(url);
      deps.log(describeLinkReceived(source, url, action.kind !== 'ignore'));
      if (action.kind === 'ignore') return { kind: 'ignored' };
      if (action.kind === 'no-code') return { kind: 'no-code' };
      if (action.kind === 'error') {
        const info = classifyAuthUrl(url);
        return once(
          `error:${codeFingerprint(url as string)}`,
          async () => {
            const code = errorCodeOf(url as string);
            deps.log(`return link error: ${info.error ?? 'unknown'}${code ? ` error_code=${code}` : ''} (${source}); staying in the app`);
            set({ error: SIGN_IN_EXPIRED });
            return { kind: 'error', message: SIGN_IN_EXPIRED };
          },
          source,
        );
      }
      return once(`code:${codeFingerprint(action.code)}`, () => exchangeOnce(action.code, source), source);
    },
  };
}
