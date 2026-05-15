import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES } from '../../utils/formatINR';
import { DEMO_INCOMES, DEMO_ACCOUNTS, DEMO_OUTFLOW_BY_MONTH } from './dummyData';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 64;

const PURPLE      = '#7C4DFF';
const PURPLE_DARK = '#5B2FBF';
const GREEN       = '#00E676';
const GREEN_DEEP  = '#00C853';
const RED         = '#FF5252';
const GREY        = '#8B8B8B';
const CAT_COLORS = [GREEN, '#26C6DA', PURPLE, '#FFB300', '#FF9100', '#E91E8C', '#448AFF', '#66BB6A'];

type Period = 'month' | 'quarter' | 'year';

const FREQ_LABEL: Record<string, string> = {
  monthly: 'Monthly', weekly: 'Weekly', biweekly: 'Bi-weekly', quarterly: 'Quarterly', yearly: 'Yearly',
};

function catMeta(key: string) {
  const cat = INCOME_CATEGORIES.find(c => c.key === key);
  const idx = INCOME_CATEGORIES.findIndex(c => c.key === key);
  return {
    icon: (cat?.icon as any) || 'cash-outline',
    color: CAT_COLORS[(idx >= 0 ? idx : 0) % CAT_COLORS.length],
    label: cat?.label || key,
  };
}

