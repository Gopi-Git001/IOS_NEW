import type { ScanResult } from '../types';
import { addToHistory, HISTORY_LIMIT, type HistoryEntry } from './display';
import { createStored, type KeyValueStorage, stored } from './stored';
import { readHistory } from './verdicts';

/**
 * Scan history lives on this device only; it is never sent to the server. It keeps the latest 50 scans
 * (verdict, headline and ingredient lists, no photos): at most about 1.5 KB per scan with long lists (71 KB for 50, history.test.ts), so well under 100 KB.
 *
 * - Force quit / restart: kept (AsyncStorage on iOS and Android, localStorage on the web).
 * - Sign out: kept. The history belongs to this phone, not to the account; "Clear history" in Menu removes it.
 * - Delete account: removed, as the privacy text says (`deleteAccountAndData` in account.ts).
 * - Deleting the app: removed by the system along with all its storage.
 */
export const HISTORY_KEY = 'quickgab.history';

/** Saved history in the current verdict names, newest first, at most 50 entries. */
export const parseHistory = (saved: unknown) => readHistory(saved).slice(0, HISTORY_LIMIT);

/** The history store on any storage; the app uses AsyncStorage, tests use memory. */
export function historyStore(storage?: KeyValueStorage) {
  const store = storage
    ? createStored<HistoryEntry[]>(storage, HISTORY_KEY, [], parseHistory)
    : stored<HistoryEntry[]>(HISTORY_KEY, [], parseHistory);
  return {
    store,
    // Waits for the saved history to load, so a scan made right after opening the app doesn't replace it.
    recordScan: (result: ScanResult, now = new Date()) => store.update((history) => addToHistory(history, result, now)),
    clearHistory: () => store.set([]),
  };
}

const history = historyStore();

export const useHistory = history.store.use;
export const getHistory = history.store.get;
export const recordScan = (result: ScanResult) => {
  history.recordScan(result).catch(() => {});
};
export const clearHistory = history.clearHistory;
