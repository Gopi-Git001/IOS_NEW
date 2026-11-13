// The signed-in user's profile (name, stats) with a local copy, plus sign-out and delete.
import { createAccountDeleter } from './accountDeletion';
import { deleteAccount } from './api';
import { clearHistory, getHistory } from './history';
import { type PrefsRow, resetPrefs, syncPrefs } from './prefs';
import { stored } from './stored';
import { isConfigured, supabase } from './supabase';

export type Stats = { total: number; clean: number; okay: number; bad: number };
type Profile = { displayName: string | null; stats: Stats | null };

const empty: Profile = { displayName: null, stats: null };
// Stats saved before the OKAY rename have no okay count; drop them so syncStats() recounts from history.
const store = stored<Profile>('quickgob.profile', empty, (saved) => {
  const profile = { ...empty, ...(saved as Partial<Profile>) };
  return profile.stats && typeof profile.stats.okay !== 'number' ? { ...profile, stats: null } : profile;
});

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
  store.set({ ...store.get(), stats: { total: history.length, clean: count('CLEAN'), okay: count('OKAY'), bad: count('BAD') } });
}

function clearLocalCache() {
  store.set(empty);
  resetPrefs();
}

export async function signOut() {
  await supabase.auth.signOut();
  clearLocalCache();
}

/**
 * Deletes the account on the server (the Auth user; scans are never stored there), then everything kept on this
 * phone: cached profile, settings and the scan history. A server failure throws and leaves all of it in place.
 * Order and double-tap handling: `createAccountDeleter` in accountDeletion.ts.
 */
export const deleteAccountAndData = createAccountDeleter(deleteAccount, [clearLocalCache, clearHistory]);
