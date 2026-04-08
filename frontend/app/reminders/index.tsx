import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Alert, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/formatINR';
import { format, parseISO, isAfter, isBefore, isToday, addDays } from 'date-fns';

const REMINDER_TYPES = [
  { key: 'investment', label: 'Investment', icon: 'trending-up', color: '#00E676' },
  { key: 'loan_emi', label: 'Loan EMI', icon: 'document-text', color: '#FF5252' },
  { key: 'credit_card', label: 'Credit Card', icon: 'card', color: '#FF9100' },
  { key: 'lending', label: 'Lending', icon: 'people', color: '#7C4DFF' },
  { key: 'bill', label: 'Bill', icon: 'receipt', color: '#FFB300' },
  { key: 'custom', label: 'Custom', icon: 'notifications', color: '#448AFF' },
];

const RECURRENCE_OPTIONS = [
  { key: 'none', label: 'One-time' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

export default function RemindersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    reminder_date: '',
    reminder_type: 'custom',
    related_id: '',
    is_recurring: false,
    recurrence: 'none',
  });
  const [saving, setSaving] = useState(false);
  const [timeForm, setTimeForm] = useState({ hour: '09', minute: '00' });

  // Date components for manual picker
  const [dateComponents, setDateComponents] = useState({ day: '', month: '', year: '' });

  // Handle deep link params for pre-filled reminders
  useEffect(() => {
    if (params.type) {
      setForm(prev => ({
        ...prev,
        reminder_type: params.type as string,
        related_id: (params.related_id as string) || '',
        title: (params.title as string) || '',
        description: (params.description as string) || '',
      }));
      setShowAdd(true);
    }
  }, [params.type]);

  useEffect(() => { load(); loadSummary(); }, [filter]);

  const load = async () => {
    try {
      const p: any = {};
      if (filter === 'completed') p.is_completed = true;
      else if (filter === 'upcoming') p.upcoming = true;
      else if (filter !== 'all') p.is_completed = false;
      const res = await api.get('/reminders', { params: p });
      let data = res.data;
      if (filter === 'today') {
        const today = new Date();
        data = data.filter((r: any) => {
          const d = new Date(r.reminder_date);
          return d.toDateString() === today.toDateString();
        });
      } else if (filter === 'overdue') {
        const now = new Date();
        data = data.filter((r: any) => {
          const d = new Date(r.reminder_date);
          return d < now && !r.is_completed;
        });
      }
      setReminders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get('/reminders/summary');
      setSummary(res.data);
    } catch (e) { console.error(e); }
  };

  const onRefresh = useCallback(() => { setRefreshing(true); load(); loadSummary(); }, [filter]);

  const handleAdd = async () => {
    if (!form.title.trim()) { Alert.alert('Required', 'Enter a title'); return; }
    if (!form.reminder_date) { Alert.alert('Required', 'Select a date'); return; }
    setSaving(true);
    try {
      await api.post('/reminders', {
        title: form.title.trim(),
        description: form.description.trim() || null,
        reminder_date: (() => {
          const d = new Date(form.reminder_date);
          d.setHours(parseInt(timeForm.hour) || 9, parseInt(timeForm.minute) || 0, 0, 0);
          return d.toISOString();
        })(),
        reminder_type: form.reminder_type,
        related_id: form.related_id || null,
        is_recurring: form.recurrence !== 'none',
        recurrence: form.recurrence !== 'none' ? form.recurrence : null,
      });
      setShowAdd(false);
      setForm({ title: '', description: '', reminder_date: '', reminder_type: 'custom', related_id: '', is_recurring: false, recurrence: 'none' });
      load(); loadSummary();
    } catch (e: any) { Alert.alert('Error', e.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const markComplete = async (item: any) => {
    try {
      await api.put(`/reminders/${item.reminder_id}`, { is_completed: true });
      load(); loadSummary();
    } catch { Alert.alert('Error', 'Failed'); }
  };

  const handleDelete = (item: any) => {
    Alert.alert('Delete Reminder', `Remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`/reminders/${item.reminder_id}`); load(); loadSummary(); }
        catch { Alert.alert('Error', 'Failed'); }
      }}
    ]);
  };

  const getTypeInfo = (type: string) => REMINDER_TYPES.find(t => t.key === type) || REMINDER_TYPES[5];
  const isOverdue = (dateStr: string) => {
    try { return isBefore(new Date(dateStr), new Date()) } catch { return false; }
  };
  const isTodayDate = (dateStr: string) => {
    try { return isToday(new Date(dateStr)); } catch { return false; }
  };

  const formatDate = (dateStr: string) => {
    try { return format(new Date(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
  };

  // Date picker helper - generate next 30 days for quick selection
  const getQuickDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i <= 30; i++) {
      const d = addDays(today, i);
      dates.push({
        date: d.toISOString().split('T')[0],
        label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'dd MMM'),
        day: format(d, 'EEE'),
      });
    }
    return dates;
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Reminders</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      {summary && (
        <View style={[styles.summaryRow, { backgroundColor: colors.card }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: summary.overdue > 0 ? '#FF5252' : colors.text }]}>
              {summary.overdue}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Overdue</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#FFB300' }]}>{summary.today}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Today</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: '#448AFF' }]}>{summary.this_week}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>This Week</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: colors.text }]}>{summary.total_pending}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {(['all', 'today', 'upcoming', 'overdue', 'completed'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, { borderColor: colors.border }, filter === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => { setFilter(f); setLoading(true); }}
          >
            <Text style={[styles.filterText, { color: filter === f ? '#FFF' : colors.text }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reminder List */}
      <FlatList
        data={reminders}
        keyExtractor={i => i.reminder_id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => {
          const typeInfo = getTypeInfo(item.reminder_type);
          const overdue = !item.is_completed && isOverdue(item.reminder_date);
          const todayItem = isTodayDate(item.reminder_date);
          return (
            <View style={[styles.card, { backgroundColor: colors.card }, overdue && { borderLeftWidth: 3, borderLeftColor: '#FF5252' }, todayItem && !item.is_completed && { borderLeftWidth: 3, borderLeftColor: '#FFB300' }]}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: typeInfo.color + '18' }]}>
                  <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.text }, item.is_completed && styles.completedText]}>{item.title}</Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={[styles.cardDate, { color: overdue ? '#FF5252' : todayItem ? '#FFB300' : colors.textSecondary }]}>
                      {overdue ? 'Overdue · ' : todayItem ? 'Today · ' : ''}{formatDate(item.reminder_date)}
                    </Text>
                    <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '20' }]}>
                      <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
                    </View>
                  </View>
                  {item.description ? <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text> : null}
                  {item.is_recurring && (
                    <View style={styles.recurringBadge}>
                      <Ionicons name="repeat" size={12} color="#448AFF" />
                      <Text style={[styles.recurringText, { color: '#448AFF' }]}>{item.recurrence}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.cardActions}>
                {!item.is_completed && (
                  <TouchableOpacity style={[styles.actBtn, { backgroundColor: 'rgba(0,230,118,0.12)' }]} onPress={() => markComplete(item)}>
                    <Ionicons name="checkmark-circle" size={16} color="#00E676" />
                    <Text style={{ color: '#00E676', fontSize: 12, fontWeight: '600' }}>Done</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: 'rgba(255,82,82,0.12)' }]} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash" size={16} color="#FF5252" />
                  <Text style={{ color: '#FF5252', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filter === 'completed' ? 'No completed reminders' : 'No reminders'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Set reminders for investments, EMIs, bills & more
            </Text>
          </View>
        }
      />

      {/* Add Reminder Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.mHeader}>
              <Text style={[styles.mTitle, { color: colors.text }]}>New Reminder</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Type Selection */}
              <Text style={[styles.fl, { color: colors.text }]}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {REMINDER_TYPES.map(rt => (
                  <TouchableOpacity
                    key={rt.key}
                    style={[styles.typeChip, { borderColor: colors.border }, form.reminder_type === rt.key && { borderColor: rt.color, borderWidth: 2 }]}
                    onPress={() => setForm(p => ({ ...p, reminder_type: rt.key }))}
                  >
                    <Ionicons name={rt.icon as any} size={14} color={form.reminder_type === rt.key ? rt.color : colors.textSecondary} />
                    <Text style={{ color: form.reminder_type === rt.key ? colors.text : colors.textSecondary, fontSize: 11, fontWeight: '500' }}>{rt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={[styles.fl, { color: colors.text }]}>Title</Text>
              <View style={[styles.fi, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <TextInput style={[styles.ft, { color: colors.text }]} placeholder="e.g., SIP Payment Due" placeholderTextColor={colors.textSecondary} value={form.title} onChangeText={v => setForm(p => ({ ...p, title: v }))} />
              </View>

              {/* Description */}
              <Text style={[styles.fl, { color: colors.text, marginTop: 12 }]}>Description (Optional)</Text>
              <View style={[styles.fi, { borderColor: colors.border, backgroundColor: colors.background, height: 70, alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput style={[styles.ft, { color: colors.text }]} placeholder="Notes..." placeholderTextColor={colors.textSecondary} value={form.description} onChangeText={v => setForm(p => ({ ...p, description: v }))} multiline />
              </View>

              {/* Date Selection */}
              <Text style={[styles.fl, { color: colors.text, marginTop: 12 }]}>Reminder Date</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {getQuickDates().slice(0, 14).map(d => (
                  <TouchableOpacity
                    key={d.date}
                    style={[styles.dateChip, { borderColor: colors.border }, form.reminder_date === d.date && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setForm(p => ({ ...p, reminder_date: d.date }))}
                  >
                    <Text style={[styles.dateChipDay, { color: form.reminder_date === d.date ? '#FFF' : colors.textSecondary }]}>{d.day}</Text>
                    <Text style={[styles.dateChipLabel, { color: form.reminder_date === d.date ? '#FFF' : colors.text }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Manual Date: Day / Month / Year */}
              <Text style={[styles.fl, { color: colors.text }]}>Or set exact date</Text>
              <View style={styles.dateRow}>
                <View style={[styles.dateField, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput style={[styles.dateFieldText, { color: colors.text }]} placeholder="DD" placeholderTextColor={colors.textSecondary} value={dateComponents.day} onChangeText={v => { const val = v.replace(/[^0-9]/g, '').slice(0, 2); setDateComponents(p => ({ ...p, day: val })); if (val.length === 2 && dateComponents.month && dateComponents.year.length === 4) setForm(p => ({ ...p, reminder_date: `${dateComponents.year}-${dateComponents.month.padStart(2, '0')}-${val.padStart(2, '0')}` })); }} keyboardType="number-pad" maxLength={2} />
                  <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Day</Text>
                </View>
                <View style={[styles.dateField, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput style={[styles.dateFieldText, { color: colors.text }]} placeholder="MM" placeholderTextColor={colors.textSecondary} value={dateComponents.month} onChangeText={v => { const val = v.replace(/[^0-9]/g, '').slice(0, 2); setDateComponents(p => ({ ...p, month: val })); if (val.length === 2 && dateComponents.day && dateComponents.year.length === 4) setForm(p => ({ ...p, reminder_date: `${dateComponents.year}-${val.padStart(2, '0')}-${dateComponents.day.padStart(2, '0')}` })); }} keyboardType="number-pad" maxLength={2} />
                  <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Month</Text>
                </View>
                <View style={[styles.dateField, { borderColor: colors.border, backgroundColor: colors.background, flex: 1.5 }]}>
                  <TextInput style={[styles.dateFieldText, { color: colors.text }]} placeholder="YYYY" placeholderTextColor={colors.textSecondary} value={dateComponents.year} onChangeText={v => { const val = v.replace(/[^0-9]/g, '').slice(0, 4); setDateComponents(p => ({ ...p, year: val })); if (val.length === 4 && dateComponents.day && dateComponents.month) setForm(p => ({ ...p, reminder_date: `${val}-${dateComponents.month.padStart(2, '0')}-${dateComponents.day.padStart(2, '0')}` })); }} keyboardType="number-pad" maxLength={4} />
                  <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Year</Text>
                </View>
              </View>

              {/* Time Selection */}
              <Text style={[styles.fl, { color: colors.text, marginTop: 12 }]}>Time</Text>
              <View style={styles.timeRow}>
                <View style={[styles.timeField, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput style={[styles.timeFieldText, { color: colors.text }]} placeholder="HH" placeholderTextColor={colors.textSecondary} value={timeForm.hour} onChangeText={v => setTimeForm(p => ({ ...p, hour: v.replace(/[^0-9]/g, '').slice(0, 2) }))} keyboardType="number-pad" maxLength={2} />
                  <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Hour</Text>
                </View>
                <Text style={[styles.timeSep, { color: colors.text }]}>:</Text>
                <View style={[styles.timeField, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput style={[styles.timeFieldText, { color: colors.text }]} placeholder="MM" placeholderTextColor={colors.textSecondary} value={timeForm.minute} onChangeText={v => setTimeForm(p => ({ ...p, minute: v.replace(/[^0-9]/g, '').slice(0, 2) }))} keyboardType="number-pad" maxLength={2} />
                  <Text style={[styles.dateFieldLabel, { color: colors.textSecondary }]}>Min</Text>
                </View>
                <View style={styles.timeQuick}>
                  {[{ l: '9 AM', h: '09', m: '00' }, { l: '12 PM', h: '12', m: '00' }, { l: '6 PM', h: '18', m: '00' }, { l: '9 PM', h: '21', m: '00' }].map(t => (
                    <TouchableOpacity key={t.l} style={[styles.timeQuickBtn, { borderColor: colors.border }, timeForm.hour === t.h && timeForm.minute === t.m && { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={() => setTimeForm({ hour: t.h, minute: t.m })}>
                      <Text style={[styles.timeQuickText, { color: timeForm.hour === t.h && timeForm.minute === t.m ? '#FFF' : colors.text }]}>{t.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {form.reminder_date ? (
                <View style={[styles.datePreview, { backgroundColor: colors.background }]}>
                  <Ionicons name="calendar" size={16} color={colors.primary} />
                  <Text style={[styles.datePreviewText, { color: colors.text }]}>
                    {(() => { try { return format(new Date(form.reminder_date), 'EEEE, dd MMMM yyyy'); } catch { return form.reminder_date; } })()}
                    {' at '}
                    {timeForm.hour.padStart(2, '0')}:{timeForm.minute.padStart(2, '0')}
                  </Text>
                </View>
              ) : null}

              {/* Recurrence */}
              <Text style={[styles.fl, { color: colors.text, marginTop: 12 }]}>Repeat</Text>
              <View style={styles.recurrenceRow}>
                {RECURRENCE_OPTIONS.map(r => (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.recurrenceChip, { borderColor: colors.border }, form.recurrence === r.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setForm(p => ({ ...p, recurrence: r.key }))}
                  >
                    <Text style={[styles.recurrenceText, { color: form.recurrence === r.key ? '#FFF' : colors.text }]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Set Reminder</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold' },
  summaryRow: { flexDirection: 'row', marginHorizontal: 20, borderRadius: 14, padding: 16, marginBottom: 14 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  summaryLabel: { fontSize: 11 },
  summaryDivider: { width: 1, marginVertical: 4 },
  filterScroll: { maxHeight: 48, marginBottom: 14 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  filterText: { fontSize: 13, fontWeight: '500' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  completedText: { textDecorationLine: 'line-through', opacity: 0.5 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardDate: { fontSize: 12 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  cardDesc: { fontSize: 12, marginTop: 4 },
  recurringBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  recurringText: { fontSize: 11, fontWeight: '500' },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12, marginLeft: 54 },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, maxHeight: '90%' },
  mHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  mTitle: { fontSize: 18, fontWeight: 'bold' },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
  fl: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  fi: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, height: 46, marginBottom: 4 },
  ft: { flex: 1, fontSize: 15 },
  dateChip: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginRight: 8, minWidth: 56 },
  dateChipDay: { fontSize: 10, marginBottom: 2 },
  dateChipLabel: { fontSize: 12, fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dateField: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  dateFieldText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  dateFieldLabel: { fontSize: 9, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  timeField: { width: 60, borderWidth: 1, borderRadius: 10, padding: 8, alignItems: 'center' },
  timeFieldText: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  timeSep: { fontSize: 24, fontWeight: 'bold' },
  timeQuick: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  timeQuickBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  timeQuickText: { fontSize: 10, fontWeight: '600' },
  datePreview: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, marginBottom: 8 },
  datePreviewText: { fontSize: 13, fontWeight: '500' },
  recurrenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  recurrenceChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  recurrenceText: { fontSize: 12, fontWeight: '500' },
  saveBtn: { height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
