import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import { format, addMonths, subMonths } from 'date-fns';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 64;

// ─── Palette ──────────────────────────────────────────────────────────────────
const GREEN        = '#51DB7A';
const RED          = '#FF4A4A';
const PURPLE       = '#8E2DE2';
const PURPLE_DARK  = '#4A00E0';
const PURPLE_LIGHT = '#8E2DE2';
const ORANGE       = '#FF9100';
const YELLOW       = '#FFB300';
const TEAL         = '#26C6DA';
const PINK         = '#E91E8C';
const GREY         = '#8B8B8B';

const CAT_COLORS = [PURPLE, TEAL, GREEN, ORANGE, YELLOW, PINK, RED, '#448AFF', '#66BB6A'];
const getCatColor = (idx: number) => CAT_COLORS[idx % CAT_COLORS.length];

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { label: 'Overview',  icon: 'grid-outline',          activeIcon: 'grid' },
  { label: 'Cash Flow', icon: 'swap-vertical-outline',  activeIcon: 'swap-vertical' },
  { label: 'Spending',  icon: 'pie-chart-outline',      activeIcon: 'pie-chart' },
  { label: 'Budget',    icon: 'wallet-outline',         activeIcon: 'wallet' },
  { label: 'Trends',    icon: 'trending-up-outline',    activeIcon: 'trending-up' },
  { label: 'Calendar',  icon: 'calendar-outline',       activeIcon: 'calendar' },
];

// ─── Category config helper ───────────────────────────────────────────────────
const CAT_CONFIG: Record<string, { icon: string; color: string }> = {
  food:          { icon: 'fast-food-outline',    color: '#FF6B6B' },
  transport:     { icon: 'car-outline',          color: '#4DABF7' },
  shopping:      { icon: 'bag-handle-outline',   color: '#B197FC' },
  entertainment: { icon: 'film-outline',         color: '#FFB300' },
  bills:         { icon: 'receipt-outline',      color: '#26C6DA' },
  utilities:     { icon: 'flash-outline',        color: '#FFB300' },
  health:        { icon: 'medkit-outline',       color: '#66BB6A' },
  education:     { icon: 'school-outline',       color: '#4DABF7' },
  investment:    { icon: 'trending-up-outline',  color: '#8E2DE2' },
  income:        { icon: 'briefcase-outline',    color: '#51DB7A' },
  salary:        { icon: 'briefcase-outline',    color: '#51DB7A' },
  freelance:     { icon: 'laptop-outline',       color: '#26C6DA' },
  travel:        { icon: 'airplane-outline',     color: '#FF9100' },
  groceries:     { icon: 'cart-outline',         color: '#66BB6A' },
  rent:          { icon: 'home-outline',         color: '#4DABF7' },
  insurance:     { icon: 'shield-outline',       color: '#26C6DA' },
  gift:          { icon: 'gift-outline',         color: '#E91E8C' },
  other:         { icon: 'ellipsis-horizontal',  color: '#8B8B8B' },
};
function getCatConfig(cat: string) {
  const key = (cat || '').toLowerCase().trim();
  return CAT_CONFIG[key] || { icon: 'ellipsis-horizontal' as any, color: '#8B8B8B' };
}

// Account type → icon
function getAccIcon(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'bank' || t === 'savings' || t === 'current') return 'business-outline';
  if (t === 'wallet' || t === 'cash') return 'wallet-outline';
  if (t === 'upi') return 'phone-portrait-outline';
  if (t === 'credit') return 'card-outline';
  return 'ellipsis-horizontal-outline';
}
function getAccColor(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'bank' || t === 'savings' || t === 'current') return PURPLE;
  if (t === 'wallet' || t === 'cash') return GREEN;
  if (t === 'upi') return PURPLE;
  if (t === 'credit') return RED;
  return GREY;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPct(v: number, showPlus = true) {
  const s = Math.abs(v).toFixed(1);
  if (v > 0) return (showPlus ? '+' : '') + s + '%';
  if (v < 0) return '-' + s + '%';
  return '0%';
}
function clamp(v: number, lo = 0, hi = 100) { return Math.min(Math.max(v, lo), hi); }

// ─── Micro-components ─────────────────────────────────────────────────────────
function ProgBar({ pct, color, height = 7, bg }: any) {
  const w = clamp(pct);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: bg || 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <View style={{ height, width: `${w}%`, borderRadius: height / 2, backgroundColor: color, overflow: 'hidden' }}>
        {/* subtle top highlight for depth */}
        <View style={{ height: Math.max(1, Math.floor(height / 3)), backgroundColor: 'rgba(255,255,255,0.22)' }} />
      </View>
    </View>
  );
}

function Delta({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const positive = inverse ? value < 0 : value > 0;
  const color = value === 0 ? '#666' : positive ? GREEN : RED;
  const icon  = value > 0 ? 'arrow-up' : value < 0 ? 'arrow-down' : 'remove';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={{ fontSize: 11, fontWeight: '700', color }}>{fmtPct(value, false)}</Text>
    </View>
  );
}

function LoadingBox({ colors }: any) {
  return (
    <View style={[st.loadBox, { backgroundColor: colors.card }]}>
      <ActivityIndicator color={PURPLE} />
    </View>
  );
}

