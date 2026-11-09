// Reads server settings from Supabase secrets only (`supabase secrets set ...`).
// Never hardcode keys or switches here: deployed function source is readable by anyone with
// project access and survives in every deployed version.
export function env(name: string): string | undefined {
  return Deno.env.get(name) || undefined;
}
