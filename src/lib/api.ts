import { FunctionsHttpError } from '@supabase/supabase-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { JevVerdict, ScanResult } from '../types';
import { supabase } from './supabase';

/** Reads the error message our Edge Functions send back, or a fallback. */
async function messageFrom(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {}
  }
  return fallback;
}

/** Shrinks the photo once (Jev accepts 280–1568 px per side) and returns it as base64 JPEG. */
export async function preparePhoto(photoUri: string): Promise<string> {
  const rendered = await ImageManipulator.manipulate(photoUri).resize({ width: 1280 }).renderAsync();
  const { base64 } = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!base64) throw new Error('Could not prepare the photo.');
  return base64;
}

/** Fast path: Jev makes the CLEAN / BAD / UGLY call straight from the photo. Never throws. */
export async function quickVerdict(image: string): Promise<JevVerdict> {
  const { data, error } = await supabase.functions.invoke<{ jev: JevVerdict }>('quick-verdict', { body: { image } });
  if (error || !data?.jev) return { status: 'unavailable', reason: await messageFrom(error, 'quick-verdict failed') };
  return data.jev;
}

/** Detail path: Claude lists the sugars, and the rules give a backstop verdict. */
export async function readLabel(image: string): Promise<ScanResult> {
  const { data, error } = await supabase.functions.invoke<{ result: ScanResult }>('scan-label', { body: { image } });
  if (error || !data?.result) throw new Error(await messageFrom(error, "Couldn't read the label. Try again."));
  return data.result;
}

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw new Error(await messageFrom(error, 'Could not delete account. Try again.'));
  // The account is gone; drop the local session too.
  await supabase.auth.signOut({ scope: 'local' });
}
