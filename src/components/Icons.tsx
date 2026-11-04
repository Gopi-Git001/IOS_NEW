import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string };

export const FlashIcon = ({ size = 24, color = '#fff', on = false }: IconProps & { on?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill={on ? color : 'none'} />
    {!on && <Path d="M3 3l18 18" />}
  </Svg>
);

export const MoreIcon = ({ size = 24, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Circle cx={12} cy={5} r={2} />
    <Circle cx={12} cy={12} r={2} />
    <Circle cx={12} cy={19} r={2} />
  </Svg>
);

export const CameraIcon = ({ size = 24, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.2} strokeLinejoin="round">
    <Path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <Circle cx={12} cy={13.5} r={3.6} />
  </Svg>
);

/** Filled circle with a check, cross or dash in the middle. */
export const VerdictIcon = ({ size = 48, color, kind }: { size?: number; color: string; kind: 'check' | 'cross' | 'dash' }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Circle cx={24} cy={24} r={24} fill={color} />
    {kind === 'check' && <Path d="M14 24.5l7 7 13-14" stroke="#0B0B0F" strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    {kind === 'cross' && <Path d="M16 16l16 16M32 16 16 32" stroke="#fff" strokeWidth={4.5} strokeLinecap="round" />}
    {kind === 'dash' && <Path d="M15 24h18" stroke="#0B0B0F" strokeWidth={4.5} strokeLinecap="round" />}
  </Svg>
);

export const LeafIcon = ({ size = 20, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 4C10 4 4 9 4 16c0 1.5.4 2.8 1 4 1-5 5-9 10-11-4 3-7 7-8 12 1 .4 2 .6 3 .6C17 21.6 20 14 20 4z" />
  </Svg>
);

export const CubeIcon = ({ size = 20, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 2 3 7l9 5 9-5-9-5z" fill={color} />
    <Path d="M3 7v10l9 5V12L3 7z" fill={color} opacity={0.75} />
    <Path d="M21 7v10l-9 5V12l9-5z" fill={color} opacity={0.5} />
  </Svg>
);

export const DropIcon = ({ size = 20, color = '#fff' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
    <Path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12z" />
    <Rect x={9} y={14} width={6} height={2} rx={1} fill={color} stroke="none" />
  </Svg>
);
