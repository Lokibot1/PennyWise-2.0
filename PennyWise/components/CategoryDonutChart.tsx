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
  centerAmount?: number;
};

const SIZE      = 118;
const CX        = SIZE / 2;
const CY        = SIZE / 2;
const R_OUT     = 48;
const R_IN      = 30;
const SLICE_GAP = 0.03;

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

function fmtShort(n: number): string {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toFixed(0)}`;
}

function fmtCenter(n: number): string {
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `₱${(n / 1_000).toFixed(1)}K`;
  return `₱${n.toFixed(0)}`;
}

export default function CategoryDonutChart({ slices, total, theme, centerLabel, centerAmount }: Props) {
  const paths = useMemo(() => {
    if (!slices.length || total === 0) return [];
    let angle = -Math.PI / 2;
    return slices.map(s => {
      const fullSweep = (s.value / total) * 2 * Math.PI;
      const sweep     = Math.max(fullSweep - SLICE_GAP * 2, 0.01);
      const a0        = angle + SLICE_GAP;
      const a1        = a0 + sweep;
      angle          += fullSweep;
      return { ...s, path: donutArc(CX, CY, R_OUT, R_IN, a0, a1) };
    });
  }, [slices, total]);

  const emptyPath  = donutArc(CX, CY, R_OUT, R_IN, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI - 0.01);
  const showCenter = centerAmount != null || !!centerLabel;

  return (
    <View style={styles.wrap}>

      {/* ── Donut — centred ───────────────────────────────────────── */}
      <View style={styles.donutWrap}>
        <Svg width={SIZE} height={SIZE}>
          {paths.length === 0 ? (
            <Path d={emptyPath} fill={theme.isDark ? 'rgba(255,255,255,0.08)' : '#EBEBEB'} />
          ) : (
            paths.map((p, i) => <Path key={i} d={p.path} fill={p.color} />)
          )}
        </Svg>

        {showCenter && (
          <View style={styles.centerWrap}>
            {centerAmount != null ? (
              <>
                <Text style={[styles.centerAmt, { color: theme.textPrimary as string }]} numberOfLines={1}>
                  {fmtCenter(centerAmount)}
                </Text>
                <Text style={[styles.centerSub, { color: theme.textMuted as string }]}>TOTAL</Text>
              </>
            ) : (
              <Text style={[styles.centerLbl, { color: theme.textPrimary as string }]} numberOfLines={2}>
                {centerLabel}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ── Full-width legend below ───────────────────────────────── */}
      <View style={styles.legend}>
        {slices.length === 0 ? (
          <Text style={[styles.emptyTxt, { color: theme.textMuted as string }]}>No data yet</Text>
        ) : (
          slices.map((s, i) => {
            const pct = total > 0 ? (s.value / total) * 100 : 0;
            return (
              <View key={i} style={styles.legendItem}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <Text style={[styles.legendLabel, { color: theme.textPrimary as string }]} numberOfLines={1}>
                    {s.label}
                  </Text>
                  <Text style={[styles.legendAmt, { color: theme.textMuted as string }]}>
                    {fmtShort(s.value)}
                  </Text>
                  <View style={[styles.pctBadge, { backgroundColor: s.color + '28' }]}>
                    <Text style={[styles.pctTxt, { color: s.color }]}>
                      {pct.toFixed(0)}%
                    </Text>
                  </View>
                </View>
                <View style={[styles.barTrack, { backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
                  <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: s.color }]} />
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 16,
  },

  // ── Donut ────────────────────────────────────────────────────────
  donutWrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerWrap: {
    position: 'absolute',
    width: R_IN * 2 - 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerAmt: {
    fontFamily: Font.headerBold,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  centerSub: {
    fontFamily: Font.bodyRegular,
    fontSize: 8,
    textAlign: 'center',
    marginTop: 1,
    letterSpacing: 0.6,
  },
  centerLbl: {
    fontFamily: Font.headerBold,
    fontSize: 9,
    textAlign: 'center',
  },

  // ── Legend ───────────────────────────────────────────────────────
  legend:     { width: '100%', gap: 10 },
  legendItem: { gap: 5 },
  legendRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:  { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  legendLabel:{ flex: 1, fontFamily: Font.bodyMedium, fontSize: 13 },
  legendAmt:  { fontFamily: Font.bodyRegular, fontSize: 12 },

  pctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 36,
    alignItems: 'center',
  },
  pctTxt: {
    fontFamily: Font.bodySemiBold,
    fontSize: 11,
  },

  barTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },

  emptyTxt: { fontFamily: Font.bodyRegular, fontSize: 13 },
});
