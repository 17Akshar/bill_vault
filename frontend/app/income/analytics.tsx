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
import { DEMO_MONTHLY_TREND, DEMO_SOURCE_BREAKDOWN } from './dummyData';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 56;
const GREEN  = '#00E676';
const PURPLE = '#7C5CE7';
const RED    = '#EF4444';

type Filter = 'monthly' | 'quarterly' | 'yearly';

const QUARTERLY = [
  { label: 'Q1', income: 348000, expense: 165000 },
  { label: 'Q2', income: 377000, expense: 204000 },
  { label: 'Q3', income: 315000, expense: 188000 },
  { label: 'Q4', income: 410000, expense: 285000 },
];
const YEARLY = [
  { label: '2022', income: 1200000, expense: 720000 },
  { label: '2023', income: 1380000, expense: 810000 },
  { label: '2024', income: 1450000, expense: 842000 },
];

export default function IncomeAnalytics() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('monthly');

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const rawTrend = filter === 'monthly' ? DEMO_MONTHLY_TREND
    : filter === 'quarterly' ? QUARTERLY : YEARLY;

  const lineData = rawTrend.map(d => ({ value: d.income / 1000, label: d.label }));
  const barData  = rawTrend.map(d => ([
    { value: d.income / 1000,  frontColor: GREEN, label: d.label },
    { value: d.expense / 1000, frontColor: RED   },
  ])).flat();

  const donutData = DEMO_SOURCE_BREAKDOWN.map(s => ({ value: s.amount, color: s.color, label: s.label }));
  const totalIncome = DEMO_SOURCE_BREAKDOWN.reduce((s, c) => s + c.amount, 0);

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Income Analytics</Text>
        <TouchableOpacity onPress={() => router.push('/income/add' as any)}>
          <Ionicons name="add-circle-outline" size={24} color={GREEN} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {(['monthly', 'quarterly', 'yearly'] as Filter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, filter === f && { backgroundColor: GREEN }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.chipText, { color: filter === f ? '#000' : colors.textSecondary }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="This Month"    value={formatINR(125000)}  icon="trending-up-outline"    color={GREEN}  />
          <StatCard label="Avg Monthly"   value={formatINR(120833)}  icon="analytics-outline"       color={PURPLE} />
          <StatCard label="Total Txns"    value="18"                 icon="swap-horizontal-outline"  color="#FFB300" />
          <StatCard label="YTD Total"     value={formatINR(1450000)} icon="calendar-outline"         color={GREEN}  />
        </View>

        {/* Line Chart */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Income Trend</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
            {filter === 'monthly' ? 'Last 6 months' : filter === 'quarterly' ? 'This year (quarterly)' : 'Last 3 years'}
          </Text>
          <View style={styles.chartWrap}>
            <LineChart
              data={lineData}
              width={CHART_W}
              height={160}
              color={GREEN}
              thickness={2.5}
              dataPointsColor={GREEN}
              dataPointsRadius={4}
              areaChart
              startFillColor={GREEN}
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

        {/* Donut Breakdown */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Source Breakdown</Text>
            <TouchableOpacity onPress={() => router.push('/income/sources' as any)}>
              <Text style={[styles.viewAll, { color: GREEN }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.donutSection}>
            <DonutChart
              data={donutData}
              size={170}
              strokeWidth={22}
              centerValue={formatINR(totalIncome)}
              centerLabel="Total Income"
              centerColor={GREEN}
            />
            <View style={styles.donutLegend}>
              {DEMO_SOURCE_BREAKDOWN.map(s => (
                <View key={s.key} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <Text style={[styles.legendName, { color: colors.text }]} numberOfLines={1}>{s.label}</Text>
                  <Text style={[styles.legendPct, { color: colors.textSecondary }]}>{s.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Income vs Expense Bar */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Income vs Expense</Text>
          <Text style={[styles.cardSub, { color: colors.textSecondary }]}>₹ thousands</Text>
          <View style={styles.legendBarRow}>
            <View style={styles.legendBarItem}>
              <View style={[styles.legendBarDot, { backgroundColor: GREEN }]} />
              <Text style={[styles.legendBarText, { color: colors.textSecondary }]}>Income</Text>
            </View>
            <View style={styles.legendBarItem}>
              <View style={[styles.legendBarDot, { backgroundColor: RED }]} />
              <Text style={[styles.legendBarText, { color: colors.textSecondary }]}>Expense</Text>
            </View>
          </View>
          <View style={styles.chartWrap}>
            <BarChart
              data={barData}
              width={CHART_W}
              height={160}
              barWidth={16}
              spacing={14}
              roundedTop
              roundedBottom
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

        {/* Top Sources */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Top Income Sources</Text>
          {[...DEMO_SOURCE_BREAKDOWN].sort((a, b) => b.amount - a.amount).map((s, i) => (
            <View key={s.key} style={[styles.topRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.topRank, { color: colors.textSecondary }]}>#{i + 1}</Text>
              <View style={[styles.topIcon, { backgroundColor: `${s.color}22` }]}>
                <Ionicons name={s.icon as any} size={18} color={s.color} />
              </View>
              <View style={styles.topMeta}>
                <Text style={[styles.topName, { color: colors.text }]}>{s.label}</Text>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${s.percentage}%`, backgroundColor: s.color }]} />
                </View>
              </View>
              <View style={styles.topRight}>
                <Text style={[styles.topAmt, { color: colors.text }]}>{formatINR(s.amount)}</Text>
                <Text style={[styles.topPct, { color: GREEN }]}>↑ {s.growth}%</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Recurring Summary */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Recurring Income</Text>
          <View style={styles.recurringGrid}>
            {[
              { label: 'Active',  value: '3',            color: GREEN  },
              { label: 'Monthly', value: formatINR(143000), color: PURPLE },
              { label: 'Yearly',  value: formatINR(1716000), color: GREEN },
            ].map(item => (
              <View key={item.label} style={[styles.recurCard, { backgroundColor: `${item.color}12` }]}>
                <Text style={[styles.recurValue, { color: item.color }]}>{item.value}</Text>
                <Text style={[styles.recurLabel, { color: colors.textSecondary }]}>{item.label}</Text>
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
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:   { fontSize: 18, fontWeight: '700' },
  scroll:        { paddingHorizontal: 20, paddingTop: 4 },
  filterRow:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,230,118,0.12)' },
  chipText:      { fontSize: 13, fontWeight: '600' },
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard:      { width: (SW - 50) / 2, borderRadius: 14, padding: 14 },
  statIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue:     { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statLabel:     { fontSize: 11 },
  card:          { borderRadius: 16, padding: 16, marginBottom: 14 },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle:     { fontSize: 16, fontWeight: '700' },
  cardSub:       { fontSize: 12, marginBottom: 12 },
  viewAll:       { fontSize: 13, fontWeight: '600' },
  chartWrap:     { marginHorizontal: -4, marginTop: 4 },
  donutSection:  { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 4 },
  donutLegend:   { flex: 1, gap: 10 },
  legendRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:     { width: 8, height: 8, borderRadius: 4 },
  legendName:    { flex: 1, fontSize: 13, fontWeight: '500' },
  legendPct:     { fontSize: 12, width: 32, textAlign: 'right' },
  legendBarRow:  { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendBarItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendBarDot:  { width: 10, height: 10, borderRadius: 2 },
  legendBarText: { fontSize: 12 },
  topRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  topRank:       { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'center' },
  topIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  topMeta:       { flex: 1, gap: 6 },
  topName:       { fontSize: 13, fontWeight: '600' },
  progressBar:   { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2 },
  topRight:      { alignItems: 'flex-end' },
  topAmt:        { fontSize: 13, fontWeight: '700' },
  topPct:        { fontSize: 11, fontWeight: '600', marginTop: 2 },
  recurringGrid: { flexDirection: 'row', gap: 10, marginTop: 8 },
  recurCard:     { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  recurValue:    { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  recurLabel:    { fontSize: 11, fontWeight: '600' },
});
