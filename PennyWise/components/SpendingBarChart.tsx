import { useMemo } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { Font } from '@/constants/fonts';
import type { Theme } from '@/contexts/AppTheme';

export type MonthData = {
  label: string;
  income: number;
  expense: number;
};

type Props = {
  data: MonthData[];
  theme: Theme;
};

const BAR_H     = 150;
const LABEL_H   = 20;
const TOP_PAD   = 8;
const Y_LABEL_W = 44;
const GROUP_GAP = 8;
const BAR_GAP   = 2;

export default function SpendingBarChart({ data, theme }: Props) {
  const containerW = Dimensions.get('window').width - 40;
  const barAreaW   = containerW - Y_LABEL_W;
  const n          = data.length;
  const totalGaps  = Math.max(n - 1, 0) * GROUP_GAP;
  const groupW     = n > 0 ? (barAreaW - totalGaps) / n : 0;
  const barW       = Math.max((groupW - BAR_GAP) / 2, 1);

  const actualMax = useMemo(
    () => Math.max(...data.flatMap(d => [d.income, d.expense]), 0),
    [data],
  );
  const maxVal = actualMax === 0 ? 1 : actualMax;

  const scale = (v: number) => (v / maxVal) * BAR_H;
  const fmtY  = (v: number) => {
    if (actualMax === 0 || v === 0) return '₱0';
    if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(0)}M`;
    if (v >= 1_000)     return `₱${(v / 1_000).toFixed(0)}k`;
    return `₱${v.toFixed(0)}`;
  };

  const gridLines = [
    { v: actualMax,       y: TOP_PAD },
    { v: actualMax * 0.5, y: TOP_PAD + BAR_H * 0.5 },
    { v: 0,               y: TOP_PAD + BAR_H },
  ];

  return (
    <View>
      <Svg width={containerW} height={BAR_H + LABEL_H + TOP_PAD + 4}>
        {/* Gridlines + Y-axis labels */}
        {gridLines.map(({ v, y }, i) => (
          <G key={i}>
            <Line
              x1={Y_LABEL_W} y1={y}
              x2={containerW} y2={y}
              stroke={theme.divider as string}
              strokeWidth={0.8}
            />
            <SvgText
              x={Y_LABEL_W - 4} y={y + 4}
              fontSize={9} textAnchor="end"
              fill={theme.textMuted as string}
              fontFamily={Font.bodyRegular}
            >
              {fmtY(v)}
            </SvgText>
          </G>
        ))}

        {/* Grouped bars */}
        {data.map((d, i) => {
          const gx = Y_LABEL_W + i * (groupW + GROUP_GAP);
          const ih = scale(d.income);
          const eh = scale(d.expense);
          return (
            <G key={i}>
              {/* Income bar */}
              <Rect
                x={gx}
                y={TOP_PAD + BAR_H - ih}
                width={barW}
                height={Math.max(ih, 0)}
                rx={3}
                fill="#22C55E"
              />
              {/* Expense bar */}
              <Rect
                x={gx + barW + BAR_GAP}
                y={TOP_PAD + BAR_H - eh}
                width={barW}
                height={Math.max(eh, 0)}
                rx={3}
                fill="#4895EF"
              />
              {/* Month label */}
              <SvgText
                x={gx + groupW / 2}
                y={TOP_PAD + BAR_H + LABEL_H}
                fontSize={10} textAnchor="middle"
                fill={theme.textSecondary as string}
                fontFamily={Font.bodyRegular}
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
          <Text style={[styles.legendTxt, { color: theme.textSecondary as string }]}>Income</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#4895EF' }]} />
          <Text style={[styles.legendTxt, { color: theme.textSecondary as string }]}>Expenses</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend:     { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  legendTxt:  { fontFamily: Font.bodyRegular, fontSize: 12 },
});
