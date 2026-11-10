// Sugar Depth: the verdict set like a Nutrition Facts panel, cut in glass. Every surface is a frosted sheet
// over a dark ambient backdrop with soft colored light; type is white, one colored word carries the verdict.
// Libre Franklin (the panel's grotesque, up to 900) for everything set; Newsreader italic for the voice.
import tokens from '../brand/tokens.json';

export const brand = { name: 'Sugar Depth', tagline: 'Read the fine print.' };

// Colors live in brand/tokens.json, shared with the marketing site (sites/sugardepth). Edit them there.
// Verdict colors are tuned for white-on-dark glass (each at least 7:1 on #0B0F18).
// brand/tokens.json (and the site) still call the amber "bad" and the rose "ugly"; the app names them by verdict.
const { bad: okay, ugly: bad, ...base } = tokens.colors;
export const colors = { ...base, okay, bad };
export const ambient = tokens.ambient;
// Scoped to verdict surfaces: camera controls and the rest of the app keep their dark glass.
export const crystal = {
  paper: colors.crystalPaper,
  ink: colors.crystalInk,
  muted: colors.crystalMuted,
  rule: colors.crystalRule,
  CLEAN: { tint: colors.clean, deep: colors.cleanInk },
  OKAY: { tint: colors.okay, deep: colors.badInk },
  BAD: { tint: colors.bad, deep: colors.uglyInk },
};

export const fonts = {
  regular: 'LibreFranklin_400Regular',
  medium: 'LibreFranklin_500Medium',
  semibold: 'LibreFranklin_600SemiBold',
  bold: 'LibreFranklin_700Bold',
  extrabold: 'LibreFranklin_800ExtraBold',
  black: 'LibreFranklin_900Black',
  serif: 'Newsreader_400Regular_Italic',
  serifMedium: 'Newsreader_500Medium_Italic',
};

/** Web-only frosted glass for content sheets; native uses the translucent fill over the ambient backdrop. */
export const frost = (blur = 28) =>
  ({
    backdropFilter: `blur(${blur}px) saturate(170%)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(170%)`,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    boxShadow: 'inset 0px 1px 0px rgba(255,255,255,0.28), inset 0px 0px 24px rgba(255,255,255,0.04), 0px 16px 40px rgba(0,0,0,0.38)',
  }) as Record<string, unknown>;
