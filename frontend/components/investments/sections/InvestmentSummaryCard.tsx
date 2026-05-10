// Section 2: Investment Summary Card — icon + name + subtitle hero.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InvestmentSummaryCardProps {
  iconName: string;
  iconColor: string;
  iconBg: string;
  name: string;
  subtitle?: string;
  colors: any;
}

export const InvestmentSummaryCard = ({
  iconName,
  iconColor,
  iconBg,
  name,
  subtitle,
  colors,
}: InvestmentSummaryCardProps) => (
  <View style={[styles.card, { backgroundColor: colors.card }]} testID="invdetail-summary-card">
    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
      <Ionicons name={iconName as any} size={28} color={iconColor} />
    </View>
    <View style={styles.textCol}>
      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
        {name}
      </Text>
      {!!subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13, fontWeight: '500' },
});