function rangeFor(period: Period): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === 'quarter') return { start: startOfQuarter(now), end: endOfQuarter(now), label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}` };
  if (period === 'year')    return { start: startOfYear(now),    end: endOfYear(now),    label: `${now.getFullYear()}` };
  return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM yyyy') };
}

function lastFourOf(account?: any) {
  if (!account) return '';
  const num = account.account_number || account.last_four || '';
  return num ? `•••• ${String(num).slice(-4)}` : '';
}

export default function IncomeDashboard() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [period, setPeriod]     = useState<Period>('month');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [incomes, setIncomes]   = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [accountMap, setAccMap] = useState<Record<string, any>>({});
  const [prevTotal, setPrevTotal] = useState(0);
  const [trend, setTrend]       = useState<{ label: string; cur: number; prev: number }[]>([]);

  const CARD_BG  = isDark ? '#1C1C2E' : colors.card;
  const SOFT_BG  = isDark ? '#0F0F1E' : colors.background;
  const { start, end, label } = rangeFor(period);

  const fetchData = useCallback(async () => {
    // Helper: timeout-bound api call that falls back to empty
    const safeGet = (url: string, config?: any) =>
      Promise.race<{ data: any[] }>([
        api.get(url, config).catch(() => ({ data: [] })),
        new Promise<{ data: any[] }>(res => setTimeout(() => res({ data: [] }), 4000)),
      ]);

    // ── Demo / dummy data path (used when backend has no income yet) ──
    const useDemoFallback = (incList: any[]) => {
      if (incList.length > 0) return null;
      // Filter DEMO_INCOMES by current period
      const filtered = DEMO_INCOMES.filter(it => {
        const dt = new Date(it.date);
        return dt >= start && dt <= end;
      });
      // Build accountMap from DEMO_ACCOUNTS
      const am: Record<string, any> = {};
      DEMO_ACCOUNTS.forEach(a => { am[a.account_id] = a; });
      // Prev-period total for delta-pill
      const periodMs = end.getTime() - start.getTime();
      const pStart = new Date(start.getTime() - periodMs);
      const pEnd   = new Date(start.getTime());
      const prevSum = DEMO_INCOMES
        .filter(it => { const dt = new Date(it.date); return dt >= pStart && dt <= pEnd; })
        .reduce((s, i) => s + i.amount, 0);
      // 6-month trend
      const now = new Date();
      const tr: { label: string; cur: number; prev: number }[] = [];
      for (let k = 5; k >= 0; k--) {
        const month  = subMonths(now, k);
        const mStart = startOfMonth(month).getTime();
        const mEnd   = endOfMonth(month).getTime();
        const prevM  = subMonths(month, 1);
        const pmStart = startOfMonth(prevM).getTime();
        const pmEnd   = endOfMonth(prevM).getTime();
        const cur  = DEMO_INCOMES.filter(it => { const t = new Date(it.date).getTime(); return t >= mStart && t <= mEnd; }).reduce((s, i) => s + i.amount, 0);
        const prev = DEMO_INCOMES.filter(it => { const t = new Date(it.date).getTime(); return t >= pmStart && t <= pmEnd; }).reduce((s, i) => s + i.amount, 0);
        tr.push({ label: format(month, 'MMM'), cur, prev });
      }
      // Dummy outflow scaled by selected period
      const outflowMonthly = DEMO_OUTFLOW_BY_MONTH['0'];
      const outflowMultiplier = period === 'year' ? 12 : period === 'quarter' ? 3 : 1;
      return { filtered, am, prevSum, tr, outflow: outflowMonthly * outflowMultiplier };
    };

    try {
      // Period range
      const periodMs   = end.getTime() - start.getTime();
      const prevStart  = new Date(start.getTime() - periodMs);
      const prevEnd    = new Date(start.getTime());

      const [incRes, expRes, accRes, prevIncRes] = await Promise.all([
        safeGet(`/income`,   { params: { start_date: start.toISOString(),  end_date: end.toISOString() } }),
        safeGet(`/expenses`, { params: { start_date: start.toISOString(),  end_date: end.toISOString() } }),
        safeGet(`/accounts`),
        safeGet(`/income`,   { params: { start_date: prevStart.toISOString(), end_date: prevEnd.toISOString() } }),
      ]);
      const inc = incRes.data || [];
      const exp = expRes.data || [];

      // If backend has NO income yet → use rich demo data
      const demo = useDemoFallback(inc);
      if (demo) {
        setIncomes(demo.filtered);
        setExpenses([]);
        setAccMap(demo.am);
        setPrevTotal(demo.prevSum);
        setTrend(demo.tr);
        // overload expenses array with a fake total so totalOutflow renders
        (window as any).__incomeDemoOutflow = demo.outflow;
        return;
      }
      (window as any).__incomeDemoOutflow = 0;

      setIncomes(inc);
      setExpenses(exp);
      const accMap: Record<string, any> = {};
      (accRes.data || []).forEach((a: any) => { accMap[a.account_id] = a; });
      setAccMap(accMap);
      setPrevTotal((prevIncRes.data || []).reduce((s: number, i: any) => s + (i.amount || 0), 0));

      // 6-month trend with last-month comparison
      const now = new Date();
      const tr: { label: string; cur: number; prev: number }[] = [];
      for (let k = 5; k >= 0; k--) {
        const month = subMonths(now, k);
        const mStart = startOfMonth(month), mEnd = endOfMonth(month);
        const pStart = startOfMonth(subMonths(month, 1)), pEnd = endOfMonth(subMonths(month, 1));
        const [cRes, pRes] = await Promise.all([
          safeGet(`/income`, { params: { start_date: mStart.toISOString(), end_date: mEnd.toISOString() } }),
          safeGet(`/income`, { params: { start_date: pStart.toISOString(), end_date: pEnd.toISOString() } }),
        ]);
        const cur  = (cRes.data || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
        const prev = (pRes.data || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
        tr.push({ label: format(month, 'MMM'), cur, prev });
      }
      setTrend(tr);
    } catch {
      // Last-resort demo fallback (even auth failed)
      const demo = useDemoFallback([]);
      if (demo) {
        setIncomes(demo.filtered);
        setExpenses([]);
        setAccMap(demo.am);
        setPrevTotal(demo.prevSum);
        setTrend(demo.tr);
        (window as any).__incomeDemoOutflow = demo.outflow;
      }
    } finally { setLoading(false); setRefreshing(false); }
  }, [period, start, end]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));

  // Totals
  const totalInflow  = incomes.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const realOutflow  = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const demoOutflow  = typeof window !== 'undefined' ? ((window as any).__incomeDemoOutflow || 0) : 0;
  const totalOutflow = realOutflow > 0 ? realOutflow : demoOutflow;
  const pctVsLast    = prevTotal > 0 ? Math.round(((totalInflow - prevTotal) / prevTotal) * 1000) / 10 : 0;
  const positive     = pctVsLast >= 0;

  // Sources aggregation (current period) + previous-period totals for growth %
  const srcMap: Record<string, { category: string; amount: number; count: number; lastFreq: string }> = {};
  incomes.forEach((it: any) => {
    const c = it.category || 'other';
    if (!srcMap[c]) srcMap[c] = { category: c, amount: 0, count: 0, lastFreq: 'monthly' };
    srcMap[c].amount += it.amount || 0;
    srcMap[c].count  += 1;
    const f = (it.labels || []).find((l: string) => l.startsWith('freq:'));
    if (f) srcMap[c].lastFreq = f.replace('freq:', '');
  });
  // Previous-period src amounts (from DEMO_INCOMES — works for demo, gracefully degrades to 0 for real backend)
  const prevSrcMap: Record<string, number> = {};
  const periodMsLocal = end.getTime() - start.getTime();
  const pStartLocal = new Date(start.getTime() - periodMsLocal);
  const pEndLocal   = new Date(start.getTime());
  DEMO_INCOMES.forEach(it => {
    const dt = new Date(it.date);
    if (dt >= pStartLocal && dt <= pEndLocal) {
      prevSrcMap[it.category] = (prevSrcMap[it.category] || 0) + it.amount;
    }
  });
  const sources = Object.values(srcMap).map(s => {
    const prev = prevSrcMap[s.category] || 0;
    const growth = prev > 0 ? Math.round(((s.amount - prev) / prev) * 100) : 0;
    return { ...s, growth };
  }).sort((a, b) => b.amount - a.amount);

  // ─── ANALYTICS SECTION DATA ──────────────────────────────────────────────
  // Recurring vs One-time
  const recurringTotal = incomes.filter((it: any) => (it.labels || []).includes('recurring')).reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
  const recurringCount = incomes.filter((it: any) => (it.labels || []).includes('recurring')).length;
  const oneTimeTotal   = totalInflow - recurringTotal;
  const recurringPct   = totalInflow > 0 ? (recurringTotal / totalInflow) * 100 : 0;

  // Taxable vs Non-taxable
  const taxableTotal     = incomes.filter((it: any) => (it.labels || []).includes('taxable')).reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
  const taxableCount     = incomes.filter((it: any) => (it.labels || []).includes('taxable')).length;
  const nonTaxableTotal  = totalInflow - taxableTotal;
  const taxablePct       = totalInflow > 0 ? (taxableTotal / totalInflow) * 100 : 0;
  // Estimated tax (assume avg 20% slab on taxable income — display only)
  const estimatedTax     = Math.round(taxableTotal * 0.2);

  // Sparkline data
  const spark = trend.map(t => ({ value: t.cur }));
  const maxBar = Math.max(1, ...trend.map(t => Math.max(t.cur, t.prev)));

  // Bar chart data — pairs: current (solid green) + prev (transparent placeholder for spacing)
  const barData: any[] = [];
  trend.forEach((t, i) => {
    barData.push({ value: t.cur, label: t.label, frontColor: GREEN, spacing: 4 });
    barData.push({ value: t.prev, frontColor: 'transparent', sideColor: 'transparent', topColor: 'transparent',
      topLabelComponent: () => null });
  });

  // Monthly comparison line (cur vs prev) — for Analytics section line chart
  const curLineData  = trend.map(t => ({ value: t.cur,  dataPointColor: GREEN_DEEP, label: t.label }));
  const prevLineData = trend.map(t => ({ value: t.prev, dataPointColor: PURPLE,   label: t.label }));

  // Donut data — source-wise income totals
  const sourceDonutData = sources.map(src => {
    const m = catMeta(src.category);
    return { value: src.amount, color: m.color, text: m.label };
  });

  // Recent (top 5)
  const recent = [...incomes].sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: SOFT_BG }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="income-back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Cash Flow</Text>
        <TouchableOpacity onPress={() => router.push('/income/analytics')} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="income-analytics-btn">
          <Ionicons name="options-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={PURPLE} />}
      >
        {/* Period Tabs */}
        <View style={[s.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="income-period-tabs">
          {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
            const active = period === k;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setPeriod(k as Period)}
                style={[s.periodBtn, active && { backgroundColor: PURPLE }]}
                activeOpacity={0.85}
                testID={`income-period-${k}`}
              >
                <Text style={[s.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }} testID="income-loading">
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : (
          <>
            {/* Total Income card */}
            <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-total-card">
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardLabel, { color: colors.textSecondary }]}>Total Income</Text>
                  <Text style={{ color: GREEN, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginTop: 6 }}>{formatINR(totalInflow)}</Text>
                  {prevTotal > 0 && (
                    <View style={[s.deltaPill, { backgroundColor: (positive ? GREEN : RED) + '1F' }]}>
                      <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={11} color={positive ? GREEN : RED} />
                      <Text style={{ color: positive ? GREEN : RED, fontSize: 11, fontWeight: '800' }}>
                        {Math.abs(pctVsLast).toFixed(0)}%
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>vs last month</Text>
                    </View>
                  )}
                </View>
                {spark.length > 1 && (
                  <View style={{ width: 110, marginTop: 4, marginRight: -8 }}>
                    <LineChart
                      data={spark}
                      width={110} height={60}
                      hideDataPoints color={GREEN} thickness={2.5} curved
                      hideRules hideYAxisText hideAxesAndRules
                      areaChart startFillColor={GREEN} endFillColor="transparent"
                      startOpacity={0.35} endOpacity={0} initialSpacing={0} endSpacing={0}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Inflow / Outflow row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <View style={[s.flowCard, { backgroundColor: CARD_BG }]} testID="income-total-inflow">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[s.flowIcon, { backgroundColor: GREEN }]}>
                    <Ionicons name="arrow-down" size={16} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Total Inflow</Text>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 }}>{formatINR(totalInflow)}</Text>
                  </View>
                </View>
              </View>
              <View style={[s.flowCard, { backgroundColor: CARD_BG }]} testID="income-total-outflow">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[s.flowIcon, { backgroundColor: RED }]}>
                    <Ionicons name="arrow-up" size={16} color="#FFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Total Outflow</Text>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 }}>{formatINR(totalOutflow)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Income Trend bar chart */}
            {trend.some(t => t.cur > 0 || t.prev > 0) && (
              <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-trend-card">
                <View style={s.sectionHead}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Income Trend</Text>
                  <TouchableOpacity onPress={() => router.push('/income/analytics')} testID="income-trend-view-all">
                    <Text style={[s.viewAll, { color: PURPLE }]}>View All</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN }} />
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Income</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: GREEN, opacity: 0.45 }} />
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>vs Last Month</Text>
                  </View>
                </View>
                <BarChart
                  data={barData}
                  width={CHART_W - 30}
                  height={140}
                  barWidth={14}
                  spacing={12}
                  barBorderRadius={4}
                  initialSpacing={6}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={isDark ? 'rgba(255,255,255,0.1)' : colors.border}
                  rulesColor={isDark ? 'rgba(255,255,255,0.06)' : colors.border}
                  rulesType="dashed"
                  yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                  xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }}
                  maxValue={maxBar * 1.2}
                  noOfSections={4}
                  isAnimated
                />
              </View>
            )}

            {/* Income Sources */}
            {sources.length > 0 && (
              <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-sources-card">
                <View style={s.sectionHead}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Income Sources</Text>
                  <TouchableOpacity onPress={() => router.push('/income/sources')} testID="income-sources-view-all">
                    <Text style={[s.viewAll, { color: PURPLE }]}>View All</Text>
                  </TouchableOpacity>
                </View>
                {sources.slice(0, 4).map((src: any, i: number) => {
                  const m = catMeta(src.category);
                  const avg = src.count > 0 ? Math.round(src.amount / src.count) : 0;
                  // approximate delta vs same-prev: not available client-side cheaply
                  return (
                    <View key={src.category} style={[s.sourceRow, i < Math.min(sources.length, 4) - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`income-source-row-${src.category}`}>
                      <View style={[s.sourceIcon, { backgroundColor: m.color + '22' }]}>
                        <Ionicons name={m.icon} size={20} color={m.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', textTransform: 'capitalize', letterSpacing: -0.1 }}>{m.label}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{FREQ_LABEL[src.lastFreq] || 'Monthly'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 }}>{formatINR(src.amount)}</Text>
                        {src.growth !== 0 ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 3 }}>
                            <Ionicons name={src.growth > 0 ? 'arrow-up' : 'arrow-down'} size={10} color={src.growth > 0 ? GREEN_DEEP : RED} />
                            <Text style={{ color: src.growth > 0 ? GREEN_DEEP : RED, fontSize: 11, fontWeight: '800' }}>{Math.abs(src.growth)}%</Text>
                          </View>
                        ) : (
                          <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>{src.count} entr{src.count === 1 ? 'y' : 'ies'}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 8 }} />
                    </View>
                  );
                })}
              </View>
            )}

            {/* CTA row */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => router.push('/income/add')}
                activeOpacity={0.85}
                style={[s.ctaBtn, { flex: 1.1 }]}
                testID="income-add-cta"
              >
                <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaInner}>
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 }}>Add Income</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/income/analytics')}
                activeOpacity={0.85}
                style={[s.ctaBtn, { flex: 1, backgroundColor: CARD_BG, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, borderWidth: 1 }]}
                testID="income-view-all-cta"
              >
                <View style={[s.ctaInner, { backgroundColor: 'transparent' }]}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.2 }}>View All Income</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Recent Income */}
            <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-recent-card">
              <View style={s.sectionHead}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Income</Text>
                <TouchableOpacity onPress={() => router.push('/income/sources')} testID="income-recent-view-all">
                  <Text style={[s.viewAll, { color: PURPLE }]}>View All</Text>
                </TouchableOpacity>
              </View>
              {recent.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 28 }} testID="income-empty">
                  <Ionicons name="wallet-outline" size={40} color={colors.textSecondary} />
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 10 }}>No income yet</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 260, lineHeight: 18 }}>
                    Tap "Add Income" above to record your first entry.
                  </Text>
                </View>
              ) : (
                recent.map((it: any, i: number) => {
                  const m   = catMeta(it.category);
                  const acc = accountMap[it.account_id];
                  return (
                    <TouchableOpacity
                      key={it.income_id}
                      onPress={() => router.push({ pathname: '/income/add', params: { id: it.income_id } } as any)}
                      style={[s.txnRow, i < recent.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}
                      activeOpacity={0.7}
                      testID={`income-recent-row-${i}`}
                    >
                      <View style={[s.sourceIcon, { backgroundColor: m.color + '22' }]}>
                        <Ionicons name={m.icon} size={20} color={m.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: -0.1 }} numberOfLines={1}>{it.source || m.label}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
                          {acc ? `${acc.name} ${lastFourOf(acc)}` : m.label}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                          {it.date ? format(parseISO(it.date), 'dd MMM yyyy') : ''}
                        </Text>
                      </View>
                      <Text style={{ color: GREEN, fontSize: 15, fontWeight: '800', letterSpacing: -0.2 }}>{formatINR(it.amount)}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* ─── ANALYTICS SECTION ─────────────────────────────────── */}
            {totalInflow > 0 && (
              <>
                <View style={s.analyticsHead}>
                  <Text style={[s.analyticsTitle, { color: colors.text }]}>Analytics</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>{format(start, 'MMM dd')} – {format(end, 'MMM dd')}</Text>
                </View>

                {/* — Source-wise Donut — */}
                {sourceDonutData.length > 0 && (
                  <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-analytics-donut">
                    <View style={s.sectionHead}>
                      <Text style={[s.sectionTitle, { color: colors.text }]}>Source-wise Income</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{sources.length} categories</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 }}>
                      <PieChart
                        data={sourceDonutData}
                        donut
                        radius={70}
                        innerRadius={48}
                        backgroundColor={CARD_BG}
                        centerLabelComponent={() => (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: '700' }}>Total</Text>
                            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 1 }}>
                              {formatINR(totalInflow).replace('.00', '')}
                            </Text>
                          </View>
                        )}
                      />
                      <View style={{ flex: 1 }}>
                        {sources.slice(0, 5).map((src: any) => {
                          const m = catMeta(src.category);
                          const pct = (src.amount / totalInflow) * 100;
                          return (
                            <View key={src.category} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: m.color }} />
                              <Text style={{ flex: 1, color: colors.text, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }} numberOfLines={1}>{m.label}</Text>
                              <Text style={{ color: m.color, fontSize: 11, fontWeight: '800' }}>{pct.toFixed(0)}%</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}

                {/* — Monthly Comparison Line — */}
                {trend.some(t => t.cur > 0 || t.prev > 0) && (
                  <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-analytics-monthly-comparison">
                    <View style={s.sectionHead}>
                      <Text style={[s.sectionTitle, { color: colors.text }]}>Monthly Comparison</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>last 6 mo</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN_DEEP }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>This Year</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: PURPLE }} />
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Prev Month</Text>
                      </View>
                    </View>
                    <LineChart
                      data={curLineData}
                      data2={prevLineData}
                      width={CHART_W - 30}
                      height={130}
                      thickness={3}
                      color1={GREEN_DEEP}
                      color2={PURPLE}
                      curved
                      hideDataPoints={false}
                      dataPointsColor1={GREEN_DEEP}
                      dataPointsColor2={PURPLE}
                      dataPointsRadius={3.5}
                      yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                      xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }}
                      yAxisThickness={0}
                      xAxisColor={isDark ? 'rgba(255,255,255,0.1)' : colors.border}
                      rulesColor={isDark ? 'rgba(255,255,255,0.06)' : colors.border}
                      rulesType="dashed"
                      noOfSections={4}
                      maxValue={maxBar * 1.2}
                      initialSpacing={10}
                      spacing={(CHART_W - 60) / 6}
                    />
                  </View>
                )}

                {/* — Recurring / Taxable summary row — */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
                  <View style={[s.statCard, { backgroundColor: CARD_BG }]} testID="income-analytics-recurring">
                    <View style={[s.statIcon, { backgroundColor: PURPLE + '22' }]}>
                      <Ionicons name="repeat" size={18} color={PURPLE} />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 10 }}>Recurring</Text>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 4 }}>{formatINR(recurringTotal)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.min(recurringPct, 100)}%`, height: '100%', backgroundColor: PURPLE, borderRadius: 3 }} />
                      </View>
                      <Text style={{ color: PURPLE, fontSize: 10, fontWeight: '800', minWidth: 32, textAlign: 'right' }}>{recurringPct.toFixed(0)}%</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4 }}>{recurringCount} of {incomes.length} entries</Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: CARD_BG }]} testID="income-analytics-taxable">
                    <View style={[s.statIcon, { backgroundColor: '#FFB300' + '22' }]}>
                      <Ionicons name="receipt-outline" size={18} color="#FFB300" />
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 10 }}>Taxable</Text>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginTop: 4 }}>{formatINR(taxableTotal)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, overflow: 'hidden' }}>
                        <View style={{ width: `${Math.min(taxablePct, 100)}%`, height: '100%', backgroundColor: '#FFB300', borderRadius: 3 }} />
                      </View>
                      <Text style={{ color: '#FFB300', fontSize: 10, fontWeight: '800', minWidth: 32, textAlign: 'right' }}>{taxablePct.toFixed(0)}%</Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4 }}>~{formatINR(estimatedTax)} est. tax</Text>
                  </View>
                </View>

                {/* — Growth Trends KPI strip — */}
                <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-analytics-growth">
                  <Text style={[s.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Income Growth Trends</Text>
                  <View style={{ flexDirection: 'row' }}>
                    {(() => {
                      const last3 = trend.slice(-3);
                      const mom = last3.length >= 2 && last3[last3.length - 2].cur > 0
                        ? Math.round(((last3[last3.length - 1].cur - last3[last3.length - 2].cur) / last3[last3.length - 2].cur) * 100)
                        : 0;
                      const avg3 = last3.reduce((sum, t) => sum + t.cur, 0) / Math.max(1, last3.length);
                      const yoyPrev = trend.reduce((sum, t) => sum + t.prev, 0);
                      const yoyCur  = trend.reduce((sum, t) => sum + t.cur, 0);
                      const yoy = yoyPrev > 0 ? Math.round(((yoyCur - yoyPrev) / yoyPrev) * 100) : 0;
                      const items = [
                        { label: 'M-o-M',  value: `${mom > 0 ? '+' : ''}${mom}%`,                color: mom >= 0 ? GREEN_DEEP : RED },
                        { label: '3-mo Avg', value: formatINR(Math.round(avg3)).replace('.00', ''), color: colors.text },
                        { label: 'Y-o-Y',  value: `${yoy > 0 ? '+' : ''}${yoy}%`,                color: yoy >= 0 ? GREEN_DEEP : RED },
                      ];
                      return items.map((it, i) => (
                        <View key={it.label} style={{ flex: 1, paddingHorizontal: 8, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, alignItems: 'center' }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' }}>{it.label}</Text>
                          <Text style={{ color: it.color, fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginTop: 4 }}>{it.value}</Text>
                        </View>
                      ));
                    })()}
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle:{ flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn:    { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  periodBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  periodBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },

  card:       { borderRadius: 16, padding: 16, marginBottom: 14 },
  cardLabel:  { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },

  deltaPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginTop: 8 },

  flowCard:   { flex: 1, borderRadius: 14, padding: 12 },
  flowIcon:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  sectionHead:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle:{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  viewAll:    { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },

  sourceRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  sourceIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  txnRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },

  ctaBtn:     { borderRadius: 14, overflow: 'hidden' },
  ctaInner:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 12 },

  analyticsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4, marginBottom: 12, paddingHorizontal: 2 },
  analyticsTitle:{ fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  statCard:   { flex: 1, borderRadius: 16, padding: 14 },
  statIcon:   { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
