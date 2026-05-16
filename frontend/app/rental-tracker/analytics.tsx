import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DUMMY_PROPERTIES, MONTHLY_BARS, EXPENSE_CAT_COLORS } from './_data';

const FILTERS = ['Monthly', 'Quarterly', 'Yearly'];

export default function RentalAnalyticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [filter, setFilter] = useState(0);

  const bars = MONTHLY_BARS;
  const maxVal = Math.max(...bars.map(b => Math.max(b.income, b.expense)));
  const BAR_MAX_H = 110;

  const totalIncome = bars.reduce((s, b) => s + b.income, 0);
  const totalExpense = bars.reduce((s, b) => s + b.expense, 0);
  const netProfit = totalIncome - totalExpense;
  const occupancyRate = Math.round((DUMMY_PROPERTIES.filter(p => p.status === 'rented').length / DUMMY_PROPERTIES.length) * 100);

  const rentedProps = DUMMY_PROPERTIES.filter(p => p.status === 'rented');
  const avgYield = rentedProps.length > 0
    ? rentedProps.reduce((s, p) => s + ((p.monthlyRent * 12) / p.purchasePrice) * 100, 0) / rentedProps.length
    : 0;

  const expenseBreakdown = [
    { cat: 'maintenance', label: 'Maintenance', amount: 22500 },
    { cat: 'tax', label: 'Property Tax', amount: 15200 },
    { cat: 'utility', label: 'Utilities', amount: 12500 },
    { cat: 'repair', label: 'Repairs', amount: 8300 },
    { cat: 'insurance', label: 'Insurance', amount: 9000 },
    { cat: 'society', label: 'Society', amount: 6500 },
  ];
  const totalExpBreakdown = expenseBreakdown.reduce((s, e) => s + e.amount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Rental Analytics</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {FILTERS.map((f, i) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, { borderColor: colors.border }, i === filter && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setFilter(i)}
            >
              <Text style={[styles.filterText, { color: i === filter ? '#FFF' : colors.textSecondary }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          {[
            { label: 'Total Income', value: formatINR(totalIncome, false), color: '#00C48C', icon: 'trending-up-outline' },
            { label: 'Total Expense', value: formatINR(totalExpense, false), color: '#FF5252', icon: 'trending-down-outline' },
            { label: 'Net Profit', value: formatINR(netProfit, false), color: netProfit >= 0 ? '#00C48C' : '#FF5252', icon: 'cash-outline' },
            { label: 'Occupancy', value: `${occupancyRate}%`, color: '#448AFF', icon: 'home-outline' },
          ].map((kpi) => (
            <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.card }]}>
              <Ionicons name={kpi.icon as any} size={18} color={kpi.color} />
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Income vs Expense Bar Chart */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Income vs Expense Trend</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Last 6 months across all properties</Text>

          <View style={styles.chartArea}>
            {bars.map((b) => {
              const incH = Math.round((b.income / maxVal) * BAR_MAX_H);
              const expH = Math.round((b.expense / maxVal) * BAR_MAX_H);
              return (
                <View key={b.month} style={styles.barGroup}>
                  <View style={styles.barPair}>
                    <View style={[styles.barCol, { height: incH, backgroundColor: '#00C48C' }]} />
                    <View style={[styles.barCol, { height: expH, backgroundColor: '#FF5252' }]} />
                  </View>
                  <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{b.month}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00C48C' }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Expense</Text>
            </View>
          </View>
        </View>

        {/* Property-wise P&L */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Property-wise P&L</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {DUMMY_PROPERTIES.map((p) => {
            const profit = p.totalReceived - p.totalExpenses;
            const yield_ = p.purchasePrice > 0 ? ((p.monthlyRent * 12) / p.purchasePrice) * 100 : 0;
            const profitColor = profit >= 0 ? '#00C48C' : '#FF5252';
            return (
              <View key={p.id} style={[styles.plRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.plIcon, { backgroundColor: p.color + '20' }]}>
                  <Ionicons name={p.icon as any} size={14} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.plName, { color: colors.text }]} numberOfLines={1}>{p.name}</Text>
                  <Text style={[styles.plCity, { color: colors.textSecondary }]}>{p.city} · {yield_.toFixed(1)}% yield</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.plProfit, { color: profitColor }]}>
                    {profit >= 0 ? '+' : ''}{formatINR(profit)}
                  </Text>
                  <Text style={[styles.plMeta, { color: colors.textSecondary }]}>
                    ↑{formatINR(p.totalReceived, false)} ↓{formatINR(p.totalExpenses, false)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Occupancy Chart */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Occupancy Rate</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.occupancyRow}>
            <View style={styles.occupancyCircle}>
              <Text style={[styles.occupancyPct, { color: colors.primary }]}>{occupancyRate}%</Text>
              <Text style={[styles.occupancyLabel, { color: colors.textSecondary }]}>Occupied</Text>
            </View>
            <View style={styles.occupancyStats}>
              {[
                { label: 'Rented', count: DUMMY_PROPERTIES.filter(p => p.status === 'rented').length, color: '#00C48C' },
                { label: 'Pending', count: DUMMY_PROPERTIES.filter(p => p.status === 'pending').length, color: '#FFB300' },
                { label: 'Vacant', count: DUMMY_PROPERTIES.filter(p => p.status === 'vacant').length, color: '#FF5252' },
              ].map((s) => (
                <View key={s.label} style={styles.occStatRow}>
                  <View style={[styles.occDot, { backgroundColor: s.color }]} />
                  <Text style={[styles.occLabel, { color: colors.text }]}>{s.label}</Text>
                  <Text style={[styles.occCount, { color: s.color }]}>{s.count}</Text>
                </View>
              ))}
              <View style={[styles.occBarTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.occBarFill, { width: `${occupancyRate}%`, backgroundColor: '#00C48C' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Expense Breakdown */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Expense Breakdown</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {/* Stacked bar */}
          <View style={styles.stackedBar}>
            {expenseBreakdown.map((e) => (
              <View
                key={e.cat}
                style={[styles.stackedSegment, {
                  flex: e.amount / totalExpBreakdown,
                  backgroundColor: EXPENSE_CAT_COLORS[e.cat] || '#607D8B',
                }]}
              />
            ))}
          </View>
          {expenseBreakdown.map((e) => {
            const pct = Math.round((e.amount / totalExpBreakdown) * 100);
            const ec = EXPENSE_CAT_COLORS[e.cat] || '#607D8B';
            return (
              <View key={e.cat} style={styles.expBreakRow}>
                <View style={[styles.expBreakDot, { backgroundColor: ec }]} />
                <Text style={[styles.expBreakLabel, { color: colors.text }]}>{e.label}</Text>
                <View style={[styles.expBreakBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.expBreakBarFill, { width: `${pct}%`, backgroundColor: ec }]} />
                </View>
                <Text style={[styles.expBreakPct, { color: ec }]}>{pct}%</Text>
                <Text style={[styles.expBreakAmt, { color: colors.textSecondary }]}>{formatINR(e.amount, false)}</Text>
              </View>
            );
          })}
        </View>

        {/* Rental Yield & ROI */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rental Yield & ROI</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.yieldRow}>
            <View style={[styles.yieldCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.yieldLabel, { color: colors.textSecondary }]}>Avg Rental Yield</Text>
              <Text style={[styles.yieldValue, { color: '#00C48C' }]}>{avgYield.toFixed(2)}% p.a.</Text>
            </View>
            <View style={[styles.yieldCard, { backgroundColor: colors.background }]}>
              <Text style={[styles.yieldLabel, { color: colors.textSecondary }]}>Portfolio ROI</Text>
              <Text style={[styles.yieldValue, { color: '#448AFF' }]}>
                {(((netProfit * 12) / DUMMY_PROPERTIES.reduce((s, p) => s + p.purchasePrice, 0)) * 100).toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  filterChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '600' },

  kpiRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  kpiCard: { flex: 1, alignItems: 'center', borderRadius: 14, padding: 12, gap: 4 },
  kpiValue: { fontSize: 14, fontWeight: '800' },
  kpiLabel: { fontSize: 9, textAlign: 'center', fontWeight: '500' },

  sectionCard: { marginHorizontal: 20, borderRadius: 20, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sectionSub: { fontSize: 12, marginBottom: 16 },
  divider: { height: 1, marginVertical: 12 },

  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130, marginBottom: 8 },
  barGroup: { alignItems: 'center', flex: 1 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barCol: { width: 10, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 6 },
  chartLegend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11 },

  plRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  plIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  plName: { fontSize: 13, fontWeight: '600' },
  plCity: { fontSize: 11, marginTop: 2 },
  plProfit: { fontSize: 14, fontWeight: '700' },
  plMeta: { fontSize: 10, marginTop: 2 },

  occupancyRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  occupancyCircle: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 8, borderColor: '#00C48C',
    alignItems: 'center', justifyContent: 'center',
  },
  occupancyPct: { fontSize: 20, fontWeight: '900' },
  occupancyLabel: { fontSize: 9, fontWeight: '600' },
  occupancyStats: { flex: 1, gap: 8 },
  occStatRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  occDot: { width: 8, height: 8, borderRadius: 4 },
  occLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  occCount: { fontSize: 15, fontWeight: '700' },
  occBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  occBarFill: { height: '100%', borderRadius: 3 },

  stackedBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  stackedSegment: { height: '100%' },
  expBreakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  expBreakDot: { width: 8, height: 8, borderRadius: 4 },
  expBreakLabel: { width: 80, fontSize: 12, fontWeight: '500' },
  expBreakBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  expBreakBarFill: { height: '100%', borderRadius: 3 },
  expBreakPct: { width: 30, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  expBreakAmt: { width: 52, fontSize: 10, textAlign: 'right' },

  yieldRow: { flexDirection: 'row', gap: 10 },
  yieldCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center' },
  yieldLabel: { fontSize: 11, marginBottom: 6, textAlign: 'center' },
  yieldValue: { fontSize: 18, fontWeight: '800' },
});
