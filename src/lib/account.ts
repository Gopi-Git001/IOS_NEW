// The signed-in user's profile (name, stats) with a local copy, plus sign-out and delete.
import { deleteAccount } from './api';
import { clearHistory, getHistory } from './history';
import { type PrefsRow, resetPrefs, syncPrefs } from './prefs';
import { stored } from './stored';
import { isConfigured, supabase } from './supabase';

export type Stats = { total: number; clean: number; bad: number; ugly: number };
type Profile = { displayName: string | null; stats: Stats | null };

const empty: Profile = { displayName: null, stats: null };
const store = stored<Profile>('quickgob.profile', empty, (saved) => ({ ...empty, ...(saved as Partial<Profile>) }));

export const useProfile = store.use;

async function userId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Name and settings live on this phone for now (no profiles table in this Supabase project yet). */
export async function syncProfile() {
  await store.loaded;
}

/** Saves a new display name (empty clears it). */
export async function saveDisplayName(name: string) {
  const displayName = name.trim().slice(0, 40) || null;
  await store.loaded;
  store.set({ ...store.get(), displayName });
}

/** Totals per verdict from the scan history on this phone. */
export async function syncStats() {
  const history = getHistory();
  const count = (v: string) => history.filter((h) => h.result.verdict === v).length;
  store.set({ ...store.get(), stats: { total: history.length, clean: count('CLEAN'), bad: count('BAD'), ugly: count('UGLY') } });
}

function clearLocalCache() {
  store.set(empty);
  resetPrefs();
}

export async function signOut() {
  await supabase.auth.signOut();
  clearLocalCache();
}

/** Deletes the account on the server (scans, profile, user), then everything kept on this phone. */
export async function deleteAccountAndData() {
  await deleteAccount();
  clearLocalCache();
  clearHistory();
}