function EmptyBox({ icon, text, colors }: any) {
  return (
    <View style={st.emptyBox}>
      <Ionicons name={icon} size={44} color={colors.textSecondary} />
      <Text style={[st.emptyText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ colors, isDark, date, onDateChange }: any) {
  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<any>(null);
  const [sparkline, setSparkline] = useState<number[]>([]);

  const m = date.getMonth() + 1;
  const y = date.getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, trendRes] = await Promise.all([
        api.get(`/insights/overview?month=${m}&year=${y}`),
        api.get(`/insights/cashflow/monthly-trend?months=6`),
      ]);
      setData(ovRes.data);
      const nets = (trendRes.data?.series || []).map((s: any) => s.net || 0);
      setSparkline(nets.length > 1 ? nets : [0, ovRes.data?.savings?.total || 0]);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [m, y]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) return <LoadingBox colors={colors} />;
  if (!data) return <EmptyBox icon="bar-chart-outline" text="No data yet. Add income & expense transactions to see your overview." colors={colors} />;

  const income   = data.income   || { total: 0, vs_last_month: 0 };
  const expenses = data.expenses || { total: 0, vs_last_month: 0 };
  const savings  = data.savings  || { total: 0, rate: 0, vs_last_month: 0 };
  const netCF    = income.total - expenses.total;
  const netPct   = data.savings?.vs_last_month || 0;
  const accounts = (data.accounts_summary || []).map((a: any) => ({
    label:   a.label,
    count:   a.count,
    balance: a.balance,
    icon:    getAccIcon(a.type),
    color:   a.balance < 0 ? RED : getAccColor(a.type),
  }));
  const quickInsights = (data.quick_insights || []).map((qi: any) => ({
    icon:  qi.icon  || 'information-circle-outline',
    color: qi.color || PURPLE,
    title: qi.title || '',
    text:  qi.text  || '',
  }));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ── Month navigator ── */}
      <View style={ov.monthRow}>
        <TouchableOpacity onPress={() => onDateChange(subMonths(date, 1))} style={ov.monthBtn} testID="month-prev">
          <Ionicons name="chevron-back" size={20} color={GREY} />
        </TouchableOpacity>
        <Text style={[ov.monthLabel, { color: colors.text }]}>{data.label || format(date, 'MMMM yyyy')}</Text>
        <TouchableOpacity onPress={() => onDateChange(addMonths(date, 1))} style={ov.monthBtn} testID="month-next">
          <Ionicons name="chevron-forward" size={20} color={GREY} />
        </TouchableOpacity>
      </View>

      {/* ── This Month Overview Card ── */}
      <View style={[ov.card, { backgroundColor: CARD_BG }]}>
        <View style={ov.cardHead}>
          <Text style={[ov.cardTitle, { color: colors.text }]}>This Month Overview</Text>
          <Text style={[ov.cardSub, { color: GREY }]}>{data.label}</Text>
        </View>
        <View style={[ov.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} />
        <View style={ov.metricsRow}>
          {[
            { label: 'Income',   value: income.total,   color: GREEN, delta: income.vs_last_month,   inv: false },
            { label: 'Expenses', value: expenses.total, color: RED,   delta: expenses.vs_last_month, inv: true  },
            { label: 'Savings',  value: savings.total,  color: GREEN, delta: savings.vs_last_month,  inv: false },
          ].map((m2, i) => (
            <View key={m2.label} style={[ov.metricCol, i < 2 && { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
              <Text style={[ov.metricLabel, { color: GREY }]}>{m2.label}</Text>
              <Text style={[ov.metricValue, { color: m2.color }]}>{formatINR(m2.value)}</Text>
              <View style={ov.deltaRow}>
                <Ionicons
                  name={m2.delta > 0 ? 'arrow-up' : m2.delta < 0 ? 'arrow-down' : 'remove'}
                  size={10}
                  color={m2.inv ? (m2.delta < 0 ? GREEN : RED) : (m2.delta >= 0 ? GREEN : RED)}
                />
                <Text style={[ov.deltaText, { color: m2.inv ? (m2.delta < 0 ? GREEN : RED) : (m2.delta >= 0 ? GREEN : RED) }]}>
                  {Math.abs(m2.delta).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
        <View style={ov.rateRow}>
          <View style={[ov.rateBadge, { backgroundColor: GREEN + '20' }]}>
            <Ionicons name="leaf-outline" size={12} color={GREEN} />
            <Text style={[ov.rateText, { color: GREEN }]}>Savings Rate: {savings.rate}%</Text>
          </View>
        </View>
      </View>

      {/* ── Net Cash Flow Card ── */}
      <View style={[ov.card, { backgroundColor: CARD_BG }]}>
        <View style={ov.cardHead}>
          <Text style={[ov.cardTitle, { color: colors.text }]}>Net Cash Flow</Text>
        </View>
        <Text style={[ov.cashSubtitle, { color: GREY }]}>This Month's Flow</Text>
        <Text style={[ov.cashValue, { color: netCF >= 0 ? GREEN : RED }]}>{formatINR(netCF)}</Text>
        <View style={ov.cashDelta}>
          <Ionicons name={netPct >= 0 ? 'arrow-up' : 'arrow-down'} size={13} color={netPct >= 0 ? GREEN : RED} />
          <Text style={[ov.cashDeltaText, { color: netPct >= 0 ? GREEN : RED }]}>
            {Math.abs(netPct).toFixed(1)}% vs last month
          </Text>
        </View>
        {sparkline.length > 1 && (
          <View style={{ marginTop: 8 }}>
            <LineChart
              data={sparkline.map(v => ({ value: v }))}
              width={CHART_W + 12}
              height={72}
              hideDataPoints
              color={GREEN}
              thickness={2.5}
              curved
              hideRules
              hideYAxisText
              hideAxesAndRules
              areaChart
              startFillColor={GREEN}
              endFillColor="transparent"
              startOpacity={0.35}
              endOpacity={0}
              initialSpacing={0}
              endSpacing={0}
            />
          </View>
        )}
      </View>

      {/* ── Quick Insights ── */}
      {quickInsights.length > 0 && (
        <View style={[ov.card, { backgroundColor: CARD_BG }]}>
          <View style={ov.sectionHead}>
            <Text style={[ov.sectionTitle, { color: colors.text }]}>Quick Insights</Text>
          </View>
          {quickInsights.map((ins: any, i: number) => (
            <View
              key={i}
              style={[ov.insightRow, i < quickInsights.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}
            >
              <View style={[ov.insightIconWrap, { backgroundColor: ins.color + '22' }]}>
                <Ionicons name={ins.icon as any} size={18} color={ins.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[ov.insightTitle, { color: colors.text }]}>{ins.title}</Text>
                <Text style={[ov.insightBody, { color: GREY }]} numberOfLines={2}>{ins.text}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={GREY} />
            </View>
          ))}
        </View>
      )}

      {/* ── Accounts Summary ── */}
      {accounts.length > 0 && (
        <View style={[ov.card, { backgroundColor: CARD_BG }]}>
          <View style={ov.sectionHead}>
            <Text style={[ov.sectionTitle, { color: colors.text }]}>Accounts Summary</Text>
          </View>
          {accounts.map((acc: any, i: number) => (
            <TouchableOpacity
              key={i}
              style={[ov.accRow, i < accounts.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}
              testID={`account-row-${i}`}
              activeOpacity={0.7}
            >
              <View style={[ov.accIconWrap, { backgroundColor: acc.color + '1E' }]}>
                <Ionicons name={acc.icon as any} size={20} color={acc.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[ov.accName, { color: colors.text }]}>{acc.label}</Text>
                <Text style={[ov.accCount, { color: GREY }]}>{acc.count} Account{acc.count !== 1 ? 's' : ''}</Text>
              </View>
              <View style={ov.accRight}>
                <Text style={[ov.accBalance, { color: acc.balance < 0 ? RED : colors.text }]}>
                  {acc.balance < 0 ? '-' : ''}{formatINR(Math.abs(acc.balance))}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={GREY} style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const ov = StyleSheet.create({
  monthRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingHorizontal: 8 },
  monthBtn:   { padding: 10, borderRadius: 12 },
  monthLabel: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, flex: 1, textAlign: 'center' },

  card:       { borderRadius: 18, padding: 18, marginBottom: 16, overflow: 'hidden' },
  cardHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:  { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  cardSub:    { fontSize: 12, fontWeight: '500' },
  divider:    { height: 1, marginBottom: 16 },

  metricsRow: { flexDirection: 'row' },
  metricCol:  { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  metricLabel:{ fontSize: 11, marginBottom: 6, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  metricValue:{ fontSize: 19, fontWeight: '800', letterSpacing: -0.4, marginBottom: 6 },
  deltaRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deltaText:  { fontSize: 11, fontWeight: '700' },
  rateRow:    { marginTop: 16, alignItems: 'flex-start' },
  rateBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  rateText:   { fontSize: 12, fontWeight: '800', letterSpacing: 0.1 },

  cashSubtitle: { fontSize: 12, marginBottom: 6, fontWeight: '500' },
  cashValue:    { fontSize: 32, fontWeight: '800', letterSpacing: -0.6, marginBottom: 4 },
  cashDelta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cashDeltaText:{ fontSize: 13, fontWeight: '700' },

  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  viewAll:      { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },

  insightRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  insightIconWrap:{ width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  insightTitle:   { fontSize: 13, fontWeight: '800', marginBottom: 3, letterSpacing: -0.1 },
  insightBody:    { fontSize: 12, lineHeight: 17 },

  accRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  accIconWrap:{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  accName:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  accCount:   { fontSize: 11, fontWeight: '500' },
  accRight:   { flexDirection: 'row', alignItems: 'center' },
  accBalance: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
});

// ══════════════════════════════════════════════════════════════════════════════
// CASH FLOW TAB
// ══════════════════════════════════════════════════════════════════════════════
function CashFlowTab({ colors, isDark, date }: any) {
  const router  = useRouter();
  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  const [period,   setPeriod]   = useState<'month' | 'quarter' | 'year'>('month');
  const [loading,  setLoading]  = useState(true);
  const [cfData,   setCfData]   = useState<any>(null);
  const [barSeries, setBarSeries] = useState<any[]>([]);

  const m = date ? (date.getMonth() + 1) : new Date().getMonth() + 1;
  const y = date ? date.getFullYear()     : new Date().getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfRes, trendRes] = await Promise.all([
        api.get(`/insights/cashflow?period=${period}&month=${m}&year=${y}`),
        api.get(`/insights/cashflow/monthly-trend?months=6`),
      ]);
      setCfData(cfRes.data);
      setBarSeries(trendRes.data?.series || []);
    } catch {
      setCfData(null);
    } finally {
      setLoading(false);
    }
  }, [period, m, y]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) return (
    <View style={{ flex: 1 }}>
      <View style={[cf.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
        {(['month', 'quarter', 'year'] as const).map((k) => (
          <TouchableOpacity key={k} onPress={() => setPeriod(k)} style={[cf.periodBtn, period === k && { backgroundColor: PURPLE }]}>
            <Text style={[cf.periodBtnText, { color: period === k ? '#FFF' : GREY }]}>{k === 'month' ? 'This Month' : k === 'quarter' ? 'This Quarter' : 'This Year'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <LoadingBox colors={colors} />
    </View>
  );

  if (!cfData) return (
    <View>
      <View style={[cf.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
        {(['month', 'quarter', 'year'] as const).map((k) => (
          <TouchableOpacity key={k} onPress={() => setPeriod(k)} style={[cf.periodBtn, period === k && { backgroundColor: PURPLE }]}>
            <Text style={[cf.periodBtnText, { color: period === k ? '#FFF' : GREY }]}>{k === 'month' ? 'This Month' : k === 'quarter' ? 'This Quarter' : 'This Year'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <EmptyBox icon="swap-vertical-outline" text="No cash flow data yet. Add income & expense transactions to see your flow." colors={colors} />
    </View>
  );

  const totals     = cfData.totals || {};
  const inflow     = totals.inflow  || 0;
  const outflow    = totals.outflow || 0;
  const net        = totals.net     || 0;
  const growthPct  = totals.growth_pct || 0;
  const inSharePct = totals.in_share_pct  || 0;
  const outSharePct= totals.out_share_pct || 0;

  const sparkNets = barSeries.map((s: any) => s.net || 0);
  const sparkData = sparkNets.length > 1 ? sparkNets : [0, net];

  const barData = barSeries.flatMap((b: any) => [
    { value: b.inflow  || 0, label: b.short_label || b.label?.split(' ')[0] || '', frontColor: GREEN, spacing: 4 },
    { value: b.outflow || 0,                                                        frontColor: RED,   spacing: 14 },
  ]);

  const accountFlow = (cfData.by_account || []).slice(0, 6).map((a: any) => ({
    name:    a.name || 'Account',
    icon:    getAccIcon(a.account_type),
    color:   getAccColor(a.account_type),
    inflow:  a.inflow  || 0,
    outflow: a.outflow || 0,
    net:     a.net     || 0,
    txns:    a.txns    || 0,
  }));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ── Period Tabs ── */}
      <View style={[cf.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="cashflow-period-tabs">
        {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
          const active = period === k;
          return (
            <TouchableOpacity key={k} onPress={() => setPeriod(k as any)} style={[cf.periodBtn, active && { backgroundColor: PURPLE }]} testID={`cashflow-period-${k}`} activeOpacity={0.85}>
              <Text style={[cf.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>{l}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Net Cash Flow hero card ── */}
      <View style={[cf.card, { backgroundColor: CARD_BG, padding: 0, overflow: 'hidden' }]} testID="cashflow-net-card">
        <LinearGradient colors={[PURPLE_DARK, PURPLE_LIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Net Cash Flow</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 3 }}>
              <Ionicons name={growthPct >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{Math.abs(growthPct).toFixed(1)}%</Text>
            </View>
          </View>
          <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 6 }}>{formatINR(net)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{cfData.label}</Text>
          {sparkData.length > 1 && (
            <View style={{ marginTop: 10, marginLeft: -16 }}>
              <LineChart
                data={sparkData.map((v: number) => ({ value: v }))}
                width={CHART_W + 12}
                height={70}
                hideDataPoints
                color="#FFF"
                thickness={2.5}
                curved
                hideRules
                hideYAxisText
                hideAxesAndRules
                areaChart
                startFillColor="#FFF"
                endFillColor="transparent"
                startOpacity={0.35}
                endOpacity={0}
                initialSpacing={0}
                endSpacing={0}
              />
            </View>
          )}
        </LinearGradient>
        <View style={cf.flowRow}>
          <View style={[cf.flowMini, { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: GREEN }]} />
              <Text style={[cf.flowMiniLabel, { color: colors.textSecondary }]}>Total Inflow</Text>
            </View>
            <Text style={[cf.flowMiniValue, { color: GREEN }]}>{formatINR(inflow)}</Text>
          </View>
          <View style={cf.flowMini}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: RED }]} />
              <Text style={[cf.flowMiniLabel, { color: colors.textSecondary }]}>Total Outflow</Text>
            </View>
            <Text style={[cf.flowMiniValue, { color: RED }]}>{formatINR(outflow)}</Text>
          </View>
        </View>
      </View>

      {/* ── Cash In vs Cash Out ── */}
      <View style={[cf.card, { backgroundColor: CARD_BG }]} testID="cashflow-in-vs-out">
        <View style={cf.sectionHead}>
          <Text style={[cf.sectionTitle, { color: colors.text }]}>Cash In vs Cash Out</Text>
          <TouchableOpacity onPress={() => router.push('/insights/cashflow-details')} testID="cashflow-in-vs-out-view-details">
            <Text style={[cf.viewDetails, { color: PURPLE }]}>View Details</Text>
          </TouchableOpacity>
        </View>
        <View style={cf.stackBar}>
          <View style={{ flex: inSharePct  || 1, backgroundColor: GREEN, height: '100%', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }} />
          <View style={{ flex: outSharePct || 1, backgroundColor: RED,   height: '100%', borderTopRightRadius: 6, borderBottomRightRadius: 6 }} />
        </View>
        <View style={cf.inOutLabelRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: GREEN }]} />
              <Text style={[cf.inOutLabel, { color: colors.text }]}>Cash In</Text>
            </View>
            <Text style={[cf.inOutAmount, { color: GREEN }]}>{formatINR(inflow)}</Text>
            <Text style={[cf.inOutPct, { color: colors.textSecondary }]}>{inSharePct.toFixed(1)}%</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: RED }]} />
              <Text style={[cf.inOutLabel, { color: colors.text }]}>Cash Out</Text>
            </View>
            <Text style={[cf.inOutAmount, { color: RED }]}>{formatINR(outflow)}</Text>
            <Text style={[cf.inOutPct, { color: colors.textSecondary }]}>{outSharePct.toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      {/* ── Monthly Cash Flow Trend ── */}
      {barData.length > 0 && (
        <View style={[cf.card, { backgroundColor: CARD_BG }]} testID="cashflow-monthly-trend">
          <View style={cf.sectionHead}>
            <Text style={[cf.sectionTitle, { color: colors.text }]}>Monthly Cash Flow Trend</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: GREEN }]} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Cash In</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: RED }]} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Cash Out</Text>
            </View>
          </View>
          <BarChart
            data={barData}
            width={CHART_W - 8}
            height={170}
            barWidth={12}
            barBorderRadius={3}
            noOfSections={4}
            xAxisColor={colors.border}
            yAxisColor="transparent"
            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
            rulesColor={isDark ? 'rgba(255,255,255,0.06)' : colors.border}
            isAnimated
            spacing={barSeries.length > 3 ? 14 : 26}
          />
        </View>
      )}

      {/* ── Account-wise Cash Flow ── */}
      {accountFlow.length > 0 && (
        <View style={[cf.card, { backgroundColor: CARD_BG }]} testID="cashflow-account-wise">
          <View style={cf.sectionHead}>
            <Text style={[cf.sectionTitle, { color: colors.text }]}>Account-wise Cash Flow</Text>
            <TouchableOpacity onPress={() => router.push('/insights/cashflow-details')} testID="cashflow-accounts-view-details">
              <Text style={[cf.viewDetails, { color: PURPLE }]}>View Details</Text>
            </TouchableOpacity>
          </View>
          {accountFlow.map((acc: any, i: number) => (
            <View key={acc.name} style={[cf.accRow, i < accountFlow.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`cashflow-account-${i}`}>
              <View style={[cf.accIcon, { backgroundColor: acc.color + '22' }]}>
                <Ionicons name={acc.icon as any} size={18} color={acc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[cf.accName, { color: colors.text }]}>{acc.name}</Text>
                <Text style={[cf.accMeta, { color: colors.textSecondary }]}>{acc.txns} transactions</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="arrow-down" size={9} color={GREEN} />
                    <Text style={{ fontSize: 11, color: GREEN, fontWeight: '600' }}>{formatINR(acc.inflow)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Ionicons name="arrow-up" size={9} color={RED} />
                    <Text style={{ fontSize: 11, color: RED, fontWeight: '600' }}>{formatINR(acc.outflow)}</Text>
                  </View>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '500', marginBottom: 2 }}>Net</Text>
                <Text style={{ color: acc.net >= 0 ? GREEN : RED, fontSize: 14, fontWeight: '800' }}>
                  {acc.net >= 0 ? '+' : '-'}{formatINR(Math.abs(acc.net))}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const cf = StyleSheet.create({
  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  periodBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  periodBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  card:          { borderRadius: 18, padding: 18, marginBottom: 16, overflow: 'hidden' },
  flowRow:       { flexDirection: 'row' },
  flowMini:      { flex: 1, padding: 14, gap: 6 },
  flowMiniLabel: { fontSize: 11, fontWeight: '500' },
  flowMiniValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  flowDot:       { width: 8, height: 8, borderRadius: 4 },
  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  viewDetails:   { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  stackBar:      { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 14 },
  inOutLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  inOutLabel:    { fontSize: 12, fontWeight: '600' },
  inOutAmount:   { fontSize: 17, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },
  inOutPct:      { fontSize: 11, marginTop: 2 },
  accRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  accIcon:       { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  accName:       { fontSize: 14, fontWeight: '700' },
  accMeta:       { fontSize: 11, marginTop: 2 },
});

// ══════════════════════════════════════════════════════════════════════════════
// SPENDING TAB
// ══════════════════════════════════════════════════════════════════════════════
function SpendingTab({ colors, isDark, date }: any) {
  const router  = useRouter();
  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  const [period,      setPeriod]      = useState<'month' | 'quarter' | 'year'>('month');
  const [loading,     setLoading]     = useState(true);
  const [spData,      setSpData]      = useState<any>(null);
  const [showAllCats, setShowAllCats] = useState(false);
  const [showAllTop,  setShowAllTop]  = useState(false);

  const m = date ? (date.getMonth() + 1) : new Date().getMonth() + 1;
  const y = date ? date.getFullYear()     : new Date().getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/insights/spending?period=${period}&month=${m}&year=${y}`);
      setSpData(res.data);
    } catch {
      setSpData(null);
    } finally {
      setLoading(false);
    }
  }, [period, m, y]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const PeriodTabs = () => (
    <View style={[sp.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="spending-period-tabs">
      {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
        const active = period === k;
        return (
          <TouchableOpacity key={k} onPress={() => { setPeriod(k as any); setShowAllCats(false); setShowAllTop(false); }} style={[sp.periodBtn, active && { backgroundColor: PURPLE }]} testID={`spending-period-${k}`} activeOpacity={0.85}>
            <Text style={[sp.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>{l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (loading) return <View><PeriodTabs /><LoadingBox colors={colors} /></View>;
  if (!spData) return <View><PeriodTabs /><EmptyBox icon="pie-chart-outline" text="No spending data yet. Add expense transactions to see your spending analysis." colors={colors} /></View>;

  const total     = spData.total     || 0;
  const vsPrev    = spData.vs_previous || 0;
  const txnCount  = spData.txn_count  || 0;
  const avgDaily  = spData.avg_daily   || 0;
  const declined  = vsPrev < 0;

  const categories = (spData.categories || []).map((c: any, idx: number) => ({
    name:   c.category || 'Other',
    amount: c.amount   || 0,
    pct:    c.percentage || 0,
    icon:   getCatConfig(c.category).icon,
    color:  getCatConfig(c.category).color || getCatColor(idx),
  }));

  const topMerchants = (spData.top_merchants || []).map((m2: any, idx: number) => ({
    merchant: m2.merchant || 'Misc',
    amount:   m2.amount   || 0,
    pct:      m2.percentage || 0,
    icon:     getCatConfig(m2.category).icon,
    color:    getCatConfig(m2.category).color || getCatColor(idx),
  }));

  const donutData = categories.map((c: any) => ({ value: c.amount, color: c.color }));
  const visibleCats = showAllCats ? categories : categories.slice(0, 4);
  const visibleTop  = showAllTop  ? topMerchants : topMerchants.slice(0, 3);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <PeriodTabs />

      {/* ── Spending Summary Card ── */}
      <View style={[sp.card, { backgroundColor: CARD_BG, padding: 0, overflow: 'hidden' }]} testID="spending-summary-card">
        <LinearGradient colors={['#7A1FA2', '#E91E8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Total Spending</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 3 }}>
              <Ionicons name={declined ? 'arrow-down' : 'arrow-up'} size={11} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{Math.abs(vsPrev).toFixed(1)}%</Text>
            </View>
          </View>
          <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>{formatINR(total)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{spData.label}</Text>
        </LinearGradient>
        <View style={sp.statStrip}>
          <View style={[sp.statCell, { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
            <Text style={[sp.statLabel, { color: colors.textSecondary }]}>Avg / Day</Text>
            <Text style={[sp.statValue, { color: colors.text }]}>{formatINR(avgDaily)}</Text>
          </View>
          <View style={[sp.statCell, { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
            <Text style={[sp.statLabel, { color: colors.textSecondary }]}>Transactions</Text>
            <Text style={[sp.statValue, { color: colors.text }]}>{txnCount}</Text>
          </View>
          <View style={sp.statCell}>
            <Text style={[sp.statLabel, { color: colors.textSecondary }]}>vs Last</Text>
            <Text style={[sp.statValue, { color: declined ? GREEN : RED }]}>{declined ? '↓' : '↑'} {Math.abs(vsPrev).toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      {/* ── Donut + Legend ── */}
      {donutData.length > 0 && (
        <View style={[sp.card, { backgroundColor: CARD_BG, alignItems: 'center' }]} testID="spending-donut-card">
          <View style={sp.sectionHead}>
            <Text style={[sp.sectionTitle, { color: colors.text }]}>Categories</Text>
          </View>
          <View style={{ marginVertical: 8 }}>
            <PieChart
              data={donutData}
              donut
              radius={92}
              innerRadius={62}
              backgroundColor={CARD_BG}
              centerLabelComponent={() => (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '500' }}>Spent</Text>
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 }}>{formatINR(total)}</Text>
                </View>
              )}
            />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', marginTop: 6 }}>
            {categories.map((c: any) => (
              <View key={c.name} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: c.color }} />
                <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 11, textTransform: 'capitalize' }}>{c.name}</Text>
                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{c.pct.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Spending by Category list ── */}
      {visibleCats.length > 0 && (
        <View style={[sp.card, { backgroundColor: CARD_BG }]} testID="spending-categories-list">
          <View style={sp.sectionHead}>
            <Text style={[sp.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
            <TouchableOpacity onPress={() => router.push('/insights/spending-by-category')} testID="spending-categories-view-all">
              <Text style={[sp.viewAll, { color: PURPLE }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {visibleCats.map((c: any, i: number) => (
            <View key={c.name} style={[sp.catRow, i < visibleCats.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`spending-category-${i}`}>
              <View style={[sp.catIcon, { backgroundColor: c.color + '22' }]}>
                <Ionicons name={c.icon as any} size={18} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={[sp.catName, { color: colors.text }]}>{c.name}</Text>
                  <Text style={[sp.catAmount, { color: colors.text }]}>{formatINR(c.amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <ProgBar pct={c.pct} color={c.color} bg={isDark ? 'rgba(255,255,255,0.06)' : colors.border} height={5} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', minWidth: 38, textAlign: 'right' }}>{c.pct.toFixed(1)}%</Text>
                </View>
              </View>
            </View>
          ))}
          {categories.length > 4 && (
            <TouchableOpacity onPress={() => setShowAllCats(v => !v)} style={{ alignItems: 'center', paddingTop: 10 }}>
              <Text style={{ color: PURPLE, fontSize: 12, fontWeight: '600' }}>{showAllCats ? 'Show Less' : `+${categories.length - 4} More`}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Top Expenses list ── */}
      {visibleTop.length > 0 && (
        <View style={[sp.card, { backgroundColor: CARD_BG }]} testID="spending-top-expenses-list">
          <View style={sp.sectionHead}>
            <Text style={[sp.sectionTitle, { color: colors.text }]}>Top Expenses</Text>
            <TouchableOpacity onPress={() => setShowAllTop(v => !v)} testID="spending-top-expenses-view-all">
              <Text style={[sp.viewAll, { color: PURPLE }]}>{showAllTop ? 'Show Less' : 'View All'}</Text>
            </TouchableOpacity>
          </View>
          {visibleTop.map((e: any, i: number) => (
            <View key={e.merchant} style={[sp.merchantRow, i < visibleTop.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`spending-top-expense-${i}`}>
              <View style={[sp.merchantBadge, { backgroundColor: e.color + '22' }]}>
                <Text style={{ color: e.color, fontSize: 14, fontWeight: '800' }}>#{i + 1}</Text>
              </View>
              <View style={[sp.merchantIcon, { backgroundColor: e.color + '14' }]}>
                <Ionicons name={e.icon as any} size={18} color={e.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[sp.merchantName, { color: colors.text }]}>{e.merchant}</Text>
                <Text style={[sp.merchantMeta, { color: colors.textSecondary }]}>{e.pct.toFixed(1)}% of total</Text>
              </View>
              <Text style={[sp.merchantAmount, { color: RED }]}>{formatINR(e.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const sp = StyleSheet.create({
  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  periodBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  periodBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  card:          { borderRadius: 18, padding: 18, marginBottom: 16, overflow: 'hidden' },
  statStrip:     { flexDirection: 'row' },
  statCell:      { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statLabel:     { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  statValue:     { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, width: '100%' },
  sectionTitle:  { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  viewAll:       { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  catRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  catIcon:       { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName:       { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  catAmount:     { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  merchantRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  merchantBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  merchantIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  merchantName:  { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  merchantMeta:  { fontSize: 11, marginTop: 2 },
  merchantAmount:{ fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET TAB
// ══════════════════════════════════════════════════════════════════════════════
function BudgetTab({ colors, isDark, date }: any) {
  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  const [period,      setPeriod]      = useState<'month' | 'quarter' | 'year'>('month');
  const [loading,     setLoading]     = useState(true);
  const [bdData,      setBdData]      = useState<any>(null);
  const [showAllCats, setShowAllCats] = useState(false);

  const m = date ? (date.getMonth() + 1) : new Date().getMonth() + 1;
  const y = date ? date.getFullYear()     : new Date().getFullYear();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/insights/budget?period=${period}&month=${m}&year=${y}`);
      setBdData(res.data);
    } catch {
      setBdData(null);
    } finally {
      setLoading(false);
    }
  }, [period, m, y]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const PeriodTabs = () => (
    <View style={[bd.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="budget-period-tabs">
      {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
        const active = period === k;
        return (
          <TouchableOpacity key={k} onPress={() => { setPeriod(k as any); setShowAllCats(false); }} style={[bd.periodBtn, active && { backgroundColor: PURPLE }]} testID={`budget-period-${k}`} activeOpacity={0.85}>
            <Text style={[bd.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>{l}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  if (loading) return <View><PeriodTabs /><LoadingBox colors={colors} /></View>;
  if (!bdData || (bdData.categories || []).length === 0) return (
    <View>
      <PeriodTabs />
      <EmptyBox icon="wallet-outline" text="No budgets set yet. Go to Profile → Budgets to create category budgets." colors={colors} />
    </View>
  );

  const totalBudget   = bdData.total_budget   || 0;
  const totalSpent    = bdData.total_spent     || 0;
  const totalRemaining= bdData.total_remaining || 0;
  const usedPct       = bdData.usage_pct       || 0;
  const onTrack       = bdData.on_track        ?? true;
  const daysLeft      = bdData.days_left       || 0;

  const categories = (bdData.categories || []).map((c: any) => ({
    name:      c.category,
    budget:    c.limit,
    spent:     c.spent,
    remaining: c.remaining,
    pct:       c.percentage || 0,
    status:    c.status,
    icon:      getCatConfig(c.category).icon,
    color:     getCatConfig(c.category).color,
  }));

  const overBudget  = categories.filter((c: any) => c.status === 'over');
  const visibleCats = showAllCats ? categories : categories.slice(0, 4);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <PeriodTabs />

      {/* ── Budget Summary Hero ── */}
      <View style={[bd.card, { backgroundColor: CARD_BG, padding: 0, overflow: 'hidden' }]} testID="budget-summary-card">
        <LinearGradient colors={onTrack ? [PURPLE_DARK, PURPLE_LIGHT] : ['#B71C1C', '#E91E8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Total Budget</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Ionicons name={onTrack ? 'checkmark-circle' : 'alert-circle'} size={12} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{onTrack ? 'On Track' : 'Over Budget'}</Text>
            </View>
          </View>
          <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 6 }}>{formatINR(totalBudget)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{bdData.label} · {daysLeft} days left</Text>
          <View style={{ marginTop: 14, height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.18)' }} testID="budget-progress-bar">
            <View style={{ width: `${clamp(usedPct)}%`, backgroundColor: '#FFF' }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>{usedPct.toFixed(0)}% used</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>{formatINR(Math.abs(totalRemaining))} {totalRemaining >= 0 ? 'remaining' : 'over'}</Text>
          </View>
        </LinearGradient>
        <View style={bd.statStrip}>
          <View style={[bd.statCell, { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
            <Text style={[bd.statLabel, { color: colors.textSecondary }]}>Total Spent</Text>
            <Text style={[bd.statValue, { color: RED }]}>{formatINR(totalSpent)}</Text>
          </View>
          <View style={bd.statCell}>
            <Text style={[bd.statLabel, { color: colors.textSecondary }]}>{totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}</Text>
            <Text style={[bd.statValue, { color: totalRemaining >= 0 ? GREEN : RED }]}>{formatINR(Math.abs(totalRemaining))}</Text>
          </View>
        </View>
      </View>

      {/* ── Over Budget ── */}
      {overBudget.length > 0 && (
        <View style={[bd.card, { backgroundColor: CARD_BG, borderWidth: 1, borderColor: RED + '40' }]} testID="budget-over-section">
          <View style={bd.sectionHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: RED + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="alert-circle" size={16} color={RED} />
              </View>
              <Text style={[bd.sectionTitle, { color: colors.text }]}>Over Budget</Text>
              <View style={{ backgroundColor: RED + '22', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: RED, fontSize: 10, fontWeight: '800' }}>{overBudget.length}</Text>
              </View>
            </View>
          </View>
          {overBudget.map((c: any, i: number) => {
            const overBy    = c.spent - c.budget;
            const overByPct = c.budget > 0 ? (overBy / c.budget) * 100 : 0;
            return (
              <View key={c.name} style={[bd.overRow, i < overBudget.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`budget-over-${i}`}>
                <View style={[bd.catIcon, { backgroundColor: c.color + '22' }]}>
                  <Ionicons name={c.icon as any} size={18} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[bd.catName, { color: colors.text, textTransform: 'capitalize' }]}>{c.name}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{formatINR(c.spent)} of {formatINR(c.budget)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: RED, fontSize: 14, fontWeight: '800' }}>+{formatINR(overBy)}</Text>
                  <Text style={{ color: RED, fontSize: 10, fontWeight: '700', marginTop: 2 }}>{overByPct.toFixed(0)}% over</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── Budget by Category ── */}
      <View style={[bd.card, { backgroundColor: CARD_BG }]} testID="budget-categories-list">
        <View style={bd.sectionHead}>
          <Text style={[bd.sectionTitle, { color: colors.text }]}>Budget by Category</Text>
          <TouchableOpacity onPress={() => setShowAllCats(v => !v)} testID="budget-categories-view-all">
            <Text style={[bd.viewAll, { color: PURPLE }]}>{showAllCats ? 'Show Less' : 'View All'}</Text>
          </TouchableOpacity>
        </View>
        {visibleCats.map((c: any, i: number) => {
          const isOver   = c.status === 'over';
          const warn     = c.pct >= 80 && !isOver;
          const barColor = isOver ? RED : warn ? ORANGE : GREEN;
          return (
            <View key={c.name} style={[bd.catRow, i < visibleCats.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`budget-category-${i}`}>
              <View style={[bd.catIcon, { backgroundColor: c.color + '22' }]}>
                <Ionicons name={c.icon as any} size={18} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[bd.catName, { color: colors.text, textTransform: 'capitalize' }]}>{c.name}</Text>
                  <Text style={[bd.catAmount, { color: colors.text }]}>{formatINR(c.spent)} / {formatINR(c.budget)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <View style={{ flex: 1 }}>
                    <ProgBar pct={c.pct} color={barColor} bg={isDark ? 'rgba(255,255,255,0.06)' : colors.border} height={5} />
                  </View>
                  <Text style={{ color: barColor, fontSize: 11, fontWeight: '700', minWidth: 40, textAlign: 'right' }}>{c.pct.toFixed(0)}%</Text>
                </View>
                <Text style={{ color: isOver ? RED : colors.textSecondary, fontSize: 11 }}>
                  {isOver ? `Over by ${formatINR(c.spent - c.budget)}` : `${formatINR(c.remaining)} left`}
                </Text>
              </View>
            </View>
          );
        })}
        {categories.length > 4 && (
          <TouchableOpacity onPress={() => setShowAllCats(v => !v)} style={{ alignItems: 'center', paddingTop: 10 }}>
            <Text style={{ color: PURPLE, fontSize: 12, fontWeight: '600' }}>{showAllCats ? 'Show Less' : `+${categories.length - 4} More`}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const bd = StyleSheet.create({
  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  periodBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  periodBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  card:          { borderRadius: 18, padding: 18, marginBottom: 16, overflow: 'hidden' },
  statStrip:     { flexDirection: 'row' },
  statCell:      { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statLabel:     { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  statValue:     { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  viewAll:       { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  catRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13 },
  catIcon:       { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName:       { fontSize: 13, fontWeight: '700' },
  catAmount:     { fontSize: 12, fontWeight: '700' },
  overRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});

// ══════════════════════════════════════════════════════════════════════════════
// TRENDS TAB
// ══════════════════════════════════════════════════════════════════════════════
type TrendCardData = { total: number; change_pct: number; series: { label: string; value: number }[] };

function TrendCard({ title, icon, accent, data, colors, isDark, inverseDelta = false, testID, onViewAll }: {
  title: string; icon: any; accent: string; data: TrendCardData; colors: any; isDark: boolean; inverseDelta?: boolean; testID: string; onViewAll?: () => void;
}) {
  const CARD_BG   = isDark ? '#1C1C2E' : colors.card;
  const positive  = inverseDelta ? data.change_pct < 0 : data.change_pct > 0;
  const deltaColor = data.change_pct === 0 ? colors.textSecondary : positive ? GREEN : RED;
  const deltaIcon  = data.change_pct > 0 ? 'arrow-up' : data.change_pct < 0 ? 'arrow-down' : 'remove';
  return (
    <View style={[tr.card, { backgroundColor: CARD_BG }]} testID={testID}>
      <View style={tr.cardHead}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={[tr.iconWrap, { backgroundColor: accent + '22' }]}>
            <Ionicons name={icon} size={18} color={accent} />
          </View>
          <Text style={[tr.cardTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} testID={`${testID}-view-all`}>
            <Text style={{ color: PURPLE, fontSize: 12, fontWeight: '800', letterSpacing: 0.2 }}>View All →</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10, marginBottom: 12 }}>
        <Text style={[tr.cardValue, { color: accent }]}>{formatINR(data.total)}</Text>
        <View style={[tr.deltaPill, { backgroundColor: deltaColor + '1E' }]}>
          <Ionicons name={deltaIcon as any} size={11} color={deltaColor} />
          <Text style={[tr.deltaText, { color: deltaColor }]}>{Math.abs(data.change_pct).toFixed(1)}%</Text>
        </View>
      </View>
      {data.series.length > 1 && (
        <LineChart
          data={data.series.map(p => ({ value: p.value, label: p.label }))}
          width={CHART_W - 8}
          height={110}
          color={accent}
          thickness={2.5}
          curved
          hideDataPoints={false}
          dataPointsColor={accent}
          dataPointsRadius={3}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          rulesColor={isDark ? 'rgba(255,255,255,0.06)' : colors.border}
          xAxisColor={colors.border}
          yAxisColor="transparent"
          areaChart
          startFillColor={accent}
          endFillColor="transparent"
          startOpacity={0.3}
          endOpacity={0}
          isAnimated
          initialSpacing={6}
        />
      )}
    </View>
  );
}

function TrendsTab({ colors, isDark }: any) {
  const router = useRouter();
  const [period,  setPeriod]  = useState<'month' | '6m' | 'year'>('6m');
  const [loading, setLoading] = useState(true);
  const [trData,  setTrData]  = useState<any>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/insights/trends?period=${period}`);
      setTrData(res.data);
    } catch {
      setTrData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const emptyTrend: TrendCardData = { total: 0, change_pct: 0, series: [] };

  const income     = trData?.income     ? { total: trData.income.total,     change_pct: trData.income.change_pct,     series: trData.income.series     } : emptyTrend;
  const expense    = trData?.expense    ? { total: trData.expense.total,    change_pct: trData.expense.change_pct,    series: trData.expense.series    } : emptyTrend;
  const investment = trData?.investment ? { total: trData.investment.total, change_pct: trData.investment.change_pct, series: trData.investment.series } : emptyTrend;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ── Period Tabs ── */}
      <View style={[tr.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="trends-period-tabs">
        {([['month', 'This Month'], ['6m', 'Last 6 Months'], ['year', 'This Year']] as const).map(([k, l]) => {
          const active = period === k;
          return (
            <TouchableOpacity key={k} onPress={() => setPeriod(k as any)} style={[tr.periodBtn, active && { backgroundColor: PURPLE }]} testID={`trends-period-${k}`} activeOpacity={0.85}>
              <Text style={[tr.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>{l}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <LoadingBox colors={colors} />
      ) : !trData ? (
        <EmptyBox icon="trending-up-outline" text="No trend data yet. Add transactions over multiple months to see trends." colors={colors} />
      ) : (
        <>
          <TrendCard title="Income Trend"    icon="arrow-down-circle" accent={GREEN}  data={income}     colors={colors} isDark={isDark} testID="trends-income-card" onViewAll={() => router.push('/income')} />
          <TrendCard title="Expense Trend"   icon="arrow-up-circle"   accent={RED}    data={expense}    colors={colors} isDark={isDark} inverseDelta testID="trends-expense-card" />
          <TrendCard title="Investment Trend" icon="trending-up"       accent={PURPLE} data={investment}  colors={colors} isDark={isDark} testID="trends-investment-card" />
        </>
      )}
    </ScrollView>
  );
}

const tr = StyleSheet.create({
  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  periodBtn:     { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 11 },
  periodBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  card:          { borderRadius: 18, padding: 18, marginBottom: 16 },
  cardHead:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconWrap:      { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardTitle:     { fontSize: 14, fontWeight: '800', letterSpacing: -0.1 },
  cardValue:     { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  deltaPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  deltaText:     { fontSize: 11, fontWeight: '800', letterSpacing: 0.1 },
});

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR TAB
// ══════════════════════════════════════════════════════════════════════════════
const DAYS        = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function CalendarTab({ colors, isDark }: any) {
  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  const [calDate,    setCalDate]    = useState(new Date());
  const [selectedDay, setSelDay]   = useState<number | null>(new Date().getDate());
  const [loading,    setLoading]   = useState(true);
  const [calData,    setCalData]   = useState<any>(null);

  const year  = calDate.getFullYear();
  const month = calDate.getMonth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/insights/calendar?month=${month + 1}&year=${year}`);
      setCalData(res.data);
    } catch {
      setCalData(null);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today       = new Date();
  const isCurMon    = today.getFullYear() === year && today.getMonth() === month;

  // Build day totals from API data
  const dailyData = calData?.daily_data || {};
  const dayTotals: Record<number, { credit: number; debit: number }> = {};
  Object.entries(dailyData).forEach(([d, v]: [string, any]) => {
    dayTotals[Number(d)] = { credit: v.income || 0, debit: v.expense || 0 };
  });

  // All transactions for selected day
  const allTxns: any[] = calData?.transactions || [];
  const dayTxns = selectedDay
    ? allTxns.filter(t => {
        try {
          const d = new Date(t.date);
          return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay;
        } catch { return false; }
      })
    : [];

  const dayCredit = dayTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const dayDebit  = dayTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  const totalTxns = allTxns.length;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 96 }}>
        {/* ── Month navigator ── */}
        <View style={[cl.monthNav, { backgroundColor: CARD_BG }]} testID="calendar-month-nav">
          <TouchableOpacity onPress={() => { setCalDate(subMonths(calDate, 1)); setSelDay(null); }} style={cl.navBtn} testID="calendar-prev-month">
            <Ionicons name="chevron-back" size={20} color={PURPLE} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={[cl.monthTitle, { color: colors.text }]}>{MONTHS_SHORT[month]} {year}</Text>
            {loading
              ? <ActivityIndicator size="small" color={PURPLE} style={{ marginTop: 4 }} />
              : <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{totalTxns} transactions</Text>
            }
          </View>
          <TouchableOpacity onPress={() => { setCalDate(addMonths(calDate, 1)); setSelDay(null); }} style={cl.navBtn} testID="calendar-next-month">
            <Ionicons name="chevron-forward" size={20} color={PURPLE} />
          </TouchableOpacity>
        </View>

        {/* ── Calendar grid ── */}
        <View style={[cl.gridCard, { backgroundColor: CARD_BG }]} testID="calendar-grid">
          <View style={cl.dayHeaderRow}>
            {DAYS.map(d => <Text key={d} style={[cl.dayHeader, { color: colors.textSecondary }]}>{d}</Text>)}
          </View>
          <View style={cl.grid}>
            {Array.from({ length: firstDay }).map((_, i) => <View key={`e${i}`} style={cl.cell} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day       = i + 1;
              const totals    = dayTotals[day];
              const hasCredit = (totals?.credit || 0) > 0;
              const hasDebit  = (totals?.debit  || 0) > 0;
              const isToday   = isCurMon && today.getDate() === day;
              const isSelected= selectedDay === day;
              return (
                <TouchableOpacity key={day} onPress={() => setSelDay(isSelected ? null : day)} style={cl.cell} activeOpacity={0.7} testID={`calendar-day-${day}`}>
                  <View style={[cl.cellInner, isSelected && { backgroundColor: PURPLE }, !isSelected && isToday && { borderWidth: 1.5, borderColor: PURPLE }]}>
                    <Text style={[cl.dayNum, { color: isSelected ? '#FFF' : (isToday ? PURPLE : colors.text) }, (isSelected || isToday) && { fontWeight: '800' }]}>{day}</Text>
                    {(hasCredit || hasDebit) && (
                      <View style={cl.dotRow}>
                        {hasCredit && <View style={[cl.dot, { backgroundColor: isSelected ? '#FFF' : GREEN }]} />}
                        {hasDebit  && <View style={[cl.dot, { backgroundColor: isSelected ? '#FFF' : RED   }]} />}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={cl.legendRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cl.dot, { backgroundColor: GREEN }]} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Credit</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cl.dot, { backgroundColor: RED }]} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Debit</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: PURPLE }} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Today</Text>
            </View>
          </View>
        </View>

        {/* ── Daily summary header ── */}
        <View style={cl.summaryHead} testID="calendar-day-summary">
          <View>
            <Text style={[cl.summaryTitle, { color: colors.text }]}>
              {selectedDay ? `${MONTHS_SHORT[month]} ${selectedDay}, ${year}` : 'Pick a day'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              {dayTxns.length} transaction{dayTxns.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {dayTxns.length > 0 && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: GREEN, fontSize: 12, fontWeight: '700' }}>+{formatINR(dayCredit)}</Text>
              <Text style={{ color: RED,   fontSize: 12, fontWeight: '700', marginTop: 2 }}>-{formatINR(dayDebit)}</Text>
            </View>
          )}
        </View>

        {/* ── Transactions list ── */}
        {dayTxns.length === 0 ? (
          <View style={[cl.emptyCard, { backgroundColor: CARD_BG }]}>
            <Ionicons name="calendar-clear-outline" size={36} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 10, fontSize: 13 }}>
              {selectedDay ? 'No transactions on this day' : 'Select a day to view transactions'}
            </Text>
          </View>
        ) : (
          <View style={[cl.txnCard, { backgroundColor: CARD_BG }]} testID="calendar-txn-list">
            {dayTxns.map((t: any, i: number) => {
              const credit  = t.type === 'credit';
              const catConf = getCatConfig(t.category);
              return (
                <View key={i} style={[cl.txnRow, i < dayTxns.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} testID={`calendar-txn-${i}`}>
                  <View style={[cl.txnIcon, { backgroundColor: catConf.color + '22' }]}>
                    <Ionicons name={catConf.icon as any} size={18} color={catConf.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[cl.txnName, { color: colors.text }]} numberOfLines={1}>{t.name}</Text>
                    <Text style={[cl.txnCat, { color: colors.textSecondary }]}>{t.category}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[cl.txnAmount, { color: credit ? GREEN : RED }]}>
                      {credit ? '+' : '-'}{formatINR(t.amount)}
                    </Text>
                    <View style={[cl.txnBadge, { backgroundColor: credit ? GREEN + '1E' : RED + '1E' }]}>
                      <Ionicons name={credit ? 'arrow-down' : 'arrow-up'} size={9} color={credit ? GREEN : RED} />
                      <Text style={{ color: credit ? GREEN : RED, fontSize: 9, fontWeight: '800' }}>{credit ? 'CREDIT' : 'DEBIT'}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={cl.fabWrap} activeOpacity={0.85} testID="calendar-add-fab">
        <LinearGradient colors={[PURPLE_DARK, PURPLE_LIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={cl.fab}>
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const cl = StyleSheet.create({
  monthNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, marginBottom: 14 },
  navBtn:       { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monthTitle:   { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  gridCard:     { borderRadius: 18, padding: 14, marginBottom: 16 },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 10 },
  dayHeader:    { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  cell:         { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  cellInner:    { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 11, gap: 3 },
  dayNum:       { fontSize: 13, fontWeight: '700' },
  dotRow:       { flexDirection: 'row', gap: 3 },
  dot:          { width: 5, height: 5, borderRadius: 2.5 },
  legendRow:    { flexDirection: 'row', gap: 18, justifyContent: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  summaryHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 12 },
  summaryTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  emptyCard:    { borderRadius: 16, padding: 32, alignItems: 'center' },
  txnCard:      { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 },
  txnRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  txnIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txnName:      { fontSize: 13, fontWeight: '800', letterSpacing: -0.1 },
  txnCat:       { fontSize: 11, textTransform: 'capitalize', marginTop: 2 },
  txnAmount:    { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  txnBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  fabWrap:      { position: 'absolute', right: 18, bottom: 24, shadowColor: PURPLE, shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  fab:          { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});

// ══════════════════════════════════════════════════════════════════════════════
// MAIN INSIGHTS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function InsightsScreen() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [date, setDate] = useState(new Date());

  const tabScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    tabScrollRef.current?.scrollTo({ x: Math.max(0, activeTab - 1) * 80, animated: true });
  }, [activeTab]);

  const tabContent = () => {
    switch (activeTab) {
      case 0: return <OverviewTab  colors={colors} isDark={isDark} date={date} onDateChange={setDate} />;
      case 1: return <CashFlowTab  colors={colors} isDark={isDark} date={date} onDateChange={setDate} />;
      case 2: return <SpendingTab  colors={colors} isDark={isDark} date={date} onDateChange={setDate} />;
      case 3: return <BudgetTab    colors={colors} isDark={isDark} date={date} onDateChange={setDate} />;
      case 4: return <TrendsTab    colors={colors} isDark={isDark} />;
      case 5: return <CalendarTab  colors={colors} isDark={isDark} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[st.root, { backgroundColor: colors.background }]} edges={['top']}>
      {/* ── Screen header ── */}
      <View style={[st.header, { borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: colors.text }]}>Insights</Text>
          <Text style={[st.headerSub, { color: colors.textSecondary }]}>
            {format(date, 'MMMM yyyy')} · your money at a glance
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[st.headerBtn, { backgroundColor: colors.card }]} testID="insights-settings-btn">
            <Ionicons name="options-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab row ── */}
      <View style={[st.tabWrap, { backgroundColor: isDark ? '#111120' : colors.card, borderBottomColor: colors.border }]}>
        <ScrollView ref={tabScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabScroll}>
          {TABS.map((tab, i) => {
            const active = activeTab === i;
            return (
              <TouchableOpacity key={tab.label} onPress={() => setActiveTab(i)} style={st.tabTouch} testID={`insights-tab-${tab.label.toLowerCase().replace(' ', '-')}`} activeOpacity={0.8}>
                {active ? (
                  <LinearGradient colors={[PURPLE_DARK, PURPLE_LIGHT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.tabItemActive}>
                    <Ionicons name={tab.activeIcon as any} size={15} color="#FFF" />
                    <Text style={[st.tabLabel, { color: '#FFF' }]}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[st.tabItemInactive, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]}>
                    <Ionicons name={tab.icon as any} size={15} color={isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary} />
                    <Text style={[st.tabLabel, { color: isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary }]}>{tab.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Tab content ── */}
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 14 }}>
        {tabContent()}
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  headerSub:   { fontSize: 12, fontWeight: '500', marginTop: 2, letterSpacing: 0.1 },
  headerBtn:   { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tabWrap:     { borderBottomWidth: 1 },
  tabScroll:   { paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  tabTouch:    {},
  tabItemActive:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, shadowColor: PURPLE_DARK, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  tabItemInactive: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999 },
  tabLabel:    { fontSize: 13, fontWeight: '700', letterSpacing: 0.1 },
  loadBox:     { alignItems: 'center', justifyContent: 'center', height: 120, borderRadius: 14, marginTop: 8 },
  emptyBox:    { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText:   { fontSize: 13, textAlign: 'center', maxWidth: 260, lineHeight: 19 },
});
