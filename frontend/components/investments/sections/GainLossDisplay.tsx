// Section 3: Gain/Loss Display — formatted gain/loss row with green/red colour.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatINR } from '../../../utils/formatINR';

interface GainLossDisplayProps {
  invested: number;
  current: number;
  colors: any;
  label?: string;
}

export const GainLossDisplay = ({
  invested,
  current,
  colors,
  label = 'Gain / Loss',
}: GainLossDisplayProps) => {
  const diff = (current || 0) - (invested || 0);
  const pct = invested > 0 ? (diff / invested) * 100 : 0;
  const positive = diff >= 0;
  const color = positive ? '#00E676' : '#FF5252';

  return (
    <View style={[styles.row, { backgroundColor: colors.card }]} testID="invdetail-gain-loss-row">
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color }]} testID="invdetail-gain-loss-value">
        {positive ? '+' : '-'}
        {formatINR(Math.abs(diff))}{' '}
        <Text style={[styles.pct, { color }]}>
          ({positive ? '+' : ''}
          {pct.toFixed(2)}%)
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 16, fontWeight: '700', textAlign: 'right' },
  pct: { fontSize: 13, fontWeight: '600' },
});
