import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../utils/api';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedMonth] = useState(new Date());

  useEffect(() => {
    loadAnalytics();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAnalytics();
    }, [])
  );

  const loadAnalytics = async () => {
    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      
      const response = await api.get('/analytics/spending', {
        params: { month, year }
      });
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!analytics || analytics.total_bills === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No data available for analysis
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const categoryColors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
  ];

  const pieData = analytics.category_breakdown.map((item: any, index: number) => ({
    value: item.amount,
    color: categoryColors[index % categoryColors.length],
    text: item.category,
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {format(selectedMonth, 'MMMM yyyy')}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Overview Cards */}
        <View style={styles.cardsContainer}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Ionicons name="wallet-outline" size={32} color={colors.primary} />
            <Text style={[styles.cardValue, { color: colors.text }]}>
              ${analytics.total_amount.toFixed(2)}
            </Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Total Bills</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
            <Text style={[styles.cardValue, { color: colors.success }]}>
              ${analytics.paid_amount.toFixed(2)}
            </Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Paid</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
            <Text style={[styles.cardValue, { color: colors.danger }]}>
              ${analytics.unpaid_amount.toFixed(2)}
            </Text>
            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Unpaid</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
          
          {pieData.length > 0 && (
            <View style={styles.chartContainer}>
              <PieChart
                data={pieData}
                donut
                radius={80}
                innerRadius={50}
                centerLabelComponent={() => (
                  <View style={styles.centerLabel}>
                    <Text style={[styles.centerLabelValue, { color: colors.text }]}>
                      {analytics.total_bills}
                    </Text>
                    <Text style={[styles.centerLabelText, { color: colors.textSecondary }]}>
                      Bills
                    </Text>
                  </View>
                )}
              />
            </View>
          )}

          <View style={styles.legendContainer}>
            {analytics.category_breakdown.map((item: any, index: number) => (
              <View key={index} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: categoryColors[index % categoryColors.length] }
                  ]}
                />
                <Text style={[styles.legendText, { color: colors.text }]}>
                  {item.category}
                </Text>
                <Text style={[styles.legendAmount, { color: colors.text }]}>
                  ${item.amount.toFixed(2)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Budget Status */}
        {analytics.budget_status && analytics.budget_status.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Status</Text>
            
            {analytics.budget_status.map((budget: any, index: number) => (
              <View key={index} style={styles.budgetItem}>
                <View style={styles.budgetHeader}>
                  <Text style={[styles.budgetCategory, { color: colors.text }]}>
                    {budget.category}
                  </Text>
                  <Text style={[styles.budgetAmount, { color: colors.text }]}>
                    ${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(budget.percentage, 100)}%`,
                        backgroundColor:
                          budget.percentage > 100
                            ? colors.danger
                            : budget.percentage > 75
                            ? colors.warning
                            : colors.success,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.budgetPercentage,
                    {
                      color:
                        budget.percentage > 100
                          ? colors.danger
                          : budget.percentage > 75
                          ? colors.warning
                          : colors.success,
                    },
                  ]}
                >
                  {budget.percentage.toFixed(0)}% used
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Status</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {analytics.paid_bills}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid Bills</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {analytics.unpaid_bills}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unpaid Bills</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {((analytics.paid_bills / analytics.total_bills) * 100).toFixed(0)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completion</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  cardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  cardLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerLabelValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  centerLabelText: {
    fontSize: 12,
  },
  legendContainer: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
    fontSize: 14,
  },
  legendAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetItem: {
    marginBottom: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  budgetCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  budgetAmount: {
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetPercentage: {
    fontSize: 12,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});