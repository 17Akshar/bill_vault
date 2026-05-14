import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPct(v: number, showPlus = true) {
  const s = Math.abs(v).toFixed(1);
  if (v > 0) return (showPlus ? '+' : '') + s + '%';
  if (v < 0) return '-' + s + '%';
  return '0%';
}
function clamp(v: number, lo = 0, hi = 100) { return Math.min(Math.max(v, lo), hi); }

// ─── Micro-components ─────────────────────────────────────────────────────────
function ProgBar({ pct, color, height = 6, bg }: any) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: bg || 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <View style={{ height, width: `${clamp(pct)}%`, borderRadius: height / 2, backgroundColor: color }} />
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

function SectionHeader({ title, colors, action, onAction }: any) {
  return (
    <View style={st.sectionHead}>
      <Text style={[st.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && <TouchableOpacity onPress={onAction}><Text style={[st.viewAll, { color: PURPLE }]}>{action}</Text></TouchableOpacity>}
    </View>
  );
}

function Chip({ label, active, onPress, color }: any) {
  return (
    <TouchableOpacity
      style={[st.chip, active && { backgroundColor: color + '22', borderColor: color }]}
      onPress={onPress}
    >
      <Text style={[st.chipText, { color: active ? color : '#888' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MonthNav({ date, onChange, colors }: any) {
  return (
    <View style={st.monthNav}>
      <TouchableOpacity onPress={() => onChange(subMonths(date, 1))} style={st.monthBtn} testID="month-prev">
        <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      <Text style={[st.monthLabel, { color: colors.text }]}>{format(date, 'MMMM yyyy')}</Text>
      <TouchableOpacity onPress={() => onChange(addMonths(date, 1))} style={st.monthBtn} testID="month-next">
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Loading & Empty states ───────────────────────────────────────────────────
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
// DUMMY DATA — Overview Tab
// ══════════════════════════════════════════════════════════════════════════════
const DUMMY_OVERVIEW = {
  label:    'May 2026',
  income:   { total: 125000, vs_last_month: 15.2 },
  expenses: { total: 75000,  vs_last_month: -5.3  },
  savings:  { total: 50000,  rate: 40.0, vs_last_month: 20.5 },
  net_cash_flow:     50000,
  net_cash_flow_pct: 20.0,
  sparkline: [22000, 35000, 28000, 42000, 47000, 50000],
  quick_insights: [
    { icon: 'flame-outline',         color: PURPLE,  title: 'Spending Alert', text: 'You spent 20% more on Food this month.' },
    { icon: 'trending-up-outline',   color: GREEN,   title: 'Savings Rate',   text: 'Your savings rate is 40% this month — excellent!' },
    { icon: 'bulb-outline',          color: YELLOW,  title: 'Opportunity',    text: 'You can save ₹20,000 with better budget planning.' },
  ],
  accounts: [
    { label: 'Bank Accounts',           count: 2, balance:  332600, icon: 'business-outline',       color: PURPLE },
    { label: 'Cash & Wallets',          count: 3, balance:   48600, icon: 'wallet-outline',          color: GREEN  },
    { label: 'UPI Accounts',            count: 2, balance:   24800, icon: 'phone-portrait-outline',  color: PURPLE },
    { label: 'Accounts with Overdraft', count: 1, balance:  -12600, icon: 'card-outline',            color: RED    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// DUMMY DATA — Trends Tab → Investment Returns
// ══════════════════════════════════════════════════════════════════════════════
const DUMMY_INVESTMENTS = {
  total_invested:   650000,
  current_value:    812500,
  absolute_return:  162500,
  return_pct:       25.0,
  xirr:             18.4,
  best_month_label: 'Mar 2026',
  best_month_pct:   8.2,
  // 6 months of portfolio value (₹)
  value_series: [
    { label: 'Dec', value: 660000 },
    { label: 'Jan', value: 682000 },
    { label: 'Feb', value: 705000 },
    { label: 'Mar', value: 762000 },
    { label: 'Apr', value: 788000 },
    { label: 'May', value: 812500 },
  ],
  // Per-asset returns breakdown
  breakdown: [
    { name: 'Mutual Funds', invested: 280000, current: 358000, color: PURPLE,    icon: 'trending-up-outline' },
    { name: 'Stocks',       invested: 180000, current: 234500, color: TEAL,      icon: 'analytics-outline'   },
    { name: 'Gold (Digital)', invested: 90000,  current: 105200, color: YELLOW,  icon: 'medal-outline'       },
    { name: 'Fixed Deposits', invested: 100000, current: 114800, color: GREEN,   icon: 'lock-closed-outline' },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB  (UI-only with dummy data)
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ colors, isDark, date, onDateChange }: any) {
  const d  = DUMMY_OVERVIEW;
  const CARD_BG = isDark ? '#1C1C2E' : colors.card;
  const SECT_BG = isDark ? '#141424' : colors.background;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* ── Month navigator ── */}
      <View style={ov.monthRow}>
        <TouchableOpacity onPress={() => onDateChange(subMonths(date, 1))} style={ov.monthBtn} testID="month-prev">
          <Ionicons name="chevron-back" size={20} color={GREY} />
        </TouchableOpacity>
        <Text style={[ov.monthLabel, { color: colors.text }]}>{d.label}</Text>
        <TouchableOpacity onPress={() => onDateChange(addMonths(date, 1))} style={ov.monthBtn} testID="month-next">
          <Ionicons name="chevron-forward" size={20} color={GREY} />
        </TouchableOpacity>
      </View>

      {/* ── This Month Overview Card ── */}
      <View style={[ov.card, { backgroundColor: CARD_BG }]}>
        {/* Card header */}
        <View style={ov.cardHead}>
          <Text style={[ov.cardTitle, { color: colors.text }]}>This Month Overview</Text>
          <Text style={[ov.cardSub, { color: GREY }]}>{d.label}</Text>
        </View>

        {/* Divider */}
        <View style={[ov.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]} />

        {/* 3 metric columns */}
        <View style={ov.metricsRow}>
          {[
            { label: 'Income',   value: d.income.total,   color: GREEN,  delta: d.income.vs_last_month  },
            { label: 'Expenses', value: d.expenses.total, color: RED,    delta: d.expenses.vs_last_month, inv: true },
            { label: 'Savings',  value: d.savings.total,  color: GREEN,  delta: d.savings.vs_last_month },
          ].map((m, i) => (
            <View key={m.label} style={[ov.metricCol, i < 2 && { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
              <Text style={[ov.metricLabel, { color: GREY }]}>{m.label}</Text>
              <Text style={[ov.metricValue, { color: m.color }]}>{formatINR(m.value)}</Text>
              <View style={ov.deltaRow}>
                <Ionicons
                  name={m.delta > 0 ? 'arrow-up' : m.delta < 0 ? 'arrow-down' : 'remove'}
                  size={10}
                  color={m.inv ? (m.delta < 0 ? GREEN : RED) : (m.delta >= 0 ? GREEN : RED)}
                />
                <Text style={[ov.deltaText, {
                  color: m.inv ? (m.delta < 0 ? GREEN : RED) : (m.delta >= 0 ? GREEN : RED)
                }]}>
                  {Math.abs(m.delta).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Savings rate badge */}
        <View style={ov.rateRow}>
          <View style={[ov.rateBadge, { backgroundColor: GREEN + '20' }]}>
            <Ionicons name="leaf-outline" size={12} color={GREEN} />
            <Text style={[ov.rateText, { color: GREEN }]}>Savings Rate: {d.savings.rate}%</Text>
          </View>
        </View>
      </View>

      {/* ── Net Cash Flow Card ── */}
      <View style={[ov.card, { backgroundColor: CARD_BG }]}>
        <View style={ov.cardHead}>
          <Text style={[ov.cardTitle, { color: colors.text }]}>Net Cash Flow</Text>
        </View>
        <Text style={[ov.cashSubtitle, { color: GREY }]}>This Month's Flow</Text>

        {/* Big value */}
        <Text style={[ov.cashValue, { color: GREEN }]}>{formatINR(d.net_cash_flow)}</Text>

        {/* Delta indicator */}
        <View style={ov.cashDelta}>
          <Ionicons name="arrow-up" size={13} color={GREEN} />
          <Text style={[ov.cashDeltaText, { color: GREEN }]}>
            {d.net_cash_flow_pct}% vs last month
          </Text>
        </View>

        {/* Sparkline */}
        <View style={{ marginTop: 8 }}>
          <LineChart
            data={d.sparkline.map(v => ({ value: v }))}
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
      </View>

      {/* ── Quick Insights ── */}
      <View style={[ov.card, { backgroundColor: CARD_BG }]}>
        <View style={ov.sectionHead}>
          <Text style={[ov.sectionTitle, { color: colors.text }]}>Quick Insights</Text>
          <TouchableOpacity testID="quick-insights-view-all">
            <Text style={[ov.viewAll, { color: PURPLE }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {d.quick_insights.map((ins, i) => (
          <View
            key={i}
            style={[
              ov.insightRow,
              i < d.quick_insights.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
            ]}
          >
            {/* Icon */}
            <View style={[ov.insightIconWrap, { backgroundColor: ins.color + '22' }]}>
              <Ionicons name={ins.icon as any} size={18} color={ins.color} />
            </View>
            {/* Text */}
            <View style={{ flex: 1 }}>
              <Text style={[ov.insightTitle, { color: colors.text }]}>{ins.title}</Text>
              <Text style={[ov.insightBody, { color: GREY }]} numberOfLines={2}>{ins.text}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={GREY} />
          </View>
        ))}
      </View>

      {/* ── Accounts Summary ── */}
      <View style={[ov.card, { backgroundColor: CARD_BG }]}>
        <View style={ov.sectionHead}>
          <Text style={[ov.sectionTitle, { color: colors.text }]}>Accounts Summary</Text>
          <TouchableOpacity testID="accounts-view-all">
            <Text style={[ov.viewAll, { color: PURPLE }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {d.accounts.map((acc, i) => (
          <TouchableOpacity
            key={i}
            style={[
              ov.accRow,
              i < d.accounts.length - 1 && { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
            ]}
            testID={`account-row-${i}`}
            activeOpacity={0.7}
          >
            {/* Icon */}
            <View style={[ov.accIconWrap, { backgroundColor: acc.color + '1E' }]}>
              <Ionicons name={acc.icon as any} size={20} color={acc.color} />
            </View>

            {/* Name + count */}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[ov.accName, { color: colors.text }]}>{acc.label}</Text>
              <Text style={[ov.accCount, { color: GREY }]}>{acc.count} Account{acc.count !== 1 ? 's' : ''}</Text>
            </View>

            {/* Balance + arrow */}
            <View style={ov.accRight}>
              <Text style={[ov.accBalance, { color: acc.balance < 0 ? RED : colors.text }]}>
                {acc.balance < 0 ? '-' : ''}{formatINR(Math.abs(acc.balance))}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={GREY} style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Overview-specific styles ──────────────────────────────────────────────────
const ov = StyleSheet.create({
  monthRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 8 },
  monthBtn:   { padding: 8 },
  monthLabel: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },

  card:       { borderRadius: 16, padding: 18, marginBottom: 14, overflow: 'hidden' },
  cardHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:  { fontSize: 16, fontWeight: '700' },
  cardSub:    { fontSize: 12 },
  divider:    { height: 1, marginBottom: 14 },

  metricsRow: { flexDirection: 'row' },
  metricCol:  { flex: 1, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 6 },
  metricLabel:{ fontSize: 12, marginBottom: 6, fontWeight: '500' },
  metricValue:{ fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  deltaRow:   { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deltaText:  { fontSize: 11, fontWeight: '700' },
  rateRow:    { marginTop: 14, alignItems: 'flex-start' },
  rateBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  rateText:   { fontSize: 12, fontWeight: '700' },

  cashSubtitle: { fontSize: 12, marginBottom: 6 },
  cashValue:    { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  cashDelta:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cashDeltaText:{ fontSize: 13, fontWeight: '700' },

  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAll:      { fontSize: 13, fontWeight: '600' },

  insightRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  insightIconWrap:{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  insightTitle:   { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  insightBody:    { fontSize: 12, lineHeight: 17 },

  accRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  accIconWrap:{ width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  accName:    { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  accCount:   { fontSize: 12 },
  accRight:   { flexDirection: 'row', alignItems: 'center' },
  accBalance: { fontSize: 15, fontWeight: '700' },
});

// ══════════════════════════════════════════════════════════════════════════════
// CASH FLOW TAB
// ══════════════════════════════════════════════════════════════════════════════
function CashFlowTab({ colors, isDark }: any) {
  const [data, setData]    = useState<any>(null);
  const [loading, setLoad] = useState(true);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const MONTHS_MAP = { month: 1, quarter: 3, year: 12 };

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const r = await api.get('/analytics/cashflow', { params: { months: 6 } });
      setData(r.data);
    } catch { setData(null); }
    finally { setLoad(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBox colors={colors} />;
  if (!data?.monthly?.length) return <EmptyBox icon="swap-vertical-outline" text="No cash flow data available" colors={colors} />;

  const monthly = data.monthly as any[];
  const summary = data.summary;

  // Filter by period
  const nMonths = MONTHS_MAP[period];
  const display = monthly.slice(-nMonths);

  const latest  = display[display.length - 1] || {};
  const prev    = display[display.length - 2] || {};
  const cashFlowChg = prev.savings ? ((latest.savings - prev.savings) / Math.abs(prev.savings)) * 100 : 0;

  // Bar chart data
  const barData = display.flatMap((m: any) => [
    { value: m.income,  label: m.short_label, frontColor: GREEN  + 'CC', spacing: 4 },
    { value: m.expense, frontColor: RED + 'CC', spacing: 14 },
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Period tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['month', 'quarter', 'year'] as const).map(p => (
            <Chip key={p} label={p === 'month' ? 'This Month' : p === 'quarter' ? 'Quarter' : 'This Year'} active={period === p} color={PURPLE} onPress={() => setPeriod(p)} />
          ))}
        </View>
      </ScrollView>

      {/* Net Cash Flow hero */}
      <View style={[st.cashHero, { backgroundColor: isDark ? '#0D1E3D' : colors.card }]}>
        <Text style={[st.cashHeroLabel, { color: 'rgba(255,255,255,0.65)' }]}>Net Cash Flow · {latest.label || ''}</Text>
        <Text style={[st.cashHeroValue, { color: latest.savings >= 0 ? GREEN : RED }]}>{formatINR(latest.savings || 0)}</Text>
        <Delta value={cashFlowChg} />
        {/* Mini sparkline */}
        {display.length > 1 && (
          <View style={{ marginTop: 12 }}>
            <LineChart
              data={display.map((m: any) => ({ value: m.savings }))}
              width={CHART_W - 40}
              height={60}
              hideDataPoints
              color={latest.savings >= 0 ? GREEN : RED}
              thickness={2}
              curved
              hideRules
              hideYAxisText
              hideAxesAndRules
              areaChart
              startFillColor={latest.savings >= 0 ? GREEN : RED}
              endFillColor="transparent"
              startOpacity={0.3}
              endOpacity={0}
            />
          </View>
        )}
      </View>

      {/* Inflow / Outflow cards */}
      <View style={st.inflowRow}>
        {[
          { label: 'Total Inflow',  value: display.reduce((s: number, m: any) => s + m.income,  0), color: GREEN, icon: 'arrow-down-circle-outline' },
          { label: 'Total Outflow', value: display.reduce((s: number, m: any) => s + m.expense, 0), color: RED,   icon: 'arrow-up-circle-outline' },
        ].map(c => (
          <View key={c.label} style={[st.flowCard, { backgroundColor: colors.card, flex: 1 }]}>
            <Ionicons name={c.icon as any} size={22} color={c.color} />
            <Text style={[st.flowLabel, { color: colors.textSecondary }]}>{c.label}</Text>
            <Text style={[st.flowValue, { color: c.color }]}>{formatINR(c.value)}</Text>
          </View>
        ))}
      </View>

      {/* Bar chart */}
      <SectionHeader title="Monthly Cash Flow Trend" colors={colors} />
      <View style={[st.card, { backgroundColor: colors.card }]}>
        <View style={st.chartLegend}>
          {[{ color: GREEN, label: 'Inflow' }, { color: RED, label: 'Outflow' }].map(l => (
            <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.color }} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{l.label}</Text>
            </View>
          ))}
        </View>
        <BarChart
          data={barData}
          width={CHART_W}
          height={150}
          barWidth={14}
          noOfSections={4}
          xAxisColor={colors.border}
          yAxisColor="transparent"
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          rulesColor={colors.border}
          showLine={false}
          isAnimated
        />
      </View>

      {/* Monthly breakdown list */}
      <SectionHeader title="Month-by-Month" colors={colors} />
      <View style={[st.card, { backgroundColor: colors.card }]}>
        {display.slice().reverse().map((m: any, i: number) => (
          <View key={i} style={[st.cfMonthRow, i < display.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[st.cfMonthLabel, { color: colors.text }]}>{m.label}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <Text style={{ color: GREEN, fontSize: 12, fontWeight: '600' }}>{formatINR(m.income)}</Text>
                <Text style={{ color: RED,   fontSize: 12, fontWeight: '600' }}>{formatINR(m.expense)}</Text>
              </View>
              <Text style={{ color: m.savings >= 0 ? GREEN : RED, fontSize: 11, marginTop: 2 }}>
                Net: {formatINR(m.savings)} · {m.savings_rate}%
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SPENDING TAB
// ══════════════════════════════════════════════════════════════════════════════
function SpendingTab({ colors, isDark, date, onDateChange }: any) {
  const [data, setData]    = useState<any>(null);
  const [loading, setLoad] = useState(true);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const r = await api.get('/analytics/expense-breakdown', { params: { month: date.getMonth() + 1, year: date.getFullYear() } });
      setData(r.data);
    } catch { setData(null); }
    finally { setLoad(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBox colors={colors} />;
  if (!data?.categories?.length) return (
    <>
      <MonthNav date={date} onChange={onDateChange} colors={colors} />
      <EmptyBox icon="pie-chart-outline" text="No spending data for this period" colors={colors} />
    </>
  );

  const total = data.total || 0;
  const cats  = data.categories as any[];

  // Donut data
  const donutData = cats.slice(0, 7).map((c: any, i: number) => ({
    value: c.amount, color: getCatColor(i), text: c.category.slice(0, 3).toUpperCase(),
  }));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <MonthNav date={date} onChange={onDateChange} colors={colors} />

      {/* Total + Donut */}
      <View style={[st.card, { backgroundColor: colors.card, alignItems: 'center', paddingTop: 20 }]}>
        <Text style={[st.sectionTitle, { color: colors.text, marginBottom: 4 }]}>Total Spending</Text>
        <Text style={[st.bigAmount, { color: RED }]}>{formatINR(total)}</Text>
        <View style={{ marginVertical: 16 }}>
          <PieChart
            data={donutData}
            donut
            radius={90}
            innerRadius={58}
            centerLabelComponent={() => (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{formatINR(total, false)}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Total</Text>
              </View>
            )}
          />
        </View>
        {/* Legend */}
        <View style={{ width: '100%', gap: 6 }}>
          {donutData.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color }} />
              <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1, textTransform: 'capitalize' }}>{cats[i]?.category}</Text>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{cats[i]?.percentage?.toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Category breakdown */}
      <SectionHeader title="Spending by Category" colors={colors} />
      <View style={[st.card, { backgroundColor: colors.card }]}>
        {cats.map((c: any, i: number) => (
          <View key={i} style={[st.catRow, i < cats.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={[st.catIcon, { backgroundColor: getCatColor(i) + '22' }]}>
              <Ionicons name="pricetag-outline" size={14} color={getCatColor(i)} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={[st.catName, { color: colors.text }]}>{c.category}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[st.catAmt, { color: colors.text }]}>{formatINR(c.amount)}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{c.percentage?.toFixed(1)}%</Text>
                </View>
              </View>
              <ProgBar pct={c.percentage} color={getCatColor(i)} bg={colors.border} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BUDGET TAB
// ══════════════════════════════════════════════════════════════════════════════
function BudgetTab({ colors, isDark, date, onDateChange }: any) {
  const [data, setData]    = useState<any>(null);
  const [loading, setLoad] = useState(true);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const res = await api.get('/insights/budget-status', {
        params: { month: date.getMonth() + 1, year: date.getFullYear() },
      });
      setData(res.data);
    } catch { setData(null); }
    finally { setLoad(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingBox colors={colors} />;
  if (!data?.budget_status?.length) return (
    <>
      <MonthNav date={date} onChange={onDateChange} colors={colors} />
      <EmptyBox icon="wallet-outline" text="No budgets set. Create budgets to track progress." colors={colors} />
    </>
  );

  const budgets        = data.budget_status as any[];
  const overBudget     = budgets.filter((b: any) => b.percentage > 100);
  const totalBudgeted  = data.total_budgeted || 0;
  const totalSpent     = data.total_spent    || 0;
  const totalRemaining = data.total_remaining || 0;
  const overallPct     = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const onTrack        = overallPct <= 100;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      <MonthNav date={date} onChange={onDateChange} colors={colors} />

      {/* Total budget card */}
      <View style={[st.card, { backgroundColor: colors.card }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>Total Budget</Text>
          <View style={[st.statusBadge, { backgroundColor: onTrack ? GREEN + '22' : RED + '22' }]}>
            <Text style={{ color: onTrack ? GREEN : RED, fontSize: 11, fontWeight: '700' }}>
              {onTrack ? 'On Track' : 'Over Budget'}
            </Text>
          </View>
        </View>
        <View style={st.budgetTotalRow}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[st.budgetTotalVal, { color: colors.text }]}>{formatINR(totalBudgeted)}</Text>
            <Text style={[st.budgetTotalLabel, { color: colors.textSecondary }]}>Budgeted</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[st.budgetTotalVal, { color: RED }]}>{formatINR(totalSpent)}</Text>
            <Text style={[st.budgetTotalLabel, { color: colors.textSecondary }]}>Spent</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[st.budgetTotalVal, { color: totalRemaining >= 0 ? GREEN : RED }]}>{formatINR(totalRemaining)}</Text>
            <Text style={[st.budgetTotalLabel, { color: colors.textSecondary }]}>Remaining</Text>
          </View>
        </View>
        <View style={{ marginTop: 10, height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row' }}>
          <View style={{ flex: Math.min(overallPct, 100), backgroundColor: totalSpent > totalBudgeted ? RED : GREEN }} />
          <View style={{ flex: 100 - Math.min(overallPct, 100), backgroundColor: colors.border }} />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
          {overallPct.toFixed(0)}% of total budget used
        </Text>
      </View>

      {/* Budget by category */}
      <SectionHeader title="Budget by Category" colors={colors} />
      <View style={[st.card, { backgroundColor: colors.card }]}>
        {budgets.map((b: any, i: number) => {
          const pctV = clamp(b.percentage);
          const bColor = b.percentage > 100 ? RED : b.percentage > 80 ? ORANGE : GREEN;
          return (
            <View key={i} style={[st.budgetRow, i < budgets.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[st.budgetIconWrap, { backgroundColor: bColor + '20' }]}>
                <Ionicons name="pricetag-outline" size={14} color={bColor} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={[st.catName, { color: colors.text }]}>{b.category}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: bColor, fontSize: 12, fontWeight: '700' }}>
                      {formatINR(b.spent)} / {formatINR(b.limit)}
                    </Text>
                    <Text style={{ color: bColor, fontSize: 10 }}>{b.percentage.toFixed(0)}% used</Text>
                  </View>
                </View>
                <ProgBar pct={pctV} color={bColor} bg={colors.border} height={5} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Over budget section */}
      {overBudget.length > 0 && (
        <>
          <SectionHeader title="Over Budget" colors={colors} />
          <View style={[st.card, { backgroundColor: colors.card }]}>
            {overBudget.map((b: any, i: number) => (
              <View key={i} style={[st.budgetRow, { alignItems: 'center' }, i < overBudget.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[st.budgetIconWrap, { backgroundColor: RED + '20' }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={RED} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.catName, { color: colors.text }]}>{b.category}</Text>
                  <Text style={{ color: RED, fontSize: 11 }}>
                    Spent {formatINR(b.spent)} of {formatINR(b.limit)} ({b.percentage.toFixed(0)}%)
                  </Text>
                </View>
                <Text style={{ color: RED, fontWeight: '700', fontSize: 13 }}>+{formatINR(b.spent - b.limit)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TRENDS TAB
// ══════════════════════════════════════════════════════════════════════════════
function TrendsTab({ colors, isDark }: any) {
  const [data, setData]    = useState<any>(null);
  const [loading, setLoad] = useState(true);
  const [period, setPeriod] = useState<'month' | '6m' | 'year'>('6m');

  const loadData = useCallback(async () => {
    setLoad(true);
    try {
      const months = period === 'month' ? 1 : period === '6m' ? 6 : 12;
      const r = await api.get('/analytics/cashflow', { params: { months } });
      setData(r.data);
    } catch { setData(null); }
    finally { setLoad(false); }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const hasData = !loading && data?.monthly?.length;
  const monthly: any[] = hasData ? (data.monthly as any[]) : [];

  const incTotal  = monthly.reduce((s: number, m: any) => s + m.income, 0);
  const expTotal  = monthly.reduce((s: number, m: any) => s + m.expense, 0);
  const netTotal  = incTotal - expTotal;
  const avgRate   = monthly.length ? monthly.reduce((s: number, m: any) => s + m.savings_rate, 0) / monthly.length : 0;

  // Latest vs prev
  const latest = monthly[monthly.length - 1] || {};
  const prev   = monthly[monthly.length - 2] || {};

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Period selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {([['month', 'This Month'], ['6m', 'Last 6 Months'], ['year', 'This Year']] as any[]).map(([k, l]) => (
            <Chip key={k} label={l} active={period === k} color={PURPLE} onPress={() => setPeriod(k)} />
          ))}
        </View>
      </ScrollView>

      {loading && <LoadingBox colors={colors} />}
      {!loading && !hasData && (
        <View style={[st.card, { backgroundColor: colors.card, alignItems: 'center', paddingVertical: 32 }]}>
          <Ionicons name="trending-up-outline" size={36} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }}>No income/expense trend data yet</Text>
        </View>
      )}

      {hasData && (
        <>
          {/* Summary metrics */}
          <View style={st.trendMetrics}>
            {[
              { label: 'Total Income',  value: incTotal, color: GREEN },
              { label: 'Total Expense', value: expTotal, color: RED   },
          { label: 'Net Savings',   value: netTotal, color: netTotal >= 0 ? GREEN : RED },
          { label: 'Avg Save Rate', value: null, display: `${avgRate.toFixed(1)}%`, color: PURPLE },
        ].map(m => (
          <View key={m.label} style={[st.trendMetricCard, { backgroundColor: colors.card }]}>
            <Text style={[st.trendMetricLabel, { color: colors.textSecondary }]}>{m.label}</Text>
            <Text style={[st.trendMetricValue, { color: m.color }]}>
              {m.display || formatINR(m.value || 0)}
            </Text>
          </View>
        ))}
      </View>

      {/* Income Trend */}
      <SectionHeader title="Income Trend" colors={colors} />
      <View style={[st.card, { backgroundColor: colors.card }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[st.bigAmount, { color: GREEN, fontSize: 20 }]}>{formatINR(latest.income || 0)}</Text>
          <Delta value={prev.income ? ((latest.income - prev.income) / Math.abs(prev.income)) * 100 : 0} />
        </View>
        <LineChart
          data={monthly.map((m: any) => ({ value: m.income, label: m.short_label }))}
          width={CHART_W}
          height={100}
          color={GREEN}
          thickness={2}
          curved
          hideDataPoints={monthly.length > 4}
          dataPointsColor={GREEN}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          rulesColor={colors.border}
          xAxisColor={colors.border}
          yAxisColor="transparent"
          areaChart
          startFillColor={GREEN}
          endFillColor="transparent"
          startOpacity={0.25}
          endOpacity={0}
          isAnimated
        />
      </View>

      {/* Expense Trend */}
      <SectionHeader title="Expense Trend" colors={colors} />
      <View style={[st.card, { backgroundColor: colors.card }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={[st.bigAmount, { color: RED, fontSize: 20 }]}>{formatINR(latest.expense || 0)}</Text>
          <Delta value={prev.expense ? ((latest.expense - prev.expense) / Math.abs(prev.expense)) * 100 : 0} inverse />
        </View>
        <LineChart
          data={monthly.map((m: any) => ({ value: m.expense, label: m.short_label }))}
          width={CHART_W}
          height={100}
          color={RED}
          thickness={2}
          curved
          hideDataPoints={monthly.length > 4}
          dataPointsColor={RED}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          rulesColor={colors.border}
          xAxisColor={colors.border}
          yAxisColor="transparent"
          areaChart
          startFillColor={RED}
          endFillColor="transparent"
          startOpacity={0.2}
          endOpacity={0}
          isAnimated
        />
      </View>

      {/* Savings Rate Trend */}
      <SectionHeader title="Savings Rate Trend" colors={colors} />
      <View style={[st.card, { backgroundColor: colors.card }]}>
        <Text style={[{ color: PURPLE, fontSize: 20, fontWeight: '800', marginBottom: 8 }]}>{latest.savings_rate?.toFixed(1)}%</Text>
        <LineChart
          data={monthly.map((m: any) => ({ value: Math.max(m.savings_rate, 0), label: m.short_label }))}
          width={CHART_W}
          height={100}
          color={PURPLE}
          thickness={2}
          curved
          dataPointsColor={PURPLE}
          xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
          rulesColor={colors.border}
          xAxisColor={colors.border}
          yAxisColor="transparent"
          areaChart
          startFillColor={PURPLE}
          endFillColor="transparent"
          startOpacity={0.25}
          endOpacity={0}
          isAnimated
        />
      </View>
        </>
      )}

      {/* ── Investment Returns (dummy data) ───────────────────────────────── */}
      <View style={{ marginTop: 6 }}>
        <View style={st.sectionHead}>
          <Text style={[st.sectionTitle, { color: colors.text }]}>Investment Returns</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="trending-up" size={12} color={GREEN} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: GREEN }}>
              +{DUMMY_INVESTMENTS.return_pct.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Portfolio hero card with gradient */}
        <View style={[st.card, { backgroundColor: colors.card, padding: 0, overflow: 'hidden' }]} testID="trends-investment-card">
          <LinearGradient
            colors={[PURPLE_DARK, PURPLE_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 16 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500', marginBottom: 4 }}>
              Portfolio Value
            </Text>
            <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
              {formatINR(DUMMY_INVESTMENTS.current_value)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 3 }}>
                <Ionicons name="arrow-up" size={11} color="#FFF" />
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
                  {formatINR(DUMMY_INVESTMENTS.absolute_return)}
                </Text>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>
                from {formatINR(DUMMY_INVESTMENTS.total_invested)} invested
              </Text>
            </View>
          </LinearGradient>

          {/* Portfolio value line chart */}
          <View style={{ padding: 14, paddingTop: 10 }}>
            <LineChart
              data={DUMMY_INVESTMENTS.value_series.map(p => ({ value: p.value, label: p.label }))}
              width={CHART_W}
              height={110}
              color={PURPLE}
              thickness={2.5}
              curved
              hideDataPoints={false}
              dataPointsColor={PURPLE}
              dataPointsRadius={3}
              xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
              yAxisTextStyle={{ color: colors.textSecondary, fontSize: 9 }}
              rulesColor={colors.border}
              xAxisColor={colors.border}
              yAxisColor="transparent"
              areaChart
              startFillColor={PURPLE}
              endFillColor="transparent"
              startOpacity={0.3}
              endOpacity={0}
              isAnimated
            />
          </View>
        </View>

        {/* XIRR + Best month stat row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          <View style={[st.card, { backgroundColor: colors.card, flex: 1, marginBottom: 0, padding: 14 }]} testID="trends-xirr-stat">
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500', marginBottom: 4 }}>XIRR</Text>
            <Text style={{ color: GREEN, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>
              {DUMMY_INVESTMENTS.xirr.toFixed(1)}%
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>annualised</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.card, flex: 1, marginBottom: 0, padding: 14 }]} testID="trends-best-month-stat">
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '500', marginBottom: 4 }}>Best Month</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>
              {DUMMY_INVESTMENTS.best_month_label}
            </Text>
            <Text style={{ color: GREEN, fontSize: 11, fontWeight: '700', marginTop: 2 }}>
              +{DUMMY_INVESTMENTS.best_month_pct}%
            </Text>
          </View>
        </View>

        {/* Asset-class breakdown */}
        <View style={[st.card, { backgroundColor: colors.card }]} testID="trends-investment-breakdown">
          <Text style={[st.sectionTitle, { color: colors.text, marginBottom: 10 }]}>By Asset Class</Text>
          {DUMMY_INVESTMENTS.breakdown.map((b, i) => {
            const gain    = b.current - b.invested;
            const gainPct = (gain / b.invested) * 100;
            const positive = gain >= 0;
            return (
              <View
                key={b.name}
                style={[
                  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
                  i < DUMMY_INVESTMENTS.breakdown.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
                  },
                ]}
                testID={`trends-asset-${i}`}
              >
                <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: b.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={b.icon as any} size={18} color={b.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{b.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {formatINR(b.invested)} → {formatINR(b.current)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: positive ? GREEN : RED }}>
                    {positive ? '+' : ''}{formatINR(gain)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                    <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={9} color={positive ? GREEN : RED} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: positive ? GREEN : RED }}>
                      {Math.abs(gainPct).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CALENDAR TAB
// ══════════════════════════════════════════════════════════════════════════════
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function CalendarTab({ colors, isDark }: any) {
  const [calDate, setCalDate] = useState(new Date());
  const [data, setData]       = useState<any>(null);
  const [loading, setLoad]    = useState(true);
  const [selectedDay, setSelDay] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoad(true);
    try {
      const r = await api.get('/insights/calendar', { params: { month: calDate.getMonth() + 1, year: calDate.getFullYear() } });
      setData(r.data);
    } catch { setData(null); }
    finally { setLoad(false); }
  }, [calDate]);

  useEffect(() => { load(); }, [load]);

  const daily: Record<string, any> = data?.daily_data || {};
  const txns: any[]               = data?.transactions || [];

  // Build calendar grid
  const year  = calDate.getFullYear();
  const month = calDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Max expense in month (for color intensity)
  const maxExp = Math.max(...Object.values(daily).map((d: any) => d.expense || 0), 1);

  const filteredTxns = selectedDay
    ? txns.filter((t: any) => {
        try { return new Date(t.date).getDate() === selectedDay; }
        catch { return false; }
      })
    : txns.slice(0, 30);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 }}>
      {/* Month navigator */}
      <View style={[st.calHeader, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setCalDate(subMonths(calDate, 1))} testID="cal-prev">
          <Ionicons name="chevron-back" size={22} color={PURPLE} />
        </TouchableOpacity>
        <Text style={[st.calMonthTitle, { color: colors.text }]}>
          {MONTHS_SHORT[month]} {year}
        </Text>
        <TouchableOpacity onPress={() => setCalDate(addMonths(calDate, 1))} testID="cal-next">
          <Ionicons name="chevron-forward" size={22} color={PURPLE} />
        </TouchableOpacity>
      </View>

      {loading ? <LoadingBox colors={colors} /> : (
        <>
          {/* Day headers */}
          <View style={st.calDayHeaders}>
            {DAYS.map(d => (
              <Text key={d} style={[st.calDayHeader, { color: colors.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={st.calGrid}>
            {/* Empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => <View key={`e${i}`} style={st.calCell} />)}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1;
              const dayData = daily[String(day)];
              const hasInc  = dayData?.income > 0;
              const hasExp  = dayData?.expense > 0;
              const expInt  = dayData ? Math.min((dayData.expense / maxExp) * 0.7 + 0.1, 0.8) : 0;
              const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
              const isSelected = selectedDay === day;

              return (
                <TouchableOpacity
                  key={day}
                  style={[st.calCell, isSelected && { backgroundColor: PURPLE + '30', borderRadius: 8 }]}
                  onPress={() => setSelDay(selectedDay === day ? null : day)}
                  testID={`cal-day-${day}`}
                >
                  <Text style={[
                    st.calDayNum,
                    { color: isToday ? PURPLE : colors.text },
                    isToday && { fontWeight: '800' },
                  ]}>{day}</Text>
                  {/* Expense heat dot */}
                  {hasExp && (
                    <View style={[st.calDot, { backgroundColor: `rgba(255,82,82,${expInt})` }]} />
                  )}
                  {/* Income dot */}
                  {hasInc && !hasExp && (
                    <View style={[st.calDot, { backgroundColor: GREEN + '80' }]} />
                  )}
                  {/* Tiny amount */}
                  {dayData?.expense > 0 && (
                    <Text style={[st.calAmt, { color: RED }]} numberOfLines={1}>
                      {formatINR(dayData.expense, false)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={[st.calLegend]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RED + 'AA' }} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Expense</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN + '80' }} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Income (no expense)</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE + '80' }} />
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Today</Text>
            </View>
          </View>

          {/* Transaction list */}
          <SectionHeader
            title={selectedDay ? `${MONTHS_SHORT[month]} ${selectedDay} Transactions` : 'Recent Transactions'}
            colors={colors}
            action={selectedDay ? 'Clear' : undefined}
            onAction={() => setSelDay(null)}
          />
          {filteredTxns.length === 0 ? (
            <View style={st.emptyBox}>
              <Text style={[st.emptyText, { color: colors.textSecondary }]}>No transactions{selectedDay ? ` on ${MONTHS_SHORT[month]} ${selectedDay}` : ''}</Text>
            </View>
          ) : (
            <View style={[st.card, { backgroundColor: colors.card }]}>
              {filteredTxns.map((t: any, i: number) => (
                <View key={i} style={[st.calTxnRow, i < filteredTxns.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <View style={[st.calTxnIcon, { backgroundColor: t.type === 'income' ? GREEN + '22' : RED + '22' }]}>
                    <Ionicons name={t.type === 'income' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={18} color={t.type === 'income' ? GREEN : RED} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[st.calTxnDesc, { color: colors.text }]} numberOfLines={1}>{t.description}</Text>
                    <Text style={[st.calTxnCat, { color: colors.textSecondary }]}>{t.category}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[st.calTxnAmt, { color: t.type === 'income' ? GREEN : RED }]}>
                      {t.type === 'income' ? '+' : '-'}{formatINR(t.amount)}
                    </Text>
                    <Text style={[{ color: colors.textSecondary, fontSize: 10 }]}>
                      {(() => { try { return format(new Date(t.date), 'd MMM'); } catch { return ''; } })()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN INSIGHTS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function InsightsScreen() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [date, setDate] = useState(new Date());

  const tabScrollRef = useRef<ScrollView>(null);

  // Re-scroll tab bar to active tab when it changes
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
        <Text style={[st.headerTitle, { color: colors.text }]}>Insights</Text>
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
              <TouchableOpacity
                key={tab.label}
                onPress={() => setActiveTab(i)}
                style={st.tabTouch}
                testID={`insights-tab-${tab.label.toLowerCase().replace(' ', '-')}`}
              >
                {active ? (
                  <LinearGradient
                    colors={[PURPLE_DARK, PURPLE_LIGHT]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={st.tabItemActive}
                  >
                    <Ionicons name={tab.activeIcon as any} size={15} color="#FFF" />
                    <Text style={[st.tabLabel, { color: '#FFF' }]}>{tab.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={st.tabItemInactive}>
                    <Ionicons name={tab.icon as any} size={15} color={GREY} />
                    <Text style={[st.tabLabel, { color: GREY }]}>{tab.label}</Text>
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root:   { flex: 1 },

  // Header
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerBtn:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  // Tabs
  tabWrap:        { borderBottomWidth: 1 },
  tabScroll:      { paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  tabTouch:       { },
  tabItemActive:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 },
  tabItemInactive:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22 },
  tabLabel:       { fontSize: 12, fontWeight: '600' },

  // Common
  card:        { borderRadius: 14, padding: 14, marginBottom: 14, overflow: 'hidden' },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  sectionTitle:{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  viewAll:     { fontSize: 12, fontWeight: '600' },
  bigAmount:   { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  // Month nav
  monthNav:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14, gap: 12 },
  monthBtn:   { padding: 6 },
  monthLabel: { fontSize: 15, fontWeight: '700', minWidth: 130, textAlign: 'center' },

  // Chips
  chip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  chipText: { fontSize: 12, fontWeight: '600' },

  // Loading / Empty
  loadBox:  { alignItems: 'center', justifyContent: 'center', height: 120, borderRadius: 14, marginTop: 8 },
  emptyBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText:{ fontSize: 13, textAlign: 'center', maxWidth: 260 },

  // Overview
  overviewCard:       { borderRadius: 18, padding: 18, marginBottom: 14 },
  overviewCardHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  overviewCardTitle:  { fontSize: 14, fontWeight: '700' },
  overviewMetrics:    { flexDirection: 'row', justifyContent: 'space-between' },
  overviewMetric:     { alignItems: 'center', flex: 1 },
  overviewMetricLabel:{ fontSize: 11, fontWeight: '500', marginBottom: 4 },
  overviewMetricValue:{ fontSize: 16, fontWeight: '800', marginBottom: 4 },
  savingsRatePill:    { alignSelf: 'center', marginTop: 14, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },

  // Insights
  insightRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 11 },
  insightIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  insightTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  insightText:  { fontSize: 12, lineHeight: 17 },

  // Accounts
  accTotalRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottomWidth: 1 },
  accTotalLabel:  { fontSize: 13, fontWeight: '500' },
  accTotalValue:  { fontSize: 16, fontWeight: '800' },
  accRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  accIcon:        { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  accLabel:       { flex: 1, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  accCount:       { fontSize: 11 },
  accBalance:     { fontSize: 13, fontWeight: '700' },

  // Cash flow
  cashHero:       { borderRadius: 16, padding: 18, marginBottom: 14 },
  cashHeroLabel:  { fontSize: 12, marginBottom: 6 },
  cashHeroValue:  { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  inflowRow:      { flexDirection: 'row', gap: 10, marginBottom: 14 },
  flowCard:       { borderRadius: 14, padding: 14, alignItems: 'center', gap: 6 },
  flowLabel:      { fontSize: 11, fontWeight: '500' },
  flowValue:      { fontSize: 16, fontWeight: '800' },
  chartLegend:    { flexDirection: 'row', gap: 16, marginBottom: 10 },
  cfMonthRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  cfMonthLabel:   { fontSize: 13, fontWeight: '600' },

  // Spending
  catRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  catIcon:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName:  { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  catAmt:   { fontSize: 13, fontWeight: '700' },

  // Budget
  statusBadge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  budgetTotalRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  budgetTotalVal:  { fontSize: 16, fontWeight: '800' },
  budgetTotalLabel:{ fontSize: 11, marginTop: 2 },
  budgetRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 11 },
  budgetIconWrap:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  // Trends
  trendMetrics:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  trendMetricCard:   { borderRadius: 12, padding: 12, flex: 1, minWidth: (SW - 48) / 2 - 4 },
  trendMetricLabel:  { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  trendMetricValue:  { fontSize: 15, fontWeight: '800' },

  // Calendar
  calHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 20, marginBottom: 8 },
  calMonthTitle: { fontSize: 17, fontWeight: '700', minWidth: 130, textAlign: 'center' },
  calDayHeaders: { flexDirection: 'row', marginBottom: 4 },
  calDayHeader:  { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  calGrid:       { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  calCell:       { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4, paddingHorizontal: 1, minHeight: 52 },
  calDayNum:     { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  calDot:        { width: 16, height: 4, borderRadius: 2, marginBottom: 1 },
  calAmt:        { fontSize: 7, textAlign: 'center', width: '100%' },
  calLegend:     { flexDirection: 'row', gap: 16, justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' },
  calTxnRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  calTxnIcon:    { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  calTxnDesc:    { fontSize: 13, fontWeight: '600' },
  calTxnCat:     { fontSize: 11, marginTop: 1, textTransform: 'capitalize' },
  calTxnAmt:     { fontSize: 13, fontWeight: '700' },
});
