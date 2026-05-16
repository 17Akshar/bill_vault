/**
 * Reminders — View All (4-tab dark UI per spec).
 *
 * Tabs:
 *   • Upcoming   — segmented by Today / Tomorrow / Next 7 Days / Later
 *   • Calendar   — month view with dots for days that have reminders
 *   • All        — flat list with search + category filters
 *   • Completed  — flat list of paid/completed reminders
 *
 * Backed by GET /api/reminders + GET /api/reminders/summary.
 * "+" button → /reminders/add (new add flow with recurring + end conditions).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import {
  syncRemindersToNotifications,
  scheduleReminderNotifications,
  cancelReminderNotifications,
} from '../../utils/reminderNotifications';

type TabKey = 'upcoming' | 'calendar' | 'all' | 'completed';
type Reminder = {
  reminder_id: string;
  title: string;
  description?: string;
  reminder_date: string;       // ISO
  reminder_type: string;       // bill / loan_emi / credit_card / investment / lending / custom
  is_completed: boolean;
  amount?: number;
  related_item?: { name?: string; amount?: number; emi_amount?: number; current_outstanding?: number; remaining_amount?: number };
};

const TYPE_META: Record<string, { color: string; icon: string }> = {
  bill: { color: '#3B82F6', icon: 'wifi' },
  loan_emi: { color: '#7C4DFF', icon: 'home' },
  credit_card: { color: '#EF4444', icon: 'card' },
  investment: { color: '#FFB300', icon: 'trending-up' },
  insurance: { color: '#22C55E', icon: 'shield-checkmark' },
  lending: { color: '#22C55E', icon: 'people' },
  custom: { color: '#7C4DFF', icon: 'notifications' },
};

const TAB_LABEL: Record<TabKey, string> = {
  upcoming: 'Upcoming',
  calendar: 'Calendar',
  all: 'All',
  completed: 'Completed',
};

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'bill', label: 'Bills' },
  { key: 'loan_emi', label: 'EMI' },
  { key: 'investment', label: 'Investment' },
  { key: 'insurance', label: 'Insurance' },
];

const fmtINR = (n: number) => formatINR(n || 0);

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const dueLabel = (iso: string, completed?: boolean) => {
  if (completed) return 'Paid';
  const d = new Date(iso);
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) > 1 ? 's' : ''} overdue`;
  if (days === 0) return 'Due Today';
  if (days === 1) return 'Due Tomorrow';
  return `Due in ${days} day${days > 1 ? 's' : ''}`;
};

const dueColor = (iso: string, completed?: boolean) => {
  if (completed) return '#22C55E';
  const days = Math.round(
    (startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime()) / 86_400_000,
  );
  if (days < 0) return '#EF4444';
  if (days === 0) return '#EF4444';
  if (days === 1) return '#FFB300';
  return '#7C4DFF';
};

export default function RemindersAllScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [items, setItems] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  const load = async () => {
    try {
      const res = await api.get('/reminders');
      const data = res.data || [];
      setItems(data);
      // Schedule local OS notifications for all open reminders (best-effort).
      // Runs in the background; errors are non-fatal.
      syncRemindersToNotifications(data).catch(() => {});
    } catch (err: any) {
      // Ignore 401 (parent will redirect to login); other errors leave items empty
      if (err?.response?.status !== 401) {
        console.error('Failed to load reminders:', err);
      }
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  const completeReminder = async (r: Reminder) => {
    // Optimistic UI: remove instantly, restore on error
    const prev = items;
    setItems(items.map((it) => (it.reminder_id === r.reminder_id
      ? { ...it, is_completed: true } : it)));
    try {
      const res = await api.put(`/reminders/${r.reminder_id}`, { is_completed: true });
      // Reschedule based on server's authoritative state (advanced or completed)
      const updated = res?.data;
      if (updated?.is_completed) {
        cancelReminderNotifications(r.reminder_id).catch(() => {});
      } else if (updated) {
        scheduleReminderNotifications(updated).catch(() => {});
      }
      load();
    } catch (e) {
      setItems(prev);
      Alert.alert('Error', 'Could not mark complete');
    }
  };

  const markUpcoming = async (r: Reminder) => {
    // "Mark as Upcoming" — moves a completed reminder back to upcoming
    const prev = items;
    setItems(
      items.map((it) =>
        it.reminder_id === r.reminder_id ? { ...it, is_completed: false } : it,
      ),
    );
    try {
      const res = await api.put(`/reminders/${r.reminder_id}`, { is_completed: false });
      if (res?.data) scheduleReminderNotifications(res.data).catch(() => {});
      load();
    } catch (e) {
      setItems(prev);
      Alert.alert('Error', 'Could not move back to upcoming');
    }
  };

  const showActionMenu = (r: Reminder) => {
    if (r.is_completed) {
      Alert.alert(r.title, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as Upcoming', onPress: () => markUpcoming(r) },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/reminders/${r.reminder_id}`);
              cancelReminderNotifications(r.reminder_id).catch(() => {});
              load();
            } catch { Alert.alert('Error', 'Could not delete'); }
          },
        },
      ]);
    } else {
      Alert.alert(r.title, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as Completed', onPress: () => completeReminder(r) },
        { text: 'Snooze',  onPress: () => snoozeReminder(r) },
        { text: 'Edit',    onPress: () => router.push({ pathname: '/reminders' as any, params: { id: r.reminder_id } }) },
      ]);
    }
  };

  const snoozeReminder = (r: Reminder) => {
    // Quick presets (1 hour, 1 day, 1 week)
    Alert.alert(
      'Snooze reminder',
      `Postpone "${r.title}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '1 hour',  onPress: () => doSnooze(r, 60 * 60 * 1000) },
        { text: '1 day',   onPress: () => doSnooze(r, 24 * 60 * 60 * 1000) },
        { text: '1 week',  onPress: () => doSnooze(r, 7 * 24 * 60 * 60 * 1000) },
      ],
    );
  };

  const doSnooze = async (r: Reminder, deltaMs: number) => {
    const newDate = new Date(new Date(r.reminder_date).getTime() + deltaMs);
    // If snoozing to the past (overdue case), bump from now instead.
    const target = newDate < new Date() ? new Date(Date.now() + deltaMs) : newDate;
    const prev = items;
    setItems(
      items.map((it) =>
        it.reminder_id === r.reminder_id
          ? { ...it, reminder_date: target.toISOString() }
          : it,
      ),
    );
    try {
      const res = await api.put(`/reminders/${r.reminder_id}`, {
        snooze_until: target.toISOString(),
      });
      if (res?.data) scheduleReminderNotifications(res.data).catch(() => {});
      load();
    } catch (e) {
      setItems(prev);
      Alert.alert('Error', 'Could not snooze reminder');
    }
  };

  const upcoming = items.filter((i) => !i.is_completed);
  const completed = items.filter((i) => i.is_completed);

  // Stats
  const now = new Date();
  const today = startOfDay(now);
  const week = new Date(today.getTime() + 7 * 86_400_000);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const dueToday = upcoming.filter((i) => startOfDay(new Date(i.reminder_date)).getTime() === today.getTime());
  const dueWeek = upcoming.filter((i) => {
    const d = new Date(i.reminder_date);
    return d >= today && d < week;
  });
  const dueMonth = upcoming.filter((i) => {
    const d = new Date(i.reminder_date);
    return d >= today && d <= monthEnd;
  });

  const groupedUpcoming = useMemo(() => {
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const inWeek = new Date(today.getTime() + 7 * 86_400_000);
    const fmtDay = (d: Date) =>
      d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const groups: { label: string; items: Reminder[] }[] = [
      { label: `Today, ${fmtDay(today)}`, items: [] },
      { label: `Tomorrow, ${fmtDay(tomorrow)}`, items: [] },
      { label: 'Next 7 Days', items: [] },
      { label: 'Later', items: [] },
    ];
    upcoming
      .slice()
      .sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime())
      .forEach((r) => {
        const d = new Date(r.reminder_date);
        if (startOfDay(d).getTime() === today.getTime()) groups[0].items.push(r);
        else if (startOfDay(d).getTime() === startOfDay(tomorrow).getTime()) groups[1].items.push(r);
        else if (d <= inWeek) groups[2].items.push(r);
        else groups[3].items.push(r);
      });
    return groups.filter((g) => g.items.length > 0);
  }, [upcoming]);

  const filtered = (tab === 'completed' ? completed : items).filter((r) => {
    if (category !== 'all' && r.reminder_type !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.title.toLowerCase().includes(q) &&
          !(r.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const renderRow = (r: Reminder) => {
    const meta = TYPE_META[r.reminder_type] || TYPE_META.custom;
    const amount = r.amount ?? r.related_item?.amount ?? r.related_item?.emi_amount ??
      r.related_item?.current_outstanding ?? r.related_item?.remaining_amount ?? 0;
    const due = dueLabel(r.reminder_date, r.is_completed);
    const color = dueColor(r.reminder_date, r.is_completed);
    const source = r.related_item?.name || r.description || '';
    return (
      <View key={r.reminder_id} style={styles.row}>
        <TouchableOpacity
          testID={`reminder-row-${r.reminder_id}`}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          // Per spec: tap row → mark as completed (or undo if completed)
          onPress={() => (r.is_completed ? markUpcoming(r) : completeReminder(r))}
          onLongPress={() => showActionMenu(r)}
          delayLongPress={350}
        >
          <View style={[styles.rowIcon, { backgroundColor: r.is_completed ? '#22C55E' : meta.color }]}>
            <Ionicons
              name={r.is_completed ? 'checkmark' : (meta.icon as any)}
              size={18}
              color="#FFFFFF"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={[
                styles.rowTitle,
                r.is_completed && { textDecorationLine: 'line-through', color: '#A0A3BD' },
              ]}
              numberOfLines={1}
            >
              {r.title}
            </Text>
            {!!source && (
              <Text style={styles.rowSub} numberOfLines={1}>{source}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
            {amount > 0 && (
              <Text style={[styles.rowAmount, { color: r.is_completed ? '#A0A3BD' : color }]}>
                {fmtINR(amount)}
              </Text>
            )}
            <Text style={[styles.rowDue, { color: r.is_completed ? '#22C55E' : color }]}>
              {r.is_completed ? 'Paid' : due}
            </Text>
          </View>
        </TouchableOpacity>
        {/* ⋮ action menu — works for both upcoming + completed */}
        <TouchableOpacity
          testID={`reminder-menu-${r.reminder_id}`}
          onPress={() => showActionMenu(r)}
          style={styles.menuBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={18} color="#A0A3BD" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#08082A' }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="reminders-back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard' as any))}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reminders</Text>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Ionicons name="search" size={22} color="#FFFFFF" />
          <TouchableOpacity
            testID="reminders-add"
            style={styles.addBtn}
            onPress={() => router.push('/reminders/add' as any)}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => (
          <TouchableOpacity
            key={k}
            testID={`reminders-tab-${k}`}
            style={styles.tab}
            onPress={() => setTab(k)}
          >
            <Text
              style={[
                styles.tabText,
                tab === k && { color: '#7C4DFF', fontWeight: '700' },
              ]}
            >
              {TAB_LABEL[k]}
            </Text>
            {tab === k && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#FFFFFF" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#FFFFFF"
            />
          }
        >
          {tab === 'upcoming' && (
            <>
              <View style={styles.statRow}>
                <StatTile label="Due Today" value={dueToday.length} amount={sum(dueToday)} color="#EF4444" />
                <StatTile label="Due This Week" value={dueWeek.length} amount={sum(dueWeek)} color="#FFB300" />
                <StatTile label="Due This Month" value={dueMonth.length} amount={sum(dueMonth)} color="#3B82F6" />
                <StatTile label="Completed" value={completed.length} amount={sum(completed)} color="#22C55E" sub="This Month" />
              </View>
              {groupedUpcoming.map((g) => (
                <View key={g.label} style={{ marginTop: 18 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.groupHeader}>{g.label}</Text>
                    <Text style={styles.groupCount}>{g.items.length} {g.items.length === 1 ? 'Reminder' : 'Reminders'}</Text>
                  </View>
                  <View style={styles.listCard}>
                    {g.items.map((r) => renderRow(r))}
                  </View>
                </View>
              ))}
              {groupedUpcoming.length === 0 && <EmptyState text="No upcoming reminders" />}
              {/* Manage Alerts CTA card per spec */}
              <TouchableOpacity
                testID="manage-alerts-cta"
                style={styles.manageAlertsCard}
                onPress={() => router.push('/settings/notifications' as any)}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: '#7C4DFF22',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="notifications-outline" size={22} color="#7C4DFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.manageAlertsTitle}>Manage Alerts</Text>
                  <Text style={styles.manageAlertsSub}>Customise notification preferences</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#A0A3BD" />
              </TouchableOpacity>
            </>
          )}

          {tab === 'calendar' && (
            <CalendarView
              month={calendarMonth}
              setMonth={setCalendarMonth}
              items={items}
              onPickDay={(_d: string) => {
                // No drill-down on click; show day's reminders below
              }}
            />
          )}

          {(tab === 'all' || tab === 'completed') && (
            <>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color="#A0A3BD" />
                <TextInput
                  testID={`reminders-search-${tab}`}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={tab === 'completed' ? 'Search completed reminders' : 'Search reminders'}
                  placeholderTextColor="#A0A3BD"
                  style={styles.searchInput}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginTop: 14, marginBottom: 8 }}
              >
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    testID={`reminders-cat-${c.key}`}
                    style={[
                      styles.catChip,
                      category === c.key && { backgroundColor: '#7C4DFF22', borderColor: '#7C4DFF' },
                    ]}
                    onPress={() => setCategory(c.key)}
                  >
                    <Text style={{
                      color: category === c.key ? '#7C4DFF' : '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '600',
                    }}>{c.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* Group by month for both All + Completed per spec */}
              {filtered.length === 0 ? (
                <View style={[styles.listCard, { marginTop: 8 }]}>
                  <EmptyState text={tab === 'completed' ? 'No completed reminders' : 'No reminders'} />
                </View>
              ) : (
                (() => {
                  // Group by Month-Year
                  const groups: Record<string, Reminder[]> = {};
                  filtered
                    .slice()
                    .sort((a, b) => new Date(b.reminder_date).getTime() - new Date(a.reminder_date).getTime())
                    .forEach((r) => {
                      const d = new Date(r.reminder_date);
                      const k = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                      if (!groups[k]) groups[k] = [];
                      groups[k].push(r);
                    });
                  return Object.entries(groups).map(([month, rows]) => (
                    <View key={month} style={{ marginTop: 12 }}>
                      <Text style={styles.groupHeader}>{month}</Text>
                      <View style={[styles.listCard, { marginTop: 8 }]}>
                        {rows.map((r) => renderRow(r))}
                      </View>
                    </View>
                  ));
                })()
              )}
              {filtered.length > 0 && (
                <View style={styles.sortFooter}>
                  <Text style={{ color: '#A0A3BD', fontSize: 12 }}>
                    Showing {filtered.length} {tab === 'completed' ? 'completed' : 'reminder' + (filtered.length === 1 ? '' : 's')}
                  </Text>
                  <Text style={{ color: '#7C4DFF', fontSize: 12, fontWeight: '600' }}>Sort by: Date ↓</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* ----- Sub-components ----- */

const sum = (xs: Reminder[]) =>
  xs.reduce(
    (s, r) =>
      s +
      (r.amount ?? r.related_item?.amount ?? r.related_item?.emi_amount ??
        r.related_item?.current_outstanding ?? r.related_item?.remaining_amount ?? 0),
    0,
  );

function StatTile({
  label, value, amount, color, sub,
}: { label: string; value: number; amount: number; color: string; sub?: string }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statSub} numberOfLines={1}>
        {sub ? sub : amount > 0 ? fmtINR(amount) : '—'}
      </Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={{ alignItems: 'center', padding: 30 }}>
      <Ionicons name="notifications-off-outline" size={32} color="#A0A3BD" />
      <Text style={{ color: '#A0A3BD', marginTop: 8 }}>{text}</Text>
    </View>
  );
}

function CalendarView({ month, setMonth, items }: any) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const startWeekday = first.getDay();
  const total = last.getDate();
  // 6×7 grid (42 cells), starting Sunday
  const cells: { date: Date | null; reminders: Reminder[] }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ date: null, reminders: [] });
  for (let d = 1; d <= total; d++) {
    const day = new Date(y, m, d);
    const dayKey = day.toDateString();
    const reminders = items.filter((r: Reminder) => new Date(r.reminder_date).toDateString() === dayKey);
    cells.push({ date: day, reminders });
  }
  while (cells.length < 42) cells.push({ date: null, reminders: [] });

  const today = startOfDay(new Date());
  const [picked, setPicked] = useState<Date>(today);
  const pickedReminders = items.filter(
    (r: Reminder) => new Date(r.reminder_date).toDateString() === picked.toDateString(),
  );

  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View>
      <View style={styles.calCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setMonth(new Date(y, m - 1, 1))}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => setMonth(new Date(y, m + 1, 1))}>
            <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.calRow}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <Text key={d} style={styles.calHeaderCell}>{d}</Text>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((c, i) => {
            const isPicked = c.date && c.date.toDateString() === picked.toDateString();
            const isToday = c.date && c.date.toDateString() === today.toDateString();
            return (
              <TouchableOpacity
                key={i}
                disabled={!c.date}
                onPress={() => c.date && setPicked(c.date)}
                style={[styles.calCell, isPicked && { backgroundColor: '#7C4DFF', borderRadius: 18 }]}
              >
                {c.date ? (
                  <>
                    <Text style={{ color: isPicked ? '#FFFFFF' : (isToday ? '#7C4DFF' : '#FFFFFF'), fontWeight: isToday ? '700' : '500' }}>
                      {c.date.getDate()}
                    </Text>
                    {c.reminders.length > 0 && !isPicked && (
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                        {c.reminders.slice(0, 3).map((r, k) => (
                          <View
                            key={k}
                            style={{
                              width: 4, height: 4, borderRadius: 2,
                              backgroundColor: TYPE_META[r.reminder_type]?.color || '#7C4DFF',
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <Text style={[styles.groupHeader, { marginTop: 20, marginBottom: 8 }]}>
        Reminders on {picked.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>
      <View style={styles.listCard}>
        {pickedReminders.length === 0
          ? <EmptyState text="No reminders on this day" />
          : pickedReminders.map((r: Reminder) => {
              const meta = TYPE_META[r.reminder_type] || TYPE_META.custom;
              const due = dueLabel(r.reminder_date, r.is_completed);
              const color = dueColor(r.reminder_date, r.is_completed);
              const amount = r.amount ?? r.related_item?.amount ?? r.related_item?.emi_amount ?? 0;
              return (
                <View key={r.reminder_id} style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: meta.color }]}>
                    <Ionicons name={meta.icon as any} size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{r.title}</Text>
                    {!!r.description && (
                      <Text style={styles.rowSub} numberOfLines={1}>{r.description}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {amount > 0 && (
                      <Text style={[styles.rowAmount, { color }]}>{fmtINR(amount)}</Text>
                    )}
                    <Text style={[styles.rowDue, { color }]}>{due}</Text>
                  </View>
                </View>
              );
            })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#7C4DFF',
    alignItems: 'center', justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomColor: '#1F1F4D',
    borderBottomWidth: 1,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { color: '#A0A3BD', fontSize: 14, fontWeight: '500' },
  tabUnderline: {
    height: 2, backgroundColor: '#7C4DFF', width: '60%',
    position: 'absolute', bottom: 0,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statTile: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#12123A',
    padding: 12,
    borderRadius: 12,
  },
  statDot: { width: 14, height: 14, borderRadius: 7, marginBottom: 8 },
  statLabel: { color: '#A0A3BD', fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statSub: { color: '#A0A3BD', fontSize: 11, marginTop: 4 },
  groupHeader: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  groupCount: { color: '#7C4DFF', fontSize: 12, fontWeight: '600' },
  listCard: {
    backgroundColor: '#12123A',
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomColor: '#1F1F4D',
    borderBottomWidth: 1,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  rowSub: { color: '#A0A3BD', fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: 14, fontWeight: '700' },
  rowDue: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  menuBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  manageAlertsCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1B1845',
    borderRadius: 14,
    padding: 14,
  },
  manageAlertsTitle: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '600',
  },
  manageAlertsSub: {
    color: '#A0A3BD', fontSize: 12, marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#12123A',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  sortFooter: {
    marginTop: 14,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 13 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F4D',
    backgroundColor: '#12123A',
  },
  calCard: { backgroundColor: '#12123A', borderRadius: 14, padding: 14 },
  calRow: { flexDirection: 'row' },
  calHeaderCell: {
    flex: 1, textAlign: 'center', color: '#A0A3BD', fontSize: 11, marginBottom: 6,
  },
  calCell: {
    width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center',
  },
});
