import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import DonutChart from '../../components/charts/DonutChart';
import {
  DEMO_CATEGORY_BREAKDOWN, DEMO_MONTHLY_TREND, DEMO_EXPENSES,
} from './_data';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 56;
const PURPLE = '#7C5CE7';
const RED    = '#EF4444';
const GREEN  = '#22C55E';

type Filter = 'monthly' | 'quarterly' | 'yearly';

const QUARTERLY_TREND = [
  { label: 'Q1', value: 165000 },
  { label: 'Q2', value: 204000 },
  { label: 'Q3', value: 188000 },
  { label: 'Q4', value: 285000 },
];
const YEARLY_TREND = [
  { label: '2022', value: 720000 },
  { label: '2023', value: 810000 },
  { label: '2024', value: 842000 },
];

export default function ExpenseAnalytics() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('monthly');

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const trendData = filter === 'monthly' ? DEMO_MONTHLY_TREND
    : filter === 'quarterly' ? QUARTERLY_TREND
    : YEARLY_TREND;

  const lineData = trendData.map(d => ({ value: d.value / 1000, label: d.label, dataPointText: '' }));

  const barData = DEMO_MONTHLY_TREND.map(d => ({
    value: d.value / 1000,
    label: d.label,
    frontColor: RED,
    gradientColor: '#FF000033',
  }));

  const donutData = DEMO_CATEGORY_BREAKDOWN.map(c => ({ value: c.amount, color: c.color, label: c.label }));
  const totalExpense = DEMO_CATEGORY_BREAKDOWN.reduce((s, c) => s + c.amount, 0);

  const topCategories = [...DEMO_CATEGORY_BREAKDOWN].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const StatCard = ({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: CARD }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Expense Analytics</Text>
        <TouchableOpacity onPress={() => router.push('/expense/add' as any)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="add-circle-outline" size={24} color={PURPLE} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {(['monthly', 'quarterly', 'yearly'] as Filter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filter === f && { backgroundColor: PURPLE }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipText, { color: filter === f ? '#FFF' : colors.textSecondary }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard label="This Month"     value={formatINR(75000)}  icon="trending-down-outline"  color={RED}    />
          <StatCard label="Avg Monthly"    value={formatINR(68000)}  icon="analytics-outline"      color={PURPLE} />
          <StatCard label="Total Txns"     value="42"                icon="swap-horizontal-outline" color={GREEN}  />
          <StatCard label="YTD Total"      value={formatINR(842000)} icon="calendar-outline"        color="#FFB300"/>
        </View>

        {/* Monthly Trend Line */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Expense Trend</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            {filter === 'monthly' ? 'Last 6 months' : filter === 'quarterly' ? 'This year (quarterly)' : 'Last 3 years'}
          </Text>
          <View style={styles.chartWrap}>
            <LineChart
              data={lineData}
              width={CHART_W}
              height={160}
              color={RED}
              thickness={2.5}
              hideDataPoints={false}
              dataPointsColor={RED}
              dataPointsRadius={4}
              areaChart
              startFillColor={RED}
              endFillColor="transparent"
              startOpacity={0.2}
              endOpacity={0}
              rulesColor={colors.border}
              rulesType="solid"
              xAxisColor={colors.border}
              yAxisColor="transparent"
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              curved
            />
          </View>
        </View>

        {/* Category Donut */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Category Breakdown</Text>
            <TouchableOpacity onPress={() => router.push('/expense/categories' as any)}>
              <Text style={[styles.viewAll, { color: PURPLE }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.donutSection}>
            <DonutChart
              data={donutData}
              size={170}
              strokeWidth={22}
              centerValue={formatINR(totalExpense)}
              centerLabel="Total"
            />
            <View style={styles.donutLegend}>
              {DEMO_CATEGORY_BREAKDOWN.map(c => (
                <View key={c.key} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                  <Text style={[styles.legendName, { color: colors.text }]} numberOfLines={1}>{c.label}</Text>
                  <Text style={[styles.legendPct, { color: colors.textSecondary }]}>{c.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Bar chart — monthly */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Comparison</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Last 6 months (₹ thousands)</Text>
          <View style={styles.chartWrap}>
            <BarChart
              data={barData}
              width={CHART_W}
              height={160}
              barWidth={28}
              spacing={18}
              roundedTop
              roundedBottom
              hideRules={false}
              rulesColor={colors.border}
              xAxisColor={colors.border}
              yAxisColor="transparent"
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
              isAnimated
              animationDuration={600}
              noOfSections={4}
            />
          </View>
        </View>

        {/* Top Categories */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Top Spending Categories</Text>
          {topCategories.map((cat, idx) => (
            <View key={cat.key} style={[styles.topCatRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.topCatRank, { color: colors.textSecondary }]}>#{idx + 1}</Text>
              <View style={[styles.topCatIcon, { backgroundColor: `${cat.color}22` }]}>
                <Ionicons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              <View style={styles.topCatMeta}>
                <Text style={[styles.topCatName, { color: colors.text }]}>{cat.label}</Text>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                </View>
              </View>
              <View style={styles.topCatRight}>
                <Text style={[styles.topCatAmt, { color: colors.text }]}>{formatINR(cat.amount)}</Text>
                <Text style={[styles.topCatPct, { color: cat.color }]}>{cat.percentage}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recurring Summary */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Recurring Expenses</Text>
          <View style={styles.recurringGrid}>
            {[
              { label: 'Active',   value: '4',           color: GREEN  },
              { label: 'Monthly',  value: formatINR(35800), color: PURPLE },
              { label: 'Yearly',   value: formatINR(429600), color: RED   },
            ].map(item => (
              <View key={item.label} style={[styles.recurringCard, { backgroundColor: `${item.color}11` }]}>
                <Text style={[styles.recurringValue, { color: item.color }]}>{item.value}</Text>
                <Text style={[styles.recurringLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:    { fontSize: 18, fontWeight: '700' },
  scroll:         { paddingHorizontal: 20, paddingTop: 4 },
  filterRow:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip:           { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(124,92,231,0.12)' },
  chipText:       { fontSize: 13, fontWeight: '600' },
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard:       { width: (SW - 50) / 2, borderRadius: 14, padding: 14 },
  statIcon:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue:      { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statLabel:      { fontSize: 11 },
  card:           { borderRadius: 16, padding: 16, marginBottom: 14 },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle:      { fontSize: 16, fontWeight: '700' },
  cardSub:        { fontSize: 12, marginBottom: 12 },
  viewAll:        { fontSize: 13, fontWeight: '600' },
  chartWrap:      { marginHorizontal: -4, marginTop: 4 },
  donutSection:   { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 4 },
  donutLegend:    { flex: 1, gap: 7 },
  legendRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendName:     { flex: 1, fontSize: 12, fontWeight: '500' },
  legendPct:      { fontSize: 11, width: 30, textAlign: 'right' },
  topCatRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  topCatRank:     { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'center' },
  topCatIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topCatMeta:     { flex: 1, gap: 6 },
  topCatName:     { fontSize: 13, fontWeight: '600' },
  progressBar:    { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: 4, borderRadius: 2 },
  topCatRight:    { alignItems: 'flex-end' },
  topCatAmt:      { fontSize: 13, fontWeight: '700' },
  topCatPct:      { fontSize: 11, fontWeight: '600', marginTop: 2 },
  recurringGrid:  { flexDirection: 'row', gap: 10, marginTop: 8 },
  recurringCard:  { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  recurringValue: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  recurringLabel: { fontSize: 11, fontWeight: '600' },
});
