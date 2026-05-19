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
  DEMO_INCOMES, DEMO_ACCOUNTS, DEMO_OUTFLOW_BY_MONTH,
  DEMO_MONTHLY_TREND, DEMO_SOURCE_BREAKDOWN,
} from './dummyData';

const { width: SW } = Dimensions.get('window');
const GREEN  = '#00E676';
const PURPLE = '#7C5CE7';
const RED    = '#EF4444';

type Period = 'month' | 'quarter' | 'year';

const TOTAL_BY_PERIOD: Record<Period, { income: number; outflow: number; growth: number }> = {
  month:   { income: 125000, outflow: 75000,  growth: 20 },
  quarter: { income: 375000, outflow: 215000, growth: 12 },
  year:    { income: 1450000, outflow: 842000, growth: 8  },
};

function formatDate(iso: string) {
  try { return format(parseISO(iso), 'd MMM yyyy'); } catch { return iso; }
}

export default function CashFlowDashboard() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [period, setPeriod]     = useState<Period>('month');
  const [refreshing, setRefreshing] = useState(false);
  const [incomes, setIncomes]   = useState(DEMO_INCOMES);

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const stats = TOTAL_BY_PERIOD[period];
  const recentIncomes = incomes.slice(0, 5);
  const lineData = DEMO_MONTHLY_TREND.map(m => ({ value: m.income / 1000, label: m.label }));
  const donutData = DEMO_SOURCE_BREAKDOWN.map(s => ({ value: s.amount, color: s.color, label: s.label }));

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const now = new Date();
      const res = await api.get(`/income?month=${now.getMonth() + 1}&year=${now.getFullYear()}`).catch(() => ({ data: [] }));
      if (res.data?.length) setIncomes(res.data);
    } finally { setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cash Flow</Text>
        <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
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
              {p === 'month' ? 'This Month' : p === 'quarter' ? 'This Quarter' : 'This Year'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={GREEN} />}
      >
        {/* Total Income Card */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Income</Text>
              <Text style={[styles.summaryAmount, { color: GREEN }]}>{formatINR(stats.income)}</Text>
              <View style={styles.growthBadge}>
                <Ionicons name="arrow-up" size={12} color={GREEN} />
                <Text style={[styles.growthText, { color: GREEN }]}>
                  {stats.growth}% vs last {period === 'month' ? 'month' : period === 'quarter' ? 'quarter' : 'year'}
                </Text>
              </View>
            </View>
            <View style={{ overflow: 'hidden', marginRight: -8 }}>
              <LineChart
                data={lineData}
                width={SW * 0.38}
                height={64}
                color={GREEN}
                thickness={2}
                hideDataPoints
                areaChart
                startFillColor={GREEN}
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

        {/* Inflow / Outflow Stats */}
        <View style={styles.inflowRow}>
          <View style={[styles.inflowCard, { backgroundColor: CARD }]}>
            <View style={[styles.inflowIconBox, { backgroundColor: `${GREEN}22` }]}>
              <Ionicons name="arrow-down-circle" size={22} color={GREEN} />
            </View>
            <View>
              <Text style={[styles.inflowLabel, { color: colors.textSecondary }]}>Total Inflow</Text>
              <Text style={[styles.inflowValue, { color: colors.text }]}>{formatINR(stats.income)}</Text>
            </View>
          </View>
          <View style={[styles.inflowCard, { backgroundColor: CARD }]}>
            <View style={[styles.inflowIconBox, { backgroundColor: `${RED}22` }]}>
              <Ionicons name="arrow-up-circle" size={22} color={RED} />
            </View>
            <View>
              <Text style={[styles.inflowLabel, { color: colors.textSecondary }]}>Total Outflow</Text>
              <Text style={[styles.inflowValue, { color: colors.text }]}>{formatINR(stats.outflow)}</Text>
            </View>
          </View>
        </View>

        {/* Income Overview — Donut */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Income Overview</Text>
          <View style={styles.donutRow}>
            <DonutChart
              data={donutData}
              size={160}
              strokeWidth={22}
              centerValue={formatINR(stats.income)}
              centerLabel="Total Income"
              centerColor={GREEN}
            />
            <View style={styles.legendList}>
              {DEMO_SOURCE_BREAKDOWN.map(s => (
                <View key={s.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.legendName, { color: colors.text }]}>{s.label}</Text>
                    <Text style={[styles.legendPct, { color: colors.textSecondary }]}>{s.percentage}%</Text>
                  </View>
                  <Text style={[styles.legendAmt, { color: colors.text }]}>{formatINR(s.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Income Sources */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Income Sources</Text>
            <TouchableOpacity onPress={() => router.push('/income/sources' as any)}>
              <Text style={[styles.viewAll, { color: PURPLE }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {DEMO_SOURCE_BREAKDOWN.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.sourceRow, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/income/sources' as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.sourceIcon, { backgroundColor: `${s.color}22` }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <View style={styles.sourceMeta}>
                <Text style={[styles.sourceName, { color: colors.text }]}>{s.label}</Text>
                <Text style={[styles.sourceFreq, { color: colors.textSecondary }]}>{s.frequency}</Text>
              </View>
              <View style={styles.sourceRight}>
                <Text style={[styles.sourceAmt, { color: colors.text }]}>{formatINR(s.amount)}</Text>
                <View style={styles.growthBadge}>
                  <Ionicons name="arrow-up" size={11} color={GREEN} />
                  <Text style={[styles.growthSmall, { color: GREEN }]}>{s.growth}%</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: PURPLE }]}
            onPress={() => router.push('/income/add' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Add Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewAllBtn, { backgroundColor: CARD, borderColor: colors.border }]}
            onPress={() => router.push('/income/analytics' as any)}
            activeOpacity={0.85}
          >
            <Text style={[styles.viewAllBtnText, { color: colors.text }]}>View All Income</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Income */}
        <View style={[styles.card, { backgroundColor: CARD }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Income</Text>
            <TouchableOpacity onPress={() => router.push('/income/analytics' as any)}>
              <Text style={[styles.viewAll, { color: PURPLE }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentIncomes.map(inc => {
            const acc = DEMO_ACCOUNTS.find(a => a.account_id === inc.account_id);
            return (
              <TouchableOpacity
                key={inc.income_id}
                style={[styles.recentRow, { borderBottomColor: colors.border }]}
                onPress={() => router.push({ pathname: '/income/[id]' as any, params: { id: inc.income_id } })}
                activeOpacity={0.7}
              >
                <View style={[styles.recentIcon, { backgroundColor: `${GREEN}22` }]}>
                  <Ionicons name="briefcase-outline" size={18} color={GREEN} />
                </View>
                <View style={styles.recentMeta}>
                  <Text style={[styles.recentTitle, { color: colors.text }]}>{inc.source}</Text>
                  {acc && (
                    <Text style={[styles.recentSub, { color: colors.textSecondary }]}>
                      • {acc.name}{acc.account_number ? ` •••• ${acc.account_number}` : ''}
                    </Text>
                  )}
                  <Text style={[styles.recentDate, { color: colors.textSecondary }]}>{formatDate(inc.date)}</Text>
                </View>
                <Text style={[styles.recentAmt, { color: GREEN }]}>+{formatINR(inc.amount)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:   { fontSize: 20, fontWeight: '700' },
  tabRow:        { flexDirection: 'row', marginHorizontal: 20, borderRadius: 12, padding: 4, borderWidth: 1, marginBottom: 12 },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabText:       { fontSize: 13, fontWeight: '600' },
  scroll:        { paddingHorizontal: 20, paddingTop: 4 },
  card:          { borderRadius: 16, padding: 16, marginBottom: 14 },
  cardHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: '700' },
  viewAll:       { fontSize: 13, fontWeight: '600' },
  summaryRow:    { flexDirection: 'row', alignItems: 'center' },
  summaryLabel:  { fontSize: 13, marginBottom: 4 },
  summaryAmount: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },
  growthBadge:   { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 3 },
  growthText:    { fontSize: 12, fontWeight: '600' },
  growthSmall:   { fontSize: 11, fontWeight: '700' },
  inflowRow:     { flexDirection: 'row', gap: 12, marginBottom: 14 },
  inflowCard:    { flex: 1, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  inflowIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  inflowLabel:   { fontSize: 11, marginBottom: 2 },
  inflowValue:   { fontSize: 16, fontWeight: '700' },
  donutRow:      { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 8 },
  legendList:    { flex: 1, gap: 12 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:     { width: 10, height: 10, borderRadius: 5 },
  legendName:    { fontSize: 13, fontWeight: '600', marginBottom: 1 },
  legendPct:     { fontSize: 11 },
  legendAmt:     { fontSize: 13, fontWeight: '700' },
  sourceRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  sourceIcon:    { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sourceMeta:    { flex: 1 },
  sourceName:    { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  sourceFreq:    { fontSize: 12 },
  sourceRight:   { alignItems: 'flex-end', marginRight: 4 },
  sourceAmt:     { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  actionRow:     { flexDirection: 'row', gap: 12, marginBottom: 14 },
  addBtn:        { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 6 },
  addBtnText:    { color: '#FFF', fontSize: 15, fontWeight: '700' },
  viewAllBtn:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1 },
  viewAllBtnText: { fontSize: 14, fontWeight: '600' },
  recentRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  recentIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentMeta:    { flex: 1 },
  recentTitle:   { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  recentSub:     { fontSize: 11, marginBottom: 1 },
  recentDate:    { fontSize: 11 },
  recentAmt:     { fontSize: 15, fontWeight: '700' },
});
