import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Font } from '@/constants/fonts';
import type { Theme } from '@/contexts/AppTheme';

export type ChartSlice = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  slices: ChartSlice[];
  total: number;
  theme: Theme;
  centerLabel?: string;
};

const SIZE  = 130;
const CX    = SIZE / 2;
const CY    = SIZE / 2;
const R_OUT = 54;
const R_IN  = 32;
const SLICE_GAP = 0.025; // radians of gap between slices

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function donutArc(cx: number, cy: number, ro: number, ri: number, a0: number, a1: number) {
  const p0 = polar(cx, cy, ro, a0);
  const p1 = polar(cx, cy, ro, a1);
  const p2 = polar(cx, cy, ri, a1);
  const p3 = polar(cx, cy, ri, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return [
    `M ${p0.x} ${p0.y}`,
    `A ${ro} ${ro} 0 ${large} 1 ${p1.x} ${p1.y}`,
    `L ${p2.x} ${p2.y}`,
    `A ${ri} ${ri} 0 ${large} 0 ${p3.x} ${p3.y}`,
    'Z',
  ].join(' ');
}

export default function CategoryDonutChart({ slices, total, theme, centerLabel }: Props) {
  const paths = useMemo(() => {
    if (!slices.length || total === 0) return [];
    let angle = -Math.PI / 2; // start at 12 o'clock
    return slices.map(s => {
      const fullSweep = (s.value / total) * 2 * Math.PI;
      const sweep = Math.max(fullSweep - SLICE_GAP * 2, 0.01);
      const a0 = angle + SLICE_GAP;
      const a1 = a0 + sweep;
      angle += fullSweep;
      return { ...s, path: donutArc(CX, CY, R_OUT, R_IN, a0, a1) };
    });
  }, [slices, total]);

  const emptyPath = donutArc(CX, CY, R_OUT, R_IN, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI - 0.01);

  return (
    <View style={styles.wrap}>
      {/* Donut */}
      <View style={styles.donutWrap}>
        <Svg width={SIZE} height={SIZE}>
          {paths.length === 0 ? (
            <Path d={emptyPath} fill={theme.isDark ? 'rgba(255,255,255,0.08)' : '#EBEBEB'} />
          ) : (
            paths.map((p, i) => <Path key={i} d={p.path} fill={p.color} />)
          )}
        </Svg>
        {centerLabel ? (
          <View style={styles.centerWrap}>
            <Text style={[styles.centerTxt, { color: theme.textPrimary as string }]} numberOfLines={2}>
              {centerLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {slices.length === 0 ? (
          <Text style={[styles.emptyTxt, { color: theme.textMuted as string }]}>No data yet</Text>
        ) : (
          slices.map((s, i) => (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={[styles.legendLabel, { color: theme.textPrimary as string }]} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={[styles.legendPct, { color: theme.textMuted as string }]}>
                {total > 0 ? `${((s.value / total) * 100).toFixed(0)}%` : '0%'}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  donutWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    position: 'absolute',
    width: R_IN * 2,
    height: R_IN * 2,
    borderRadius: R_IN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTxt: {
    fontFamily: Font.headerBold,
    fontSize: 9,
    textAlign: 'center',
  },
  legend:     { flex: 1, gap: 10 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendLabel: { flex: 1, fontFamily: Font.bodyMedium, fontSize: 13 },
  legendPct:  { fontFamily: Font.bodySemiBold, fontSize: 13, minWidth: 34, textAlign: 'right' },
  emptyTxt:   { fontFamily: Font.bodyRegular, fontSize: 13 },
});
