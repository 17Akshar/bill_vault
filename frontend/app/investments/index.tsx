import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import api from '../../utils/api';
import Svg, { Circle, Path } from 'react-native-svg';

// Visual metadata per investment type — used for icon + colour on the dashboard.
const TYPE_META: Record<string, { name: string; icon: string; color: string }> = {
  stocks: { name: 'Shares / Stocks', icon: 'trending-up', color: '#00E676' },
  mutual_funds: { name: 'Mutual Funds', icon: 'pie-chart', color: '#448AFF' },
  etf: { name: 'Exchange Traded Funds', icon: 'stats-chart', color: '#7C4DFF' },
  bonds: { name: 'Bonds', icon: 'document-text', color: '#14B8A6' },
  reit: { name: 'REIT', icon: 'business', color: '#00BCD4' },
  fd: { name: 'Fixed Deposit', icon: 'lock-closed', color: '#FF6B81' },
  corporate_deposit: { name: 'Corporate Deposit', icon: 'briefcase', color: '#8D6E63' },
  rd: { name: 'Recurring Deposit', icon: 'calendar', color: '#9C27B0' },
  ppf: { name: 'PPF', icon: 'shield-checkmark', color: '#00BCD4' },
  nps: { name: 'NPS', icon: 'ribbon', color: '#4CAF50' },
  epf: { name: 'EPF', icon: 'wallet', color: '#9C27B0' },
  gold: { name: 'Gold', icon: 'diamond', color: '#FF9100' },
  silver: { name: 'Silver', icon: 'diamond', color: '#B0BEC5' },
  lic: { name: 'LIC', icon: 'shield', color: '#3F51B5' },
  term_insurance: { name: 'Term Insurance', icon: 'shield', color: '#3F51B5' },
  mediclaim: { name: 'Mediclaim', icon: 'medical', color: '#E91E63' },
  motor_insurance: { name: 'Motor Insurance', icon: 'car', color: '#FF5722' },
  vehicle_car: { name: 'Vehicle - Car', icon: 'car', color: '#FF5722' },
  vehicle_two_wheeler: { name: 'Vehicle - 2W', icon: 'bicycle', color: '#FF5722' },
  vehicle_other: { name: 'Vehicle - Other', icon: 'car-sport', color: '#FF5722' },
  esop: { name: 'ESOP', icon: 'gift', color: '#FFC107' },
  private_equity: { name: 'Private Equity', icon: 'trending-up', color: '#00BCD4' },
  arts_artifacts: { name: 'Arts & Artifacts', icon: 'color-palette', color: '#E91E63' },
  aif: { name: 'AIF', icon: 'pie-chart', color: '#9C27B0' },
  crypto: { name: 'Crypto', icon: 'logo-bitcoin', color: '#FF9100' },
  others: { name: 'Others', icon: 'ellipsis-horizontal', color: '#607D8B' },
};

const getTypeMeta = (type: string) => TYPE_META[type] || TYPE_META.others;

type AllocationItem = {
  type: string;
  value: number;
  percentage: number;
};

type DashboardData = {
  total_invested: number;
  total_current_value: number;
  total_gain_loss: number;
  gain_loss_percentage: number;
  total_dividends: number;
  total_count: number;
  asset_allocation: {
    by_type: AllocationItem[];
    total_portfolio_value: number;
  };
};

