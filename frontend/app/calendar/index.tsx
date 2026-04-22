import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';

const { width: SW } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SW - 40 - 6) / 7);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'bill' | 'income' | 'expense' | 'reminder';
  amount: number;
  color: string;
  status?: string;
}

const TYPE_ICONS: Record<string, string> = {
  bill: 'receipt-outline',
  income: 'arrow-down-circle-outline',
  expense: 'arrow-up-circle-outline',
  reminder: 'alarm-outline',
};

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/auth/login'); return; }
    loadEvents();
  }, [isAuthenticated, month, year]);

  const loadEvents = async () => {
    try {
      const res = await api.get(`/calendar/events?month=${month}&year=${year}`);
      setEvents(res.data.events || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); loadEvents(); }, [month, year]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDate(null);
  };

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  // Events by date
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  events.forEach((ev) => {
    const d = ev.date;
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(ev);
  });

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const getDateStr = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Calendar</Text>
          <TouchableOpacity onPress={() => { setMonth(today.getMonth() + 1); setYear(today.getFullYear()); setSelectedDate(todayStr); }}>
            <Text style={[styles.todayBtn, { color: colors.primary }]}>Today</Text>
          </TouchableOpacity>
        </View>

        {/* Month Selector */}
        <View style={[styles.monthSelector, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthText, { color: colors.text }]}>{MONTHS[month - 1]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthArrow}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {DAYS.map((d) => (
            <View key={d} style={styles.dayHeaderCell}>
              <Text style={[styles.dayHeaderText, { color: colors.textSecondary }]}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {weeks.map((wk, wi) => (
            <View key={wi} style={styles.weekRow}>
              {wk.map((day, di) => {
                if (day === null) return <View key={di} style={styles.dayCell} />;
                const dateStr = getDateStr(day);
                const dayEvents = eventsByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const hasEvents = dayEvents.length > 0;
                const uniqueColors = [...new Set(dayEvents.map(e => e.color))];

                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.dayCell,
                      isToday && { borderWidth: 2, borderColor: colors.primary, borderRadius: 12 },
                      isSelected && { backgroundColor: colors.primary, borderRadius: 12 },
                    ]}
                    onPress={() => setSelectedDate(dateStr)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayNum,
                      { color: colors.text },
                      isSelected && { color: '#FFF', fontWeight: '700' },
                    ]}>{day}</Text>
                    {hasEvents && (
                      <View style={styles.dotContainer}>
                        {uniqueColors.slice(0, 3).map((c, ci) => (
                          <View key={ci} style={[styles.eventDot, { backgroundColor: isSelected ? '#FFF' : c }]} />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Event Legend */}
        <View style={styles.legendRow}>
          {[
            { color: '#22C55E', label: 'Income' },
            { color: '#F59E0B', label: 'Expense' },
            { color: '#EF4444', label: 'Bill' },
            { color: '#8B5CF6', label: 'Reminder' },
          ].map((item, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Selected Date Events */}
        {selectedDate && (
          <View style={styles.eventsSection}>
            <Text style={[styles.eventsSectionTitle, { color: colors.text }]}>
              {selectedDate === todayStr ? 'Today' : new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            {selectedEvents.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No events on this date</Text>
              </View>
            ) : (
              <View style={[styles.eventsList, { backgroundColor: colors.card }]}>
                {selectedEvents.map((ev, i) => (
                  <View key={ev.id || i} style={[styles.eventItem, i < selectedEvents.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={[styles.eventIcon, { backgroundColor: ev.color + '15' }]}>
                      <Ionicons name={(TYPE_ICONS[ev.type] || 'ellipse') as any} size={20} color={ev.color} />
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTitle, { color: colors.text }]}>{ev.title}</Text>
                      <Text style={[styles.eventType, { color: colors.textSecondary }]}>{ev.type.charAt(0).toUpperCase() + ev.type.slice(1)}{ev.status ? ` · ${ev.status}` : ''}</Text>
                    </View>
                    {ev.amount > 0 && (
                      <Text style={[styles.eventAmount, { color: ev.type === 'income' ? '#22C55E' : ev.color }]}>
                        {ev.type === 'income' ? '+' : ''}{formatINR(ev.amount)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  todayBtn: { fontSize: 14, fontWeight: '600' },
  monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, borderRadius: 14, padding: 14, marginBottom: 16 },
  monthArrow: { padding: 6 },
  monthText: { fontSize: 17, fontWeight: '700' },
  dayHeaders: { flexDirection: 'row', paddingHorizontal: 20 },
  dayHeaderCell: { width: CELL_SIZE, alignItems: 'center', paddingBottom: 8 },
  dayHeaderText: { fontSize: 12, fontWeight: '600' },
  calendarGrid: { paddingHorizontal: 20 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayCell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 14, fontWeight: '500' },
  dotContainer: { flexDirection: 'row', gap: 3, marginTop: 2 },
  eventDot: { width: 5, height: 5, borderRadius: 3 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '500' },
  eventsSection: { paddingHorizontal: 20, paddingTop: 8 },
  eventsSectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  emptyCard: { borderRadius: 14, padding: 28, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14 },
  eventsList: { borderRadius: 14, overflow: 'hidden' },
  eventItem: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  eventIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  eventType: { fontSize: 11 },
  eventAmount: { fontSize: 14, fontWeight: '700' },
});
