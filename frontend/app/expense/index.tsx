import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-gifted-charts';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import DonutChart from '../../components/charts/DonutChart';
import api from '../../utils/api';
import {
  DEMO_EXPENSES, DEMO_CATEGORY_BREAKDOWN, DEMO_MONTHLY_TREND, DEMO_ACCOUNTS,
  type ExpenseItem, type ExpenseCategoryBreakdown,
} from './_data';

const { width: SW } = Dimensions.get('window');

type Period = 'month' | 'quarter' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
};

const TOTAL_BY_PERIOD: Record<Period, number> = {
  month: 75000,
  quarter: 215000,
  year: 842000,
};

const TXN_COUNT_BY_PERIOD: Record<Period, number> = {
  month: 42,
  quarter: 127,
  year: 498,
};

function formatDate(iso: string) {
  try { return format(parseISO(iso), 'd MMM yyyy'); } catch { return iso; }
}

export default function ExpenseDashboard() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [period, setPeriod] = useState<Period>('month');
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseItem[]>(DEMO_EXPENSES);
  const [categories, setCategories] = useState<ExpenseCategoryBreakdown[]>(DEMO_CATEGORY_BREAKDOWN);
  const [showFilter, setShowFilter] = useState(false);

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;
  const PURPLE = '#7C5CE7';
  const RED    = '#EF4444';

  const totalExpense = TOTAL_BY_PERIOD[period];
  const avgMonthly   = period === 'month' ? totalExpense : period === 'quarter' ? Math.round(totalExpense / 3) : Math.round(totalExpense / 12);
  const txnCount     = TXN_COUNT_BY_PERIOD[period];
  const growth       = 12;

  const safeGet = (url: string, cfg?: any) =>
    Promise.race([
      api.get(url, cfg).catch(() => ({ data: [] })),
      new Promise<{ data: any[] }>(res => setTimeout(() => res({ data: [] }), 4000)),
    ]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const now = new Date();
      const res = await safeGet(`/expenses?month=${now.getMonth() + 1}&year=${now.getFullYear()}`);
      if (res.data && res.data.length > 0) {
        setExpenses(res.data.slice(0, 10));
      }
    } catch {
      // keep dummy data
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = () => loadData(true);

  const recentExpenses = expenses.slice(0, 5);

  const lineData = DEMO_MONTHLY_TREND.map(m => ({ value: m.value / 1000, label: m.label }));

  const donutData = categories.map(c => ({ value: c.amount, color: c.color, label: c.label }));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Expense</Text>
        <TouchableOpacity onPress={() => setShowFilter(!showFilter)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="filter-outline" size={22} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {/* Period Tabs */}
      <View style={[styles.tabRow, { backgroundColor: CARD, borderColor: colors.border }]}>
        {(['month', 'quarter', 'year'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.tab, period === p && { backgroundColor: PURPLE }]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.tabText, { color: period === p ? '#FFF' : colors.textSecondary }]}>
              {PERIOD_LABELS[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PURPLE} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Expense</Text>
              <Text style={[styles.summaryAmount, { color: RED }]}>{formatINR(totalExpense)}</Text>
              <View style={styles.growthBadge}>
                <Ionicons name="arrow-up" size={12} color={RED} />
                <Text style={[styles.growthText, { color: RED }]}>{growth}% vs last {period === 'month' ? 'month' : period === 'quarter' ? 'quarter' : 'year'}</Text>
              </View>
            </View>
            <View style={styles.chartContainer}>
              <LineChart
                data={lineData}
                width={SW * 0.38}
                height={64}
                color={RED}
                thickness={2}
                hideDataPoints
                areaChart
                startFillColor={RED}
                endFillColor="transparent"
                startOpacity={0.25}
                endOpacity={0}
                hideAxesAndRules
                hideYAxisText
                xAxisLabelsHeight={0}
                pointerConfig={{ pointerStripHeight: 0, pointerColor: 'transparent' }}
              />
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: CARD }]}>
            <View style={[styles.statIconBox, { backgroundColor: `${PURPLE}22` }]}>
              <Ionicons name="swap-horizontal-outline" size={18} color={PURPLE} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Transactions</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{txnCount}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: CARD }]}>
            <View style={[styles.statIconBox, { backgroundColor: `${RED}22` }]}>
              <Ionicons name="trending-down-outline" size={18} color={RED} />
            </View>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg Monthly Expense</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatINR(avgMonthly)}</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Expense by Category</Text>
            <TouchableOpacity onPress={() => router.push('/expense/categories' as any)}>
              <Text style={[styles.viewAll, { color: PURPLE }]}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.donutRow}>
            {/* Donut chart */}
            <DonutChart
              data={donutData}
              size={160}
              strokeWidth={22}
              centerValue={formatINR(totalExpense)}
              centerLabel="Total"
            />

            {/* Category legend */}
            <View style={styles.legendList}>
              {categories.map(cat => (
                <View key={cat.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                  <View style={styles.legendMeta}>
                    <Text style={[styles.legendName, { color: colors.text }]}>{cat.label}</Text>
                    <Text style={[styles.legendAmt, { color: colors.textSecondary }]}>{formatINR(cat.amount)}</Text>
                  </View>
                  <Text style={[styles.legendPct, { color: colors.textSecondary }]}>{cat.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Recent Expenses */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => router.push('/expense/analytics' as any)}>
              <Text style={[styles.viewAll, { color: PURPLE }]}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentExpenses.map(exp => (
            <TouchableOpacity
              key={exp.id}
              style={[styles.expenseRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push({ pathname: '/expense/[id]' as any, params: { id: exp.id } })}
              activeOpacity={0.7}
            >
              <View style={[styles.expenseIcon, { backgroundColor: `${exp.categoryColor}22` }]}>
                <Ionicons name={exp.categoryIcon as any} size={20} color={exp.categoryColor} />
              </View>
              <View style={styles.expenseInfo}>
                <Text style={[styles.expenseTitle, { color: colors.text }]}>{exp.title}</Text>
                <Text style={[styles.expenseSub, { color: colors.textSecondary }]}>{exp.categoryLabel}</Text>
              </View>
              <View style={styles.expenseRight}>
                <Text style={[styles.expenseDate, { color: colors.textSecondary }]}>{formatDate(exp.date)}</Text>
                <Text style={[styles.expenseAmount, { color: RED }]}>-{formatINR(exp.amount)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: PURPLE }]}
            onPress={() => router.push('/expense/add' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: CARD, borderColor: colors.border }]}
            onPress={() => router.push('/expense/analytics' as any)}
            activeOpacity={0.85}
          >
            <Text style={[styles.viewAllBtnText, { color: colors.text }]}>View All Expenses</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:  { fontSize: 20, fontWeight: '700' },
  tabRow:       { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 4, borderWidth: 1, marginBottom: 12 },
  tab:          { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabText:      { fontSize: 13, fontWeight: '600' },
  scroll:       { paddingHorizontal: 20, paddingTop: 4 },
  card:         { borderRadius: 16, padding: 16, marginBottom: 14 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, marginBottom: 4 },
  summaryAmount:{ fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  growthBadge:  { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
  growthText:   { fontSize: 12, fontWeight: '600' },
  chartContainer: { overflow: 'hidden', marginRight: -8 },
  statsRow:     { flexDirection: 'row', gap: 12, marginBottom: 14 },
  statCard:     { flex: 1, borderRadius: 16, padding: 14 },
  statIconBox:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel:    { fontSize: 11, marginBottom: 4 },
  statValue:    { fontSize: 18, fontWeight: '700' },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAll:      { fontSize: 13, fontWeight: '600' },
  donutRow:     { flexDirection: 'row', gap: 16, alignItems: 'center' },
  legendList:   { flex: 1, gap: 8 },
  legendItem:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:    { width: 8, height: 8, borderRadius: 4 },
  legendMeta:   { flex: 1 },
  legendName:   { fontSize: 12, fontWeight: '600' },
  legendAmt:    { fontSize: 11, marginTop: 1 },
  legendPct:    { fontSize: 11, fontWeight: '600', width: 32, textAlign: 'right' },
  expenseRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  expenseIcon:  { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expenseInfo:  { flex: 1 },
  expenseTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  expenseSub:   { fontSize: 12 },
  expenseRight: { alignItems: 'flex-end', marginRight: 4 },
  expenseDate:  { fontSize: 11, marginBottom: 2 },
  expenseAmount:{ fontSize: 14, fontWeight: '700' },
  actionRow:    { flexDirection: 'row', gap: 12, marginTop: 4 },
  addBtn:       { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 6 },
  addBtnText:   { color: '#FFF', fontSize: 15, fontWeight: '700' },
  viewAllBtn:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1 },
  viewAllBtnText: { fontSize: 14, fontWeight: '600' },
});
