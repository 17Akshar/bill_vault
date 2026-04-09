import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface Segment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  data: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  centerColor?: string;
}

export default function DonutChart({ data, size = 180, strokeWidth = 24, centerLabel, centerValue, centerColor = '#FFF' }: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((s, d) => s + d.value, 0);
  let cumulativePercent = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background circle */}
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} fill="none" />
          {data.map((segment, i) => {
            const pct = total > 0 ? segment.value / total : 0;
            const dashArray = `${pct * circumference} ${circumference}`;
            const offset = -cumulativePercent * circumference;
            cumulativePercent += pct;
            return (
              <Circle key={i} cx={size / 2} cy={size / 2} r={radius} stroke={segment.color} strokeWidth={strokeWidth} fill="none" strokeDasharray={dashArray} strokeDashoffset={offset} strokeLinecap="round" />
            );
          })}
        </G>
      </Svg>
      {(centerLabel || centerValue) && (
        <View style={[styles.center, { width: size, height: size }]}>
          {centerValue && <Text style={[styles.centerValue, { color: centerColor }]}>{centerValue}</Text>}
          {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  center: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  centerValue: { fontSize: 22, fontWeight: 'bold' },
  centerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
});
