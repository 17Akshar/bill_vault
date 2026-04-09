import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../utils/formatINR';
import DonutChart from '../../components/charts/DonutChart';

const CAT_COLORS: Record<string, string> = {
  food: '#FF5252', shopping: '#7C4DFF', transport: '#448AFF', entertainment: '#FF9100',
  utilities: '#00BCD4', health: '#00E676', education: '#FFB300', rent: '#E91E63',
  insurance: '#78909C', emi: '#FF5252', investment: '#00E676', other: '#607D8B',
  salary: '#00E676', business: '#448AFF', freelance: '#7C4DFF', rental: '#FF9100',
  dividend: '#FFB300', interest: '#00BCD4', gift: '#E91E63', refund: '#78909C',
};

export default function ExpenseBreakdownScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [expenseData, setExpenseData] = useState<any>(null);
  const [incomeData, setIncomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewType, setViewType] = useState<'expense' | 'income'>('expense');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => { load(); }, [selectedMonth, selectedYear]);

  const load = async () => {
    try {
      const [expRes, incRes] = await Promise.all([
        api.get(`/analytics/expense-breakdown?month=${selectedMonth}&year=${selectedYear}`),
        api.get(`/analytics/income-breakdown?month=${selectedMonth}&year=${selectedYear}`),
      ]);
      setExpenseData(expRes.data);
      setIncomeData(incRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const currentData = viewType === 'expense' ? expenseData : incomeData;
  const categories = currentData?.categories || [];
  const total = currentData?.total || 0;
  const catMeta = viewType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const donutData = categories.map((c: any) => ({
    value: c.amount,
    color: CAT_COLORS[c.category] || '#607D8B',
    label: catMeta.find(cm => cm.key === c.category)?.label || c.category,
  }));

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Breakdown</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>

        {/* Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, viewType === 'expense' && { backgroundColor: '#FF5252' }]} onPress={() => setViewType('expense')}>
            <Ionicons name="arrow-down-circle" size={16} color={viewType === 'expense' ? '#FFF' : colors.textSecondary} />
            <Text style={{ color: viewType === 'expense' ? '#FFF' : colors.text, fontWeight: '600', fontSize: 14 }}>Expenses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewType === 'income' && { backgroundColor: '#00E676' }]} onPress={() => setViewType('income')}>
            <Ionicons name="arrow-up-circle" size={16} color={viewType === 'income' ? '#000' : colors.textSecondary} />
            <Text style={{ color: viewType === 'income' ? '#000' : colors.text, fontWeight: '600', fontSize: 14 }}>Income</Text>
          </TouchableOpacity>
        </View>

        {/* Month Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll} contentContainerStyle={styles.monthScrollContent}>
          {monthNames.map((name, i) => {
            const m = i + 1;
            const isActive = selectedMonth === m;
            return (
              <TouchableOpacity key={m} style={[styles.monthChip, { borderColor: colors.border }, isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => { setSelectedMonth(m); setLoading(true); }}>
                <Text style={[styles.monthChipText, { color: isActive ? '#FFF' : colors.text }]}>{name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Donut + Total */}
        <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
          <DonutChart data={donutData.length > 0 ? donutData : [{ value: 1, color: 'rgba(255,255,255,0.05)', label: 'Empty' }]}
            size={200} strokeWidth={26}
            centerValue={formatINR(total)} centerLabel={viewType === 'expense' ? 'Total Spent' : 'Total Earned'}
            centerColor={viewType === 'expense' ? '#FF5252' : '#00E676'} />
        </View>

        {/* Category List */}
        {categories.length > 0 ? categories.map((c: any, i: number) => {
          const meta = catMeta.find(cm => cm.key === c.category);
          const color = CAT_COLORS[c.category] || '#607D8B';
          return (
            <View key={i} style={[styles.catCard, { backgroundColor: colors.card }]}>
              <View style={[styles.catIcon, { backgroundColor: color + '18' }]}>
                <Ionicons name={(meta?.icon || 'ellipsis-horizontal') as any} size={20} color={color} />
              </View>
              <View style={styles.catInfo}>
                <Text style={[styles.catName, { color: colors.text }]}>{meta?.label || c.category}</Text>
                <View style={[styles.catBar, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                  <View style={[styles.catBarFill, { width: `${c.percentage}%`, backgroundColor: color }]} />
                </View>
              </View>
              <View style={styles.catRight}>
                <Text style={[styles.catAmount, { color: colors.text }]}>{formatINR(c.amount)}</Text>
                <Text style={[styles.catPct, { color: colors.textSecondary }]}>{c.percentage}%</Text>
              </View>
            </View>
          );
        }) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="pie-chart-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No {viewType} data for this month</Text>
          </View>
        )}

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
  toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  monthScroll: { maxHeight: 44, marginBottom: 16 },
  monthScrollContent: { gap: 8 },
  monthChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  monthChipText: { fontSize: 13, fontWeight: '500' },
  chartCard: { borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  catCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 8 },
  catIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catInfo: { flex: 1 },
  catName: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  catBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  catRight: { alignItems: 'flex-end', marginLeft: 12 },
  catAmount: { fontSize: 15, fontWeight: '700' },
  catPct: { fontSize: 11, marginTop: 2 },
  emptyCard: { borderRadius: 14, padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14 },
});
