import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/** The part of AsyncStorage this file uses; tests pass an in-memory version. */
export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

/**
 * A value kept on the device that any component can read with `use()`.
 * Starts as `initial`, then switches to the saved value once it has loaded (`loaded` resolves then).
 *
 * On iOS and Android this is AsyncStorage: it survives force quits and restarts and is removed only when the
 * app is deleted. On the web it is the browser's localStorage.
 */
export function createStored<T>(storage: KeyValueStorage, key: string, initial: T, parse: (saved: unknown) => T) {
  let value = initial;
  let changedBeforeLoad = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const loaded: Promise<void> = storage
    .getItem(key)
    .then((raw) => {
      if (raw === null || changedBeforeLoad) return;
      value = parse(JSON.parse(raw));
      emit();
    })
    .catch(() => {}); // Unreadable data: keep the default.

  // Writes go out one after another, so the last value set is the one left on the device.
  let writes: Promise<void> = Promise.resolve();

  const get = () => value;
  /** Replaces the value. Before loading has finished, this wins over what was saved. */
  const set = (next: T) => {
    changedBeforeLoad = true;
    value = next;
    emit();
    const json = JSON.stringify(next);
    writes = writes.then(() => storage.setItem(key, json)).catch(() => {});
  };
  /** Changes the saved value: waits for it to load first, so nothing saved earlier is lost. */
  const update = async (change: (current: T) => T) => {
    await loaded;
    set(change(value));
  };
  /** Resolves once every write so far has reached storage. */
  const written = () => writes;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const use = () => useSyncExternalStore(subscribe, get);

  return { get, set, update, use, loaded, written };
}

export function stored<T>(key: string, initial: T, parse: (saved: unknown) => T) {
  return createStored(AsyncStorage, key, initial, parse);
}
