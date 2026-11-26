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

// Website Mint, shared with the marketing site's design tokens. Sign-in, Menu, Profile, the camera chrome
// and the result sheet use it.
export const mint = {
  paper: colors.mintPaper, paperFade: colors.mintPaperFade, glow: colors.mintGlow, glowClear: colors.mintGlowClear, grid: colors.mintGrid,
  surface: colors.mintSurface, border: colors.mintBorder,
  ink: colors.mintInk, muted: colors.mintMuted, onInk: colors.mintOnInk,
  highlight: colors.mintHighlight, pill: colors.mintPill, pillInk: colors.mintPillInk, pillDot: colors.mintPillDot,
  danger: colors.mintDanger,
  chipBorder: colors.mintChipBorder, shadow: colors.mintShadow, pressed: colors.mintPressed,
  toggleOn: colors.mintInk, toggleOff: colors.mintToggleOff, toggleOffBorder: colors.mintToggleOffBorder, thumb: colors.mintSurface, thumbShadow: colors.mintToggleThumbShadow,
  paperClear: colors.mintPaperClear, photoFadeMid: colors.mintPhotoFadeMid, photoFadeEnd: colors.mintPhotoFadeEnd,
  shadowStrong: colors.mintShadowStrong, cubeShadow: colors.mintCubeShadow, shutterRing: colors.mintShutterRing,
  sheen: colors.mintSheen, sheenSoft: colors.mintSheenSoft, sheenClear: colors.mintSheenClear, rim: colors.mintRim,
  // The No verdict slab: the toggle greys, so it reads as "nothing decided".
  NONE: { tint: colors.mintToggleOff, deep: colors.mintToggleOffBorder },
  CLEAN: { tint: colors.mintClean, deep: colors.mintCleanInk },
  OKAY: { tint: colors.mintOkay, deep: colors.mintOkayInk },
  BAD: { tint: colors.mintBad, deep: colors.mintBadInk },
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
