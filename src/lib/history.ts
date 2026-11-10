import type { ScanResult } from '../types';
import { addToHistory, type HistoryEntry } from './display';
import { stored } from './stored';
import { readHistory } from './verdicts';

// Scan history lives on this device only; it is never sent to the server.
const store = stored<HistoryEntry[]>('quickgab.history', [], readHistory);

export const useHistory = store.use;
export const getHistory = store.get;
export const recordScan = (result: ScanResult) => store.set(addToHistory(store.get(), result, new Date()));
export const clearHistory = () => store.set([]);
