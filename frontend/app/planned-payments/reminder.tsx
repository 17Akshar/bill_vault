import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { DUMMY_PLANNED_PAYMENTS } from './_data';

type ReminderType = 'payment' | 'income' | 'due' | 'missed';
type RepeatOption = 'one_time' | 'daily' | 'weekly' | 'monthly';

const REMINDER_TYPES: { key: ReminderType; label: string; icon: string; color: string; desc: string }[] = [
  { key: 'payment', label: 'Payment Reminder', icon: 'cash-outline', color: '#EF4444', desc: 'Remind before payment is due' },
  { key: 'income', label: 'Income Reminder', icon: 'trending-up-outline', color: '#22C55E', desc: 'Remind before income arrives' },
  { key: 'due', label: 'Due Reminder', icon: 'alarm-outline', color: '#F59E0B', desc: 'Remind on the due date' },
  { key: 'missed', label: 'Missed Payment', icon: 'alert-circle-outline', color: '#6366F1', desc: 'Alert if payment is missed' },
];

const REPEAT_OPTIONS: { key: RepeatOption; label: string }[] = [
  { key: 'one_time', label: 'One Time' },
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

// Build active reminders from dummy data
const ACTIVE_REMINDERS = DUMMY_PLANNED_PAYMENTS
  .filter(p => p.autoReminder)
  .map(p => ({
    id: p.id,
    paymentId: p.id,
    paymentTitle: p.title,
    type: (p.type === 'income' ? 'income' : 'payment') as ReminderType,
    daysBeforeDue: p.reminderDaysBefore,
    nextReminderDate: p.nextDueDate,
    categoryColor: p.categoryColor,
    categoryIcon: p.categoryIcon,
    isActive: true,
    amount: p.amount,
    frequency: 'monthly' as RepeatOption,
  }));

export default function PlannedPaymentReminderScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<ReminderType>('payment');
  const [selectedPaymentId, setSelectedPaymentId] = useState(DUMMY_PLANNED_PAYMENTS[0].id);
  const [reminderDate, setReminderDate] = useState('22 Jun 2024');
  const [reminderTime, setReminderTime] = useState('09:00 AM');
  const [reminderNote, setReminderNote] = useState('');
  const [repeat, setRepeat] = useState<RepeatOption>('monthly');

  const selectedPayment = DUMMY_PLANNED_PAYMENTS.find(p => p.id === selectedPaymentId);

  const handleSave = () =>
    Alert.alert(
      'Reminder Saved',
      `${REMINDER_TYPES.find(t => t.key === selectedType)?.label} for "${selectedPayment?.title}" set for ${reminderDate}.`,
      [{ text: 'OK', onPress: () => setShowForm(false) }],
    );

  const handleDelete = (id: string, title: string) =>
    Alert.alert('Delete Reminder', `Remove reminder for "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {} },
    ]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Reminders</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.iconBtn}>
          <Ionicons name={showForm ? 'close' : 'add'} size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Active Reminders */}
        {!showForm && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Active Reminders ({ACTIVE_REMINDERS.length})</Text>
            {ACTIVE_REMINDERS.map(r => {
              const rt = REMINDER_TYPES.find(t => t.key === r.type)!;
              return (
                <View key={r.id} style={[styles.reminderCard, { backgroundColor: colors.card }]}>
                  <View style={styles.reminderTop}>
                    <View style={[styles.reminderIcon, { backgroundColor: rt.color + '20' }]}>
                      <Ionicons name={rt.icon as any} size={18} color={rt.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reminderTitle, { color: colors.text }]}>{r.paymentTitle}</Text>
                      <Text style={[styles.reminderMeta, { color: colors.textSecondary }]}>
                        {rt.label} · {r.daysBeforeDue > 0 ? `${r.daysBeforeDue}d before` : 'On due date'}
                      </Text>
                    </View>
                    <Switch
                      value={r.isActive}
                      onValueChange={() => {}}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
                    />
                  </View>
                  <View style={styles.reminderBottom}>
                    <View style={[styles.dateChip, { backgroundColor: colors.background }]}>
                      <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.dateChipText, { color: colors.textSecondary }]}>{r.nextReminderDate}</Text>
                    </View>
                    <View style={[styles.freqChip, { backgroundColor: colors.background }]}>
                      <Ionicons name="repeat-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.dateChipText, { color: colors.textSecondary }]}>Monthly</Text>
                    </View>
                    <View style={styles.actionBtns}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="create-outline" size={14} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}
                        onPress={() => handleDelete(r.id, r.paymentTitle)}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

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
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Reminder Type</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {REMINDER_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeRow, selectedType === t.key && { backgroundColor: t.color + '10' }]}
                  onPress={() => setSelectedType(t.key)}
                >
                  <View style={[styles.radio, { borderColor: selectedType === t.key ? t.color : colors.border }]}>
                    {selectedType === t.key && <View style={[styles.radioDot, { backgroundColor: t.color }]} />}
                  </View>
                  <View style={[styles.typeIconBox, { backgroundColor: t.color + '20' }]}>
                    <Ionicons name={t.icon as any} size={16} color={t.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.typeLabel, { color: colors.text }]}>{t.label}</Text>
                    <Text style={[styles.typeDesc, { color: colors.textSecondary }]}>{t.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Payment Selector */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Select Payment</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              {DUMMY_PLANNED_PAYMENTS.slice(0, 5).map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.paymentRow, selectedPaymentId === p.id && { backgroundColor: colors.primary + '10' }]}
                  onPress={() => setSelectedPaymentId(p.id)}
                >
                  <View style={[styles.radio, { borderColor: selectedPaymentId === p.id ? colors.primary : colors.border }]}>
                    {selectedPaymentId === p.id && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <View style={[styles.payIcon, { backgroundColor: p.categoryColor + '20' }]}>
                    <Ionicons name={p.categoryIcon as any} size={14} color={p.categoryColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.payTitle, { color: colors.text }]}>{p.title}</Text>
                    <Text style={[styles.payMeta, { color: colors.textSecondary }]}>₹{p.amount.toLocaleString()} · {p.nextDueDate}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Schedule */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Schedule</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Reminder Date</Text>
              <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.fieldValue, { color: colors.text }]}>{reminderDate}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Reminder Time</Text>
              <TouchableOpacity style={[styles.fieldRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={[styles.fieldValue, { color: colors.text }]}>{reminderTime}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Repeat */}
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Repeat</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.repeatRow}>
                {REPEAT_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.key}
                    style={[styles.repeatChip, { borderColor: colors.border }, repeat === o.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setRepeat(o.key)}
                  >
                    <Text style={[styles.repeatChipText, { color: repeat === o.key ? '#FFF' : colors.textSecondary }]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  sectionLabel: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  reminderCard: { borderRadius: 16, padding: 14, marginBottom: 10 },
  reminderTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  reminderIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  reminderMeta: { fontSize: 11 },
  reminderBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dateChipText: { fontSize: 11, fontWeight: '500' },
  freqChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  actionBtns: { flexDirection: 'row', gap: 6, marginLeft: 'auto' },
  actionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, height: 52, gap: 8, marginTop: 4 },
  addBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  formCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  formSectionTitle: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 12 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, marginBottom: 6 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  typeIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  typeDesc: { fontSize: 11 },

  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, marginBottom: 4 },
  payIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  payTitle: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  payMeta: { fontSize: 11 },

  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 6, marginTop: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 4 },
  fieldValue: { flex: 1, fontSize: 14, fontWeight: '500' },

  repeatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  repeatChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  repeatChipText: { fontSize: 13, fontWeight: '600' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, height: 54, gap: 8, marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
