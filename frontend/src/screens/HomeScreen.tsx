import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
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
import { api } from '../services/api';
import { formatCurrency } from '../utils/currency';

interface HomeScreenProps {
  navigation: any;
}

interface QuickAction {
  title: string;
  icon: string;
  color: string;
  bg: string;
  screen?: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { title: 'Budget', icon: 'pie-chart', color: '#16C79A', bg: '#16C79A22', screen: 'BudgetDashboard' },
  { title: 'Lend & Borrowed', icon: 'users', color: '#3498DB', bg: '#3498DB22', screen: 'LendBorrowDashboard' },
  { title: 'Templates', icon: 'zap', color: '#FF9800', bg: '#FF980022', screen: 'BudgetTemplates' },
  { title: 'Insights', icon: 'trending-up', color: '#7B61FF', bg: '#7B61FF22', screen: 'BudgetInsights' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [budgetSummary, setBudgetSummary] = useState<any>(null);
  const [loansSummary, setLoansSummary] = useState<any>(null);
  const [currency, setCurrency] = useState<string>('USD');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const now = new Date();
    try {
      const [b, l, budget] = await Promise.all([
        api.getBudgetSummary(now.getMonth() + 1, now.getFullYear()).catch(() => null),
        api.getLoansSummary().catch(() => null),
        api.getBudget().catch(() => null),
      ]);
      if (b) setBudgetSummary(b);
      if (l) setLoansSummary(l);
      if (budget?.currency) setCurrency(budget.currency);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = navigation?.addListener?.('focus', load);
    return unsub;
  }, [navigation, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.hello}>Hello!</Text>
            <Text style={styles.tagline}>Here's your financial snapshot</Text>
          </View>
          <View style={styles.avatarPlaceholder}>
            <Feather name="user" size={22} color={COLORS.primary} />
          </View>
        </View>

        {/* Hero Card - Budget */}
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => navigation?.navigate?.('BudgetDashboard')}
        >
          <View style={styles.heroHeaderRow}>
            <View>
              <Text style={styles.heroLabel}>This Month's Budget</Text>
              <Text style={styles.heroAmount}>
                {formatCurrency(budgetSummary?.remaining_budget ?? 0, currency)}
              </Text>
              <Text style={styles.heroSub}>remaining</Text>
            </View>
            <View style={styles.heroIcon}>
              <Feather name="pie-chart" size={28} color={COLORS.white} />
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Spent</Text>
              <Text style={styles.heroStatValue}>
                {formatCurrency(budgetSummary?.total_spent ?? 0, currency)}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Income</Text>
              <Text style={styles.heroStatValue}>
                {formatCurrency(budgetSummary?.income ?? 0, currency)}
              </Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Savings</Text>
              <Text style={styles.heroStatValue}>
                {(budgetSummary?.savings_rate ?? 0).toFixed(0)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Lend & Borrowed Snapshot */}
        <TouchableOpacity
          style={styles.lbCard}
          activeOpacity={0.9}
          onPress={() => navigation?.navigate?.('LendBorrowDashboard')}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Lend & Borrowed</Text>
            <Feather name="chevron-right" size={20} color={COLORS.textSecondary} />
          </View>
          <View style={styles.lbRow}>
            <View style={[styles.lbStat, { backgroundColor: COLORS.success + '15' }]}>
              <Text style={styles.lbLabel}>Lent</Text>
              <Text style={[styles.lbValue, { color: COLORS.success }]}>
                {formatCurrency(loansSummary?.total_lent ?? 0, currency)}
              </Text>
              <Text style={styles.lbSub}>
                {loansSummary?.lent_people_count ?? 0}{' '}
                {(loansSummary?.lent_people_count ?? 0) === 1 ? 'person' : 'people'}
              </Text>
            </View>
            <View style={[styles.lbStat, { backgroundColor: COLORS.error + '15' }]}>
              <Text style={styles.lbLabel}>Borrowed</Text>
              <Text style={[styles.lbValue, { color: COLORS.error }]}>
                {formatCurrency(loansSummary?.total_borrowed ?? 0, currency)}
              </Text>
              <Text style={styles.lbSub}>
                {loansSummary?.borrowed_people_count ?? 0}{' '}
                {(loansSummary?.borrowed_people_count ?? 0) === 1 ? 'person' : 'people'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((qa) => (
            <TouchableOpacity
              key={qa.title}
              style={styles.quickItem}
              activeOpacity={0.8}
              onPress={() => qa.screen && navigation?.navigate?.(qa.screen)}
            >
              <View style={[styles.quickIcon, { backgroundColor: qa.bg }]}>
                <Feather name={qa.icon as any} size={22} color={qa.color} />
              </View>
              <Text style={styles.quickTitle}>{qa.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.md },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  hello: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  tagline: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primaryLight + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between' },
  heroLabel: { fontSize: FONT_SIZES.sm, color: COLORS.white + 'CC', fontWeight: FONT_WEIGHTS.medium },
  heroAmount: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
    marginTop: 4,
  },
  heroSub: { fontSize: FONT_SIZES.xs, color: COLORS.white + 'CC' },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.white + '22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroStatsRow: {
    flexDirection: 'row',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.white + '22',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroDivider: { width: 1, backgroundColor: COLORS.white + '22' },
  heroStatLabel: { fontSize: FONT_SIZES.xs, color: COLORS.white + 'CC' },
  heroStatValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.white,
    marginTop: 2,
  },
  lbCard: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.textPrimary },
  lbRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  lbStat: { flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md },
  lbLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: FONT_WEIGHTS.medium },
  lbValue: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, marginTop: 4 },
  lbSub: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quickItem: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  quickTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
});
