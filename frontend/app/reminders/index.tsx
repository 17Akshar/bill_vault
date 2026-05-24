import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, ScrollView, RefreshControl, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { formatINR } from '../../utils/formatINR';
import {
  syncRemindersToNotifications,
  scheduleReminderNotifications,
  cancelReminderNotifications,
} from '../../utils/reminderNotifications';
import api from '../../utils/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type TabKey = 'upcoming' | 'calendar' | 'all' | 'completed';
type Reminder = {
  reminder_id: string;
  title: string;
  description?: string;
  reminder_date: string;
  reminder_type: string;
  is_completed: boolean;
  is_recurring?: boolean;
  recurrence?: string;
  amount?: number;
  provider?: string;
  related_item?: {
    name?: string; amount?: number; emi_amount?: number;
    current_outstanding?: number; remaining_amount?: number;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────
const BG     = '#08082A';
const CARD   = '#12123A';
const CARD2  = '#1B1845';
const BORDER = '#1F1F4D';
const TEXT   = '#FFFFFF';
const DIM    = '#A0A3BD';
const PURPLE = '#7C4DFF';

const TYPE_META: Record<string, { color: string; icon: string; label: string }> = {
  bill:        { color: '#3B82F6', icon: 'wifi-outline',              label: 'Bill'        },
  loan_emi:    { color: '#7C4DFF', icon: 'home-outline',              label: 'EMI'         },
  credit_card: { color: '#EF4444', icon: 'card-outline',              label: 'Credit Card' },
  investment:  { color: '#FFB300', icon: 'trending-up-outline',       label: 'Investment'  },
  insurance:   { color: '#22C55E', icon: 'shield-checkmark-outline',  label: 'Insurance'   },
  lending:     { color: '#22C55E', icon: 'people-outline',            label: 'Lending'     },
  custom:      { color: '#7C4DFF', icon: 'notifications-outline',     label: 'Custom'      },
};

const CATEGORIES = [
  { key: 'all',        label: 'All'        },
  { key: 'bill',       label: 'Bills'      },
  { key: 'loan_emi',   label: 'EMI'        },
  { key: 'investment', label: 'Investment' },
  { key: 'insurance',  label: 'Insurance'  },
  { key: 'credit_card',label: 'Cards'      },
];

const TAB_LABELS: Record<TabKey, string> = {
  upcoming: 'Upcoming', calendar: 'Calendar', all: 'All', completed: 'Completed',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

const daysDiff = (iso: string) =>
  Math.round((startOfDay(new Date(iso)).getTime() - startOfDay(new Date()).getTime()) / 86_400_000);

const dueInfo = (iso: string, completed?: boolean): { label: string; color: string } => {
  if (completed) return { label: 'Paid', color: '#22C55E' };
  const d = daysDiff(iso);
  if (d < 0)  return { label: `${Math.abs(d)}d overdue`, color: '#EF4444' };
  if (d === 0) return { label: 'Due Today',    color: '#EF4444' };
  if (d === 1) return { label: 'Due Tomorrow', color: '#FFB300' };
  return { label: `Due in ${d} days`, color: PURPLE };
};

const getAmount = (r: Reminder): number =>
  r.amount ?? r.related_item?.amount ?? r.related_item?.emi_amount ??
  r.related_item?.current_outstanding ?? r.related_item?.remaining_amount ?? 0;

const getProvider = (r: Reminder): string =>
  r.provider ?? r.related_item?.name ?? r.description ?? '';

const sum = (xs: Reminder[]) => xs.reduce((s, r) => s + getAmount(r), 0);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RemindersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [tab, setTab]           = useState<TabKey>('upcoming');
  const [items, setItems]       = useState<Reminder[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]     = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [category, setCategory] = useState('all');
  const [calMonth, setCalMonth] = useState(() => new Date());

  // Handle deep-link → add reminder pre-filled
  useEffect(() => {
    if (params.type) {
      router.push({
        pathname: '/reminders/add' as any,
        params: {
          type: params.type,
          related_id: params.related_id,
          title: params.title,
          description: params.description,
        },
      });
    }
  }, [params.type]);

  const load = async () => {
    try {
      const res = await api.get('/reminders');
      const data = res.data || [];
      setItems(data);
      syncRemindersToNotifications(data).catch(() => {});
    } catch (e: any) {
      if (e?.response?.status !== 401) console.error(e);
      setItems([]);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  // ─── Actions ──────────────────────────────────────────────────────────────
  const completeReminder = async (r: Reminder) => {
    setItems(prev => prev.map(it => it.reminder_id === r.reminder_id ? { ...it, is_completed: true } : it));
    try {
      const res = await api.put(`/reminders/${r.reminder_id}`, { is_completed: true });
      const updated = res?.data;
      if (updated?.is_completed) cancelReminderNotifications(r.reminder_id).catch(() => {});
      else if (updated) scheduleReminderNotifications(updated).catch(() => {});
      load();
    } catch { setItems(prev => prev); Alert.alert('Error', 'Could not mark complete'); }
  };

  const markUpcoming = async (r: Reminder) => {
    setItems(prev => prev.map(it => it.reminder_id === r.reminder_id ? { ...it, is_completed: false } : it));
    try {
      const res = await api.put(`/reminders/${r.reminder_id}`, { is_completed: false });
      if (res?.data) scheduleReminderNotifications(res.data).catch(() => {});
      load();
    } catch { Alert.alert('Error', 'Could not move to upcoming'); }
  };

  const deleteReminder = async (r: Reminder) => {
    Alert.alert('Delete Reminder', `Remove "${r.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/reminders/${r.reminder_id}`);
          cancelReminderNotifications(r.reminder_id).catch(() => {});
          load();
        } catch { Alert.alert('Error', 'Could not delete'); }
      }},
    ]);
  };

  const snoozeReminder = (r: Reminder) => {
    Alert.alert(`Snooze "${r.title}"`, 'Postpone by:', [
      { text: 'Cancel', style: 'cancel' },
      { text: '1 hour',  onPress: () => doSnooze(r, 60 * 60 * 1000) },
      { text: '1 day',   onPress: () => doSnooze(r, 24 * 60 * 60 * 1000) },
      { text: '1 week',  onPress: () => doSnooze(r, 7 * 24 * 60 * 60 * 1000) },
    ]);
  };

  const doSnooze = async (r: Reminder, deltaMs: number) => {
    const base = new Date(r.reminder_date);
    const target = base < new Date() ? new Date(Date.now() + deltaMs) : new Date(base.getTime() + deltaMs);
    try {
      const res = await api.put(`/reminders/${r.reminder_id}`, { snooze_until: target.toISOString() });
      if (res?.data) scheduleReminderNotifications(res.data).catch(() => {});
      load();
    } catch { Alert.alert('Error', 'Could not snooze'); }
  };

  const showActionMenu = (r: Reminder) => {
    if (r.is_completed) {
      Alert.alert(r.title, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark as Upcoming', onPress: () => markUpcoming(r) },
        { text: 'Delete', style: 'destructive', onPress: () => deleteReminder(r) },
      ]);
    } else {
      Alert.alert(r.title, undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: '✓ Mark as Complete', onPress: () => completeReminder(r) },
        { text: '✏️ Edit',   onPress: () => router.push({ pathname: '/reminders/add' as any, params: { id: r.reminder_id } }) },
        { text: '⏰ Snooze', onPress: () => snoozeReminder(r) },
        { text: '🗑 Delete', style: 'destructive', onPress: () => deleteReminder(r) },
      ]);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const upcoming  = items.filter(i => !i.is_completed);
  const completed = items.filter(i => i.is_completed);

  const today   = startOfDay(new Date());
  const week    = new Date(today.getTime() + 7 * 86_400_000);
  const month   = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const dueToday = upcoming.filter(i => daysDiff(i.reminder_date) === 0);
  const dueWeek  = upcoming.filter(i => { const d = new Date(i.reminder_date); return d >= today && d < week; });
  const dueMonth = upcoming.filter(i => { const d = new Date(i.reminder_date); return d >= today && d <= month; });

  const groupedUpcoming = useMemo(() => {
    const tomorrow = new Date(today.getTime() + 86_400_000);
    const inWeek   = new Date(today.getTime() + 7 * 86_400_000);
    const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const groups: { label: string; items: Reminder[] }[] = [
      { label: `Today, ${fmt(today)}`,    items: [] },
      { label: `Tomorrow, ${fmt(tomorrow)}`, items: [] },
      { label: 'Next 7 Days',            items: [] },
      { label: 'Later',                  items: [] },
    ];
    [...upcoming].sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime())
      .forEach(r => {
        const d = daysDiff(r.reminder_date);
        if (d === 0) groups[0].items.push(r);
        else if (d === 1) groups[1].items.push(r);
        else if (d > 1 && new Date(r.reminder_date) <= inWeek) groups[2].items.push(r);
        else groups[3].items.push(r);
      });
    return groups.filter(g => g.items.length > 0);
  }, [upcoming, today]);

  const filtered = (tab === 'completed' ? completed : items).filter(r => {
    if (category !== 'all' && r.reminder_type !== category) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.provider || '').toLowerCase().includes(q);
    }
    return true;
  });

  // ─── Render helpers ────────────────────────────────────────────────────────
  const ReminderRow = ({ r }: { r: Reminder }) => {
    const meta    = TYPE_META[r.reminder_type] || TYPE_META.custom;
    const amount  = getAmount(r);
    const provider = getProvider(r);
    const { label: dueLabel, color: dueColor } = dueInfo(r.reminder_date, r.is_completed);
    const dateStr = new Date(r.reminder_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
      <View style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: r.is_completed ? '#22C55E22' : meta.color + '22' }]}>
          <Ionicons name={(r.is_completed ? 'checkmark-circle' : meta.icon) as any} size={20} color={r.is_completed ? '#22C55E' : meta.color} />
        </View>
        <View style={styles.rowBody}>
          <Text
            style={[styles.rowTitle, r.is_completed && styles.strikethrough]}
            numberOfLines={1}
          >
            {r.title}
          </Text>
          {!!provider && <Text style={styles.rowProvider} numberOfLines={1}>{provider}</Text>}
          <View style={styles.rowMeta}>
            {r.is_recurring && (
              <View style={styles.recurBadge}>
                <Ionicons name="repeat" size={10} color={DIM} />
                <Text style={styles.recurText}>{r.recurrence}</Text>
              </View>
            )}
            <Text style={styles.rowDate}>{dateStr}</Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          {amount > 0 && (
            <Text style={[styles.rowAmount, { color: r.is_completed ? DIM : TEXT }]}>
              {formatINR(amount)}
            </Text>
          )}
          <View style={[styles.duePill, { backgroundColor: dueColor + '22' }]}>
            <Text style={[styles.duePillText, { color: dueColor }]}>{dueLabel}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuBtn} onPress={() => showActionMenu(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="ellipsis-vertical" size={18} color={DIM} />
        </TouchableOpacity>
      </View>
    );
  };

  const SearchBar = () => showSearch ? (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={16} color={DIM} />
      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search reminders…"
        placeholderTextColor={DIM}
        autoFocus
      />
      {!!search && (
        <TouchableOpacity onPress={() => setSearch('')}>
          <Ionicons name="close-circle" size={16} color={DIM} />
        </TouchableOpacity>
      )}
    </View>
  ) : null;

  const CategoryChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
      {CATEGORIES.map(c => (
        <TouchableOpacity
          key={c.key}
          style={[styles.chip, category === c.key && { backgroundColor: PURPLE + '22', borderColor: PURPLE }]}
          onPress={() => setCategory(c.key)}
        >
          <Text style={{ color: category === c.key ? PURPLE : TEXT, fontSize: 12, fontWeight: '600' }}>{c.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const MonthGrouped = ({ data }: { data: Reminder[] }) => {
    const groups: Record<string, Reminder[]> = {};
    [...data].sort((a, b) => new Date(b.reminder_date).getTime() - new Date(a.reminder_date).getTime())
      .forEach(r => {
        const k = new Date(r.reminder_date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
        if (!groups[k]) groups[k] = [];
        groups[k].push(r);
      });
    if (Object.keys(groups).length === 0) return <EmptyState text={tab === 'completed' ? 'No completed reminders' : 'No reminders found'} />;
    return (
      <>
        {Object.entries(groups).map(([month, rows]) => (
          <View key={month} style={{ marginTop: 14 }}>
            <Text style={styles.groupHeader}>{month}</Text>
            <View style={[styles.listCard, { marginTop: 8 }]}>
              {rows.map((r, i) => (
                <View key={r.reminder_id} style={i < rows.length - 1 ? styles.divider : undefined}>
                  <ReminderRow r={r} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </>
    );
  };

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard' as any)}>
          <Ionicons name="arrow-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reminders</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => { setShowSearch(v => !v); if (showSearch) setSearch(''); }}>
            <Ionicons name={showSearch ? 'close' : 'search'} size={22} color={TEXT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/reminders/add' as any)}>
            <Ionicons name="add" size={22} color={TEXT} />
          </TouchableOpacity>
        </View>
      </View>

      <SearchBar />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(Object.keys(TAB_LABELS) as TabKey[]).map(k => (
          <TouchableOpacity key={k} style={styles.tabBtn} onPress={() => setTab(k)}>
            <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>{TAB_LABELS[k]}</Text>
            {tab === k && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={PURPLE} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ══ UPCOMING tab ══ */}
          {tab === 'upcoming' && (
            <>
              {/* 2×2 stat grid */}
              <View style={styles.statGrid}>
                <StatTile label="Due Today"       value={dueToday.length} amount={sum(dueToday)} color="#EF4444" />
                <StatTile label="Due This Week"   value={dueWeek.length}  amount={sum(dueWeek)}  color="#FFB300" />
                <StatTile label="Due This Month"  value={dueMonth.length} amount={sum(dueMonth)} color="#3B82F6" />
                <StatTile label="Completed"       value={completed.length} amount={sum(completed)} color="#22C55E" sub="This Month" />
              </View>

              {groupedUpcoming.length === 0 ? (
                <EmptyState text="No upcoming reminders" />
              ) : (
                groupedUpcoming.map(g => (
                  <View key={g.label} style={{ marginTop: 20 }}>
                    <View style={styles.groupHeaderRow}>
                      <Text style={styles.groupHeader}>{g.label}</Text>
                      <Text style={styles.groupCount}>{g.items.length} Reminder{g.items.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={styles.listCard}>
                      {g.items.map((r, i) => (
                        <View key={r.reminder_id} style={i < g.items.length - 1 ? styles.divider : undefined}>
                          <ReminderRow r={r} />
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}

              {/* Never miss a payment CTA */}
              <View style={styles.ctaCard}>
                <View style={styles.ctaIcon}>
                  <Ionicons name="notifications-outline" size={24} color={PURPLE} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaTitle}>Never miss a payment</Text>
                  <Text style={styles.ctaSub}>Set up alerts to stay on top of all your due dates</Text>
                </View>
                <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/settings/notifications' as any)}>
                  <Text style={styles.ctaBtnText}>Manage Alerts</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ══ CALENDAR tab ══ */}
          {tab === 'calendar' && (
            <CalendarView month={calMonth} setMonth={setCalMonth} items={items} />
          )}

          {/* ══ ALL / COMPLETED tabs ══ */}
          {(tab === 'all' || tab === 'completed') && (
            <>
              <View style={styles.searchBar2}>
                <Ionicons name="search" size={16} color={DIM} />
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder={tab === 'completed' ? 'Search completed…' : 'Search reminders…'}
                  placeholderTextColor={DIM}
                />
              </View>
              <CategoryChips />
              {tab === 'all' && (
                <View style={styles.sortRow}>
                  <Text style={styles.resultCount}>{filtered.length} reminder{filtered.length !== 1 ? 's' : ''}</Text>
                  <TouchableOpacity style={styles.sortBtn}>
                    <Ionicons name="funnel-outline" size={14} color={PURPLE} />
                    <Text style={styles.sortBtnText}>Sort by: Date</Text>
                  </TouchableOpacity>
                </View>
              )}
              <MonthGrouped data={filtered} />
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatTile({ label, value, amount, color, sub }: { label: string; value: number; amount: number; color: string; sub?: string }) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statTileLabel}>{label}</Text>
      <Text style={[styles.statTileValue, { color }]}>{value}</Text>
      <Text style={styles.statTileSub} numberOfLines={1}>
        {sub || (amount > 0 ? formatINR(amount) : '—')}
      </Text>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="notifications-off-outline" size={40} color={DIM} />
      <Text style={{ color: DIM, marginTop: 10, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

function CalendarView({ month, setMonth, items }: { month: Date; setMonth: (d: Date) => void; items: Reminder[] }) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(y, m, 1);
  const last  = new Date(y, m + 1, 0);
  const startWday = first.getDay();
  const [picked, setPicked] = useState<Date>(startOfDay(new Date()));

  const cells: { date: Date | null; reminders: Reminder[] }[] = [];
  for (let i = 0; i < startWday; i++) cells.push({ date: null, reminders: [] });
  for (let d = 1; d <= last.getDate(); d++) {
    const day = new Date(y, m, d);
    cells.push({ date: day, reminders: items.filter(r => new Date(r.reminder_date).toDateString() === day.toDateString()) });
  }
  while (cells.length < 42) cells.push({ date: null, reminders: [] });

  const today = startOfDay(new Date());
  const pickedReminders = items.filter(r => new Date(r.reminder_date).toDateString() === picked.toDateString());
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View>
      <View style={styles.calCard}>
        {/* Month navigation */}
        <View style={styles.calNav}>
          <TouchableOpacity onPress={() => setMonth(new Date(y, m - 1, 1))}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={styles.calMonthLabel}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => setMonth(new Date(y, m + 1, 1))}>
            <Ionicons name="chevron-forward" size={22} color={TEXT} />
          </TouchableOpacity>
        </View>
        {/* Day headers */}
        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <Text key={d} style={styles.calDayHeader}>{d}</Text>
          ))}
        </View>
        {/* Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((c, i) => {
            const isPicked = c.date && c.date.toDateString() === picked.toDateString();
            const isToday  = c.date && c.date.toDateString() === today.toDateString();
            return (
              <TouchableOpacity
                key={i}
                disabled={!c.date}
                onPress={() => c.date && setPicked(c.date)}
                style={[styles.calCell, isPicked && { backgroundColor: PURPLE, borderRadius: 18 }]}
              >
                {c.date && (
                  <>
                    <Text style={{ color: isPicked ? TEXT : (isToday ? PURPLE : TEXT), fontWeight: isToday ? '700' : '400', fontSize: 13 }}>
                      {c.date.getDate()}
                    </Text>
                    {c.reminders.length > 0 && !isPicked && (
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                        {c.reminders.slice(0, 3).map((r, k) => (
                          <View key={k} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: TYPE_META[r.reminder_type]?.color || PURPLE }} />
                        ))}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Legend */}
        <View style={styles.calLegend}>
          {Object.entries(TYPE_META).slice(0, 5).map(([k, v]) => (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: v.color }]} />
              <Text style={styles.legendText}>{v.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.groupHeader, { marginTop: 20, marginBottom: 8 }]}>
        Reminders on {picked.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </Text>
      <View style={styles.listCard}>
        {pickedReminders.length === 0 ? (
          <EmptyState text="No reminders on this day" />
        ) : (
          pickedReminders.map((r, i) => {
            const meta = TYPE_META[r.reminder_type] || TYPE_META.custom;
            const amount = getAmount(r);
            const provider = getProvider(r);
            const { label: dueLabel, color: dueColor } = dueInfo(r.reminder_date, r.is_completed);
            return (
              <View key={r.reminder_id} style={[styles.row, i < pickedReminders.length - 1 ? styles.divider : {}]}>
                <View style={[styles.rowIcon, { backgroundColor: meta.color + '22' }]}>
                  <Ionicons name={meta.icon as any} size={20} color={meta.color} />
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{r.title}</Text>
                  {!!provider && <Text style={styles.rowProvider}>{provider}</Text>}
                </View>
                <View style={styles.rowRight}>
                  {amount > 0 && <Text style={[styles.rowAmount, { color: TEXT }]}>{formatINR(amount)}</Text>}
                  <View style={[styles.duePill, { backgroundColor: dueColor + '22' }]}>
                    <Text style={[styles.duePillText, { color: dueColor }]}>{dueLabel}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: BG },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle:    { color: TEXT, fontSize: 22, fontWeight: '800' },
  headerRight:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  searchBar:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 8, backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 12, height: 40 },
  searchBar2:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 12, height: 40, marginBottom: 12 },
  searchInput:    { flex: 1, color: TEXT, fontSize: 13 },
  tabBar:         { flexDirection: 'row', paddingHorizontal: 20, borderBottomColor: BORDER, borderBottomWidth: 1 },
  tabBtn:         { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText:        { color: DIM, fontSize: 13, fontWeight: '500' },
  tabTextActive:  { color: PURPLE, fontWeight: '700' },
  tabUnderline:   { height: 2, backgroundColor: PURPLE, width: '60%', position: 'absolute', bottom: 0 },
  scroll:         { padding: 20, paddingBottom: 40 },
  statGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statTile:       { flex: 1, minWidth: '47%', backgroundColor: CARD, padding: 14, borderRadius: 14 },
  statDot:        { width: 12, height: 12, borderRadius: 6, marginBottom: 8 },
  statTileLabel:  { color: DIM, fontSize: 11, marginBottom: 4 },
  statTileValue:  { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  statTileSub:    { color: DIM, fontSize: 11 },
  groupHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  groupHeader:    { color: TEXT, fontSize: 15, fontWeight: '700' },
  groupCount:     { color: PURPLE, fontSize: 12, fontWeight: '600' },
  listCard:       { backgroundColor: CARD, borderRadius: 14, overflow: 'hidden' },
  divider:        { borderBottomColor: BORDER, borderBottomWidth: StyleSheet.hairlineWidth },
  row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  rowIcon:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowBody:        { flex: 1, minWidth: 0 },
  rowTitle:       { color: TEXT, fontSize: 14, fontWeight: '600', marginBottom: 2 },
  strikethrough:  { textDecorationLine: 'line-through', color: DIM },
  rowProvider:    { color: DIM, fontSize: 11, marginBottom: 4 },
  rowMeta:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowDate:        { color: DIM, fontSize: 11 },
  rowRight:       { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  rowAmount:      { fontSize: 14, fontWeight: '700' },
  duePill:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  duePillText:    { fontSize: 10, fontWeight: '700' },
  recurBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: CARD2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  recurText:      { color: DIM, fontSize: 10, fontWeight: '500' },
  menuBtn:        { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ctaCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD2, borderRadius: 16, padding: 16, marginTop: 20 },
  ctaIcon:        { width: 44, height: 44, borderRadius: 22, backgroundColor: PURPLE + '22', alignItems: 'center', justifyContent: 'center' },
  ctaTitle:       { color: TEXT, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  ctaSub:         { color: DIM, fontSize: 12 },
  ctaBtn:         { backgroundColor: PURPLE, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  ctaBtnText:     { color: TEXT, fontSize: 12, fontWeight: '700' },
  chipsRow:       { gap: 8, marginBottom: 12 },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD },
  sortRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resultCount:    { color: DIM, fontSize: 12 },
  sortBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText:    { color: PURPLE, fontSize: 12, fontWeight: '600' },
  empty:          { alignItems: 'center', padding: 32 },
  // Calendar
  calCard:        { backgroundColor: CARD, borderRadius: 16, padding: 16 },
  calNav:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  calMonthLabel:  { color: TEXT, fontWeight: '700', fontSize: 16 },
  calDayHeader:   { flex: 1, textAlign: 'center', color: DIM, fontSize: 11, marginBottom: 4 },
  calCell:        { width: '14.28%', height: 44, alignItems: 'center', justifyContent: 'center' },
  calLegend:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendText:     { color: DIM, fontSize: 11 },
});
