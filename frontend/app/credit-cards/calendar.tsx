import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DUMMY_CALENDAR_EVENTS } from './_data';

const { width: SW } = Dimensions.get('window');
const DAY_CELL = (SW - 48) / 7;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

type EventType = 'payment_due' | 'reminder' | 'recurring';

const EVENT_COLORS: Record<EventType, string> = {
  payment_due: '#FF4D67',
  reminder: '#448AFF',
  recurring: '#00C48C',
};

export default function CreditCardCalendarScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const today = new Date();
  const [year, setYear] = useState(2024);
  const [month, setMonth] = useState(4); // May 2024 (0-indexed)
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const cells = buildCalendarDays(year, month);
  const monthLabel = `${MONTHS[month]} ${year}`;

  const eventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return DUMMY_CALENDAR_EVENTS.filter((e) => e.date === dateStr);
  };

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];
  const allUpcoming = [...DUMMY_CALENDAR_EVENTS].sort((a, b) => a.date.localeCompare(b.date));

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Calendar</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Calendar card */}
        <View style={[styles.calendarCard, { backgroundColor: colors.card }]}>
          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={styles.dayHeaders}>
            {DAYS.map((d) => (
              <Text key={d} style={[styles.dayHeader, { color: colors.textSecondary, width: DAY_CELL }]}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={{ width: DAY_CELL, height: DAY_CELL }} />;
              const events = eventsForDay(day);
              const isSelected = day === selectedDay;
              const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    { width: DAY_CELL, height: DAY_CELL },
                    isSelected && { backgroundColor: colors.primary, borderRadius: DAY_CELL / 2 },
                    isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.primary, borderRadius: DAY_CELL / 2 },
                  ]}
                  onPress={() => setSelectedDay(isSelected ? null : day)}
                >
                  <Text style={[styles.dayNum, { color: isSelected ? '#FFF' : colors.text }]}>{day}</Text>
                  <View style={styles.eventDots}>
                    {events.slice(0, 3).map((e, i) => (
                      <View key={i} style={[styles.dot, { backgroundColor: EVENT_COLORS[e.type as EventType] ?? '#888' }]} />
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {[
              { type: 'payment_due', label: 'Payment Due' },
              { type: 'reminder', label: 'Reminder' },
              { type: 'recurring', label: 'Recurring' },
            ].map((item) => (
              <View key={item.type} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: EVENT_COLORS[item.type as EventType] }]} />
                <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selected day events */}
        {selectedDay && selectedEvents.length > 0 && (
          <View style={[styles.selectedSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.selDate, { color: colors.text }]}>
              {selectedDay} {MONTHS[month]} {year}
            </Text>
            {selectedEvents.map((event, i) => (
              <View key={i} style={[styles.eventItem, { borderLeftColor: EVENT_COLORS[event.type as EventType] }]}>
                <Text style={[styles.eventLabel, { color: colors.text }]}>{event.label}</Text>
                <Text style={[styles.eventAmt, { color: EVENT_COLORS[event.type as EventType] }]}>
                  {formatINR(event.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming events */}
        <View style={styles.upcomingSection}>
          <Text style={[styles.upcomingTitle, { color: colors.text }]}>Upcoming Events</Text>
          {allUpcoming.map((event, i) => {
            const eventColor = EVENT_COLORS[event.type as EventType] ?? '#888';
            const dateObj = new Date(event.date);
            const dayNum = dateObj.getDate();
            const mon = MONTHS[dateObj.getMonth()];
            return (
              <View key={i} style={[styles.upcomingItem, { backgroundColor: colors.card }]}>
                <View style={[styles.upcomingDateBox, { backgroundColor: eventColor + '22' }]}>
                  <Text style={[styles.upcomingDayNum, { color: eventColor }]}>{dayNum}</Text>
                  <Text style={[styles.upcomingMon, { color: eventColor }]}>{mon.slice(0, 3)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.upcomingLabel, { color: colors.text }]}>{event.label}</Text>
                  <Text style={[styles.upcomingType, { color: eventColor }]}>
                    {event.type === 'payment_due' ? 'Payment Due' : 'Reminder'}
                  </Text>
                </View>
                <Text style={[styles.upcomingAmt, { color: colors.text }]}>{formatINR(event.amount)}</Text>
              </View>
            );
          })}
        </View>

        {/* Add Reminder FAB placeholder row */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/credit-cards/reminder' as any)}
      >
        <Ionicons name="add" size={24} color="#FFF" />
        <Text style={styles.fabText}>Add Reminder</Text>
      </TouchableOpacity>
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

  calendarCard: { marginHorizontal: 20, borderRadius: 20, padding: 16, marginBottom: 12 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 17, fontWeight: '700' },

  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { textAlign: 'center', fontSize: 11, fontWeight: '600' },

  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dayNum: { fontSize: 13, fontWeight: '600' },
  eventDots: { flexDirection: 'row', gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11 },

  selectedSection: {
    marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 12,
  },
  selDate: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  eventItem: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, marginBottom: 6, flexDirection: 'row', justifyContent: 'space-between' },
  eventLabel: { fontSize: 13 },
  eventAmt: { fontSize: 14, fontWeight: '700' },

  upcomingSection: { paddingHorizontal: 20 },
  upcomingTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  upcomingItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, gap: 14,
  },
  upcomingDateBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  upcomingDayNum: { fontSize: 18, fontWeight: '800' },
  upcomingMon: { fontSize: 10, fontWeight: '600' },
  upcomingLabel: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  upcomingType: { fontSize: 11, fontWeight: '500' },
  upcomingAmt: { fontSize: 14, fontWeight: '700' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 28,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
