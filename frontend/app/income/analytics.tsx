import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { format, subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, INCOME_CATEGORIES } from '../../utils/formatINR';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 64;

const PURPLE      = '#8E2DE2';
const PURPLE_DARK = '#4A00E0';
const GREEN       = '#51DB7A';
const RED         = '#FF4A4A';

const CAT_COLORS = [GREEN, '#26C6DA', PURPLE, '#FFB300', '#FF9100', '#E91E8C', '#448AFF', '#66BB6A'];

type Period = 'month' | 'quarter' | 'year';

function catMeta(key: string, idx: number) {
  const k = (key || '').toLowerCase().trim();
  const cat = INCOME_CATEGORIES.find(c => c.key === k);
  return {
    icon: (cat?.icon as any) || 'cash-outline',
    color: CAT_COLORS[idx % CAT_COLORS.length],
    label: cat?.label || (key || 'Other'),
  };
}

function rangeFor(period: Period): { start: Date; end: Date; label: string } {
  const now = new Date();
  if (period === 'quarter') return { start: startOfQuarter(now), end: endOfQuarter(now), label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}` };
  if (period === 'year')    return { start: startOfYear(now),    end: endOfYear(now),    label: `${now.getFullYear()}` };
  return { start: startOfMonth(now), end: endOfMonth(now), label: format(now, 'MMMM yyyy') };
}

export default function IncomeAnalytics() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [period, setPeriod]   = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [prevTotal, setPrevTotal] = useState(0);
  const [monthlySeries, setMonthlySeries] = useState<{ label: string; value: number }[]>([]);

  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  const { start, end, label } = rangeFor(period);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // current range
      const curRes = await api.get(`/income`, { params: { start_date: start.toISOString(), end_date: end.toISOString() } });
      const cur = curRes.data || [];
      setIncomes(cur);

      // previous range
      const periodMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - periodMs);
      const prevEnd   = new Date(start.getTime());
      const prevRes = await api.get(`/income`, { params: { start_date: prevStart.toISOString(), end_date: prevEnd.toISOString() } });
      setPrevTotal((prevRes.data || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0));

      // last 6 months for trend bar chart
      const now = new Date();
      const series: { label: string; value: number }[] = [];
      for (let k = 5; k >= 0; k--) {
        const month = subMonths(now, k);
        const mStart = startOfMonth(month);
        const mEnd   = endOfMonth(month);
        const mRes = await api.get(`/income`, { params: { start_date: mStart.toISOString(), end_date: mEnd.toISOString() } });
        const mTotal = (mRes.data || []).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
        series.push({ label: format(month, 'MMM'), value: mTotal });
      }
      setMonthlySeries(series);
    } catch {
      setIncomes([]); setPrevTotal(0); setMonthlySeries([]);
    } finally { setLoading(false); }
  }, [period, start, end]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const total       = incomes.reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
  const txCount     = incomes.length;
  const avgPerEntry = txCount > 0 ? Math.round(total / txCount) : 0;
  const pctVsLast   = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 1000) / 10 : 0;
  const positive    = pctVsLast >= 0;

  // Aggregate categories
  const catMap: Record<string, { category: string; amount: number; count: number }> = {};
  incomes.forEach((it: any) => {
    const c = it.category || 'other';
    if (!catMap[c]) catMap[c] = { category: c, amount: 0, count: 0 };
    catMap[c].amount += it.amount || 0;
    catMap[c].count  += 1;
  });
  const cats = Object.values(catMap)
    .sort((a, b) => b.amount - a.amount)
    .map((c, i) => ({ ...c, ...catMeta(c.category, i), pct: total > 0 ? (c.amount / total) * 100 : 0 }));

  // Top sources (by `source` field)
  const srcMap: Record<string, { source: string; amount: number; count: number; category: string }> = {};
  incomes.forEach((it: any) => {
    const k = (it.source || 'Other').trim();
    if (!srcMap[k]) srcMap[k] = { source: k, amount: 0, count: 0, category: it.category || 'other' };
    srcMap[k].amount += it.amount || 0;
    srcMap[k].count  += 1;
  });
  const topSources = Object.values(srcMap).sort((a, b) => b.amount - a.amount).slice(0, 5);

  const maxSeries = Math.max(1, ...monthlySeries.map(s => s.value));
  const barData = monthlySeries.map(s => ({
    value: s.value,
    label: s.label,
    frontColor: GREEN,
    topLabelComponent: () => s.value > 0 ? (
      <Text style={{ color: colors.textSecondary, fontSize: 9, marginBottom: 4 }}>{formatINR(s.value).replace('.00', '')}</Text>
    ) : null,
  }));

  const donutData = cats.map((c: any) => ({ value: c.amount, color: c.color }));

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[s.iconBtn, { backgroundColor: CARD_BG }]} testID="income-analytics-back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Income Analytics</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{label}</Text>
        </View>
        <View style={[s.iconBtn, { backgroundColor: 'transparent' }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 32 }}>
        {/* Period tabs */}
        <View style={[s.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="income-analytics-period-tabs">
          {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
            const active = period === k;
            return (
              <TouchableOpacity
                key={k}
                onPress={() => setPeriod(k as Period)}
                style={[s.periodBtn, active && { backgroundColor: PURPLE }]}
                activeOpacity={0.85}
                testID={`income-analytics-period-${k}`}
              >
                <Text style={[s.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>{l}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: 'center' }} testID="income-analytics-loading">
            <ActivityIndicator size="large" color={PURPLE} />
          </View>
        ) : total === 0 ? (
          <View style={[s.empty, { backgroundColor: CARD_BG }]} testID="income-analytics-empty">
            <Ionicons name="analytics-outline" size={48} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 12 }}>No income yet</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: 'center', maxWidth: 260, lineHeight: 18 }}>
              Add income entries to see analytics, top sources, and monthly trends.
            </Text>
          </View>
        ) : (
          <>
            {/* Hero — total */}
            <LinearGradient colors={[PURPLE_DARK, PURPLE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero} testID="income-analytics-hero">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' }}>Total Income</Text>
                {prevTotal > 0 && (
                  <View style={s.heroPill}>
                    <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={11} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>{Math.abs(pctVsLast).toFixed(1)}%</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: '#FFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 }}>{formatINR(total)}</Text>
              <View style={s.heroStats}>
                <View style={s.heroStat}><Text style={s.heroStatLabel}>Entries</Text><Text style={s.heroStatVal}>{txCount}</Text></View>
                <View style={[s.heroStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)' }]}><Text style={s.heroStatLabel}>Avg / Entry</Text><Text style={s.heroStatVal}>{formatINR(avgPerEntry)}</Text></View>
                <View style={[s.heroStat, { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)' }]}><Text style={s.heroStatLabel}>Sources</Text><Text style={s.heroStatVal}>{cats.length}</Text></View>
              </View>
            </LinearGradient>

            {/* Monthly trend bar */}
            {monthlySeries.some(m => m.value > 0) && (
              <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-analytics-trend">
                <View style={s.sectionHead}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Last 6 Months</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Monthly Income</Text>
                </View>
                <View style={{ alignItems: 'center', marginTop: 4 }}>
                  <BarChart
                    data={barData}
                    width={CHART_W - 24}
                    height={150}
                    barWidth={26}
                    spacing={16}
                    barBorderRadius={6}
                    initialSpacing={8}
                    yAxisThickness={0}
                    xAxisThickness={1}
                    xAxisColor={isDark ? 'rgba(255,255,255,0.1)' : colors.border}
                    rulesColor={isDark ? 'rgba(255,255,255,0.06)' : colors.border}
                    rulesType="dashed"
                    yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
                    xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700' }}
                    maxValue={maxSeries * 1.2}
                    noOfSections={4}
                    isAnimated
                  />
                </View>
              </View>
            )}

            {/* By category donut */}
            <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-analytics-by-category">
              <View style={s.sectionHead}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>By Source</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{cats.length} categories</Text>
              </View>
              <View style={{ alignItems: 'center', marginTop: 8 }}>
                <PieChart
                  data={donutData}
                  donut
                  radius={100}
                  innerRadius={68}
                  backgroundColor={CARD_BG}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>Total</Text>
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 }}>
                        {formatINR(total).replace('.00', '')}
                      </Text>
                    </View>
                  )}
                />
              </View>
              <View style={{ marginTop: 18 }}>
                {cats.map((c: any, i: number) => (
                  <View key={c.category} style={[s.catRow, i < cats.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`income-analytics-cat-${c.category}`}>
                    <View style={[s.catIcon, { backgroundColor: c.color + '22' }]}>
                      <Ionicons name={c.icon} size={18} color={c.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }}>{c.label}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{c.count} entries</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{formatINR(c.amount)}</Text>
                      <View style={[s.pctPill, { backgroundColor: c.color + '22' }]}>
                        <Text style={{ color: c.color, fontSize: 10, fontWeight: '800' }}>{c.pct.toFixed(1)}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Top sources */}
            {topSources.length > 0 && (
              <View style={[s.card, { backgroundColor: CARD_BG }]} testID="income-analytics-top-sources">
                <View style={s.sectionHead}>
                  <Text style={[s.sectionTitle, { color: colors.text }]}>Top Sources</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>by amount</Text>
                </View>
                {topSources.map((src, i) => {
                  const m = catMeta(src.category, i);
                  return (
                    <View key={src.source} style={[s.catRow, i < topSources.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`income-analytics-source-${i}`}>
                      <View style={[s.rankBadge, { backgroundColor: PURPLE + '22' }]}>
                        <Text style={{ color: PURPLE, fontSize: 13, fontWeight: '800' }}>#{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }} numberOfLines={1}>{src.source}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{m.label} · {src.count} entries</Text>
                      </View>
                      <Text style={{ color: GREEN, fontSize: 14, fontWeight: '800' }}>+{formatINR(src.amount)}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1 },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle:{ fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  iconBtn:    { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  periodBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  periodBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },

  hero:       { borderRadius: 20, padding: 20, marginBottom: 16, overflow: 'hidden' },
  heroPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  heroStats:  { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  heroStat:   { flex: 1, paddingHorizontal: 10, alignItems: 'center' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  heroStatVal:{ color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 4, letterSpacing: -0.2 },

  card:       { borderRadius: 18, padding: 18, marginBottom: 16 },
  sectionHead:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:{ fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },

  catRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  catIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pctPill:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  rankBadge:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  empty:      { padding: 36, borderRadius: 18, alignItems: 'center' },
});
