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
// ══════════════════════════════════════════════════════════════════════════════
// DUMMY DATA — Cash Flow Tab
// ══════════════════════════════════════════════════════════════════════════════
const DUMMY_CASHFLOW: Record<'month' | 'quarter' | 'year', any> = {
  month: {
    label:       'May 2026',
    inflow:      125000,
    outflow:      75000,
    net:          50000,
    growth_pct:   20.0,
    sparkline:   [12000, 18000, 22000, 31000, 42000, 50000],
    bars: [
      { m: 'May', income: 125000, expense: 75000 },
    ],
    in_vs_out_pct: { in: 62.5, out: 37.5 },
  },
  quarter: {
    label:       'Q2 2026',
    inflow:      358000,
    outflow:     232000,
    net:         126000,
    growth_pct:   12.4,
    sparkline:   [70000, 84000, 96000, 108000, 118000, 126000],
    bars: [
      { m: 'Mar', income: 110000, expense: 78000 },
      { m: 'Apr', income: 123000, expense: 79000 },
      { m: 'May', income: 125000, expense: 75000 },
    ],
    in_vs_out_pct: { in: 60.7, out: 39.3 },
  },
  year: {
    label:       'FY 2026',
    inflow:     1382000,
    outflow:     918500,
    net:         463500,
    growth_pct:   28.7,
    sparkline:   [150000, 210000, 268000, 322000, 398000, 463500],
    bars: [
      { m: 'Dec', income:  96000, expense: 70000 },
      { m: 'Jan', income: 108000, expense: 74500 },
      { m: 'Feb', income: 115000, expense: 71000 },
      { m: 'Mar', income: 110000, expense: 78000 },
      { m: 'Apr', income: 123000, expense: 79000 },
      { m: 'May', income: 125000, expense: 75000 },
    ],
    in_vs_out_pct: { in: 60.1, out: 39.9 },
  },
};

const DUMMY_ACCOUNT_FLOW = [
  { name: 'HDFC Bank',    icon: 'business-outline',       color: '#005DAA', inflow: 78000,  outflow: 42000,  txns: 24 },
  { name: 'ICICI Bank',   icon: 'business-outline',       color: '#F37920', inflow: 32000,  outflow: 18500,  txns: 16 },
  { name: 'Wallets',      icon: 'wallet-outline',          color: GREEN,    inflow: 8500,   outflow: 9200,   txns: 11 },
  { name: 'UPI Accounts', icon: 'phone-portrait-outline',  color: PURPLE,   inflow: 6500,   outflow: 5300,   txns: 19 },
];

