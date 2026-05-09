import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS, FONT_WEIGHTS } from '../constants/theme';
import { ProgressBar } from '../components/ProgressBar';
import { CategoryIcon } from '../components/CategoryIcon';
import { api } from '../services/api';
import { BudgetSummary } from '../types';
import { formatCurrency as fmt } from '../utils/currency';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SpendingTrend {
  category: string;
  icon: string;
  spent: number;
  budget: number;
  progress: number;
  trend: 'up' | 'down' | 'stable';
}

interface Alert {
  category: string;
  icon: string;
  progress: number;
  spent: number;
  budget: number;
  severity: 'warning' | 'danger';
}

export const BudgetInsightsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  
  // Insights data
  const [highestSpending, setHighestSpending] = useState<any>(null);
  const [monthlySavingsRate, setMonthlySavingsRate] = useState(0);
  const [budgetAlerts, setBudgetAlerts] = useState<Alert[]>([]);
  const [spendingTrends, setSpendingTrends] = useState<SpendingTrend[]>([]);
  const [savingsInsights, setSavingsInsights] = useState<any>(null);

  const currentDate = new Date();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    loadInsightsData();
  }, []);

  const loadInsightsData = async () => {
    try {
      setLoading(true);
      
      // Fetch budget summary
      const budgetData = await api.getBudgetSummary(month, year);
      setSummary(budgetData);
      
      // Calculate insights
      calculateHighestSpending(budgetData);
      calculateSavingsRate(budgetData);
      calculateBudgetAlerts(budgetData);
      calculateSpendingTrends(budgetData);
      calculateSavingsInsights(budgetData);
      
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInsightsData();
  };

  const calculateHighestSpending = (data: BudgetSummary) => {
    if (!data.categories || data.categories.length === 0) return;
    
    const highest = data.categories.reduce((max, cat) => 
      cat.spent > max.spent ? cat : max
    );
    
    setHighestSpending(highest);
  };

  const calculateSavingsRate = (data: BudgetSummary) => {
    setMonthlySavingsRate(data.savings_rate);
  };

  const calculateBudgetAlerts = (data: BudgetSummary) => {
    if (!data.categories) return;
    
    const alerts: Alert[] = [];
    
    data.categories.forEach(cat => {
      if (cat.progress >= 80) {
        alerts.push({
          category: cat.category,
          icon: cat.icon,
          progress: cat.progress,
          spent: cat.spent,
          budget: cat.budget,
          severity: cat.progress >= 100 ? 'danger' : 'warning',
        });
      }
    });
    
    // Sort by progress (highest first)
    alerts.sort((a, b) => b.progress - a.progress);
    setBudgetAlerts(alerts);
  };

  const calculateSpendingTrends = (data: BudgetSummary) => {
    if (!data.categories) return;
    
    const trends: SpendingTrend[] = data.categories.map(cat => {
      // Determine trend based on progress
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (cat.progress > 75) trend = 'up';
      else if (cat.progress < 25) trend = 'down';
      
      return {
        category: cat.category,
        icon: cat.icon,
        spent: cat.spent,
        budget: cat.budget,
        progress: cat.progress,
        trend,
      };
    });
    
    // Sort by spent amount (highest first)
    trends.sort((a, b) => b.spent - a.spent);
    setSpendingTrends(trends);
  };

  const calculateSavingsInsights = (data: BudgetSummary) => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const currentDay = currentDate.getDate();
    const daysRemaining = Math.max(daysInMonth - currentDay, 1);
    
    const projectedSavings = data.savings + (data.savings / currentDay) * daysRemaining;
    const savingsGoal = data.total_budget * 0.2; // Assume 20% savings goal
    const onTrack = projectedSavings >= savingsGoal;
    
    setSavingsInsights({
      current: data.savings,
      projected: Math.round(projectedSavings),
      goal: Math.round(savingsGoal),
      onTrack,
      savingsRate: data.savings_rate,
    });
  };

  const formatCurrency = (amount: number) => fmt(amount, summary?.currency);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analyzing your budget...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Budget Insights</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: COLORS.primary + '20' }]}>
            <Feather name="trending-up" size={24} color={COLORS.primary} />
            <Text style={styles.statValue}>{summary?.savings_rate || 0}%</Text>
            <Text style={styles.statLabel}>Savings Rate</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.success + '20' }]}>
            <Feather name="dollar-sign" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>{formatCurrency(summary?.savings || 0)}</Text>
            <Text style={styles.statLabel}>Total Savings</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: COLORS.error + '20' }]}>
            <Feather name="alert-circle" size={24} color={COLORS.error} />
            <Text style={styles.statValue}>{budgetAlerts.length}</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>

        {/* Highest Spending Category */}
        {highestSpending && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="award" size={24} color={COLORS.warning} />
              <Text style={styles.cardTitle}>Highest Spending</Text>
            </View>
            
            <View style={styles.highestSpendingCard}>
              <View style={styles.categoryIconLarge}>
                <CategoryIcon name={highestSpending.icon} size={32} color={COLORS.warning} />
              </View>
              <View style={styles.highestSpendingContent}>
                <Text style={styles.highestSpendingCategory}>{highestSpending.category}</Text>
                <Text style={styles.highestSpendingAmount}>
                  {formatCurrency(highestSpending.spent)}
                </Text>
                <Text style={styles.highestSpendingSubtext}>
                  {Math.round((highestSpending.spent / (summary?.total_spent || 1)) * 100)}% of total spending
                </Text>
              </View>
              <View style={styles.highestSpendingProgress}>
                <Text style={styles.progressPercentage}>{Math.round(highestSpending.progress)}%</Text>
                <ProgressBar
                  progress={highestSpending.progress}
                  height={8}
                  showWarning={highestSpending.progress > 100}
                />
              </View>
            </View>
          </View>
        )}

        {/* Monthly Savings Rate */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="pie-chart" size={24} color={COLORS.success} />
            <Text style={styles.cardTitle}>Monthly Savings Rate</Text>
          </View>
          
          <View style={styles.savingsRateCard}>
            <View style={styles.savingsRateCircle}>
              <Text style={styles.savingsRateValue}>{monthlySavingsRate.toFixed(1)}%</Text>
            </View>
            
            <View style={styles.savingsRateDetails}>
              <View style={styles.savingsRateRow}>
                <View style={styles.savingsRateItem}>
                  <Feather name="arrow-down-circle" size={20} color={COLORS.success} />
                  <View>
                    <Text style={styles.savingsRateLabel}>Income</Text>
                    <Text style={[styles.savingsRateAmount, { color: COLORS.success }]}>
                      {formatCurrency(summary?.income || 0)}
                    </Text>
                  </View>
                </View>
                <View style={styles.savingsRateItem}>
                  <Feather name="arrow-up-circle" size={20} color={COLORS.error} />
                  <View>
                    <Text style={styles.savingsRateLabel}>Expenses</Text>
                    <Text style={[styles.savingsRateAmount, { color: COLORS.error }]}>
                      {formatCurrency(summary?.expenses || 0)}
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.savingsBreakdown}>
                <ProgressBar
                  progress={monthlySavingsRate}
                  height={12}
                  color={monthlySavingsRate >= 20 ? COLORS.success : COLORS.warning}
                />
                <Text style={styles.savingsBreakdownText}>
                  {monthlySavingsRate >= 20 ? 'Great job! ' : 'Target: 20% - '}
                  You saved {formatCurrency(summary?.savings || 0)} this month
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Budget Exceeded Alerts */}
        {budgetAlerts.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="alert-triangle" size={24} color={COLORS.error} />
              <Text style={styles.cardTitle}>Budget Alerts</Text>
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{budgetAlerts.length}</Text>
              </View>
            </View>
            
            {budgetAlerts.map((alert, index) => (
              <View
                key={index}
                style={[
                  styles.alertItem,
                  alert.severity === 'danger' && styles.alertItemDanger,
                ]}
              >
                <View style={styles.alertIconContainer}>
                  <CategoryIcon name={alert.icon} size={24} color={COLORS.white} />
                </View>
                
                <View style={styles.alertContent}>
                  <View style={styles.alertHeader}>
                    <Text style={styles.alertCategory}>{alert.category}</Text>
                    <Text style={[styles.alertProgress, alert.severity === 'danger' && { color: COLORS.error }]}>
                      {Math.round(alert.progress)}%
                    </Text>
                  </View>
                  
                  <View style={styles.alertAmounts}>
                    <Text style={styles.alertAmount}>
                      Spent: {formatCurrency(alert.spent)}
                    </Text>
                    <Text style={styles.alertAmount}>
                      Budget: {formatCurrency(alert.budget)}
                    </Text>
                  </View>
                  
                  <ProgressBar
                    progress={alert.progress}
                    height={6}
                    showWarning={alert.progress > 100}
                  />
                  
                  {alert.severity === 'danger' && (
                    <View style={styles.alertMessage}>
                      <Feather name="x-circle" size={14} color={COLORS.error} />
                      <Text style={styles.alertMessageText}>
                        Budget exceeded by {formatCurrency(alert.spent - alert.budget)}
                      </Text>
                    </View>
                  )}
                  
                  {alert.severity === 'warning' && (
                    <View style={styles.alertMessage}>
                      <Feather name="info" size={14} color={COLORS.warning} />
                      <Text style={styles.alertMessageText}>
                        {formatCurrency(alert.budget - alert.spent)} remaining
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Spending Trends */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="bar-chart-2" size={24} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Spending Trends</Text>
          </View>
          
          {spendingTrends.slice(0, 5).map((trend, index) => (
            <View key={index} style={styles.trendItem}>
              <View style={styles.trendLeft}>
                <View style={styles.trendIconContainer}>
                  <CategoryIcon name={trend.icon} size={20} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.trendCategory}>{trend.category}</Text>
                  <Text style={styles.trendAmount}>{formatCurrency(trend.spent)}</Text>
                </View>
              </View>
              
              <View style={styles.trendRight}>
                <View style={styles.trendIndicator}>
                  {trend.trend === 'up' && (
                    <Feather name="trending-up" size={20} color={COLORS.error} />
                  )}
                  {trend.trend === 'down' && (
                    <Feather name="trending-down" size={20} color={COLORS.success} />
                  )}
                  {trend.trend === 'stable' && (
                    <Feather name="minus" size={20} color={COLORS.textSecondary} />
                  )}
                  <Text style={styles.trendProgress}>{Math.round(trend.progress)}%</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Savings Insights */}
        {savingsInsights && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Feather name="target" size={24} color={COLORS.success} />
              <Text style={styles.cardTitle}>Savings Insights</Text>
            </View>
            
            <View style={styles.savingsInsightsCard}>
              <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                  <Text style={styles.insightLabel}>Current Savings</Text>
                  <Text style={[styles.insightValue, { color: COLORS.success }]}>
                    {formatCurrency(savingsInsights.current)}
                  </Text>
                </View>
                <View style={styles.insightItem}>
                  <Text style={styles.insightLabel}>Projected Savings</Text>
                  <Text style={[styles.insightValue, { color: COLORS.primary }]}>
                    {formatCurrency(savingsInsights.projected)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.insightProgressContainer}>
                <View style={styles.insightProgressHeader}>
                  <Text style={styles.insightProgressLabel}>Savings Goal Progress</Text>
                  <Text style={styles.insightProgressValue}>
                    {formatCurrency(savingsInsights.goal)}
                  </Text>
                </View>
                <ProgressBar
                  progress={(savingsInsights.current / savingsInsights.goal) * 100}
                  height={12}
                  color={savingsInsights.onTrack ? COLORS.success : COLORS.warning}
                />
              </View>
              
              <View style={[styles.insightStatus, savingsInsights.onTrack ? styles.insightStatusGood : styles.insightStatusWarning]}>
                <Feather
                  name={savingsInsights.onTrack ? 'check-circle' : 'alert-circle'}
                  size={20}
                  color={savingsInsights.onTrack ? COLORS.success : COLORS.warning}
                />
                <Text style={styles.insightStatusText}>
                  {savingsInsights.onTrack
                    ? 'You\'re on track to meet your savings goal! 🎉'
                    : 'Consider reducing expenses to improve savings'}
                </Text>
              </View>
              
              <View style={styles.insightTips}>
                <Text style={styles.insightTipsTitle}>💡 Quick Tips</Text>
                {monthlySavingsRate < 20 && (
                  <Text style={styles.insightTip}>
                    • Try to save at least 20% of your income
                  </Text>
                )}
                {budgetAlerts.length > 0 && (
                  <Text style={styles.insightTip}>
                    • Review categories that exceeded their budgets
                  </Text>
                )}
                {highestSpending && highestSpending.progress > 80 && (
                  <Text style={styles.insightTip}>
                    • Monitor {highestSpending.category} spending closely
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
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
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
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
  backButton: {
    padding: SPACING.xs,
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  statValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    flex: 1,
  },
  highestSpendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight + '20',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  categoryIconLarge: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    ...SHADOWS.sm,
  },
  highestSpendingContent: {
    flex: 1,
  },
  highestSpendingCategory: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  highestSpendingAmount: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.warning,
    marginVertical: SPACING.xs,
  },
  highestSpendingSubtext: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  highestSpendingProgress: {
    width: 60,
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.warning,
    marginBottom: SPACING.xs,
  },
  savingsRateCard: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  savingsRateCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 8,
    borderColor: COLORS.success,
  },
  savingsRateValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.success,
  },
  savingsRateDetails: {
    flex: 1,
  },
  savingsRateRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  savingsRateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  savingsRateLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  savingsRateAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
  },
  savingsBreakdown: {
    gap: SPACING.xs,
  },
  savingsBreakdownText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  alertBadge: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.round,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBadgeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: FONT_WEIGHTS.bold,
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.warningLight + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  alertItemDanger: {
    backgroundColor: COLORS.errorLight + '15',
    borderLeftColor: COLORS.error,
  },
  alertIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.warning,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  alertCategory: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  alertProgress: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.warning,
  },
  alertAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  alertAmount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  alertMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  alertMessageText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  trendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  trendIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendCategory: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.textPrimary,
  },
  trendAmount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  trendRight: {
    alignItems: 'flex-end',
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  trendProgress: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  savingsInsightsCard: {
    gap: SPACING.md,
  },
  insightRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  insightItem: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  insightLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  insightValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  insightProgressContainer: {
    gap: SPACING.sm,
  },
  insightProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightProgressLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  insightProgressValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
  },
  insightStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  insightStatusGood: {
    backgroundColor: COLORS.successLight + '30',
  },
  insightStatusWarning: {
    backgroundColor: COLORS.warningLight + '30',
  },
  insightStatusText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHTS.medium,
  },
  insightTips: {
    backgroundColor: COLORS.primaryLight + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  insightTipsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  insightTip: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
});
