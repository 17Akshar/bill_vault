import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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

interface LendBorrowDashboardScreenProps {
  navigation: any;
}

interface Loan {
  _id: string;
  person_name: string;
  type: 'lent' | 'borrowed';
  purpose: string;
  amount: number;
  total_paid: number;
  remaining_amount: number;
  start_date: string;
  due_date?: string;
  status: string;
  notes?: string;
}

interface LoanSummary {
  total_lent: number;
  total_borrowed: number;
  total_lent_remaining: number;
  total_borrowed_remaining: number;
  lent_people_count: number;
  borrowed_people_count: number;
  net_position: number;
  loan_count: number;
}

const TAB_LENT = 'lent';
const TAB_BORROWED = 'borrowed';

const computeDueLabel = (dueDate?: string): { text: string; color: string } => {
  if (!dueDate) return { text: 'No Due Date', color: COLORS.textSecondary };
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return { text: `Overdue by ${Math.abs(diffDays)} days`, color: COLORS.error };
  }
  if (diffDays === 0) return { text: 'Due Today', color: COLORS.warning };
  return { text: `Due in ${diffDays} days`, color: COLORS.warning };
};

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const LendBorrowDashboardScreen: React.FC<LendBorrowDashboardScreenProps> = ({
  navigation,
}) => {
  const [activeTab, setActiveTab] = useState<'lent' | 'borrowed'>(TAB_LENT);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [lentLoans, setLentLoans] = useState<Loan[]>([]);
  const [borrowedLoans, setBorrowedLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currency, setCurrency] = useState<string>('USD');

  const loadData = useCallback(async () => {
    try {
      const [s, lent, borrowed, b] = await Promise.all([
        api.getLoansSummary(),
        api.getLoans('lent'),
        api.getLoans('borrowed'),
        api.getBudget().catch(() => null),
      ]);
      setSummary(s);
      setLentLoans(lent);
      setBorrowedLoans(borrowed);
      if (b?.currency) setCurrency(b.currency);
    } catch (e) {
      // silent — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = navigation?.addListener?.('focus', loadData);
    return unsubscribe;
  }, [navigation, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const renderLoanCard = (loan: Loan) => {
    const isLent = loan.type === 'lent';
    const dueInfo = computeDueLabel(loan.due_date);
    const amountColor = isLent ? COLORS.success : COLORS.error;
    return (
      <TouchableOpacity
        key={loan._id}
        style={styles.loanRow}
        onPress={() => navigation?.navigate?.('LoanDetail', { loanId: loan._id })}
        activeOpacity={0.7}
      >
        <View style={[styles.avatar, { backgroundColor: amountColor + '22' }]}>
          <Text style={[styles.avatarText, { color: amountColor }]}>
            {initials(loan.person_name)}
          </Text>
        </View>
        <View style={styles.loanRowText}>
          <Text style={styles.loanName} numberOfLines={1}>
            {loan.person_name}
          </Text>
          <Text style={styles.loanPurpose} numberOfLines={1}>
            {loan.purpose}
          </Text>
        </View>
        <View style={styles.loanRowRight}>
          <Text style={[styles.loanAmount, { color: amountColor }]}>
            {formatCurrency(loan.amount, currency)}
          </Text>
          <Text style={[styles.loanDue, { color: dueInfo.color }]} numberOfLines={1}>
            {dueInfo.text}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  const dataForTab = activeTab === TAB_LENT ? lentLoans : borrowedLoans;
  const sectionTitle = activeTab === TAB_LENT ? 'Lent Money (To Others)' : 'Borrowed Money (From Others)';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lend & Borrowed</Text>
        <TouchableOpacity
          style={styles.addBtnSmall}
          onPress={() => navigation?.navigate?.('AddLoan')}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_LENT && styles.tabActive]}
          onPress={() => setActiveTab(TAB_LENT)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === TAB_LENT && styles.tabTextActive]}>
            Lent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_BORROWED && styles.tabActive]}
          onPress={() => setActiveTab(TAB_BORROWED)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === TAB_BORROWED && styles.tabTextActive]}>
            Borrowed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Total Overview */}
        <Text style={styles.sectionLabel}>Total Overview</Text>
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: COLORS.success + '15' }]}>
            <Text style={styles.overviewLabel}>Total Lent</Text>
            <Text style={[styles.overviewAmount, { color: COLORS.success }]}>
              {formatCurrency(summary?.total_lent || 0, currency)}
            </Text>
            <Text style={styles.overviewSub}>
              {(summary?.lent_people_count || 0)} {summary?.lent_people_count === 1 ? 'Person' : 'People'}
            </Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: COLORS.error + '15' }]}>
            <Text style={styles.overviewLabel}>Total Borrowed</Text>
            <Text style={[styles.overviewAmount, { color: COLORS.error }]}>
              {formatCurrency(summary?.total_borrowed || 0, currency)}
            </Text>
            <Text style={styles.overviewSub}>
              {(summary?.borrowed_people_count || 0)} {summary?.borrowed_people_count === 1 ? 'Person' : 'People'}
            </Text>
          </View>
        </View>

        {/* Net position chip */}
        <View style={styles.netRow}>
          <Feather
            name={(summary?.net_position || 0) >= 0 ? 'trending-up' : 'trending-down'}
            size={16}
            color={(summary?.net_position || 0) >= 0 ? COLORS.success : COLORS.error}
          />
          <Text style={styles.netText}>
            Net Position:{' '}
            <Text
              style={{
                color: (summary?.net_position || 0) >= 0 ? COLORS.success : COLORS.error,
                fontWeight: FONT_WEIGHTS.bold,
              }}
            >
              {formatCurrency(Math.abs(summary?.net_position || 0), currency)}
            </Text>{' '}
            {(summary?.net_position || 0) >= 0 ? 'in your favor' : 'you owe'}
          </Text>
        </View>

        {/* List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{sectionTitle}</Text>
          <Text style={styles.listCount}>{dataForTab.length}</Text>
        </View>

        {dataForTab.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="inbox" size={36} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>
              No {activeTab === TAB_LENT ? 'lent' : 'borrowed'} entries yet
            </Text>
            <Text style={styles.emptySub}>
              Tap "Add New" below to track your first loan.
            </Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {dataForTab.map(renderLoanCard)}
          </View>
        )}

        {/* Add New CTA */}
        <TouchableOpacity
          style={styles.addCta}
          onPress={() => navigation?.navigate?.('AddLoan', { defaultType: activeTab })}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={20} color={COLORS.primary} />
          <Text style={styles.addCtaText}>Add New (Lent / Borrowed)</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
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
  addBtnSmall: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.bold,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  overviewCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  overviewLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  overviewAmount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: 4,
  },
  overviewSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  netText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  listTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  listCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.sm,
    overflow: 'hidden',
  },
  loanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  loanRowText: {
    flex: 1,
    minWidth: 0,
  },
  loanName: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  loanPurpose: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  loanRowRight: {
    alignItems: 'flex-end',
  },
  loanAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  loanDue: {
    fontSize: FONT_SIZES.xs,
    marginTop: 2,
    fontWeight: FONT_WEIGHTS.medium,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  addCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primary + '55',
    borderStyle: 'dashed',
    marginTop: SPACING.md,
  },
  addCtaText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
});
