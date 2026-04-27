import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

const W = Dimensions.get('window').width;

// Classic M-wing bird silhouette (~32px wide at scale 1)
const BIRD = 'M0,0 C5,-7 12,-9 16,0 C20,-9 27,-7 32,0';

// Pine tree with trunk, four stacked tiers (~36px wide, ~84px tall, origin at base-center)
const TREE = [
  'M-2,0 L2,0 L2,-18 L-2,-18 Z',
  'M-18,-14 L0,-44 L18,-14 Z',
  'M-13,-38 L0,-62 L13,-38 Z',
  'M-9,-56 L0,-76 L9,-56 Z',
  'M-5,-70 L0,-84 L5,-70 Z',
].join(' ');

type Props = { height?: number };

export default function HeaderDecor({ height = 220 }: Props) {
  const H = height;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        {/* ── Circles ──────────────────────────────────────────── */}
        <Circle cx={W - 40}  cy={40}      r={110} fill="rgba(255,255,255,0.07)" />
        <Circle cx={W - 128} cy={48}      r={38}  fill="rgba(255,255,255,0.05)" />
        <Circle cx={35}      cy={H - 35}  r={75}  fill="rgba(255,255,255,0.04)" />

        {/* ── Birds ────────────────────────────────────────────── */}
        <G transform="translate(38, 28)" opacity={0.18}>
          <Path d={BIRD} stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </G>
        <G transform="translate(78, 14) scale(0.75)" opacity={0.13}>
          <Path d={BIRD} stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
        </G>
        <G transform="translate(126, 34) scale(0.6)" opacity={0.10}>
          <Path d={BIRD} stroke="#fff" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </G>
        <G transform={`translate(${W - 136}, 20) scale(0.8)`} opacity={0.14}>
          <Path d={BIRD} stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        </G>
        <G transform={`translate(${W - 95}, 40) scale(0.52)`} opacity={0.09}>
          <Path d={BIRD} stroke="#fff" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </G>

        {/* ── Trees — lean inward from each edge ───────────────── */}
        <G transform={`translate(14, ${H + 5}) rotate(16)`} opacity={0.12}>
          <Path d={TREE} fill="#fff" />
        </G>
        <G transform={`translate(${W - 14}, ${H + 5}) rotate(-16)`} opacity={0.12}>
          <Path d={TREE} fill="#fff" />
        </G>
      </Svg>
    </View>
  );
}
