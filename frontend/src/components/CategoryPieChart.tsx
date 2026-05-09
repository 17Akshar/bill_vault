import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';
import { COLORS, SPACING, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

interface PieDatum {
  label: string;
  value: number;
  color: string;
}

interface CategoryPieChartProps {
  data: PieDatum[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

// Donut/Pie chart with legend below
export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  size = 200,
  strokeWidth = 28,
  centerLabel,
  centerValue,
}) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  if (total <= 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No data to display</Text>
      </View>
    );
  }

  // Build arc segments for the donut
  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = d.value / total;
    const dasharray = `${fraction * circumference} ${circumference}`;
    const dashoffset = circumference - (cumulative * circumference) / 1; // not used for stroke-dashoffset; simpler: use rotate
    const rotation = (cumulative / 1) * 360 - 90; // starting from top
    cumulative += fraction;
    return { d, dasharray, rotation };
  });

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          {/* Background ring */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={COLORS.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((s, idx) => (
            <G key={idx} rotation={s.rotation} origin={`${cx}, ${cy}`}>
              <Circle
                cx={cx}
                cy={cy}
                r={radius}
                stroke={s.d.color}
                strokeWidth={strokeWidth}
                strokeDasharray={s.dasharray}
                strokeLinecap="butt"
                fill="none"
              />
            </G>
          ))}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          {centerValue ? (
            <Text style={styles.centerValue} numberOfLines={1}>
              {centerValue}
            </Text>
          ) : null}
          {centerLabel ? (
            <Text style={styles.centerLabel} numberOfLines={1}>
              {centerLabel}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.legend}>
        {data.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {d.label}
              </Text>
              <Text style={styles.legendPct}>{pct.toFixed(1)}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  centerLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  legend: {
    width: '100%',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: SPACING.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  legendPct: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textSecondary,
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.sm,
  },
});
