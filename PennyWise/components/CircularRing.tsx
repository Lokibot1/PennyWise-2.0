/**
 * components/CircularRing.tsx
 * Pure-RN circular progress ring using the two-halves clip technique.
 * No SVG dependency required.
 *
 * Props:
 *  size     – total diameter (ring included)
 *  stroke   – ring stroke width
 *  pct      – progress 0-100
 *  color    – arc + inner circle background color
 *  track    – unfilled arc color
 *  icon     – Ionicons icon name
 *  iconSize – icon size
 *  innerBg  – (optional) override the inner circle bg; defaults to `color`
 */
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  size: number;
  stroke: number;
  pct: number;
  color: string;
  track: string;
  icon: string;
  iconSize: number;
  innerBg?: string;
};

export default function CircularRing({ size, stroke, pct, color, track, icon, iconSize, innerBg }: Props) {
  const half = size / 2;
  const p    = Math.min(100, Math.max(0, pct));

  // Right half sweeps 0 → 50%  (rotation: −135° → 45°)
  const rotRight = -135 + Math.min(p, 50) * 3.6;
  // Left half sweeps 50 → 100% (rotation: 135° → −45°)
  const rotLeft  = 135 - Math.max(0, p - 50) * 3.6;
  const showLeft = p > 50;

  const innerSize = size - stroke * 2 - 6;
  const bg        = innerBg ?? color;

  return (
    <View style={{ width: size, height: size }}>
      {/* Track ring */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: half, borderWidth: stroke, borderColor: track,
      }} />

      {/* Right arc (0–50%) */}
      {p > 0 && (
        <View testID="ring-arc-right" style={{ position: 'absolute', right: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={{
            position: 'absolute', right: 0,
            width: size, height: size, borderRadius: half,
            borderWidth: stroke,
            borderTopColor:    color,
            borderRightColor:  color,
            borderBottomColor: 'transparent',
            borderLeftColor:   'transparent',
            transform: [{ rotate: `${rotRight}deg` }],
          }} />
        </View>
      )}

      {/* Left arc (50–100%) */}
      {showLeft && (
        <View testID="ring-arc-left" style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={{
            position: 'absolute', left: 0,
            width: size, height: size, borderRadius: half,
            borderWidth: stroke,
            borderTopColor:    color,
            borderRightColor:  'transparent',
            borderBottomColor: 'transparent',
            borderLeftColor:   color,
            transform: [{ rotate: `${rotLeft}deg` }],
          }} />
        </View>
      )}

      {/* Inner icon circle */}
      <View testID="ring-inner" style={{
        position: 'absolute',
        top:  (size - innerSize) / 2,
        left: (size - innerSize) / 2,
        width: innerSize, height: innerSize,
        borderRadius: innerSize / 2,
        backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={icon as any} size={iconSize} color="#fff" />
      </View>
    </View>
  );
}
