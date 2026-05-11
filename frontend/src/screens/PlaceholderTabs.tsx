import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  FONT_WEIGHTS,
  BORDER_RADIUS,
} from '../constants/theme';

interface PlaceholderTabProps {
  title: string;
  subtitle: string;
  icon: string;
}

export const PlaceholderTab: React.FC<PlaceholderTabProps> = ({ title, subtitle, icon }) => (
  <SafeAreaView style={styles.container} edges={['top']}>
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
    <View style={styles.center}>
      <View style={styles.iconBadge}>
        <Feather name={icon as any} size={48} color={COLORS.primary} />
      </View>
      <Text style={styles.bigTitle}>Coming Soon</Text>
      <Text style={styles.bigSub}>{subtitle}</Text>
    </View>
  </SafeAreaView>
);

export const TransactionsTabScreen = () => (
  <PlaceholderTab
    title="Transactions"
    subtitle="Your transaction history will appear here."
    icon="repeat"
  />
);

export const WealthScreen = () => (
  <PlaceholderTab
    title="Wealth"
    subtitle="Net worth, investments and assets will appear here."
    icon="trending-up"
  />
);

export const InsightsTabScreen = () => (
  <PlaceholderTab
    title="Insights"
    subtitle="Detailed analytics and trends will appear here."
    icon="bar-chart-2"
  />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bigTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  bigSub: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
