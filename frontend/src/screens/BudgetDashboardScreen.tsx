import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants/theme';
import { ProgressBar } from '../components/ProgressBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { BudgetFilterDropdown } from '../components/BudgetFilterDropdown';

interface BudgetDashboardScreenProps {
  navigation: any;
}

// DUMMY DATA
const DUMMY_BUDGET_DATA = {
  totalBudget: 100000,
  totalSpent: 62340,
  remainingBudget: 37660,
  income: 150000,
  expenses: 62340,
  savings: 87660,
  savingsRate: 58.4,
  month: 'May 2024',
  daysInMonth: 31,
  daysPassed: 16,
  currency: '₹',
};

const DUMMY_CATEGORIES = [
  { id: '1', name: 'Home', icon: 'home', budget: 20000, spent: 16000, remaining: 4000, progress: 80 },
  { id: '2', name: 'Food & Dining', icon: 'restaurant', budget: 10000, spent: 8045, remaining: 1955, progress: 80 },
  { id: '3', name: 'Transport', icon: 'car', budget: 10000, spent: 6520, remaining: 3480, progress: 65 },
  { id: '4', name: 'Shopping', icon: 'shopping-bag', budget: 5000, spent: 3780, remaining: 1220, progress: 75 },
  { id: '5', name: 'Entertainment', icon: 'film', budget: 3000, spent: 2100, remaining: 900, progress: 70 },
  { id: '6', name: 'Travel', icon: 'airplane', budget: 5000, spent: 6300, remaining: -1300, progress: 126 },
  { id: '7', name: 'Investments', icon: 'trending-up', budget: 15000, spent: 10000, remaining: 5000, progress: 66 },
  { id: '8', name: 'Health', icon: 'heart', budget: 3000, spent: 2000, remaining: 1000, progress: 66 },
  { id: '9', name: 'Education', icon: 'book', budget: 2000, spent: 1000, remaining: 1000, progress: 50 },
  { id: '10', name: 'Others', icon: 'more-horizontal', budget: 2000, spent: 1395, remaining: 605, progress: 70 },
];

