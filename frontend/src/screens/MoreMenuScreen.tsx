import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  COLORS,
  SPACING,
  FONT_SIZES,
  BORDER_RADIUS,
  FONT_WEIGHTS,
  SHADOWS,
} from '../constants/theme';

interface MoreMenuScreenProps {
  navigation: any;
}

interface MenuItem {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  screen: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Lend & Borrowed',
    subtitle: 'Track money you lent or borrowed',
    icon: 'repeat',
    color: '#6C63FF',
    screen: 'LendBorrowDashboard',
  },
  {
    title: 'Currency',
    subtitle: 'Choose preferred currency',
    icon: 'globe',
    color: '#03A9F4',
    screen: 'CurrencySettings',
  },
  {
    title: 'Budget Templates',
    subtitle: 'One-tap budget setup',
    icon: 'zap',
    color: '#FF9800',
    screen: 'BudgetTemplates',
  },
  {
    title: 'Insights',
    subtitle: 'Analytics & spending trends',
    icon: 'pie-chart',
    color: '#4CAF50',
    screen: 'BudgetInsights',
  },
];

export const MoreMenuScreen: React.FC<MoreMenuScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>More</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.screen}
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => {
              navigation?.goBack?.();
              setTimeout(() => navigation?.navigate?.(item.screen), 250);
            }}
          >
            <View style={[styles.iconBadge, { backgroundColor: item.color + '22' }]}>
              <Feather name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
            <Feather name="chevron-right" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  list: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  rowSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
