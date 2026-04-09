import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import BarChart from '../../components/charts/BarChart';

export default function CashFlowScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [months, setMonths] = useState(6);

  useEffect(() => { load(); }, [months]);

  const load = async () => {
    try {
      const res = await api.get(`/analytics/cashflow?months=${months}`);
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const summary = data?.summary || {};
  const monthly = data?.monthly || [];
  const barData = monthly.map((m: any) => ({ label: m.short_label, income: m.income, expense: m.expense }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Cash Flow</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>

        {/* Summary Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card }]}>
          <View style={styles.heroRow}>
            <View style={styles.heroCol}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Income</Text>
              <Text style={[styles.heroValue, { color: '#00E676' }]}>{formatINR(summary.total_income || 0)}</Text>
            </View>
            <View style={styles.heroCol}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Expense</Text>
              <Text style={[styles.heroValue, { color: '#FF5252' }]}>{formatINR(summary.total_expense || 0)}</Text>
            </View>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroCol}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total Savings</Text>
              <Text style={[styles.heroValue, { color: (summary.total_savings || 0) >= 0 ? '#00E676' : '#FF5252' }]}>
                {formatINR(summary.total_savings || 0)}
              </Text>
            </View>
            <View style={styles.heroCol}>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Avg Savings Rate</Text>
              <Text style={[styles.heroValue, { color: (summary.avg_savings_rate || 0) >= 0 ? '#00E676' : '#FF5252' }]}>
                {summary.avg_savings_rate || 0}%
              </Text>
            </View>
          </View>
        </View>

        {/* Month Duration Selector */}
        <View style={styles.durationRow}>
          {[3, 6, 12].map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.durationBtn, { borderColor: colors.border }, months === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => { setMonths(m); setLoading(true); }}
            >
              <Text style={[styles.durationText, { color: months === m ? '#FFF' : colors.text }]}>{m} Months</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Income vs Expense Bar Chart */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Income vs Expense</Text>
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#00E676' }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>Income</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} /><Text style={[styles.legendText, { color: colors.textSecondary }]}>Expense</Text></View>
          </View>
          {barData.length > 0 ? (
            <BarChart data={barData} height={160} textColor={colors.textSecondary} />
          ) : (
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No data for the selected period</Text>
          )}
        </View>

        {/* Monthly Breakdown */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Breakdown</Text>
        {monthly.map((m: any, i: number) => {
          const maxVal = Math.max(m.income, m.expense, 1);
          return (
            <View key={i} style={[styles.monthCard, { backgroundColor: colors.card }]}>
              <View style={styles.monthHeader}>
                <Text style={[styles.monthLabel, { color: colors.text }]}>{m.label}</Text>
                <View style={[styles.savingsChip, { backgroundColor: m.savings >= 0 ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)' }]}>
                  <Ionicons name={m.savings >= 0 ? 'trending-up' : 'trending-down'} size={12} color={m.savings >= 0 ? '#00E676' : '#FF5252'} />
                  <Text style={{ color: m.savings >= 0 ? '#00E676' : '#FF5252', fontSize: 11, fontWeight: '700' }}>
                    {m.savings_rate}% saved
                  </Text>
                </View>
              </View>
              <View style={styles.monthRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.monthBarRow}>
                    <Text style={[styles.monthBarLabel, { color: colors.textSecondary }]}>Inc</Text>
                    <View style={[styles.monthBar, { flex: 1 }]}>
                      <View style={[styles.monthBarFill, { width: `${(m.income / maxVal * 100)}%`, backgroundColor: '#00E676' }]} />
                    </View>
                    <Text style={[styles.monthBarVal, { color: '#00E676' }]}>{formatINR(m.income)}</Text>
                  </View>
                  <View style={styles.monthBarRow}>
                    <Text style={[styles.monthBarLabel, { color: colors.textSecondary }]}>Exp</Text>
                    <View style={[styles.monthBar, { flex: 1 }]}>
                      <View style={[styles.monthBarFill, { width: `${(m.expense / maxVal * 100)}%`, backgroundColor: '#FF5252' }]} />
                    </View>
                    <Text style={[styles.monthBarVal, { color: '#FF5252' }]}>{formatINR(m.expense)}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { paddingHorizontal: 20 },
  heroCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  heroRow: { flexDirection: 'row', marginBottom: 16 },
  heroCol: { flex: 1 },
  heroLabel: { fontSize: 12, marginBottom: 4 },
  heroValue: { fontSize: 18, fontWeight: 'bold' },
  durationRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  durationBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  durationText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  chartCard: { borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' },
  legendRow: { flexDirection: 'row', gap: 20, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  emptyText: { fontSize: 14, paddingVertical: 40 },
  monthCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthLabel: { fontSize: 15, fontWeight: '600' },
  savingsChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center' },
  monthBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  monthBarLabel: { width: 28, fontSize: 11 },
  monthBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
  monthBarFill: { height: '100%', borderRadius: 4 },
  monthBarVal: { fontSize: 12, fontWeight: '600', minWidth: 80, textAlign: 'right' },
});
