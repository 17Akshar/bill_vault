import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants/theme';
import { ProgressBar } from '../components/ProgressBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { api } from '../services/api';
import { BudgetSummary } from '../types';

interface BudgetDashboardScreenProps {
  navigation: any;
}

export const BudgetDashboardScreen: React.FC<BudgetDashboardScreenProps> = ({ navigation }) => {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const periods = ['This Month', 'Last Month', 'This Year', 'Last Year', 'Custom Range'];

  const loadSummary = async () => {
    try {
      setLoading(true);
      const data = await api.getBudgetSummary(month, year);
      setSummary(data);
    } catch (error) {
      console.error('Error loading summary:', error);
      Alert.alert('Error', 'Failed to load budget summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary();
    // Seed categories on first load
    api.seedCategories().catch(console.error);
  }, [month, year]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSummary();
  }, [month, year]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setShowPeriodMenu(false);
    
    const now = new Date();
    switch (period) {
      case 'This Month':
        setMonth(now.getMonth() + 1);
        setYear(now.getFullYear());
        break;
      case 'Last Month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
        setMonth(lastMonth.getMonth() + 1);
        setYear(lastMonth.getFullYear());
        break;
      case 'This Year':
        setMonth(now.getMonth() + 1);
        setYear(now.getFullYear());
        break;
      case 'Last Year':
        setMonth(now.getMonth() + 1);
        setYear(now.getFullYear() - 1);
        break;
    }
  };

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CNY: '¥', AUD: 'A$', CAD: 'C$'
    };
    return symbols[code] || '$';
  };

  const formatCurrency = (amount: number) => {
    const symbol = summary ? getCurrencySymbol(summary.currency) : '$';
    return `${symbol} ${amount.toLocaleString()}`;
  };

  if (loading && !summary) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const currentDay = currentDate.getDate();
  const daysRemaining = daysInMonth - currentDay;
  const dailyBudget = summary ? Math.floor(summary.remaining_budget / Math.max(daysRemaining, 1)) : 0;

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
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Period Selector */}
        <View style={styles.periodSection}>
          <TouchableOpacity
            style={styles.periodSelector}
            onPress={() => setShowPeriodMenu(!showPeriodMenu)}
          >
            <Feather name="calendar" size={20} color={COLORS.primary} />
            <Text style={styles.periodText}>{selectedPeriod}</Text>
            <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.periodInfo}>
            <Text style={styles.periodInfoText}>
              {currentDay} days passed • {formatCurrency(dailyBudget)} / day left
            </Text>
          </View>
          
          <TouchableOpacity style={styles.filterButton}>
            <Feather name="filter" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {showPeriodMenu && (
          <View style={styles.periodMenu}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodMenuItem,
                  selectedPeriod === period && styles.periodMenuItemActive,
                ]}
                onPress={() => handlePeriodChange(period)}
              >
                <Feather name="calendar" size={18} color={selectedPeriod === period ? COLORS.primary : COLORS.textSecondary} />
                <Text style={[
                  styles.periodMenuText,
                  selectedPeriod === period && styles.periodMenuTextActive,
                ]}>
                  {period}
                </Text>
                {period === 'This Year' && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>Popular</Text>
                  </View>
                )}
                {selectedPeriod === period && (
                  <Feather name="check" size={18} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.dataForText}>
          Showing data for: {format(new Date(year, month - 1), 'MMMM yyyy')}
        </Text>

        {/* Budget Overview Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overview</Text>
          
          <View style={styles.budgetMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Total Budget</Text>
              <Text style={[styles.metricValue, { color: COLORS.primary }]}>
                {formatCurrency(summary?.total_budget || 0)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Total Spent</Text>
              <Text style={[styles.metricValue, { color: COLORS.error }]}>
                {formatCurrency(summary?.total_spent || 0)}
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Remaining Budget</Text>
              <Text style={[styles.metricValue, { color: COLORS.success }]}>
                {formatCurrency(summary?.remaining_budget || 0)}
              </Text>
            </View>
          </View>

          <ProgressBar
            progress={summary ? (summary.total_spent / summary.total_budget) * 100 : 0}
            height={12}
          />
          
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>
              {summary ? Math.round((summary.total_spent / summary.total_budget) * 100) : 0}% Used
            </Text>
            <Text style={styles.progressLabel}>
              {summary ? Math.round((summary.remaining_budget / summary.total_budget) * 100) : 0}% Remaining
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
                  {formatCurrency(summary?.income || 0)}
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
                  {formatCurrency(summary?.expenses || 0)}
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
                {formatCurrency(summary?.savings || 0)}
              </Text>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.successLight }]}>
                <Feather name="dollar-sign" size={16} color={COLORS.success} />
              </View>
            </View>
          </View>

          <View style={styles.savingsRate}>
            <Text style={styles.savingsRateLabel}>Savings Rate</Text>
            <Text style={styles.savingsRateValue}>{summary?.savings_rate || 0}%</Text>
          </View>
          <ProgressBar
            progress={summary?.savings_rate || 0}
            height={8}
            color={COLORS.success}
          />
        </View>

        {/* Category Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category Summary</Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Category</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Budget</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Spent</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Remaining</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Progress</Text>
          </View>

          {summary?.categories && summary.categories.length > 0 ? (
            summary.categories.map((cat, index) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tableRow, index === summary.categories.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => navigation.navigate('CategoryDetails', { categoryId: cat.id })}
              >
                <View style={[styles.tableCell, { flex: 2 }]}>
                  <View style={styles.categoryIconContainer}>
                    <CategoryIcon name={cat.icon} size={20} color={COLORS.primary} />
                  </View>
                  <Text style={styles.categoryName}>{cat.category}</Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(cat.budget)}</Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>{formatCurrency(cat.spent)}</Text>
                <Text style={[styles.tableCell, { flex: 1, color: cat.remaining < 0 ? COLORS.error : COLORS.success }]}>
                  {formatCurrency(cat.remaining)}
                </Text>
                <View style={[styles.tableCell, { flex: 1.5, alignItems: 'flex-end' }]}>
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
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={48} color={COLORS.textDisabled} />
              <Text style={styles.emptyStateText}>No category budgets set</Text>
              <Text style={styles.emptyStateSubtext}>Tap the button below to add your first category budget</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddToBudget')}
          >
            <Feather name="plus" size={20} color={COLORS.primary} />
            <Text style={styles.addButtonText}>Add Category Budget</Text>
          </TouchableOpacity>
        </View>

        {/* Motivational Banner */}
        {summary && summary.savings_rate > 0 && (
          <View style={styles.motivationalBanner}>
            <View style={styles.bannerContent}>
              <View style={[styles.iconCircle, { backgroundColor: COLORS.warningLight }]}>
                <Feather name="zap" size={20} color={COLORS.warning} />
              </View>
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>You are doing great!</Text>
                <Text style={styles.bannerSubtitle}>
                  You've saved {summary.savings_rate}% of your income this month.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.insightsButton}
              onPress={() => navigation.navigate('BudgetInsights')}
            >
              <Feather name="bar-chart-2" size={18} color={COLORS.primary} />
              <Text style={styles.insightsButtonText}>View Insights</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddToBudget')}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
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
  periodSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
  },
  periodText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.medium,
    color: COLORS.textPrimary,
  },
  periodInfo: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  periodInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  filterButton: {
    padding: SPACING.sm,
  },
  periodMenu: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.md,
  },
  periodMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  periodMenuItemActive: {
    backgroundColor: COLORS.primaryLight + '20',
  },
  periodMenuText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
  },
  periodMenuTextActive: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  popularBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  popularText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.medium,
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
  },
  metricValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
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
    width: '100%',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyStateSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  motivationalBanner: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  bannerTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  bannerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
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
