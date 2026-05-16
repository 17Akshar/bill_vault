import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { DUMMY_PLANNED_PAYMENTS, PAYMENT_CATEGORIES } from './_data';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

type ViewFilter = 'all' | 'expense' | 'income';

// Return day number -> payments map for a given month/year
function buildCalendarMap(year: number, month: number) {
  const map: Record<number, typeof DUMMY_PLANNED_PAYMENTS> = {};
  DUMMY_PLANNED_PAYMENTS.forEach(p => {
    // Parse nextDueDate like "05 Jun 2024"
    const parts = p.nextDueDate.split(' ');
    if (parts.length === 3) {
      const pDay = parseInt(parts[0]);
      const pMonthStr = parts[1];
      const pYear = parseInt(parts[2]);
      const pMonth = MONTHS.findIndex(m => m.startsWith(pMonthStr));
      if (pYear === year && pMonth === month) {
        if (!map[pDay]) map[pDay] = [];
        map[pDay].push(p);
      }
    }
  });
  return map;
}

export default function PlannedPaymentCalendarScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const calMap = buildCalendarMap(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  };

  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const selectedPayments = selectedDay ? (calMap[selectedDay] || []) : [];
  const filteredSelected = selectedPayments.filter(p =>
    viewFilter === 'all' || p.type === viewFilter
  );

  const allThisMonth = Object.values(calMap).flat();
  const upcomingAll = allThisMonth.filter(p => viewFilter === 'all' || p.type === viewFilter);

  // Group upcoming by category
  const groupedUpcoming: Record<string, typeof DUMMY_PLANNED_PAYMENTS> = {};
  upcomingAll.forEach(p => {
    if (!groupedUpcoming[p.categoryLabel]) groupedUpcoming[p.categoryLabel] = [];
    groupedUpcoming[p.categoryLabel].push(p);
  });

  const catColor = (catId: string) => PAYMENT_CATEGORIES.find(c => c.id === catId)?.color || '#6B7280';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Calendar</Text>
        <TouchableOpacity onPress={() => router.push('/planned-payments/add' as any)}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {([
            { key: 'all' as ViewFilter, label: 'All' },
            { key: 'expense' as ViewFilter, label: 'Expense' },
            { key: 'income' as ViewFilter, label: 'Income' },
          ]).map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, viewFilter === f.key && { backgroundColor: colors.primary }]}
              onPress={() => setViewFilter(f.key)}
            >
              <Text style={[styles.filterText, { color: viewFilter === f.key ? '#FFF' : colors.textSecondary }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Calendar */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map(d => (
              <Text key={d} style={[styles.dayHeader, { color: colors.textSecondary }]}>{d}</Text>
            ))}
          </View>

          {/* Grid */}
          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              if (cell === null) return <View key={`e-${idx}`} style={styles.cell} />;
              const dayPayments = calMap[cell] || [];
              const filteredDay = dayPayments.filter(p => viewFilter === 'all' || p.type === viewFilter);
              const isToday = cell === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
              const isSelected = cell === selectedDay;
              const expenseDots = filteredDay.filter(p => p.type === 'expense');
              const incomeDots = filteredDay.filter(p => p.type === 'income');

              return (
                <TouchableOpacity
                  key={cell}
                  style={[styles.cell, isSelected && { backgroundColor: colors.primary }, isToday && !isSelected && { borderWidth: 2, borderColor: colors.primary }]}
                  onPress={() => setSelectedDay(cell === selectedDay ? null : cell)}
                >
                  <Text style={[styles.cellText, { color: isSelected ? '#FFF' : colors.text }, isToday && !isSelected && { color: colors.primary }]}>
                    {cell}
                  </Text>
                  <View style={styles.cellDots}>
                    {expenseDots.length > 0 && <View style={[styles.dot, { backgroundColor: isSelected ? '#FFF' : '#EF4444' }]} />}
                    {incomeDots.length > 0 && <View style={[styles.dot, { backgroundColor: isSelected ? '#FFF' : '#22C55E' }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Expense</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.todayIndicator, { borderColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Today</Text>
            </View>
          </View>
        </View>

        {/* Selected Day */}
        {selectedDay !== null && (
          <View style={[styles.selectedSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.selectedTitle, { color: colors.text }]}>
              {selectedDay} {MONTHS[currentMonth]} {currentYear}
            </Text>
            {filteredSelected.length > 0 ? (
              filteredSelected.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.eventRow, { borderBottomColor: colors.border }]}
                  onPress={() => router.push(`/planned-payments/${p.id}` as any)}
                >
                  <View style={[styles.eventDot, { backgroundColor: catColor(p.categoryId) }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventTitle, { color: colors.text }]}>{p.title}</Text>
                    <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>{p.payee} · {p.accountLabel}</Text>
                  </View>
                  <Text style={[styles.eventAmount, { color: p.type === 'income' ? '#22C55E' : '#EF4444' }]}>
                    {p.type === 'income' ? '+' : '-'}₹{p.amount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[styles.noPay, { color: colors.textSecondary }]}>No payments on this date</Text>
            )}
          </View>
        )}

        {/* Upcoming This Month */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>This Month</Text>
        {Object.entries(groupedUpcoming).length > 0 ? (
          Object.entries(groupedUpcoming).map(([cat, payments]) => (
            <View key={cat} style={[styles.groupCard, { backgroundColor: colors.card }]}>
              <View style={styles.groupHeader}>
                <Ionicons name={payments[0].categoryIcon as any} size={18} color={payments[0].categoryColor} />
                <Text style={[styles.groupTitle, { color: colors.text }]}>{cat}</Text>
                <Text style={[styles.groupTotal, { color: payments[0].type === 'income' ? '#22C55E' : '#EF4444' }]}>
                  ₹{payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                </Text>
              </View>
              {payments.map((p, idx) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.groupItem, { borderTopColor: colors.border, borderTopWidth: idx === 0 ? 1 : 0 }]}
                  onPress={() => router.push(`/planned-payments/${p.id}` as any)}
                >
                  <View style={styles.groupItemLeft}>
                    <Text style={[styles.groupItemDate, { color: colors.textSecondary }]}>{p.nextDueDate.split(' ')[0]}</Text>
                    <Text style={[styles.groupItemTitle, { color: colors.text }]}>{p.title}</Text>
                  </View>
                  <Text style={[styles.groupItemAmount, { color: p.type === 'income' ? '#22C55E' : colors.text }]}>
                    {p.type === 'income' ? '+' : '-'}₹{p.amount.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="calendar-outline" size={36} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No payments this month</Text>
          </View>
        )}

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

  calendarCard: { borderRadius: 18, padding: 16, marginBottom: 16 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginVertical: 2 },
  cellText: { fontSize: 13, fontWeight: '600' },
  cellDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  todayIndicator: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, fontWeight: '500' },

  selectedSection: { borderRadius: 14, padding: 14, marginBottom: 14 },
  selectedTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  eventRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  eventMeta: { fontSize: 11 },
  eventAmount: { fontSize: 14, fontWeight: '700' },
  noPay: { fontSize: 13, textAlign: 'center', paddingVertical: 10 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  groupCard: { borderRadius: 14, padding: 14, marginBottom: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  groupTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
  groupTotal: { fontSize: 14, fontWeight: '700' },
  groupItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  groupItemLeft: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  groupItemDate: { fontSize: 20, fontWeight: '800', width: 30 },
  groupItemTitle: { fontSize: 13, fontWeight: '500' },
  groupItemAmount: { fontSize: 13, fontWeight: '700' },

  emptyCard: { borderRadius: 14, paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, marginTop: 10 },
});
