import { isConfigured, supabase } from './supabase';

/** Fetch rather than functions.invoke: preserve the response stream. */
export async function postScan(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  if (!isConfigured || !data.session) throw new Error('Not signed in');
  return fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/quickgob-scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(body),
    signal,
  });
}

/** Signed-in only; entirely best-effort and never starts a paid request. */
export function warmScan() {
  postScanQuietly({ action: 'warm' });
}

/** No dependency on AbortSignal.timeout, which is absent in some native runtimes. */
export function postScanQuietly(body: Record<string, unknown>) {
  void (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try { await postScan(body, controller.signal); }
    finally { clearTimeout(timeout); }
  })().catch(() => {});
}
