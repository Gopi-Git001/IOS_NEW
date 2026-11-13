import { createStored, type KeyValueStorage, stored } from './stored';

/**
 * One-time consent before the first scan (App Store guideline 5.1.2(i)): label photos go to Anthropic (Claude)
 * and TypeSafe (Jev) for analysis. Acceptance is kept on this device (AsyncStorage on iOS and Android,
 * localStorage on the web); "Not now" stores nothing, so the next shutter tap asks again.
 */
export const SCAN_CONSENT_KEY = 'quickgab.scanConsent';

/** Only a saved `true` counts as accepted; anything else (missing, corrupted) asks again. */
export const parseScanConsent = (saved: unknown) => saved === true;

/** The consent store on any storage; the app uses AsyncStorage, tests use memory. */
export function scanConsentStore(storage?: KeyValueStorage) {
  const store = storage
    ? createStored<boolean>(storage, SCAN_CONSENT_KEY, false, parseScanConsent)
    : stored<boolean>(SCAN_CONSENT_KEY, false, parseScanConsent);

  /** True once the user has accepted. Waits for the saved value, so an earlier acceptance is never missed. */
  const accepted = async () => {
    await store.loaded;
    return store.get();
  };

  return {
    store,
    accepted,
    /** "Accept": remembered on this device for good. */
    accept: () => store.set(true),
    /**
     * A shutter tap: runs `scan` when accepted, otherwise `ask` (show the notice) and nothing is captured or sent.
     * Returns whether the scan ran.
     */
    gate: async (scan: () => unknown, ask: () => void) => {
      if (await accepted()) {
        await scan();
        return true;
      }
      ask();
      return false;
    },
  };
}

const scanConsent = scanConsentStore();

export const useScanConsent = scanConsent.store.use;
export const acceptScanConsent = scanConsent.accept;
export const gateScan = scanConsent.gate;
