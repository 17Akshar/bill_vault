import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { format, parseISO, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES } from '../../utils/formatINR';

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
    try {
      // Period range
      const periodMs   = end.getTime() - start.getTime();
      const prevStart  = new Date(start.getTime() - periodMs);
      const prevEnd    = new Date(start.getTime());

      const [incRes, expRes, accRes, prevIncRes] = await Promise.all([
        api.get(`/income`,   { params: { start_date: start.toISOString(),  end_date: end.toISOString() } }),
        api.get(`/expenses`, { params: { start_date: start.toISOString(),  end_date: end.toISOString() } }).catch(() => ({ data: [] })),
        api.get(`/accounts`).catch(() => ({ data: [] })),
        api.get(`/income`,   { params: { start_date: prevStart.toISOString(), end_date: prevEnd.toISOString() } }).catch(() => ({ data: [] })),
      ]);
      const inc = incRes.data || [];
      const exp = expRes.data || [];
      setIncomes(inc);
      setExpenses(exp);
      const accMap: Record<string, any> = {};
      (accRes.data || []).forEach((a: any) => { accMap[a.account_id] = a; });
      setAccMap(accMap);
      setPrevTotal((prevIncRes.data || []).reduce((s: number, i: any) => s + (i.amount || 0), 0));

      // 6-month trend with last-year comparison
      const now = new Date();
      const tr: { label: string; cur: number; prev: number }[] = [];
      for (let k = 5; k >= 0; k--) {
        const month = subMonths(now, k);
        const mStart = startOfMonth(month), mEnd = endOfMonth(month);
        const pStart = startOfMonth(subMonths(month, 1)), pEnd = endOfMonth(subMonths(month, 1));
        const [cRes, pRes] = await Promise.all([
          api.get(`/income`, { params: { start_date: mStart.toISOString(), end_date: mEnd.toISOString() } }),
          api.get(`/income`, { params: { start_date: pStart.toISOString(), end_date: pEnd.toISOString() } }),
        ]);
        const cur  = (cRes.data || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
        const prev = (pRes.data || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
        tr.push({ label: format(month, 'MMM'), cur, prev });
      }
      setTrend(tr);
    } catch {
      setIncomes([]); setExpenses([]); setAccMap({}); setPrevTotal(0); setTrend([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, [period, start, end]);

  useFocusEffect(useCallback(() => { setLoading(true); fetchData(); }, [fetchData]));

  // Totals
  const totalInflow  = incomes.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const totalOutflow = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const pctVsLast    = prevTotal > 0 ? Math.round(((totalInflow - prevTotal) / prevTotal) * 1000) / 10 : 0;
  const positive     = pctVsLast >= 0;

  // Sources aggregation
  const srcMap: Record<string, { category: string; amount: number; count: number; lastFreq: string }> = {};
  incomes.forEach((it: any) => {
    const c = it.category || 'other';
    if (!srcMap[c]) srcMap[c] = { category: c, amount: 0, count: 0, lastFreq: 'monthly' };
    srcMap[c].amount += it.amount || 0;
    srcMap[c].count  += 1;
    const f = (it.labels || []).find((l: string) => l.startsWith('freq:'));
    if (f) srcMap[c].lastFreq = f.replace('freq:', '');
  });
  const sources = Object.values(srcMap).sort((a, b) => b.amount - a.amount);

  // Sparkline data
  const spark = trend.map(t => ({ value: t.cur }));
  const maxBar = Math.max(1, ...trend.map(t => Math.max(t.cur, t.prev)));

  // Bar chart data — pairs: current (solid green) + prev (dashed outline)
  const barData: any[] = [];
  trend.forEach((t, i) => {
    barData.push({ value: t.cur, label: t.label, frontColor: GREEN, spacing: 4 });
    barData.push({ value: t.prev, frontColor: 'transparent', sideColor: 'transparent', topColor: 'transparent',
      // Hack: use a thin green-outlined bar via a custom view
      topLabelComponent: () => null });
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
                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>{src.count} entr{src.count === 1 ? 'y' : 'ies'}</Text>
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
});
