import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { formatINR } from '../../utils/formatINR';
import { DEMO_REMINDERS, type ExpenseReminder } from './_data';

const PURPLE = '#7C5CE7';
const RED    = '#EF4444';
const GREEN  = '#22C55E';
const ORANGE = '#F59E0B';

type ReminderType = 'expense' | 'bill' | 'subscription' | 'emi';
type RepeatOption = 'one_time' | 'daily' | 'weekly' | 'monthly' | 'yearly';

const REMINDER_TYPES: { key: ReminderType; label: string; icon: string; color: string }[] = [
  { key: 'expense',      label: 'Expense',      icon: 'cash-outline',              color: RED    },
  { key: 'bill',         label: 'Bill',         icon: 'flash-outline',             color: ORANGE },
  { key: 'subscription', label: 'Subscription', icon: 'repeat-outline',            color: PURPLE },
  { key: 'emi',          label: 'EMI',          icon: 'card-outline',              color: GREEN  },
];

const REPEAT_OPTIONS: { key: RepeatOption; label: string }[] = [
  { key: 'one_time', label: 'One Time' },
  { key: 'daily',    label: 'Daily'    },
  { key: 'weekly',   label: 'Weekly'   },
  { key: 'monthly',  label: 'Monthly'  },
  { key: 'yearly',   label: 'Yearly'   },
];

const STATUS_COLOR: Record<string, string> = {
  upcoming: PURPLE,
  missed: RED,
  done: GREEN,
};

