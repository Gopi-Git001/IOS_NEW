import { Linking, Platform, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { links } from '../config';
import { notify } from '../lib/confirm';
import { CharacterView } from './Character';

/** Laptops from this width on get the larger mascot (the sign-in screen's wide layout starts here too). */
export const WIDE_FROM = 900;

/** Where the small mascot sits and how big it is, before safe-area insets. */
export function smallMascotBox(width: number) {
  return width >= WIDE_FROM ? { left: 20, top: 12, width: 84, height: 64 } : { left: 12, top: 12, width: 68, height: 52 };
}

/** How far the header's left-hand text (the demo-mode tagline) moves right to clear the mascot. The header is 20 px in. */
export function useSmallMascotClearance() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const box = smallMascotBox(width);
  return insets.left + box.left + box.width + 8 - 20;
}

/**
 * The small mascot in the top-left corner: a link to sugardepth.com (a new tab on the web, the browser on phones).
 * Shown on sign-in (animated) and on the camera and result screens (`still`: the first frame, so the camera stays smooth).
 */
export function SmallMascot({ still }: { still: boolean }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const box = smallMascotBox(width);
  const web = Platform.OS === 'web';
  const open = () => Linking.openURL(links.website).catch(() => notify("Couldn't open link", links.website));
  // react-native-web renders href/hrefAttrs as an anchor; they aren't in React Native's types.
  const anchor = web ? ({ href: links.website, hrefAttrs: { target: '_blank', rel: 'noopener' } } as object) : {};
  return (
    <Pressable
      {...anchor}
      onPress={web ? undefined : open}
      accessibilityRole="link"
      accessibilityLabel="Sugar Depth website"
      style={({ pressed }) => [styles.mascot, { ...box, top: insets.top + box.top, left: insets.left + box.left }, pressed && styles.pressed]}
    >
      <CharacterView mood="idle" size={box.height} motion={still ? 'still' : 'full'} shadow={false} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mascot: { position: 'absolute', zIndex: 3, alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 },
  pressed: { opacity: 0.8 },
});
