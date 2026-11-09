// Reads server keys. Deployed copies may fill TEST_KEYS for test accounts; the repo copy stays empty.
// Never put real keys in this file in git.
const TEST_KEYS: Record<string, string> = {};

export function env(name: string): string | undefined {
  return Deno.env.get(name) || TEST_KEYS[name] || undefined;
}