export default function ExpenseReminder() {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const CARD = isDark ? '#1A1A2E' : colors.card;
  const BG   = isDark ? '#0D0D14' : colors.background;

  const [reminders, setReminders] = useState<ExpenseReminder[]>(DEMO_REMINDERS);
  const [showAdd, setShowAdd]     = useState(false);

  // Form state
  const [title,     setTitle]     = useState('');
  const [amount,    setAmount]    = useState('');
  const [type,      setType]      = useState<ReminderType>('expense');
  const [dueDate,   setDueDate]   = useState(new Date());
  const [showDate,  setShowDate]  = useState(false);
  const [repeat,    setRepeat]    = useState<RepeatOption>('monthly');
  const [note,      setNote]      = useState('');
  const [autoAlert, setAutoAlert] = useState(true);

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Validation', 'Please enter a title'); return; }
    const newReminder: ExpenseReminder = {
      id: `r${Date.now()}`,
      title: title.trim(),
      amount: Number(amount) || 0,
      type,
      dueDate: format(dueDate, 'yyyy-MM-dd'),
      repeat,
      note: note.trim() || undefined,
      status: 'upcoming',
    };
    setReminders(prev => [newReminder, ...prev]);
    setTitle(''); setAmount(''); setNote('');
    setType('expense'); setRepeat('monthly');
    setShowAdd(false);
    Alert.alert('Success', 'Reminder set successfully');
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Reminder', 'Remove this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setReminders(r => r.filter(x => x.id !== id)) },
    ]);
  };

  const markDone = (id: string) => {
    setReminders(r => r.map(x => x.id === id ? { ...x, status: 'done' as const } : x));
  };

  const typeIcon = (t: ReminderType) => REMINDER_TYPES.find(r => r.key === t)?.icon || 'notifications-outline';
  const typeColor = (t: ReminderType) => REMINDER_TYPES.find(r => r.key === t)?.color || PURPLE;

  const upcoming = reminders.filter(r => r.status === 'upcoming');
  const missed   = reminders.filter(r => r.status === 'missed');
  const done     = reminders.filter(r => r.status === 'done');

  const ReminderCard = ({ item }: { item: ExpenseReminder }) => (
    <View style={[styles.reminderCard, { backgroundColor: CARD }]}>
      <View style={[styles.remIcon, { backgroundColor: `${typeColor(item.type)}22` }]}>
        <Ionicons name={typeIcon(item.type) as any} size={20} color={typeColor(item.type)} />
      </View>
      <View style={styles.remMeta}>
        <View style={styles.remTitleRow}>
          <Text style={[styles.remTitle, { color: colors.text }]}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[item.status]}22` }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        {item.amount > 0 && (
          <Text style={[styles.remAmt, { color: RED }]}>{formatINR(item.amount)}</Text>
        )}
        <View style={styles.remDetails}>
          <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
          <Text style={[styles.remDate, { color: colors.textSecondary }]}>
            Due: {item.dueDate}
          </Text>
          <Ionicons name="repeat-outline" size={12} color={colors.textSecondary} style={{ marginLeft: 8 }} />
          <Text style={[styles.remDate, { color: colors.textSecondary }]}>
            {REPEAT_OPTIONS.find(r => r.key === item.repeat)?.label || item.repeat}
          </Text>
        </View>
        {item.note && (
          <Text style={[styles.remNote, { color: colors.textSecondary }]}>{item.note}</Text>
        )}
      </View>
      <View style={styles.remActions}>
        {item.status !== 'done' && (
          <TouchableOpacity style={[styles.remActionBtn, { backgroundColor: `${GREEN}22` }]} onPress={() => markDone(item.id)}>
            <Ionicons name="checkmark" size={15} color={GREEN} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.remActionBtn, { backgroundColor: `${RED}22` }]} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={15} color={RED} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: BG }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Expense Reminders</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="add-circle-outline" size={24} color={PURPLE} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Upcoming', count: upcoming.length, color: PURPLE },
            { label: 'Missed',   count: missed.length,   color: RED    },
            { label: 'Done',     count: done.length,     color: GREEN  },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: CARD }]}>
              <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Upcoming</Text>
            {upcoming.map(r => <ReminderCard key={r.id} item={r} />)}
          </>
        )}

        {/* Missed */}
        {missed.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: RED }]}>Missed</Text>
            {missed.map(r => <ReminderCard key={r.id} item={r} />)}
          </>
        )}

        {/* Done */}
        {done.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: GREEN }]}>Completed</Text>
            {done.map(r => <ReminderCard key={r.id} item={r} />)}
          </>
        )}

        {reminders.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={56} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reminders set</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: PURPLE }]} onPress={() => setShowAdd(true)}>
              <Text style={styles.emptyBtnText}>Add Reminder</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: PURPLE }]}
        onPress={() => setShowAdd(true)}
      >
        <Ionicons name="add" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* Add Reminder Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAdd(false)} />
        <View style={[styles.sheet, { backgroundColor: isDark ? '#1A1A2E' : '#FFF' }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>New Reminder</Text>

          {/* Title */}
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Reminder title"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Amount */}
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="Amount (optional)"
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
          />

          {/* Type */}
          <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Reminder Type</Text>
          <View style={styles.typeRow}>
            {REMINDER_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeChip, type === t.key && { backgroundColor: t.color }]}
                onPress={() => setType(t.key)}
              >
                <Ionicons name={t.icon as any} size={14} color={type === t.key ? '#FFF' : colors.textSecondary} />
                <Text style={[styles.typeText, { color: type === t.key ? '#FFF' : colors.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Due Date */}
          <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Due Date</Text>
          <TouchableOpacity
            style={[styles.dateBtn, { borderColor: colors.border }]}
            onPress={() => setShowDate(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={PURPLE} />
            <Text style={[styles.dateBtnText, { color: colors.text }]}>{format(dueDate, 'd MMM yyyy')}</Text>
          </TouchableOpacity>

          {/* Repeat */}
          <Text style={[styles.sheetLabel, { color: colors.textSecondary }]}>Repeat</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.repeatRow}>
            {REPEAT_OPTIONS.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[styles.repeatChip, repeat === r.key && { backgroundColor: PURPLE }]}
                onPress={() => setRepeat(r.key)}
              >
                <Text style={[styles.repeatText, { color: repeat === r.key ? '#FFF' : colors.textSecondary }]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Note */}
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor={colors.textSecondary}
          />

          {/* Auto Alert */}
          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Auto notification alert</Text>
            <Switch
              value={autoAlert}
              onValueChange={setAutoAlert}
              trackColor={{ false: colors.border, true: PURPLE }}
              thumbColor="#FFF"
            />
          </View>

          {/* Save */}
          <TouchableOpacity style={[styles.sheetSaveBtn, { backgroundColor: PURPLE }]} onPress={handleSave}>
            <Text style={styles.sheetSaveBtnText}>Set Reminder</Text>
          </TouchableOpacity>

          {showDate && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={(_, d) => { setShowDate(false); if (d) setDueDate(d); }}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle:    { fontSize: 18, fontWeight: '700' },
  scroll:         { paddingHorizontal: 20, paddingTop: 4 },
  statsRow:       { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard:       { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statCount:      { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel:      { fontSize: 11, fontWeight: '600' },
  sectionTitle:   { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  reminderCard:   { flexDirection: 'row', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, alignItems: 'flex-start' },
  remIcon:        { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  remMeta:        { flex: 1, gap: 4 },
  remTitleRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  remTitle:       { flex: 1, fontSize: 14, fontWeight: '700' },
  statusBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText:     { fontSize: 10, fontWeight: '700' },
  remAmt:         { fontSize: 16, fontWeight: '800', letterSpacing: -0.5 },
  remDetails:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  remDate:        { fontSize: 11 },
  remNote:        { fontSize: 12, fontStyle: 'italic' },
  remActions:     { gap: 6 },
  remActionBtn:   { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  empty:          { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:      { fontSize: 16, fontWeight: '600' },
  emptyBtn:       { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText:   { color: '#FFF', fontWeight: '700' },
  fab:            { position: 'absolute', bottom: 28, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet:          { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, gap: 12 },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', alignSelf: 'center', marginBottom: 4 },
  sheetTitle:     { fontSize: 18, fontWeight: '700' },
  sheetLabel:     { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginBottom: -4 },
  input:          { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  typeRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.12)' },
  typeText:       { fontSize: 12, fontWeight: '600' },
  dateBtn:        { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  dateBtnText:    { fontSize: 14, fontWeight: '600' },
  repeatRow:      { marginHorizontal: -4 },
  repeatChip:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, marginHorizontal: 4, backgroundColor: 'rgba(128,128,128,0.12)' },
  repeatText:     { fontSize: 12, fontWeight: '600' },
  switchRow:      { flexDirection: 'row', alignItems: 'center' },
  switchLabel:    { flex: 1, fontSize: 14, fontWeight: '500' },
  sheetSaveBtn:   { paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  sheetSaveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
