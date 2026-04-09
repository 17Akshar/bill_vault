import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';
import { formatINR } from '../../utils/formatINR';

interface BarData {
  label: string;
  income: number;
  expense: number;
}

interface BarChartProps {
  data: BarData[];
  height?: number;
  textColor?: string;
}

export default function BarChart({ data, height = 180, textColor = '#FFF' }: BarChartProps) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const barWidth = Math.min(20, (300 / data.length) * 0.35);
  const gap = (300 - data.length * barWidth * 2.5) / (data.length + 1);

  return (
    <View style={styles.container}>
      <Svg width={320} height={height + 30} viewBox={`0 0 320 ${height + 30}`}>
        {data.map((d, i) => {
          const x = gap + i * (barWidth * 2.5 + gap);
          const incH = (d.income / maxVal) * height;
          const expH = (d.expense / maxVal) * height;
          return (
            <G key={i}>
              <Rect x={x} y={height - incH} width={barWidth} height={Math.max(incH, 2)} rx={4} fill="#00E676" opacity={0.85} />
              <Rect x={x + barWidth + 3} y={height - expH} width={barWidth} height={Math.max(expH, 2)} rx={4} fill="#FF5252" opacity={0.85} />
            </G>
          );
        })}
      </Svg>
      <View style={[styles.labels, { marginLeft: gap }]}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.label, { color: textColor, width: barWidth * 2.5 + gap, textAlign: 'center' }]}>{d.label}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 8 },
  labels: { flexDirection: 'row', marginTop: 4 },
  label: { fontSize: 10 },
});
