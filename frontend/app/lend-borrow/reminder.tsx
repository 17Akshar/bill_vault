import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { DUMMY_LEND_BORROW, REMINDER_TYPES } from './_data';

const REMINDER_TYPE_OPTIONS = [
  { key: 'payment', label: 'Payment Reminder', icon: 'cash-outline', color: '#FF5252' },
  { key: 'custom', label: 'Custom Reminder', icon: 'notifications-outline', color: '#448AFF' },
];

const REPEAT_OPTIONS = [
  { key: 'one_time', label: 'One Time' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
];

export default function ReminderScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<'payment' | 'custom'>('payment');
  const [selectedEntry, setSelectedEntry] = useState(DUMMY_LEND_BORROW[0].id);
  const [reminderDate, setReminderDate] = useState('05 Jun 2024');
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [repeat, setRepeat] = useState('monthly');

  const handleSave = () => {
    Alert.alert(
      'Reminder Set',
      `Reminder for ${DUMMY_LEND_BORROW.find(e => e.id === selectedEntry)?.personName} set for ${reminderDate}.`,
      [{ text: 'OK', onPress: () => setShowForm(false) }],
    );
  };

  const allReminders = DUMMY_LEND_BORROW
    .filter(e => e.reminders.length > 0)
    .sort((a, b) => {
      const aDate = new Date(a.reminders[0]?.nextDueDate || '').getTime();
      const bDate = new Date(b.reminders[0]?.nextDueDate || '').getTime();
      return aDate - bDate;
    });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Reminders</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.iconBtn}>
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Existing Reminders */}
        {!showForm && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Active Reminders</Text>
            {allReminders.length > 0 ? (
              allReminders.map((entry) =>
                entry.reminders.map((r) => {
                  const rt = REMINDER_TYPE_OPTIONS.find(t => t.key === r.type);
                  return (
                    <View key={r.id} style={[styles.reminderCard, { backgroundColor: colors.card }]}>
                      <View style={styles.reminderTop}>
                        <View style={[styles.reminderIcon, { backgroundColor: (rt?.color || '#607D8B') + '20' }]}>
                          <Ionicons name={rt?.icon as any || 'notifications-outline'} size={18} color={rt?.color || '#607D8B'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.reminderTitle, { color: colors.text }]}>
                            {entry.personName} - {rt?.label}
                          </Text>
                          <Text style={[styles.reminderProp, { color: colors.textSecondary }]}>
                            {r.nextDueDate} · {r.frequency}
                          </Text>
                        </View>
                        <View style={[styles.statusDot, { backgroundColor: r.isActive ? '#22C55E' : colors.textSecondary }]} />
                      </View>
                      <View style={styles.reminderActions}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons name="create-outline" size={14} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF525215' }]}>
                          <Ionicons name="trash-outline" size={14} color="#FF5252" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                <Ionicons name="alarm-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reminders set</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowForm(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Add New Reminder</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Add Reminder Form */}
        {showForm && (
          <>
            {/* Reminder Type */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminder Type</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {REMINDER_TYPE_OPTIONS.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeRow, selectedType === t.key && { backgroundColor: t.color + '10' }]}
                  onPress={() => setSelectedType(t.key as any)}
                >
                  <View style={[styles.radio, { borderColor: selectedType === t.key ? t.color : colors.border }]}>
                    {selectedType === t.key && <View style={[styles.radioDot, { backgroundColor: t.color }]} />}
                  </View>
                  <View style={[styles.typeIconBox, { backgroundColor: t.color + '20' }]}>
                    <Ionicons name={t.icon as any} size={16} color={t.color} />
                  </View>
                  <Text style={[styles.typeLabel, { color: colors.text }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Entry Selector */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Entry</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {DUMMY_LEND_BORROW.map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.entryRow, selectedEntry === e.id && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => setSelectedEntry(e.id)}
                >
                  <View style={[styles.radio, { borderColor: selectedEntry === e.id ? colors.primary : colors.border }]}>
                    {selectedEntry === e.id && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={[styles.entryIcon, { backgroundColor: (e.type === 'lent' ? '#22C55E' : '#EF4444') + '20' }]}>
                    <Ionicons name={e.type === 'lent' ? 'arrow-redo-outline' : 'arrow-undo-outline'} size={14} color={e.type === 'lent' ? '#22C55E' : '#EF4444'} />
                  </View>
                  <View>
                    <Text style={[styles.entryName, { color: colors.text }]}>{e.personName}</Text>
                    <Text style={[styles.entryAmount, { color: colors.textSecondary }]}>
                      {e.type === 'lent' ? 'Lent' : 'Borrowed'} ₹{e.amount.toLocaleString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Schedule */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Schedule</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
              <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.fieldValue, { color: colors.text }]}>{reminderDate}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Time</Text>
              <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.fieldValue, { color: colors.text }]}>{reminderTime}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Repeat */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Repeat</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.repeatRow}>
                {REPEAT_OPTIONS.map((o) => (
                  <TouchableOpacity
                    key={o.key}
                    style={[styles.repeatChipBtn, { borderColor: colors.border }, repeat === o.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setRepeat(o.key)}
                  >
                    <Text style={[styles.repeatBtnText, { color: repeat === o.key ? '#FFF' : colors.textSecondary }]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Ionicons name="notifications-outline" size={20} color="#FFF" />
              <Text style={styles.saveBtnText}>Save Reminder</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  reminderCard: { borderRadius: 18, padding: 16, marginBottom: 10 },
  reminderTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  reminderIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  reminderProp: { fontSize: 11 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  reminderActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 52, gap: 8, marginTop: 4,
  },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  sectionCard: { borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },

  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  typeIconBox: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 14, fontWeight: '600' },

  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, marginBottom: 6 },
  entryIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  entryName: { fontSize: 13, fontWeight: '600' },
  entryAmount: { fontSize: 11 },

  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12,
    padding: 14, marginBottom: 4,
  },
  fieldValue: { flex: 1, fontSize: 14, fontWeight: '500' },

  repeatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  repeatChipBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  repeatBtnText: { fontSize: 13, fontWeight: '600' },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, height: 54, gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  emptyState: { borderRadius: 14, paddingVertical: 32, alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 14, marginTop: 8 },
});
