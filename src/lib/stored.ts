import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * A value kept on the device (AsyncStorage) that any component can read with `use()`.
 * Starts as `initial`, then switches to the saved value once it has loaded (`loaded` resolves then).
 */
export function stored<T>(key: string, initial: T, parse: (saved: unknown) => T) {
  let value = initial;
  let changedBeforeLoad = false;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  const loaded: Promise<void> = AsyncStorage.getItem(key)
    .then((raw) => {
      if (raw === null || changedBeforeLoad) return;
      value = parse(JSON.parse(raw));
      emit();
    })
    .catch(() => {}); // Unreadable data: keep the default.

  const get = () => value;
  const set = (next: T) => {
    changedBeforeLoad = true;
    value = next;
    emit();
    AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const use = () => useSyncExternalStore(subscribe, get);

  return { get, set, use, loaded };
}
