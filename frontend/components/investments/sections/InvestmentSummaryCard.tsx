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
  <View
    style={[
      styles.card,
      {
        backgroundColor: colors.card,
        borderLeftWidth: 3,
        borderLeftColor: iconColor,
        shadowColor: iconColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
      },
    ]}
    testID="invdetail-summary-card"
  >
    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
      <Ionicons name={iconName as any} size={30} color={iconColor} />
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
    paddingVertical: 18,
    paddingRight: 18,
    paddingLeft: 16,
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', marginBottom: 3, lineHeight: 22 },
  subtitle: { fontSize: 13, fontWeight: '500' },
});
