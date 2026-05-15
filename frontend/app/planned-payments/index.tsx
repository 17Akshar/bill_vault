import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DUMMY_PLANNED_PAYMENTS, PAYMENT_CATEGORIES, PlannedPayment, PaymentStatus, PaymentType,
} from './_data';

type FilterKey = 'all' | 'expense' | 'income' | 'upcoming' | 'completed' | 'missed';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expense' },
  { key: 'income', label: 'Income' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'missed', label: 'Missed' },
];

function filterPayments(payments: PlannedPayment[], filter: FilterKey) {
  switch (filter) {
    case 'expense': return payments.filter(p => p.type === 'expense');
    case 'income': return payments.filter(p => p.type === 'income');
    case 'upcoming': return payments.filter(p => p.status === 'upcoming');
    case 'completed': return payments.filter(p => p.status === 'completed');
    case 'missed': return payments.filter(p => p.status === 'missed');
    default: return payments;
  }
}

export default function PlannedPaymentsDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const totalExpenses = DUMMY_PLANNED_PAYMENTS
    .filter(p => p.type === 'expense')
    .reduce((s, p) => s + p.amount, 0);

  const totalIncome = DUMMY_PLANNED_PAYMENTS
    .filter(p => p.type === 'income')
    .reduce((s, p) => s + p.amount, 0);

  const upcomingCount = DUMMY_PLANNED_PAYMENTS.filter(p => p.status === 'upcoming').length;
  const missedCount = DUMMY_PLANNED_PAYMENTS.filter(p => p.status === 'missed').length;

  const filtered = filterPayments(DUMMY_PLANNED_PAYMENTS, activeFilter);

  const statusMeta = (s: PaymentStatus) => {
    if (s === 'upcoming') return { color: '#0EA5E9', label: 'Upcoming' };
    if (s === 'completed') return { color: '#22C55E', label: 'Completed' };
    if (s === 'missed') return { color: '#EF4444', label: 'Missed' };
    return { color: '#F59E0B', label: 'Paused' };
  };

  const frequencyLabel: Record<string, string> = {
    one_time: 'One Time', daily: 'Daily', weekly: 'Weekly',
    monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Planned Payments</Text>
        <TouchableOpacity onPress={() => router.push('/planned-payments/analytics' as any)}>
          <Ionicons name="analytics-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <LinearGradient colors={['#6366F1', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpiCardGrad}>
            <Ionicons name="arrow-redo-outline" size={22} color="#FFF" />
            <Text style={styles.kpiGradLabel}>Monthly Expenses</Text>
            <Text style={styles.kpiGradValue}>₹{(totalExpenses / 1000).toFixed(1)}K</Text>
          </LinearGradient>

          <LinearGradient colors={['#22C55E', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.kpiCardGrad}>
            <Ionicons name="arrow-undo-outline" size={22} color="#FFF" />
            <Text style={styles.kpiGradLabel}>Monthly Income</Text>
            <Text style={styles.kpiGradValue}>₹{(totalIncome / 1000).toFixed(0)}K</Text>
          </LinearGradient>
        </View>

        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#0EA5E920' }]}>
              <Ionicons name="time-outline" size={20} color="#0EA5E9" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Upcoming</Text>
            <Text style={[styles.kpiValue, { color: colors.text }]}>{upcomingCount}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.card }]}>
            <View style={[styles.kpiIcon, { backgroundColor: '#EF444420' }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Missed</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>{missedCount}</Text>
          </View>
        </View>

        {/* Category Chips */}
        <View style={styles.categoriesRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
            {PAYMENT_CATEGORIES.slice(0, 8).map((cat) => (
              <View key={cat.id} style={[styles.categoryChip, { backgroundColor: cat.color + '20' }]}>
                <Ionicons name={cat.icon as any} size={14} color={cat.color} />
                <Text style={[styles.categoryChipText, { color: cat.color }]}>{cat.label}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, activeFilter === f.key && { backgroundColor: colors.primary }]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterText, { color: activeFilter === f.key ? '#FFF' : colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Payments List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {filtered.length} payments
            </Text>
            <TouchableOpacity onPress={() => router.push('/planned-payments/calendar' as any)}>
              <View style={[styles.calendarBtn, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={[styles.calendarBtnText, { color: colors.primary }]}>Calendar</Text>
              </View>
            </TouchableOpacity>
          </View>

          {filtered.map((payment) => {
            const sm = statusMeta(payment.status);
            return (
              <TouchableOpacity
                key={payment.id}
                style={[styles.paymentCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(`/planned-payments/${payment.id}` as any)}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.cardIcon, { backgroundColor: payment.categoryColor + '20' }]}>
                    <Ionicons name={payment.categoryIcon as any} size={20} color={payment.categoryColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{payment.title}</Text>
                    <Text style={[styles.cardSub, { color: colors.textSecondary }]}>
                      {payment.accountLabel} · {frequencyLabel[payment.frequency]}
                    </Text>
                    <View style={styles.cardMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: sm.color + '20' }]}>
                        <Text style={[styles.statusText, { color: sm.color }]}>{sm.label}</Text>
                      </View>
                      {payment.autoReminder && (
                        <View style={[styles.reminderBadge, { backgroundColor: colors.background }]}>
                          <Ionicons name="notifications-outline" size={10} color={colors.textSecondary} />
                          <Text style={[styles.reminderBadgeText, { color: colors.textSecondary }]}>{payment.reminderDaysBefore}d before</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={[styles.cardAmount, { color: payment.type === 'income' ? '#22C55E' : colors.text }]}>
                    {payment.type === 'income' ? '+' : '-'}₹{payment.amount.toLocaleString()}
                  </Text>
                  <Text style={[styles.cardDue, { color: colors.textSecondary }]}>{payment.nextDueDate}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/planned-payments/add' as any)}
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kpiCardGrad: { flex: 1, borderRadius: 16, padding: 16, gap: 6 },
  kpiGradLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '500' },
  kpiGradValue: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  kpiCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  kpiIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  kpiValue: { fontSize: 18, fontWeight: '700' },

  categoriesRow: { marginBottom: 14 },
  categoriesContent: { paddingBottom: 4, gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, gap: 5 },
  categoryChipText: { fontSize: 12, fontWeight: '600' },

  filterScroll: { marginBottom: 16 },
  filterContent: { gap: 8, paddingBottom: 4 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.1)' },
  filterText: { fontSize: 13, fontWeight: '600' },

  listSection: { flex: 1 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  calendarBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 5 },
  calendarBtnText: { fontSize: 13, fontWeight: '600' },

  paymentCard: { borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  cardSub: { fontSize: 11, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
  reminderBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, gap: 4 },
  reminderBadgeText: { fontSize: 10, fontWeight: '500' },

  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardAmount: { fontSize: 15, fontWeight: '800' },
  cardDue: { fontSize: 11 },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
});
