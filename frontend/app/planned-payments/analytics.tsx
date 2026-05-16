import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DUMMY_PLANNED_PAYMENTS, MONTHLY_CHART_DATA, PAYMENT_CATEGORIES } from './_data';

type Period = 'monthly' | 'quarterly' | 'yearly';

export default function PlannedPaymentsAnalyticsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('monthly');

  const expenses = DUMMY_PLANNED_PAYMENTS.filter(p => p.type === 'expense');
  const incomes = DUMMY_PLANNED_PAYMENTS.filter(p => p.type === 'income');

  const totalExpenses = expenses.reduce((s, p) => s + p.amount, 0);
  const totalIncome = incomes.reduce((s, p) => s + p.amount, 0);
  const netCashFlow = totalIncome - totalExpenses;
  const completionRate = Math.round(
    (DUMMY_PLANNED_PAYMENTS.filter(p => p.status === 'completed').length / DUMMY_PLANNED_PAYMENTS.length) * 100
  );
  const missedCount = DUMMY_PLANNED_PAYMENTS.filter(p => p.status === 'missed').length;

  const maxBar = Math.max(...MONTHLY_CHART_DATA.map(d => Math.max(d.expenses, d.income)));

  // Category breakdown for expenses
  const catBreakdown = expenses.reduce<Record<string, number>>((acc, p) => {
    acc[p.categoryId] = (acc[p.categoryId] || 0) + p.amount;
    return acc;
  }, {});

  const catEntries = Object.entries(catBreakdown)
    .map(([id, amount]) => ({
      id,
      amount,
      cat: PAYMENT_CATEGORIES.find(c => c.id === id)!,
      pct: Math.round((amount / totalExpenses) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Period Filter */}
        <View style={styles.filterRow}>
          {(['monthly', 'quarterly', 'yearly'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.filterTab, period === p && { backgroundColor: colors.primary }]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.filterText, { color: period === p ? '#FFF' : colors.textSecondary }]}>
                {p === 'monthly' ? 'Monthly' : p === 'quarterly' ? 'Quarterly' : 'Yearly'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <LinearGradient colors={['#EF4444', '#DC2626']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpiGrad}>
            <Ionicons name="arrow-redo-outline" size={20} color="#FFF" />
            <Text style={styles.kpiGradLabel}>Planned Expenses</Text>
            <Text style={styles.kpiGradValue}>₹{(totalExpenses / 1000).toFixed(1)}K</Text>
          </LinearGradient>
          <LinearGradient colors={['#22C55E', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpiGrad}>
            <Ionicons name="arrow-undo-outline" size={20} color="#FFF" />
            <Text style={styles.kpiGradLabel}>Planned Income</Text>
            <Text style={styles.kpiGradValue}>₹{(totalIncome / 1000).toFixed(0)}K</Text>
          </LinearGradient>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: (netCashFlow >= 0 ? '#22C55E' : '#EF4444') + '20' }]}>
              <Ionicons name="trending-up-outline" size={20} color={netCashFlow >= 0 ? '#22C55E' : '#EF4444'} />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Net Cash Flow</Text>
            <Text style={[styles.kpiValue, { color: netCashFlow >= 0 ? '#22C55E' : '#EF4444' }]}>
              {netCashFlow >= 0 ? '+' : ''}₹{(Math.abs(netCashFlow) / 1000).toFixed(1)}K
            </Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#0EA5E920' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#0EA5E9" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Completion Rate</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{completionRate}%</Text>
          </View>
        </View>

        {/* Bar Chart */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Expense vs Income Trend</Text>
          <View style={styles.chartContainer}>
            {MONTHLY_CHART_DATA.map((data, idx) => (
              <View key={idx} style={styles.barGroup}>
                <View style={styles.barsWrap}>
                  <View style={styles.barCol}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[styles.bar, { height: Math.max(4, (data.expenses / maxBar) * 90) }]}
                    />
                  </View>
                  <View style={styles.barCol}>
                    <LinearGradient
                      colors={['#22C55E', '#16A34A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[styles.bar, { height: Math.max(4, (data.income / maxBar) * 90) }]}
                    />
                  </View>
                </View>
                <Text style={[styles.barMonthLabel, { color: colors.textSecondary }]}>{data.month}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Expenses</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Income</Text>
            </View>
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Expense Category Breakdown</Text>
          {catEntries.map((entry, idx) => (
            <View key={idx} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: entry.cat?.color || '#6B7280' }]} />
              <Text style={[styles.catName, { color: colors.text }]}>{entry.cat?.label || entry.id}</Text>
              <View style={styles.catBarWrap}>
                <View style={[styles.catBar, { width: `${entry.pct}%`, backgroundColor: (entry.cat?.color || '#6B7280') + '70' }]} />
              </View>
              <Text style={[styles.catPct, { color: colors.textSecondary }]}>{entry.pct}%</Text>
              <Text style={[styles.catAmt, { color: colors.text }]}>₹{(entry.amount / 1000).toFixed(0)}K</Text>
            </View>
          ))}
        </View>

        {/* Completion Rate Donut */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Payment Completion Rate</Text>
          <View style={styles.completionSection}>
            <View style={styles.completionCircleWrap}>
              <View style={[styles.completionCircleOuter, { borderColor: colors.border }]}>
                <View style={[styles.completionCircleInner, { borderColor: colors.primary }]}>
                  <Text style={[styles.completionPct, { color: colors.primary }]}>{completionRate}%</Text>
                  <Text style={[styles.completionLabel, { color: colors.textSecondary }]}>Completed</Text>
                </View>
              </View>
            </View>
            <View style={styles.completionStats}>
              {[
                { label: 'Total Payments', value: DUMMY_PLANNED_PAYMENTS.length.toString(), color: colors.text },
                { label: 'Completed', value: DUMMY_PLANNED_PAYMENTS.filter(p => p.status === 'completed').length.toString(), color: '#22C55E' },
                { label: 'Upcoming', value: DUMMY_PLANNED_PAYMENTS.filter(p => p.status === 'upcoming').length.toString(), color: '#0EA5E9' },
                { label: 'Missed', value: missedCount.toString(), color: '#EF4444' },
              ].map((stat, idx) => (
                <View key={idx} style={styles.statRow}>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Missed Payment Analysis */}
        {missedCount > 0 && (
          <View style={[styles.card, { backgroundColor: '#EF444415', borderColor: '#EF444430', borderWidth: 1 }]}>
            <View style={styles.missedHeader}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
              <Text style={[styles.cardTitle, { color: '#EF4444' }]}>Missed Payments ({missedCount})</Text>
            </View>
            {DUMMY_PLANNED_PAYMENTS.filter(p => p.status === 'missed').map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.missedRow, { borderTopColor: 'rgba(239,68,68,0.2)' }]}
                onPress={() => router.push(`/planned-payments/${p.id}` as any)}
              >
                <View style={[styles.missedIcon, { backgroundColor: p.categoryColor + '20' }]}>
                  <Ionicons name={p.categoryIcon as any} size={16} color={p.categoryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.missedTitle, { color: colors.text }]}>{p.title}</Text>
                  <Text style={[styles.missedDate, { color: colors.textSecondary }]}>{p.nextDueDate}</Text>
                </View>
                <Text style={[styles.missedAmt, { color: '#EF4444' }]}>₹{p.amount.toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming Commitments */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Upcoming Commitments</Text>
          {DUMMY_PLANNED_PAYMENTS.filter(p => p.status === 'upcoming').slice(0, 4).map((p, idx, arr) => (
            <View key={p.id} style={[styles.upcomingRow, { borderBottomWidth: idx < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
              <View style={[styles.upcomingDot, { backgroundColor: p.categoryColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.upcomingTitle, { color: colors.text }]}>{p.title}</Text>
                <Text style={[styles.upcomingDue, { color: colors.textSecondary }]}>{p.nextDueDate}</Text>
              </View>
              <Text style={[styles.upcomingAmt, { color: p.type === 'income' ? '#22C55E' : colors.text }]}>
                {p.type === 'income' ? '+' : '-'}₹{p.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.1)', alignItems: 'center' },
  filterText: { fontSize: 13, fontWeight: '600' },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiGrad: { flex: 1, borderRadius: 14, padding: 14, gap: 4 },
  kpiGradLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '500' },
  kpiGradValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  kpiCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  kpiIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  kpiLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4, textAlign: 'center' },
  kpiValue: { fontSize: 16, fontWeight: '700' },

  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },

  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120 },
  barGroup: { flex: 1, alignItems: 'center' },
  barsWrap: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 90, marginBottom: 4 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  barMonthLabel: { fontSize: 11, fontWeight: '600' },
  chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '500' },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { fontSize: 12, fontWeight: '600', width: 90 },
  catBarWrap: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(128,128,128,0.1)', overflow: 'hidden' },
  catBar: { height: '100%', borderRadius: 4 },
  catPct: { fontSize: 11, fontWeight: '500', width: 30, textAlign: 'right' },
  catAmt: { fontSize: 12, fontWeight: '600', width: 50, textAlign: 'right' },

  completionSection: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  completionCircleWrap: { alignItems: 'center' },
  completionCircleOuter: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  completionCircleInner: { width: 80, height: 80, borderRadius: 40, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  completionPct: { fontSize: 20, fontWeight: '800' },
  completionLabel: { fontSize: 9, fontWeight: '500' },
  completionStats: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  statValue: { fontSize: 14, fontWeight: '700' },

  missedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  missedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, gap: 10 },
  missedIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  missedTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  missedDate: { fontSize: 11 },
  missedAmt: { fontSize: 14, fontWeight: '700' },

  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  upcomingDot: { width: 10, height: 10, borderRadius: 5 },
  upcomingTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  upcomingDue: { fontSize: 11 },
  upcomingAmt: { fontSize: 14, fontWeight: '700' },
});