// ══════════════════════════════════════════════════════════════════════════════
// CASH FLOW TAB  (UI-only with dummy data)
// ══════════════════════════════════════════════════════════════════════════════
function CashFlowTab({ colors, isDark }: any) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const d = DUMMY_CASHFLOW[period];
  const CARD_BG = isDark ? '#1C1C2E' : colors.card;

  const barData = d.bars.flatMap((b: any) => [
    { value: b.income,  label: b.m, frontColor: GREEN, spacing: 4,  topLabelComponent: () => null },
    { value: b.expense,                  frontColor: RED,   spacing: 14 },
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ── Period Tabs ─────────────────────────────────────────── */}
      <View style={[cf.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="cashflow-period-tabs">
        {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
          const active = period === k;
          return (
            <TouchableOpacity
              key={k}
              onPress={() => setPeriod(k as any)}
              style={[cf.periodBtn, active && { backgroundColor: PURPLE }]}
              testID={`cashflow-period-${k}`}
              activeOpacity={0.85}
            >
              <Text style={[cf.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>
                {l}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Net Cash Flow hero card ─────────────────────────────── */}
      <View style={[cf.card, { backgroundColor: CARD_BG, padding: 0, overflow: 'hidden' }]} testID="cashflow-net-card">
        <LinearGradient
          colors={[PURPLE_DARK, PURPLE_LIGHT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Net Cash Flow</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 3 }}>
              <Ionicons name={d.growth_pct >= 0 ? 'arrow-up' : 'arrow-down'} size={11} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{Math.abs(d.growth_pct).toFixed(1)}%</Text>
            </View>
          </View>
          <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginTop: 6 }}>
            {formatINR(d.net)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{d.label}</Text>

          {/* Trend graph (sparkline) */}
          <View style={{ marginTop: 10, marginLeft: -16 }}>
            <LineChart
              data={d.sparkline.map((v: number) => ({ value: v }))}
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
        </LinearGradient>

        {/* Inflow / Outflow row */}
        <View style={cf.flowRow}>
          <View style={[cf.flowMini, { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: GREEN }]} />
              <Text style={[cf.flowMiniLabel, { color: colors.textSecondary }]}>Total Inflow</Text>
            </View>
            <Text style={[cf.flowMiniValue, { color: GREEN }]}>{formatINR(d.inflow)}</Text>
          </View>
          <View style={cf.flowMini}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: RED }]} />
              <Text style={[cf.flowMiniLabel, { color: colors.textSecondary }]}>Total Outflow</Text>
            </View>
            <Text style={[cf.flowMiniValue, { color: RED }]}>{formatINR(d.outflow)}</Text>
          </View>
        </View>
      </View>

      {/* ── Cash In vs Cash Out ─────────────────────────────────── */}
      <View style={[cf.card, { backgroundColor: CARD_BG }]} testID="cashflow-in-vs-out">
        <View style={cf.sectionHead}>
          <Text style={[cf.sectionTitle, { color: colors.text }]}>Cash In vs Cash Out</Text>
          <TouchableOpacity testID="cashflow-in-vs-out-view-details">
            <Text style={[cf.viewDetails, { color: PURPLE }]}>View Details</Text>
          </TouchableOpacity>
        </View>

        {/* Composite stacked bar */}
        <View style={cf.stackBar}>
          <View style={{ flex: d.in_vs_out_pct.in, backgroundColor: GREEN, height: '100%', borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }} />
          <View style={{ flex: d.in_vs_out_pct.out, backgroundColor: RED, height: '100%', borderTopRightRadius: 6, borderBottomRightRadius: 6 }} />
        </View>

        {/* Labels */}
        <View style={cf.inOutLabelRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: GREEN }]} />
              <Text style={[cf.inOutLabel, { color: colors.text }]}>Cash In</Text>
            </View>
            <Text style={[cf.inOutAmount, { color: GREEN }]}>{formatINR(d.inflow)}</Text>
            <Text style={[cf.inOutPct, { color: colors.textSecondary }]}>{d.in_vs_out_pct.in.toFixed(1)}%</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[cf.flowDot, { backgroundColor: RED }]} />
              <Text style={[cf.inOutLabel, { color: colors.text }]}>Cash Out</Text>
            </View>
            <Text style={[cf.inOutAmount, { color: RED }]}>{formatINR(d.outflow)}</Text>
            <Text style={[cf.inOutPct, { color: colors.textSecondary }]}>{d.in_vs_out_pct.out.toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      {/* ── Monthly Cash Flow Trend (bar chart) ─────────────────── */}
      <View style={[cf.card, { backgroundColor: CARD_BG }]} testID="cashflow-monthly-trend">
        <View style={cf.sectionHead}>
          <Text style={[cf.sectionTitle, { color: colors.text }]}>Monthly Cash Flow Trend</Text>
          <TouchableOpacity testID="cashflow-monthly-view-details">
            <Text style={[cf.viewDetails, { color: PURPLE }]}>View Details</Text>
          </TouchableOpacity>
        </View>

        {/* Legend */}
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
          spacing={d.bars.length > 3 ? 14 : 26}
        />
      </View>

      {/* ── Account-wise Cash Flow ──────────────────────────────── */}
      <View style={[cf.card, { backgroundColor: CARD_BG }]} testID="cashflow-account-wise">
        <View style={cf.sectionHead}>
          <Text style={[cf.sectionTitle, { color: colors.text }]}>Account-wise Cash Flow</Text>
          <TouchableOpacity testID="cashflow-accounts-view-details">
            <Text style={[cf.viewDetails, { color: PURPLE }]}>View Details</Text>
          </TouchableOpacity>
        </View>

        {DUMMY_ACCOUNT_FLOW.map((acc, i) => {
          const net = acc.inflow - acc.outflow;
          const positive = net >= 0;
          return (
            <View
              key={acc.name}
              style={[
                cf.accRow,
                i < DUMMY_ACCOUNT_FLOW.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
                },
              ]}
              testID={`cashflow-account-${i}`}
            >
              <View style={[cf.accIcon, { backgroundColor: acc.color + '22' }]}>
                <Ionicons name={acc.icon as any} size={18} color={acc.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[cf.accName, { color: colors.text }]}>{acc.name}</Text>
                <Text style={[cf.accMeta, { color: colors.textSecondary }]}>{acc.txns} transactions</Text>

                {/* Mini in/out values */}
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
                <Text style={{ color: positive ? GREEN : RED, fontSize: 14, fontWeight: '800' }}>
                  {positive ? '+' : '-'}{formatINR(Math.abs(net))}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── CashFlow-specific styles ─────────────────────────────────────────────────
const cf = StyleSheet.create({
  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  periodBtn:     { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  periodBtnText: { fontSize: 12, fontWeight: '700' },

  card:          { borderRadius: 16, padding: 16, marginBottom: 14, overflow: 'hidden' },

  flowRow:       { flexDirection: 'row' },
  flowMini:      { flex: 1, padding: 14, gap: 6 },
  flowMiniLabel: { fontSize: 11, fontWeight: '500' },
  flowMiniValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  flowDot:       { width: 8, height: 8, borderRadius: 4 },

  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '700' },
  viewDetails:   { fontSize: 12, fontWeight: '600' },

  stackBar:      { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
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
// DUMMY DATA — Spending Tab
// ══════════════════════════════════════════════════════════════════════════════
const DUMMY_SPENDING: Record<'month' | 'quarter' | 'year', any> = {
  month: {
    label:       'May 2026',
    total:        75000,
    vs_last_pct: -5.3,
    avg_daily:    2500,
    txn_count:    87,
    categories: [
      { name: 'Food',          amount: 22500, pct: 30.0, icon: 'fast-food-outline',   color: '#FF6B6B' },
      { name: 'Transport',     amount: 12000, pct: 16.0, icon: 'car-outline',         color: '#4DABF7' },
      { name: 'Shopping',      amount: 15000, pct: 20.0, icon: 'bag-handle-outline',  color: '#B197FC' },
      { name: 'Entertainment', amount:  8500, pct: 11.3, icon: 'film-outline',        color: '#FFB300' },
      { name: 'Bills',         amount: 11500, pct: 15.3, icon: 'receipt-outline',     color: '#26C6DA' },
      { name: 'Others',        amount:  5500, pct:  7.4, icon: 'ellipsis-horizontal', color: '#8B8B8B' },
    ],
    top_expenses: [
      { merchant: 'Amazon',        amount: 8500, pct: 11.3, icon: 'logo-amazon',       color: '#FF9100' },
      { merchant: 'Swiggy',        amount: 6200, pct:  8.3, icon: 'fast-food-outline', color: '#FF6B6B' },
      { merchant: 'Uber',          amount: 4800, pct:  6.4, icon: 'car-outline',       color: '#4DABF7' },
      { merchant: 'Netflix',       amount: 3200, pct:  4.3, icon: 'tv-outline',        color: '#E50914' },
      { merchant: 'Electricity Co.', amount: 2900, pct: 3.9, icon: 'flash-outline',    color: '#FFB300' },
    ],
  },
  quarter: {
    label:       'Q2 2026',
    total:       232000,
    vs_last_pct:   8.4,
    avg_daily:    2580,
    txn_count:   262,
    categories: [
      { name: 'Food',          amount: 68500, pct: 29.5, icon: 'fast-food-outline',   color: '#FF6B6B' },
      { name: 'Transport',     amount: 37000, pct: 16.0, icon: 'car-outline',         color: '#4DABF7' },
      { name: 'Shopping',      amount: 48000, pct: 20.7, icon: 'bag-handle-outline',  color: '#B197FC' },
      { name: 'Entertainment', amount: 24500, pct: 10.6, icon: 'film-outline',        color: '#FFB300' },
      { name: 'Bills',         amount: 36000, pct: 15.5, icon: 'receipt-outline',     color: '#26C6DA' },
      { name: 'Others',        amount: 18000, pct:  7.7, icon: 'ellipsis-horizontal', color: '#8B8B8B' },
    ],
    top_expenses: [
      { merchant: 'Amazon',          amount: 24500, pct: 10.6, icon: 'logo-amazon',       color: '#FF9100' },
      { merchant: 'Swiggy',          amount: 18500, pct:  8.0, icon: 'fast-food-outline', color: '#FF6B6B' },
      { merchant: 'Uber',            amount: 14200, pct:  6.1, icon: 'car-outline',       color: '#4DABF7' },
      { merchant: 'Flipkart',        amount: 12800, pct:  5.5, icon: 'cart-outline',      color: '#2874F0' },
      { merchant: 'Electricity Co.', amount:  9200, pct:  4.0, icon: 'flash-outline',     color: '#FFB300' },
    ],
  },
  year: {
    label:       'FY 2026',
    total:       918500,
    vs_last_pct:  12.1,
    avg_daily:    2517,
    txn_count:  1042,
    categories: [
      { name: 'Food',          amount: 268000, pct: 29.2, icon: 'fast-food-outline',   color: '#FF6B6B' },
      { name: 'Transport',     amount: 142000, pct: 15.5, icon: 'car-outline',         color: '#4DABF7' },
      { name: 'Shopping',      amount: 198000, pct: 21.6, icon: 'bag-handle-outline',  color: '#B197FC' },
      { name: 'Entertainment', amount:  96000, pct: 10.5, icon: 'film-outline',        color: '#FFB300' },
      { name: 'Bills',         amount: 142500, pct: 15.5, icon: 'receipt-outline',     color: '#26C6DA' },
      { name: 'Others',        amount:  72000, pct:  7.8, icon: 'ellipsis-horizontal', color: '#8B8B8B' },
    ],
    top_expenses: [
      { merchant: 'Amazon',          amount: 96500, pct: 10.5, icon: 'logo-amazon',       color: '#FF9100' },
      { merchant: 'Swiggy',          amount: 72000, pct:  7.8, icon: 'fast-food-outline', color: '#FF6B6B' },
      { merchant: 'Uber',            amount: 54200, pct:  5.9, icon: 'car-outline',       color: '#4DABF7' },
      { merchant: 'Flipkart',        amount: 48500, pct:  5.3, icon: 'cart-outline',      color: '#2874F0' },
      { merchant: 'Electricity Co.', amount: 36800, pct:  4.0, icon: 'flash-outline',     color: '#FFB300' },
    ],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// SPENDING TAB  (UI-only with dummy data)
// ══════════════════════════════════════════════════════════════════════════════
function SpendingTab({ colors, isDark }: any) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [showAllCats, setShowAllCats] = useState(false);
  const [showAllTop, setShowAllTop]   = useState(false);

  const d        = DUMMY_SPENDING[period];
  const CARD_BG  = isDark ? '#1C1C2E' : colors.card;
  const declined = d.vs_last_pct < 0; // spending went down → green

  const donutData = d.categories.map((c: any) => ({
    value: c.amount,
    color: c.color,
  }));

  const visibleCats = showAllCats ? d.categories : d.categories.slice(0, 4);
  const visibleTop  = showAllTop  ? d.top_expenses : d.top_expenses.slice(0, 3);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* ── Period Tabs ─────────────────────────────────────────── */}
      <View style={[sp.periodWrap, { backgroundColor: isDark ? '#141424' : colors.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} testID="spending-period-tabs">
        {([['month', 'This Month'], ['quarter', 'This Quarter'], ['year', 'This Year']] as const).map(([k, l]) => {
          const active = period === k;
          return (
            <TouchableOpacity
              key={k}
              onPress={() => { setPeriod(k as any); setShowAllCats(false); setShowAllTop(false); }}
              style={[sp.periodBtn, active && { backgroundColor: PURPLE }]}
              testID={`spending-period-${k}`}
              activeOpacity={0.85}
            >
              <Text style={[sp.periodBtnText, { color: active ? '#FFF' : (isDark ? 'rgba(255,255,255,0.55)' : colors.textSecondary) }]}>
                {l}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Spending Summary Card ──────────────────────────────── */}
      <View style={[sp.card, { backgroundColor: CARD_BG, padding: 0, overflow: 'hidden' }]} testID="spending-summary-card">
        <LinearGradient
          colors={['#7A1FA2', '#E91E8C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 18 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>Total Spending</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 3 }}>
              <Ionicons name={declined ? 'arrow-down' : 'arrow-up'} size={11} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>{Math.abs(d.vs_last_pct).toFixed(1)}%</Text>
            </View>
          </View>
          <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>
            {formatINR(d.total)}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>{d.label}</Text>
        </LinearGradient>

        {/* Stat strip */}
        <View style={sp.statStrip}>
          <View style={[sp.statCell, { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
            <Text style={[sp.statLabel, { color: colors.textSecondary }]}>Avg / Day</Text>
            <Text style={[sp.statValue, { color: colors.text }]}>{formatINR(d.avg_daily)}</Text>
          </View>
          <View style={[sp.statCell, { borderRightWidth: 1, borderRightColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border }]}>
            <Text style={[sp.statLabel, { color: colors.textSecondary }]}>Transactions</Text>
            <Text style={[sp.statValue, { color: colors.text }]}>{d.txn_count}</Text>
          </View>
          <View style={sp.statCell}>
            <Text style={[sp.statLabel, { color: colors.textSecondary }]}>vs Last</Text>
            <Text style={[sp.statValue, { color: declined ? GREEN : RED }]}>
              {declined ? '↓' : '↑'} {Math.abs(d.vs_last_pct).toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* ── Donut + Legend ─────────────────────────────────────── */}
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
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2 }}>
                  {formatINR(d.total).replace('.00', '')}
                </Text>
              </View>
            )}
          />
        </View>

        {/* Legend grid (2 cols) */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%', marginTop: 6 }}>
          {d.categories.map((c: any) => (
            <View key={c.name} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: c.color }} />
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 11 }}>{c.name}</Text>
              <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{c.pct.toFixed(1)}%</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Spending by Category list ───────────────────────────── */}
      <View style={[sp.card, { backgroundColor: CARD_BG }]} testID="spending-categories-list">
        <View style={sp.sectionHead}>
          <Text style={[sp.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
          <TouchableOpacity onPress={() => setShowAllCats(v => !v)} testID="spending-categories-view-all">
            <Text style={[sp.viewAll, { color: PURPLE }]}>{showAllCats ? 'Show Less' : 'View All'}</Text>
          </TouchableOpacity>
        </View>

        {visibleCats.map((c: any, i: number) => (
          <View
            key={c.name}
            style={[
              sp.catRow,
              i < visibleCats.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
              },
            ]}
            testID={`spending-category-${i}`}
          >
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
                <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', minWidth: 38, textAlign: 'right' }}>
                  {c.pct.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* ── Top Expenses list ───────────────────────────────────── */}
      <View style={[sp.card, { backgroundColor: CARD_BG }]} testID="spending-top-expenses-list">
        <View style={sp.sectionHead}>
          <Text style={[sp.sectionTitle, { color: colors.text }]}>Top Expenses</Text>
          <TouchableOpacity onPress={() => setShowAllTop(v => !v)} testID="spending-top-expenses-view-all">
            <Text style={[sp.viewAll, { color: PURPLE }]}>{showAllTop ? 'Show Less' : 'View All'}</Text>
          </TouchableOpacity>
        </View>

        {visibleTop.map((e: any, i: number) => (
          <View
            key={e.merchant}
            style={[
              sp.merchantRow,
              i < visibleTop.length - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
              },
            ]}
            testID={`spending-top-expense-${i}`}
          >
            <View style={[sp.merchantBadge, { backgroundColor: e.color + '22' }]}>
              <Text style={{ color: e.color, fontSize: 14, fontWeight: '800' }}>
                #{i + 1}
              </Text>
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
    </ScrollView>
  );
}

// ─── Spending-specific styles ─────────────────────────────────────────────────
const sp = StyleSheet.create({
  periodWrap:    { flexDirection: 'row', padding: 4, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  periodBtn:     { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10 },
  periodBtnText: { fontSize: 12, fontWeight: '700' },

  card:          { borderRadius: 16, padding: 16, marginBottom: 14, overflow: 'hidden' },

  statStrip:     { flexDirection: 'row' },
  statCell:      { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statLabel:     { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  statValue:     { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },

  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, width: '100%' },
  sectionTitle:  { fontSize: 15, fontWeight: '700' },
  viewAll:       { fontSize: 12, fontWeight: '600' },

  catRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  catIcon:       { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName:       { fontSize: 13, fontWeight: '700' },
  catAmount:     { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },

  merchantRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  merchantBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  merchantIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  merchantName:  { fontSize: 13, fontWeight: '700' },
  merchantMeta:  { fontSize: 11, marginTop: 2 },
  merchantAmount:{ fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});

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
