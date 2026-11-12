/** Display state only: the server is always authoritative about paid scan permission. */
export type GuestQuota = { limit: number; remaining: number };

export function isGuestUser(user?: { email?: string; app_metadata?: Record<string, unknown> } | null): boolean {
  return user?.app_metadata?.guest === true || /@guest\.sugarhunter\.app$/i.test(user?.email ?? '');
}

export function parseGuestQuota(value: unknown): GuestQuota | null {
  if (!value || typeof value !== 'object') return null;
  const { limit, remaining } = value as GuestQuota;
  return Number.isInteger(limit) && limit > 0 && limit <= 100 && Number.isInteger(remaining) && remaining >= 0 && remaining <= limit
    ? { limit, remaining } : null;
}

export function freeScansLabel(remaining: number): string {
  return `${remaining} free ${remaining === 1 ? 'scan' : 'scans'} left`;
}
