/** Dev-only build stamp for the Profile screen: "38f6a91 · ios-dev · ios · 16:30 Nov 13". */

export type BuildEnv = { commit?: string; branch?: string; time?: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const UNKNOWN = 'unknown';

/** The values the preview script sets when it starts Metro. Each read is a literal
 *  `process.env.EXPO_PUBLIC_*` so Expo inlines it at bundle time. */
export function readBuildEnv(): BuildEnv {
  return {
    commit: process.env.EXPO_PUBLIC_GIT_COMMIT,
    branch: process.env.EXPO_PUBLIC_GIT_BRANCH,
    time: process.env.EXPO_PUBLIC_BUILD_TIME,
  };
}

/** "2026-11-13T16:30:00-06:00" -> "16:30 Nov 13", using the clock time as written (Metro's local time). */
export function formatBuildTime(iso: string | undefined): string {
  const m = iso?.trim().match(/^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  const month = m ? MONTHS[Number(m[1]) - 1] : undefined;
  if (!m || !month) return UNKNOWN;
  return `${m[3]}:${m[4]} ${month} ${Number(m[2])}`;
}

const orUnknown = (v: string | undefined) => v?.trim() || UNKNOWN;

/** The stamp line, or null in release builds (nothing is rendered). */
export function buildStamp(env: BuildEnv, platform: string, isDev: boolean): string | null {
  if (!isDev) return null;
  return [orUnknown(env.commit), orUnknown(env.branch), orUnknown(platform), formatBuildTime(env.time)].join(' · ');
}