// Donut chart for asset allocation
const DonutChart = ({ data }: { data: AllocationItem[] }) => {
  const size = 140;
  const strokeWidth = 28;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;

  return (
    <View style={styles.chartContainer}>
      <Svg width={size} height={size}>
        {data.map((item, index) => {
          const percentage = item.percentage / 100;
          const strokeDashoffset = circumference * (1 - percentage);
          const rotation = currentAngle;
          currentAngle += percentage * 360;
          const meta = getTypeMeta(item.type);

          return (
            <Circle
              key={`${item.type}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              stroke={meta.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              rotation={rotation}
              origin={`${center}, ${center}`}
              strokeLinecap="round"
            />
          );
        })}
      </Svg>
      <View style={styles.chartCenter} pointerEvents="none">
        <Text style={styles.chartCenterText}>Portfolio</Text>
      </View>
    </View>
  );
};

const MiniTrendGraph = ({ positive }: { positive: boolean }) => {
  const points = positive
    ? '0,20 10,15 20,18 30,12 40,8 50,10 60,5'
    : '0,5 10,8 20,6 30,12 40,15 50,13 60,20';
  return (
    <Svg width={60} height={25} viewBox="0 0 60 25">
      <Path
        d={`M${points}`}
        stroke={positive ? '#00E676' : '#FF5252'}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default function InvestmentsDashboardScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    try {
      setError(null);
      const [dashRes, listRes] = await Promise.all([
        api.get('/investments/dashboard'),
        api.get('/investments'),
      ]);
      setDashboard(dashRes.data);
      setInvestments(listRes.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to load investments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll();
    }, [loadAll])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  // Group investments by type and aggregate metrics for the categories list
  const categories = React.useMemo(() => {
    if (!investments.length) return [];
    const totalValue = investments.reduce(
      (acc, inv) => acc + (inv.current_value || 0),
      0
    );
    const grouped: Record<string, any> = {};
    for (const inv of investments) {
      const type = inv.investment_type || 'others';
      if (!grouped[type]) {
        grouped[type] = {
          type,
          invested: 0,
          current: 0,
          count: 0,
        };
      }
      grouped[type].invested += inv.invested_amount || 0;
      grouped[type].current += inv.current_value || 0;
      grouped[type].count += 1;
    }
    return Object.values(grouped)
      .map((g: any) => {
        const gainLoss = g.current - g.invested;
        const gainLossPercent = g.invested > 0 ? (gainLoss / g.invested) * 100 : 0;
        const percentage = totalValue > 0 ? (g.current / totalValue) * 100 : 0;
        const meta = getTypeMeta(g.type);
        return {
          ...g,
          name: meta.name,
          icon: meta.icon,
          color: meta.color,
          gainLoss,
          gainLossPercent,
          percentage,
        };
      })
      .sort((a, b) => b.current - a.current);
  }, [investments]);

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Investments</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading your portfolio...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalValue = dashboard?.total_current_value || 0;
  const totalInvested = dashboard?.total_invested || 0;
  const totalGainLoss = dashboard?.total_gain_loss || 0;
  const gainLossPercentage = dashboard?.gain_loss_percentage || 0;
  const isPositive = totalGainLoss >= 0;
  const gainLossColor = isPositive ? '#00E676' : '#FF5252';
  const allocation = dashboard?.asset_allocation?.by_type || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="investments-back-btn">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Investments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/investments/select-type' as any)}
            testID="investments-add-header-btn"
          >
            <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: '#FF525215' }]}>
            <Ionicons name="alert-circle" size={18} color="#FF5252" />
            <Text style={{ color: '#FF5252', flex: 1, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {/* Empty state */}
        {dashboard && dashboard.total_count === 0 ? (
          <View style={styles.emptyState} testID="investments-empty-state">
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="trending-up" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Start your investment journey
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Track stocks, mutual funds, FDs, gold and more — all in one place.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/investments/select-type' as any)}
              testID="investments-empty-add-btn"
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.emptyBtnText}>Add Your First Investment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Portfolio Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card }]} testID="investments-summary-card">
              <View style={styles.summaryHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Total Investment Value
                  </Text>
                  <Text style={[styles.summaryAmount, { color: colors.text }]} testID="total-portfolio-value">
                    {formatINR(totalValue)}
                  </Text>
                </View>
                {allocation.length > 0 && <DonutChart data={allocation} />}
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total Invested
                  </Text>
                  <Text style={[styles.statValue, { color: colors.text }]} testID="total-invested-value">
                    {formatINR(totalInvested)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                    Total Gain/Loss
                  </Text>
                  <Text style={[styles.statValue, { color: gainLossColor }]} testID="total-gain-loss-value">
                    {isPositive ? '+' : '-'}
                    {formatINR(Math.abs(totalGainLoss))}
                  </Text>
                  <Text style={[styles.statPercent, { color: gainLossColor }]} testID="gain-loss-percentage">
                    {isPositive ? '+' : ''}
                    {gainLossPercentage.toFixed(2)}%
                  </Text>
                </View>
              </View>

              {(dashboard?.total_dividends || 0) > 0 && (
                <View style={[styles.dividendChip, { backgroundColor: '#448AFF15' }]} testID="dividend-chip">
                  <Ionicons name="cash-outline" size={14} color="#448AFF" />
                  <Text style={{ color: '#448AFF', fontSize: 12, fontWeight: '600' }}>
                    {formatINR(dashboard?.total_dividends || 0)} earned in dividends
                  </Text>
                </View>
              )}
            </View>

            {/* Investment Categories Section */}
            <View style={styles.categoriesSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Investment Categories
              </Text>

              {categories.map((category, index) => {
                const isCatPositive = category.gainLoss >= 0;
                const catColor = isCatPositive ? '#00E676' : '#FF5252';

                return (
                  <TouchableOpacity
                    key={category.type}
                    style={[
                      styles.categoryCard,
                      { backgroundColor: colors.card },
                      index === categories.length - 1 && { marginBottom: 0 },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (category.type === 'stocks') {
                        router.push('/investments/stocks' as any);
                      }
                    }}
                    testID={`category-card-${category.type}`}
                  >
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLeft}>
                        <View
                          style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}
                        >
                          <Ionicons name={category.icon as any} size={20} color={category.color} />
                        </View>
                        <View>
                          <Text style={[styles.categoryName, { color: colors.text }]}>
                            {category.name}
                          </Text>
                          <Text style={[styles.categoryPercent, { color: colors.textSecondary }]}>
                            {category.percentage.toFixed(1)}% · {category.count} {category.count === 1 ? 'asset' : 'assets'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.categoryRight}>
                        <MiniTrendGraph positive={isCatPositive} />
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                      </View>
                    </View>

                    <View style={styles.categoryStats}>
                      <View style={styles.categoryStatItem}>
                        <Text style={[styles.categoryStatLabel, { color: colors.textSecondary }]}>
                          Invested
                        </Text>
                        <Text style={[styles.categoryStatValue, { color: colors.text }]}>
                          {formatINR(category.invested)}
                        </Text>
                      </View>
                      <View style={styles.categoryStatItem}>
                        <Text style={[styles.categoryStatLabel, { color: colors.textSecondary }]}>
                          Current
                        </Text>
                        <Text style={[styles.categoryStatValue, { color: colors.text }]}>
                          {formatINR(category.current)}
                        </Text>
                      </View>
                      <View style={styles.categoryStatItem}>
                        <Text style={[styles.categoryStatLabel, { color: colors.textSecondary }]}>
                          Gain/Loss
                        </Text>
                        <Text style={[styles.categoryStatValue, { color: catColor }]}>
                          {isCatPositive ? '+' : '-'}
                          {formatINR(Math.abs(category.gainLoss))}
                        </Text>
                        <Text style={[styles.categoryStatPercent, { color: catColor }]}>
                          {isCatPositive ? '+' : ''}
                          {category.gainLossPercent.toFixed(2)}%
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: '#6366F1' }]}
              onPress={() => router.push('/investments/select-type' as any)}
              activeOpacity={0.8}
              testID="add-investment-btn"
            >
              <Ionicons name="add" size={24} color="#FFF" />
              <Text style={styles.addButtonText}>Add Investment</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: 'bold', flex: 1, marginLeft: 12 },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
    gap: 16,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Portfolio Summary Card
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryLabel: { fontSize: 13, marginBottom: 8 },
  summaryAmount: { fontSize: 28, fontWeight: 'bold' },
  chartContainer: {
    position: 'relative',
    width: 140,
    height: 140,
  },
  chartCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenterText: { fontSize: 12, color: '#999', fontWeight: '600' },
  summaryStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
    paddingTop: 16,
  },
  statItem: { flex: 1 },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(128,128,128,0.1)',
    marginHorizontal: 16,
  },
  statLabel: { fontSize: 12, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  statPercent: { fontSize: 14, fontWeight: '700' },

  dividendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 14,
    alignSelf: 'flex-start',
  },

  // Categories Section
  categoriesSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  categoryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  categoryPercent: { fontSize: 12, fontWeight: '600' },
  categoryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.05)',
  },
  categoryStatItem: { flex: 1 },
  categoryStatLabel: { fontSize: 11, marginBottom: 4 },
  categoryStatValue: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  categoryStatPercent: { fontSize: 12, fontWeight: '600' },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  addButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