export const BudgetDashboardScreen: React.FC<BudgetDashboardScreenProps> = ({ navigation }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

  const handlePeriodChange = (period: string, fromDate?: Date, toDate?: Date) => {
    setSelectedPeriod(period);
    if (period === 'Custom Range' && fromDate && toDate) {
      setCustomDateRange({ from: fromDate, to: toDate });
      console.log('Custom Range Selected:', fromDate, 'to', toDate);
      // Here you would typically fetch data for the custom date range
    }
  };

  const formatCurrency = (amount: number) => {
    return `${DUMMY_BUDGET_DATA.currency} ${amount.toLocaleString()}`;
  };

  const usedPercentage = (DUMMY_BUDGET_DATA.totalSpent / DUMMY_BUDGET_DATA.totalBudget) * 100;
  const remainingPercentage = 100 - usedPercentage;
  const dailyBudget = Math.floor(DUMMY_BUDGET_DATA.remainingBudget / (DUMMY_BUDGET_DATA.daysInMonth - DUMMY_BUDGET_DATA.daysPassed));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budget</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="search" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Feather name="bell" size={24} color={COLORS.textPrimary} />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton}>
            <Feather name="plus" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Budget Filter Dropdown */}
        <BudgetFilterDropdown
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
          daysInfo={`${DUMMY_BUDGET_DATA.daysPassed} days passed • ${formatCurrency(dailyBudget)} / day left`}
        />

        <Text style={styles.dataForText}>
          Showing data for: {DUMMY_BUDGET_DATA.month}
        </Text>

        {/* Budget Overview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overview</Text>
          
          <View style={styles.budgetMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Total Budget</Text>
              <Text style={[styles.metricValue, { color: COLORS.primary }]}>
                {formatCurrency(DUMMY_BUDGET_DATA.totalBudget)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Total Spent</Text>
              <Text style={[styles.metricValue, { color: COLORS.error }]}>
                {formatCurrency(DUMMY_BUDGET_DATA.totalSpent)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Remaining Budget</Text>
              <Text style={[styles.metricValue, { color: COLORS.success }]}>
                {formatCurrency(DUMMY_BUDGET_DATA.remainingBudget)}
              </Text>
            </View>
          </View>

          <ProgressBar
            progress={usedPercentage}
            height={12}
          />
          
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>
              {Math.round(usedPercentage)}% Used
            </Text>
            <Text style={styles.progressLabel}>
              {Math.round(remainingPercentage)}% Remaining
            </Text>
          </View>
        </View>

        {/* Budget vs Expense Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Budget vs Expense</Text>
          
          <View style={styles.expenseMetrics}>
            <View style={styles.expenseItem}>
              <Text style={styles.expenseLabel}>Income</Text>
              <View style={styles.expenseValueContainer}>
                <Text style={[styles.expenseValue, { color: COLORS.success }]}>
                  {formatCurrency(DUMMY_BUDGET_DATA.income)}
                </Text>
                <View style={[styles.iconCircle, { backgroundColor: COLORS.successLight }]}>
                  <Feather name="arrow-up" size={16} color={COLORS.success} />
                </View>
              </View>
            </View>
            
            <View style={styles.expenseItem}>
              <Text style={styles.expenseLabel}>Expenses</Text>
              <View style={styles.expenseValueContainer}>
                <Text style={[styles.expenseValue, { color: COLORS.error }]}>
                  {formatCurrency(DUMMY_BUDGET_DATA.expenses)}
                </Text>
                <View style={[styles.iconCircle, { backgroundColor: COLORS.errorLight }]}>
                  <Feather name="arrow-down" size={16} color={COLORS.error} />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.savingsSection}>
            <Text style={styles.expenseLabel}>Savings</Text>
            <View style={styles.expenseValueContainer}>
              <Text style={[styles.expenseValue, { color: COLORS.success }]}>
                {formatCurrency(DUMMY_BUDGET_DATA.savings)}
              </Text>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.successLight }]}>
                <Feather name="dollar-sign" size={16} color={COLORS.success} />
              </View>
            </View>
          </View>

          <View style={styles.savingsRate}>
            <Text style={styles.savingsRateLabel}>Savings Rate</Text>
            <Text style={styles.savingsRateValue}>{DUMMY_BUDGET_DATA.savingsRate}%</Text>
          </View>
          <ProgressBar
            progress={DUMMY_BUDGET_DATA.savingsRate}
            height={8}
            color={COLORS.success}
          />
        </View>

        {/* Category Summary Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category Summary</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Category</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Budget</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Spent</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Remaining</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Progress</Text>
          </View>

          {DUMMY_CATEGORIES.map((cat, index) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.tableRow, index === DUMMY_CATEGORIES.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                <View style={styles.categoryIconContainer}>
                  <CategoryIcon name={cat.icon} size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </View>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(cat.budget)}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(cat.spent)}</Text>
              <Text style={[styles.tableCell, { flex: 1, color: cat.remaining < 0 ? COLORS.error : COLORS.success }]}>
                {formatCurrency(cat.remaining)}
              </Text>
              <View style={[styles.tableCell, { flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                <View style={styles.progressContainer}>
                  <ProgressBar
                    progress={cat.progress}
                    height={6}
                    showWarning={cat.progress > 100}
                  />
                  <View style={styles.progressTextContainer}>
                    <Text style={[styles.progressText, cat.progress > 100 && { color: COLORS.error }]}>
                      {Math.round(cat.progress)}%
                    </Text>
                    {cat.progress > 100 && (
                      <Feather name="alert-circle" size={14} color={COLORS.error} />
                    )}
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}

          {/* Add Category Budget Button */}
          <TouchableOpacity
            style={styles.addCategoryButton}
            onPress={() => navigation?.navigate?.('AddToBudget')}
          >
            <Feather name="plus" size={20} color={COLORS.primary} />
            <Text style={styles.addCategoryButtonText}>Add Category Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Insights Card */}
        <View style={styles.insightsCard}>
          <View style={styles.insightsContent}>
            <View style={[styles.iconCircle, { backgroundColor: COLORS.warningLight, marginRight: SPACING.md }]}>
              <Feather name="zap" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.insightsTextContainer}>
              <Text style={styles.insightsTitle}>You are doing great! 🎉</Text>
              <Text style={styles.insightsSubtitle}>
                You've saved {DUMMY_BUDGET_DATA.savingsRate}% of your income this month.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.insightsButton}
            onPress={() => navigation?.navigate?.('BudgetInsights')}
          >
            <Feather name="bar-chart-2" size={18} color={COLORS.primary} />
            <Text style={styles.insightsButtonText}>View Insights</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation?.navigate?.('AddToBudget')}
      >
        <Feather name="plus" size={28} color={COLORS.white} />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
    position: 'relative',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.round,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: FONT_WEIGHTS.bold,
  },
  scrollView: {
    flex: 1,
  },
  dataForText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  budgetMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    textAlign: 'center',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  progressLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  expenseMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  expenseItem: {
    flex: 1,
  },
  expenseLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  expenseValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  expenseValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingsSection: {
    marginBottom: SPACING.md,
  },
  savingsRate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  savingsRateLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  savingsRateValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.success,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  tableHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
  },
  categoryName: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  progressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  progressText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addCategoryButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  insightsCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  insightsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  insightsTextContainer: {
    flex: 1,
  },
  insightsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  insightsSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  insightsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  insightsButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  fab: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
});
