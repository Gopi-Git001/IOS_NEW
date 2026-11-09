// Sugar Depth: the verdict set like a Nutrition Facts panel, cut in glass. Every surface is a frosted sheet
// over a dark ambient backdrop with soft colored light; type is white, one colored word carries the verdict.
// Libre Franklin (the panel's grotesque, up to 900) for everything set; Newsreader italic for the voice.
export const brand = { name: 'Sugar Depth', tagline: 'Read the fine print.' };

export const colors = {
  // Verdict colors, tuned for white-on-dark glass (each at least 7:1 on #0B0F18).
  clean: '#5BE49B',
  bad: '#FFC24D',
  ugly: '#FF7A66',
  // The glass system. `paper` is the deep base under the ambient light; `paperRaised` a frosted sheet.
  paper: '#06080D',
  paperRaised: 'rgba(255,255,255,0.07)',
  ink: '#F4F6FB',
  inkMuted: 'rgba(244,246,251,0.74)',
  inkFaint: 'rgba(244,246,251,0.6)',
  rule: 'rgba(255,255,255,0.34)',
  hairline: 'rgba(255,255,255,0.12)',
  // Text on the bright frosted buttons.
  onInk: '#0A0D14',
  // The large frosted sheets (result, glossary): darker so text holds over any photo.
  sheet: 'rgba(16,20,30,0.62)',
  pressedFill: 'rgba(255,255,255,0.08)',
  // Over the camera and photos.
  background: '#06080D',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.8)',
  textFaint: 'rgba(255,255,255,0.62)',
  glassBorder: 'rgba(255,255,255,0.18)',
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
