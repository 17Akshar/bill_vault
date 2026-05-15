import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import {
  DUMMY_BUDGET_CATEGORIES, MONTHLY_BARS, SMART_SUGGESTIONS, CAT_COLORS,
} from './_data';

const { width: SW } = Dimensions.get('window');
const FILTERS = ['Monthly', 'Quarterly', 'Yearly'];

const OVER_BUDGET = DUMMY_BUDGET_CATEGORIES.filter(c => c.spent > c.budget);
const ON_TRACK = DUMMY_BUDGET_CATEGORIES.filter(c => c.spent <= c.budget * 0.8);

export default function BudgetInsightsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [filter, setFilter] = useState(0);

  const bars = MONTHLY_BARS;
  const maxIncome = Math.max(...bars.map(b => b.income));
  const BAR_MAX_H = 120;

  const totalBudget = DUMMY_BUDGET_CATEGORIES.reduce((s, c) => s + c.budget, 0);
  const totalSpent = DUMMY_BUDGET_CATEGORIES.reduce((s, c) => s + c.spent, 0);
  const savingsRate = Math.round(((totalBudget - totalSpent) / totalBudget) * 100);
  const utilization = Math.round((totalSpent / totalBudget) * 100);

  // Donut segments (simplified — we'll use stacked bars instead for RN)
  const catTotal = totalSpent || 1;
  const topCats = [...DUMMY_BUDGET_CATEGORIES].sort((a, b) => b.spent - a.spent).slice(0, 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Budget Insights</Text>
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

        {/* Summary KPI row */}
        <View style={styles.kpiRow}>
          {[
            { label: 'Savings Rate', value: `${savingsRate}%`, color: '#00C48C', icon: 'trending-up-outline' },
            { label: 'Utilization', value: `${utilization}%`, color: utilization > 90 ? '#FF5252' : utilization > 75 ? '#FFB300' : '#448AFF', icon: 'pie-chart-outline' },
            { label: 'Over Budget', value: `${OVER_BUDGET.length}`, color: OVER_BUDGET.length > 0 ? '#FF5252' : '#00C48C', icon: 'alert-circle-outline' },
            { label: 'On Track', value: `${ON_TRACK.length}`, color: '#00C48C', icon: 'checkmark-circle-outline' },
          ].map((kpi) => (
            <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.card }]}>
              <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
              <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value}</Text>
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Spending Trend Bar Chart */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending Trend</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Income vs Expenses — last 6 months</Text>

          <View style={styles.chartArea}>
            {bars.map((b) => {
              const incH = Math.round((b.income / maxIncome) * BAR_MAX_H);
              const expH = Math.round((b.expense / maxIncome) * BAR_MAX_H);
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
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Expenses</Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Breakdown</Text>
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>Top spending categories this month</Text>

          {/* Stacked Donut (simplified as segmented bar) */}
          <View style={styles.donutBar}>
            {topCats.map((c) => (
              <View
                key={c.key}
                style={[styles.donutSegment, { flex: c.spent / catTotal, backgroundColor: c.color }]}
              />
            ))}
          </View>

          {topCats.map((c) => {
            const pct = Math.round((c.spent / catTotal) * 100);
            return (
              <View key={c.key} style={styles.breakRow}>
                <View style={[styles.breakIcon, { backgroundColor: c.color + '22' }]}>
                  <Ionicons name={c.icon as any} size={14} color={c.color} />
                </View>
                <Text style={[styles.breakLabel, { color: colors.text }]}>{c.label}</Text>
                <View style={[styles.breakBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.breakBarFill, { width: `${pct}%` as any, backgroundColor: c.color }]} />
                </View>
                <Text style={[styles.breakAmt, { color: colors.text }]}>{pct}%</Text>
                <Text style={[styles.breakValue, { color: colors.textSecondary }]}>{formatINR(c.spent, false)}</Text>
              </View>
            );
          })}
        </View>

        {/* Over Budget Alerts */}
        {OVER_BUDGET.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: '#FF5252' }]}>Over Budget Alerts</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {OVER_BUDGET.map((c) => {
              const excess = c.spent - c.budget;
              return (
                <View key={c.key} style={[styles.alertRow, { backgroundColor: '#FF525210' }]}>
                  <View style={[styles.alertIcon, { backgroundColor: '#FF525220' }]}>
                    <Ionicons name={c.icon as any} size={16} color="#FF5252" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.alertCat, { color: colors.text }]}>{c.label}</Text>
                    <Text style={[styles.alertOver, { color: '#FF5252' }]}>
                      Over by {formatINR(excess)} ({Math.round((excess / c.budget) * 100)}%)
                    </Text>
                  </View>
                  <Ionicons name="alert-circle" size={20} color="#FF5252" />
                </View>
              );
            })}
          </View>
        )}

        {/* Savings Performance */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Savings Performance</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {bars.map((b) => {
            const saved = b.income - b.expense;
            const savedPct = Math.round((saved / b.income) * 100);
            const barColor = savedPct >= 30 ? '#00C48C' : savedPct >= 15 ? '#FFB300' : '#FF5252';
            return (
              <View key={b.month} style={styles.savingsRow}>
                <Text style={[styles.savingsMonth, { color: colors.textSecondary }]}>{b.month}</Text>
                <View style={[styles.savingsBarTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.savingsBarFill, { width: `${Math.max(savedPct, 0)}%`, backgroundColor: barColor }]} />
                </View>
                <Text style={[styles.savingsPct, { color: barColor }]}>{savedPct}%</Text>
                <Text style={[styles.savingsAmt, { color: colors.textSecondary }]}>{formatINR(saved, false)}</Text>
              </View>
            );
          })}
        </View>

        {/* Smart Suggestions */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Smart Suggestions</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {SMART_SUGGESTIONS.map((s, i) => (
            <View key={i} style={[styles.suggRow, { backgroundColor: s.color + '10' }]}>
              <Ionicons name={s.icon as any} size={20} color={s.color} />
              <Text style={[styles.suggText, { color: colors.text }]}>{s.text}</Text>
            </View>
          ))}
        </View>

        {/* Monthly Comparison */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Comparison</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {bars.slice(-3).reverse().map((b, i) => {
            const prevBar = bars[bars.length - 3 + i - 1];
            const diff = prevBar ? b.expense - prevBar.expense : 0;
            const diffColor = diff > 0 ? '#FF5252' : '#00C48C';
            return (
              <View key={b.month} style={styles.compareRow}>
                <Text style={[styles.compareMonth, { color: colors.textSecondary }]}>{b.month}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.compareIncome, { color: colors.text }]}>
                    Income: {formatINR(b.income, false)}
                  </Text>
                  <Text style={[styles.compareExpense, { color: '#FF5252' }]}>
                    Expense: {formatINR(b.expense, false)}
                  </Text>
                </View>
                {diff !== 0 && (
                  <View style={[styles.diffBadge, { backgroundColor: diffColor + '20' }]}>
                    <Ionicons name={diff > 0 ? 'arrow-up' : 'arrow-down'} size={12} color={diffColor} />
                    <Text style={[styles.diffText, { color: diffColor }]}>{formatINR(Math.abs(diff), false)}</Text>
                  </View>
                )}
              </View>
            );
          })}
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
  kpiValue: { fontSize: 18, fontWeight: '800' },
  kpiLabel: { fontSize: 9, textAlign: 'center', fontWeight: '500' },

  sectionCard: { marginHorizontal: 20, borderRadius: 20, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  sectionSub: { fontSize: 12, marginBottom: 16 },
  divider: { height: 1, marginVertical: 12 },

  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 140, marginBottom: 8 },
  barGroup: { alignItems: 'center', flex: 1 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barCol: { width: 10, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, marginTop: 6 },
  chartLegend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11 },

  donutBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
  donutSegment: { height: '100%' },
  breakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  breakIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  breakLabel: { width: 80, fontSize: 12, fontWeight: '500' },
  breakBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  breakBarFill: { height: '100%', borderRadius: 3 },
  breakAmt: { width: 32, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  breakValue: { width: 52, fontSize: 10, textAlign: 'right' },

  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12, marginBottom: 8 },
  alertIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  alertCat: { fontSize: 14, fontWeight: '600' },
  alertOver: { fontSize: 12, marginTop: 2 },

  savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  savingsMonth: { width: 28, fontSize: 11 },
  savingsBarTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  savingsBarFill: { height: '100%', borderRadius: 4 },
  savingsPct: { width: 32, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  savingsAmt: { width: 52, fontSize: 10, textAlign: 'right' },

  suggRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 12, marginBottom: 8 },
  suggText: { flex: 1, fontSize: 13, lineHeight: 18 },

  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  compareMonth: { width: 28, fontSize: 12, fontWeight: '600' },
  compareIncome: { fontSize: 12, fontWeight: '500' },
  compareExpense: { fontSize: 12, fontWeight: '500' },
  diffBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  diffText: { fontSize: 11, fontWeight: '700' },
});
